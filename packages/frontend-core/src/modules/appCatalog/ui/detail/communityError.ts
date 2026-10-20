/**
 * The server's reason when it gave a readable one ("Up to 3 images"), else a
 * generic line. Validation failures arrive as serialized issue lists, which
 * are not for a reader.
 */
export function formatCommunityError(error: unknown): string {
  const reason =
    error instanceof Error ? error.message.trim().replace(/\.$/, '') : ''
  return reason && !/^[[{]/.test(reason) ? reason : 'Something went wrong'
}
