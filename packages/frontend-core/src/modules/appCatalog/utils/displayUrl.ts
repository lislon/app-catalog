/**
 * A URL as a human should read it: without the scheme.
 *
 * Anchored on purpose. The catalog carries URLs that embed another URL in a
 * query parameter -- an IAM Identity Center deep link can end in
 * `&destination=https://console.aws.amazon.com/...` -- and an unanchored strip
 * silently rewrites the inner one too, so the text no longer describes where
 * the link goes.
 */
export const displayUrl = (url: string): string =>
  url.replace(/^https?:\/\//, '')
