import React from 'react'
import { cn } from '~/lib/utils'
import { useUrlSyncedState } from '~/modules/appCatalog/hooks/useUrlSyncedState'

export interface DetailTab {
  /** Stable id — this is what lands in `?tab=`, so treat it as public. */
  id: string
  label: string
  /** One short count beside the label ("430", "55 roles", "2 steps"). */
  chip?: string
  /** Marks unreviewed content. Also stated in the accessible name. */
  dot?: boolean
  /** Spoken instead of `label` when the chip and dot need explaining. */
  ariaLabel?: string
  render: () => React.ReactNode
}

/**
 * The detail card's tabs.
 *
 * Every entry gets them, including thin ones. Two earlier rules were worse:
 * hiding a tab with little in it turned "we have not documented the way in"
 * into a dead end you had to click to discover, and showing them only on heavy
 * entries made the card's shape change between apps, so "where is access?" had
 * two answers and no habit could form across a few hundred entries. Naming the
 * route in the tab itself removes the reason to hide anything — the label tells
 * you whether opening it is worth it.
 *
 * The active tab lives in the url so a card is linkable mid-conversation. A
 * `forcedTab` (today: arriving with `?sub=`) wins over `?tab=`, because a url
 * that selects a child and then shows a different tab is lying about itself.
 *
 * Panels mount only while active, which also resets their internal state on
 * the way out — the same choice the card makes when it navigates between apps.
 */
export function DetailTabs({
  tabs,
  forcedTab,
  band,
  bandClassName,
  trailing,
}: {
  tabs: DetailTab[]
  /** Overrides `?tab=` while set. */
  forcedTab?: string
  /**
   * Identity and actions, shown ABOVE the strip and inside the same tinted
   * surface. Owned here rather than by the caller because the band and the
   * strip have to be one visual unit with the panel outside it — render the
   * panel inside the band and it inherits the tint, which is the mistake this
   * prop exists to make impossible.
   */
  band?: React.ReactNode
  /** Cancels the dialog's own padding so the tint reaches the card's edges. */
  bandClassName?: string
  /**
   * Shown at the right end of the strip, outside the tablist so it is not
   * announced as a tab. Handed `select` because the strip owns the active tab:
   * a caller writing `?tab=` itself would fight `useUrlSyncedState`, which keeps
   * its own state and only pushes it out to the url.
   */
  trailing?: (select: (id: string) => void) => React.ReactNode
}) {
  /**
   * The first tab is what the card opens on, so naming it in the URL says nothing.
   * `encode` returning undefined drops the param, which keeps `?tab=` out of a link
   * until someone has actually chosen something other than the default — and keeps a
   * shared link honest about what the sender was looking at.
   */
  const defaultTabId = tabs[0]?.id
  const [urlTab, setUrlTab] = useUrlSyncedState<string>({
    key: 'tab',
    defaultValue: '',
    encode: (value) => (value && value !== defaultTabId ? value : undefined),
  })

  const ids = tabs.map((t) => t.id)

  /**
   * Tab ids are public — they are in `?tab=` in links people have already shared.
   * Renaming one would silently drop those onto the first tab, so a retired id
   * keeps resolving to its replacement instead.
   */
  const RETIRED: Record<string, string> = {
    metadata: 'documentation',
    notes: 'behind',
  }

  /**
   * `forcedTab` picks the tab you ARRIVE on, not the tab you are stuck on.
   *
   * `?sub=` stays set for the card's whole life, so forcing it permanently would
   * make the strip unclickable. It applies until the user expresses a preference,
   * and then gets out of the way. `userChose` is what distinguishes "no opinion
   * yet" from "chose the tab that happens to be the forced one".
   */
  const [userChose, setUserChose] = React.useState(false)
  /**
   * Releasing the force must not move the view.
   *
   * Arriving with `?sub=` forces the sub-resources tab, but only through
   * `forcedTab` — the tab's own state is still the default. Clearing the
   * selection drops `?sub=`, the force goes with it, and the strip fell back to
   * that stale default: the reader was moved to Overview while looking at the
   * table they had just cleared a filter on. So when the force is released
   * before the user picked anything, the forced tab becomes the real choice.
   *
   * Adjusted during render rather than in an effect, the pattern React
   * documents for responding to a prop change: an effect would paint one frame
   * of Overview first, mounting that panel only to tear it down again.
   */
  const [lastForced, setLastForced] = React.useState(forcedTab)
  if (forcedTab !== lastForced) {
    setLastForced(forcedTab)
    if (lastForced && !forcedTab && !userChose) setUrlTab(lastForced)
  }

  const asked = userChose || !forcedTab ? urlTab : forcedTab
  const requested = RETIRED[asked] ?? asked
  const activeId = ids.includes(requested) ? requested : (ids[0] ?? '')
  const active = tabs.find((t) => t.id === activeId)

  const select = (id: string) => {
    setUserChose(true)
    setUrlTab(id)
  }

  // Arrow keys move between tabs, per the tablist pattern. Selection follows
  // focus, which is correct here because every panel is already loaded.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const delta =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const from = ids.indexOf(activeId)
    const next = ids[(from + delta + ids.length) % ids.length]
    if (!next) return
    select(next)
    // Focus follows selection, or the arrow keys would walk the visual
    // selection away from the keyboard's position. By id rather than by
    // position in a NodeList: each tab already carries one, and an id lookup
    // says "missing" with a null instead of an out-of-range index.
    document.getElementById(`detail-tab-${next}`)?.focus()
  }

  return (
    <>
      <div className={cn('detail-band', bandClassName)}>
        {band}
        <div className="detail-tabs-row mt-5">
          <div role="tablist" className="detail-tabs" onKeyDown={onKeyDown}>
            {tabs.map((tab) => {
              const selected = tab.id === activeId
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`detail-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`detail-panel-${tab.id}`}
                  // Only the selected tab stays in the tab order; the rest are
                  // reached with the arrow keys, as the pattern requires.
                  tabIndex={selected ? 0 : -1}
                  aria-label={tab.ariaLabel}
                  className="detail-tab"
                  onClick={() => select(tab.id)}
                >
                  {tab.label}
                  {tab.chip && (
                    <span className="detail-tab__chip">{tab.chip}</span>
                  )}
                  {tab.dot && (
                    <span className="detail-tab__dot" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>
          {trailing && (
            <div className="detail-tabs-trailing">{trailing(select)}</div>
          )}
        </div>
      </div>
      {active && (
        <div
          role="tabpanel"
          id={`detail-panel-${active.id}`}
          aria-labelledby={`detail-tab-${active.id}`}
          // Focusable so that tabbing out of the strip lands in the content it
          // controls rather than skipping past it.
          tabIndex={0}
          className="pt-5 outline-none"
        >
          {active.render()}
        </div>
      )}
    </>
  )
}
