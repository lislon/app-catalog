import type { Request, RequestHandler, Response, Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { getDbClient } from '../../db'
import {
  isNotModified,
  setRevalidatingCacheHeaders,
} from '../assets/assetCache'
import { generateChecksum } from '../assets/assetUtils'
import { resolveActor } from '../visitor/visitorIdentity'
import { MAX_ATTACHMENTS } from './service'

/** Long edge, in pixels. A correction request needs a readable screenshot, not a print. */
const MAX_EDGE = 2000

/** Per upload. Generous for a screenshot; multer rejects above it before we decode. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

/** Uploads one browser may make per window, and the window. */
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 60 * 1000

/** Orphans older than this are swept — see the sweep below. */
const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Everything is re-encoded to this one format, so the bytes we store are always
 * produced by our own encoder from decoded pixels. That is the actual defence: it
 * drops EXIF, colour profiles, trailing data and anything polyglot that a
 * content-type header would have happily waved through.
 */
const STORED_MIME = 'image/webp'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: MAX_ATTACHMENTS },
})

/**
 * Multer's own errors, answered as JSON.
 *
 * Handed straight to express they reach the default error page — an HTML stack trace
 * carrying absolute server paths, from an endpoint any passer-by can POST to. The
 * limits are also the first thing a person hits by accident, so they deserve a
 * sentence rather than a 500.
 */
const acceptImages: RequestHandler = (req, res, next) => {
  upload.array('image', MAX_ATTACHMENTS)(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_COUNT'
          ? `Up to ${MAX_ATTACHMENTS} images`
          : err.code === 'LIMIT_FILE_SIZE'
            ? `Each image must be under ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`
            : err.code === 'LIMIT_UNEXPECTED_FILE'
              ? 'Unexpected upload field'
              : 'Could not read the upload'
      res.status(400).json({ error: message })
      return
    }
    if (err) {
      console.error('Error reading feedback attachment upload:', err)
      res.status(500).json({ error: 'Failed to upload image' })
      return
    }
    next()
  })
}

/**
 * ponytail: in-memory window, so the budget is per process rather than per browser
 * across a replica set. Move to a shared store if this ever runs more than one
 * replica and the abuse is real; for a form behind the office network it is enough
 * to stop a script, which is all it is for.
 */
const recentUploads = new Map<string, number[]>()

function overRateLimit(actorHash: string): boolean {
  const now = Date.now()
  const kept = (recentUploads.get(actorHash) ?? []).filter(
    (at) => now - at < RATE_WINDOW_MS,
  )
  if (kept.length >= RATE_LIMIT) {
    recentUploads.set(actorHash, kept)
    return true
  }
  kept.push(now)
  recentUploads.set(actorHash, kept)
  return false
}

/**
 * Delete images nobody ever submitted. Opportunistic rather than scheduled: an
 * abandoned form is the only thing that creates them, so the cheapest place to notice
 * is the next upload, and there is no cron to own.
 */
async function sweepOrphans(): Promise<void> {
  try {
    await getDbClient().dbFeedbackAttachment.deleteMany({
      where: {
        feedbackId: null,
        createdAt: { lt: new Date(Date.now() - ORPHAN_MAX_AGE_MS) },
      },
    })
  } catch (error) {
    // A failed sweep must never fail the upload that triggered it.
    console.error('Error sweeping orphaned feedback attachments:', error)
  }
}

export interface FeedbackAttachmentControllerConfig {
  /** Base path for the endpoints (e.g. '/api/feedback-attachments'). */
  basePath: string
}

/**
 * Upload and retrieval for the images on a correction request.
 *
 * These are deliberately NOT `DbAsset`: that table's `name` is unique and holds
 * published catalog artwork, so letting a passing visitor write into it would mean
 * untrusted uploads sharing a namespace with the icons the catalog serves.
 *
 * Endpoints:
 * - POST {basePath}/upload - up to MAX_ATTACHMENTS images (multipart, field `image`)
 * - GET  {basePath}/:id    - the stored image
 */
export function registerFeedbackAttachmentController(
  router: Router,
  config: FeedbackAttachmentControllerConfig,
): void {
  const { basePath } = config

  router.post(
    `${basePath}/upload`,
    acceptImages,
    async (req: Request, res: Response) => {
      try {
        // Same identity the feedback row gets, and it issues the cookie if this is
        // the visitor's first request — so an upload can be the first thing they do.
        const actor = resolveActor(req, res)
        if (!actor) {
          res.status(412).json({ error: 'Uploading needs cookies enabled' })
          return
        }

        const files = Array.isArray(req.files) ? req.files : []
        if (files.length === 0) {
          res.status(400).json({ error: 'No image uploaded' })
          return
        }
        if (overRateLimit(actor.hash)) {
          res.status(429).json({ error: 'Too many uploads, try again later' })
          return
        }

        const prisma = getDbClient()
        const ids: string[] = []

        for (const file of files) {
          // The declared content type is never consulted. Decoding is the check:
          // if sharp cannot read it as an image, it is not one, whatever the
          // header claimed.
          let content: Buffer
          let width: number | undefined
          let height: number | undefined
          try {
            const out = await sharp(file.buffer, { failOn: 'error' })
              .rotate() // Apply EXIF orientation BEFORE the metadata is dropped.
              .resize({
                width: MAX_EDGE,
                height: MAX_EDGE,
                fit: 'inside',
                withoutEnlargement: true,
              })
              .webp({ quality: 82 })
              .toBuffer({ resolveWithObject: true })
            content = out.data
            width = out.info.width
            height = out.info.height
          } catch {
            res
              .status(400)
              .json({ error: `Not a readable image: ${file.originalname}` })
            return
          }

          const row = await prisma.dbFeedbackAttachment.create({
            data: {
              authorHash: actor.hash,
              // Prisma's Bytes wants a plain view; sharp hands back a Buffer whose
              // backing store it will not accept as-is.
              content: new Uint8Array(content),
              mimeType: STORED_MIME,
              fileSize: content.byteLength,
              checksum: generateChecksum(content),
              width,
              height,
              // Kept for a maintainer to read, never used as a path or a key.
              originalFilename: file.originalname.slice(0, 200),
            },
            select: { id: true },
          })
          ids.push(row.id)
        }

        void sweepOrphans()
        res.status(201).json({ ids })
      } catch (error) {
        console.error('Error uploading feedback attachment:', error)
        res.status(500).json({ error: 'Failed to upload image' })
      }
    },
  )

  router.get(`${basePath}/:id`, async (req: Request, res: Response) => {
    try {
      const attachment = await getDbClient().dbFeedbackAttachment.findUnique({
        where: { id: req.params['id'] ?? '' },
        select: {
          content: true,
          mimeType: true,
          checksum: true,
          originalFilename: true,
        },
      })
      if (!attachment) {
        res.status(404).json({ error: 'Image not found' })
        return
      }

      const etag = setRevalidatingCacheHeaders(res, attachment.checksum)
      if (isNotModified(req, etag)) {
        res.status(304).end()
        return
      }

      res.setHeader('Content-Type', attachment.mimeType)
      // Never inline-rendered as a document and never sniffed into one: this is the
      // one place the catalog serves bytes a stranger supplied.
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Content-Disposition', 'inline')
      res.send(Buffer.from(attachment.content))
    } catch (error) {
      console.error('Error fetching feedback attachment:', error)
      res.status(500).json({ error: 'Failed to fetch image' })
    }
  })
}
