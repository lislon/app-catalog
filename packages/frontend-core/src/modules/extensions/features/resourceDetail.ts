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

  /**
   * One cell per row of the sub-resources table, in a column of its own.
   *
   * Called once per rendered row, which is the opposite shape to
   * `resourceDetailAccessActions` — that one is called once and handed the whole
   * list. Use this when the action belongs to a single child.
   *
   * Two things to know before filling it. The table renders EVERY row with no
   * virtualisation, so a contribution here is mounted as many times as the
   * family has children (hundreds, in a large catalog) — keep the cell cheap and
   * defer anything expensive until it is interacted with. And the column only
   * appears when a plugin actually fills it, so a build with no plugin renders
   * the table exactly as before.
   */
  resourceSubResourceRowActions: {
    /** The child this row is showing. */
    resource: Resource
    /** The entry the row hangs off. Always present here, unlike the header slot. */
    parent: Resource
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
export const ResourceSubResourceRowActions = mkSlot(
  'resourceSubResourceRowActions',
)
export const ResourceDetailProvider = mkWrapper('resourceDetailProvider')
