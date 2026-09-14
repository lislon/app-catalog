import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { publicProcedure, router } from '../../server/trpcSetup'
import type { Visitor } from './visitorIdentity'
import {
  CommentError,
  MAX_BODY_LENGTH,
  addComment,
  deleteComment,
  editComment,
  listComments,
} from './service'

const bodyInput = z.string().min(1).max(MAX_BODY_LENGTH)

/**
 * Writing needs a visitor token, and the token is issued on the request that reads
 * the comment list — so by the time anyone can click Post, the cookie exists. A
 * missing one here means cookies are blocked, which no error code describes well;
 * PRECONDITION_FAILED at least separates it from a permission problem.
 */
function requireVisitor(visitor: Visitor | null): Visitor {
  if (!visitor) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Commenting needs cookies enabled',
    })
  }
  return visitor
}

const REASON_CODES = {
  'not-found': 'NOT_FOUND',
  'not-author': 'FORBIDDEN',
  'window-closed': 'FORBIDDEN',
  empty: 'BAD_REQUEST',
} as const

async function mapErrors<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof CommentError) {
      throw new TRPCError({
        code: REASON_CODES[error.reason],
        message: error.message,
      })
    }
    throw error
  }
}

export function createCommentsRouter() {
  return router({
    list: publicProcedure
      .input(z.object({ resourceSlug: z.string() }))
      .query(({ input, ctx }) => listComments(input.resourceSlug, ctx.visitor)),

    add: publicProcedure
      .input(z.object({ resourceSlug: z.string(), body: bodyInput }))
      .mutation(({ input, ctx }) =>
        mapErrors(() =>
          addComment(
            input.resourceSlug,
            input.body,
            requireVisitor(ctx.visitor),
          ),
        ),
      ),

    edit: publicProcedure
      .input(z.object({ id: z.string(), body: bodyInput }))
      .mutation(({ input, ctx }) =>
        mapErrors(() =>
          editComment(input.id, input.body, requireVisitor(ctx.visitor)),
        ),
      ),

    remove: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input, ctx }) =>
        mapErrors(() => deleteComment(input.id, requireVisitor(ctx.visitor))),
      ),
  })
}
