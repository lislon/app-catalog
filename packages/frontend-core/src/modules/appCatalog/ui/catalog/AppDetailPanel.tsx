import type { Resource } from '@igstack/app-catalog-backend-core'
import { useMemo } from 'react'
import { useAppCatalogContext } from '../../context/AppCatalogContext'
import {
  ResourceDetailAccessActions,
  ResourceDetailProvider,
} from '~/modules/extensions'
import { useOptionalUser } from '~/modules/auth'
import { getChildResources } from '../../utils/resolveHelpers'
import { SubResourceDetailPanel } from '../components/SubResourceDetailPanel'
import { AppDetails } from '../detail/AppDetails'
import { DetailDialogShell } from './DetailDialogShell'

/**
 * Centered detail card over the catalog (#38, item B). Renders the rich
 * AppDetails (access-hero, sub-resources, tiers) as a large centered modal card
 * over the catalog backdrop.
 *
 * When a sub-resource is selected (`?sub=<slug>` — e.g. the user clicked a
 * matched sub-resource row in the search results) the card shows that
 * sub-resource's own detail, with its two-step access chain and a back link to
 * the parent.
 *
 * The overlay itself — scrim, centring, Widen, Close, Escape — is
 * `DetailDialogShell`, shared with the community tool card.
 */
export function AppDetailPanel({
  app,
  subResource,
  onClose,
  onAppClick,
  onBackToParent,
}: {
  app: Resource
  /** Selected child of `app`, when the URL carries `?sub=<slug>`. */
  subResource?: Resource | null
  onClose: () => void
  onAppClick?: (app: Resource) => void
  /** Clears `?sub=` and returns to the parent's detail. */
  onBackToParent?: () => void
}) {
  const { approvalMethods, resources: allResources } = useAppCatalogContext()
  const user = useOptionalUser()

  // The sub-resource branch has no band of its own, so its slot payload is
  // assembled here, where the catalog context already is, and handed down.
  const subResourceActionsCtx = useMemo(
    () => ({
      resource: subResource ?? app,
      parent: subResource ? app : undefined,
      subResources: getChildResources(allResources, app.slug),
      user: user ? { email: user.email, isAdmin: user.isAdmin ?? false } : null,
    }),
    [subResource, app, allResources, user],
  )
  const shownSlug = subResource?.slug ?? app.slug

  return (
    <DetailDialogShell
      label={`${subResource?.displayName ?? app.displayName} details`}
      shownKey={shownSlug}
      // Wide enough for data tables (sub-resources have 5 columns incl.
      // "Access Contacts"/"AWS Account" that wrapped at 760px); prose inside
      // AppDetails is width-capped separately so it stays readable. Caps at
      // 94vw so it never touches the edges.
      maxWidthClass="max-w-[min(1120px,94vw)]"
      focusSelector=".app-door"
      onClose={onClose}
    >
      {/* Inside the key, so anything a plugin provides here is scoped to
              the resource on screen and is discarded when the card navigates.
              Renders its children untouched when no plugin contributes. */}
      <ResourceDetailProvider
        resource={subResource ?? app}
        parent={subResource ? app : undefined}
      >
        {subResource ? (
          <SubResourceDetailPanel
            subResource={subResource}
            parent={app}
            approvalMethods={approvalMethods}
            onBack={onBackToParent ?? onClose}
            actions={<ResourceDetailAccessActions {...subResourceActionsCtx} />}
          />
        ) : (
          <AppDetails app={app} onAppClick={onAppClick} />
        )}
      </ResourceDetailProvider>
    </DetailDialogShell>
  )
}
