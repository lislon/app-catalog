import type {
  ApprovalMethod,
  Resource,
} from '@igstack/app-catalog-backend-core'

/**
 * What the detail card's access tab says about itself.
 *
 * `route` names how you get in — the tab reads `Access — <route>` — and `chip`
 * is the one number worth carrying next to it.
 */
export interface AccessTabLabel {
  route: string
  chip?: string
}

/** Shown when nothing in the entry records a way in. */
export const ROUTE_UNDOCUMENTED = 'not documented'
/** Shown when the resource needs no request at all. */
export const ROUTE_FREE = 'Free'
/** A request with no named channel behind it. */
export const ROUTE_REQUEST = 'request'

/**
 * Names the access route for a resource's tab.
 *
 * The point is that the tab answers "can I get in?" BEFORE it is opened. That
 * is what lets every entry carry the same four tabs: an access tab holding one
 * sentence saying the route is unknown is a dead end when you have to click to
 * find out, and merely a fact you already read when the label says it.
 *
 * A named channel beats the step count, because the channel is the thing people
 * recognise — most entries route through one or two of them, and "two steps"
 * describes effort rather than destination. The count rides in `chip` instead.
 */
export function accessTabLabel(
  resource: Resource,
  approvalMethods: ApprovalMethod[],
): AccessTabLabel {
  const request = resource.accessRequest
  // Children carry their access as top-level fields rather than an
  // `accessRequest`, and the detail card's access section already falls back to
  // them. The tab has to agree with the section below it, or the label promises
  // something the panel does not show.
  const hasContactsOnly =
    (resource.approverSlugs?.length ?? 0) > 0 ||
    Boolean(resource.accessComments)

  if (!request) {
    return hasContactsOnly
      ? { route: ROUTE_REQUEST, chip: undefined }
      : { route: ROUTE_UNDOCUMENTED }
  }

  const method = approvalMethods.find(
    (m) => m.slug === request.approvalMethodSlug,
  )
  const hasWrittenSteps = Boolean(request.requestPrompt || request.comments)
  const isTwoStep = Boolean(hasWrittenSteps && request.postApprovalInstructions)

  // Steps before roles: two-step is the rarer and more consequential shape, and
  // an entry that is both (a named channel AND a follow-up) is exactly the one
  // where "there is more to do after approval" is the thing worth knowing.
  const roleCount = request.roles?.length ?? 0
  const chip = isTwoStep
    ? '2 steps'
    : roleCount > 0
      ? `${roleCount} role${roleCount === 1 ? '' : 's'}`
      : undefined

  if (method?.type === 'noAccessRequired') return { route: ROUTE_FREE, chip }

  // Nothing here can name a channel: `custom` has none by definition, and an
  // `approvalMethodSlug` that resolves to no method is a dangling reference —
  // the section below renders an access box with nothing in it either way.
  const cannotNameRoute = !method || method.type === 'custom'

  // `unknown` is the honest "we did not find out". A route we cannot name AND
  // cannot describe is the same dead end wearing a different slug: claiming
  // "request" there would promise a way in that the panel does not show.
  if (method?.type === 'unknown' || (cannotNameRoute && !hasWrittenSteps)) {
    return { route: ROUTE_UNDOCUMENTED, chip }
  }

  // A named desk, bot or team. `shortName` exists because `displayName` is
  // written for prose and the longest in use does not fit a tab. No `&& method`
  // guard: `cannotNameRoute` is `!method || …`, so ruling it out already narrows
  // `method` to present.
  if (!cannotNameRoute) {
    return { route: method.shortName ?? method.displayName, chip }
  }

  // Written steps with no channel to name them.
  return { route: isTwoStep ? '2 steps' : ROUTE_REQUEST, chip }
}
