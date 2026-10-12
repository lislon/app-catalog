import type { AcPlugin } from '@igstack/app-catalog-frontend-core'

/**
 * A worked example of the plugin API, and the only open-source consumer of it.
 *
 * It exists for two reasons beyond documentation. An extension point with no
 * consumer in this repository reads as scaffolding for somebody's private fork,
 * and nothing here would notice if the slot stopped rendering. This keeps the
 * path exercised where it is maintained.
 *
 * Deliberately trivial: it reads only what the slot hands it, so it also shows
 * that a plugin needs no access to the core's internals.
 */
const resourceSummaryPlugin: AcPlugin = {
  name: 'example-resource-summary',
  slots: {
    resourceDetailAccessActions: ({ resource, parent, subResources, user }) => (
      <span
        data-testid="example-plugin-summary"
        className="text-xs text-muted-foreground"
      >
        {resource.slug}
        {parent
          ? ` · child of ${parent.displayName}`
          : ` · ${subResources.length} sub-resources`}
        {user ? ' · signed in' : ''}
      </span>
    ),
  },
}

/**
 * Module-level and constant: the core iterates this while rendering, so
 * rebuilding it per render would change hook call order inside the plugins.
 */
export const plugins: readonly AcPlugin[] = [resourceSummaryPlugin]
