import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { publicProcedure, router } from '../../server/trpcSetup'
import type { Actor } from '../visitor/visitorIdentity'
import {
  FeedbackError,
  MAX_ATTACHMENTS,
  MAX_BODY_LENGTH,
  MAX_SUBJECT_LENGTH,
  addFeedback,
  dismissFeedback,
  editFeedback,
  listFeedback,
  listMyFeedback,
} from './service'

/**
 * Writing needs a visitor token, and the token is issued on the request that reads the
 * list — so by the time anyone can click Send, the cookie exists. A missing one here
 * means cookies are blocked, which no error code describes well; PRECONDITION_FAILED at
 * least separates it from a permission problem.
 */
function requireActor(actor: Actor | null): Actor {
  if (!actor) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Sending this needs cookies enabled',
    })
  }
  return actor
}

const REASON_CODES = {
  'not-found': 'NOT_FOUND',
  'not-author': 'FORBIDDEN',
  'window-closed': 'FORBIDDEN',
  'already-reviewed': 'FORBIDDEN',
  empty: 'BAD_REQUEST',
  'too-many-attachments': 'BAD_REQUEST',
} as const

async function mapErrors<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof FeedbackError) {
      throw new TRPCError({
        code: REASON_CODES[error.reason],
        message: error.message,
      })
    }
    throw error
  }
}

export function createFeedbackRouter() {
  return router({
    /** One entry's thread, plus its unreviewed count so the badge needs no second call. */
    list: publicProcedure
      .input(z.object({ resourceSlug: z.string() }))
      .query(({ input, ctx }) => listFeedback(input.resourceSlug, ctx.actor)),

    /** Everything this browser filed, for the tracker. Empty means render no button. */
    mine: publicProcedure.query(({ ctx }) => listMyFeedback(ctx.actor)),

    add: publicProcedure
      .input(
        z
          .object({
            resourceSlug: z.string().optional(),
            subject: z.string().max(MAX_SUBJECT_LENGTH).optional(),
            // Both optional on purpose: a bare flag with no words and no image is the
            // cheapest signal a passing visitor can send, and still worth having.
            body: z.string().max(MAX_BODY_LENGTH).optional(),
            attachmentIds: z.array(z.string()).max(MAX_ATTACHMENTS).optional(),
          })
          .refine((v) => !!v.resourceSlug || !!v.subject?.trim(), {
            message: 'Needs either an entry or a subject',
          }),
      )
      .mutation(({ input, ctx }) =>
        mapErrors(() => addFeedback(input, requireActor(ctx.actor))),
      ),

    edit: publicProcedure
      .input(
        z.object({ id: z.string(), body: z.string().max(MAX_BODY_LENGTH) }),
      )
      .mutation(({ input, ctx }) =>
        mapErrors(() =>
          editFeedback(input.id, input.body, requireActor(ctx.actor)),
        ),
      ),

    /** Withdraw your own, for as long as nobody has reviewed it. */
    dismiss: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input, ctx }) =>
        mapErrors(() => dismissFeedback(input.id, requireActor(ctx.actor))),
      ),
  })
}
