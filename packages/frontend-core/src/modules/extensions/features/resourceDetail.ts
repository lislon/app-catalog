import type { Resource } from '@igstack/app-catalog-backend-core'
import { slotFactory, wrapperFactory } from '../factories'
import type { PluginUser } from '../types'

/**
 * Leaf slots on the resource detail card.
 *
 * Payloads are additive-only. Adding a field is invisible to existing plugins;
 * renaming or removing one breaks them at compile time on their next core bump,
 * which is the intended moment for that to surface.
 */
export interface ResourceDetailSlots {
  /**
   * Actions on the detail card's header band.
   *
   * The band and not a tab panel: tab panels mount only while active and
   * Overview is first, so a slot inside a tab is invisible until a second click.
   */
  resourceDetailAccessActions: {
    /** The resource on screen — a top-level app OR one of its sub-resources. */
    resource: Resource
    /** Present only on a sub-resource view. Its absence is how a plugin tells the two apart. */
    parent?: Resource
    /** Children of `parent ?? resource`: the family's sub-resources. */
    subResources: Resource[]
    user: PluginUser | null
  }
}

/**
 * Wrappers on the resource detail card.
 *
 * `resourceDetailProvider` is mounted inside the panel's `key={shownSlug}`
 * subtree, so anything a plugin provides here is scoped to the resource on
 * screen and is discarded when the card navigates. That is what lets two slots
 * share per-resource state without the plugin writing any cleanup.
 */
export interface ResourceDetailWrappers {
  resourceDetailProvider: {
    resource: Resource
    parent?: Resource
  }
}

const mkSlot = slotFactory<ResourceDetailSlots>()
const mkWrapper = wrapperFactory<ResourceDetailWrappers>()

export const ResourceDetailAccessActions = mkSlot('resourceDetailAccessActions')
export const ResourceDetailProvider = mkWrapper('resourceDetailProvider')
