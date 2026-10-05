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
  requestTab,
  requestNonce,
  band,
  bandClassName,
}: {
  tabs: DetailTab[]
  /** Overrides `?tab=` while set. */
  forcedTab?: string
  /**
   * A one-shot "please show this tab" from outside the strip — the band's
   * "Suggest a change" uses it.
   *
   * It has to come through here rather than the caller writing `?tab=` itself:
   * `useUrlSyncedState` keeps its own `useState` seeded once from the URL and only
   * ever pushes state OUT to the URL, so a second instance writing the same key
   * does not update this one. The two then fight — the strip's next render sees the
   * URL disagreeing with its own state and navigates back over it.
   */
  requestTab?: string
  /**
   * Bumped by the caller every time it asks again. Without it a repeat request is
   * indistinguishable from the same standing value, so the effect below does not
   * re-fire and the second ask does nothing — which is what made the band's
   * button work exactly once per card.
   */
  requestNonce?: number
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
  const RETIRED: Record<string, string> = { metadata: 'documentation' }

  /**
   * `forcedTab` picks the tab you ARRIVE on, not the tab you are stuck on.
   *
   * It used to win over `?tab=` for as long as it was set, and `?sub=` keeps it set
   * for the whole life of the card — so on any entry reached by a sub-resource
   * search (667 accounts on one of them) the strip was dead: every click wrote
   * nothing and the tab never moved. The same override also silently killed the
   * band's "Suggest a change", which navigates by writing `?tab=`.
   *
   * So it applies until the user expresses a preference, and then gets out of the
   * way. `userChose` is what distinguishes "no opinion yet" from "chose the tab
   * that happens to be the forced one".
   */
  const [userChose, setUserChose] = React.useState(false)

  // Applied when it changes, through the state that actually owns the tab.
  React.useEffect(() => {
    if (!requestTab) return
    setUserChose(true)
    setUrlTab(requestTab)
  }, [requestTab, requestNonce, setUrlTab])
  const asked = userChose || !forcedTab ? urlTab : forcedTab
  const requested = RETIRED[asked] ?? asked
  const activeId = ids.includes(requested) ? requested : (ids[0] ?? '')
  const active = tabs.find((t) => t.id === activeId)

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
    setUserChose(true)
    setUrlTab(next)
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
        <div role="tablist" className="detail-tabs mt-5" onKeyDown={onKeyDown}>
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
                onClick={() => {
                  setUserChose(true)
                  setUrlTab(tab.id)
                }}
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
