# Plugins

Deployment-specific UI, rendered inside the core at points the core declares.

The core ships no deployment specifics. A consuming app passes an array of plugins to `<App>`; the
core renders them at named slots and knows nothing about what they do. Everything here is
compile-time typed — there are no string slot ids at call sites.

- [1. Shape](#1-shape)
- [2. Where plugins mount](#2-where-plugins-mount)
- [3. The registry](#3-the-registry)
- [4. Writing a plugin](#4-writing-a-plugin)
- [5. Failure containment](#5-failure-containment)
- [6. Suspense and async](#6-suspense-and-async)
- [7. Reading host state](#7-reading-host-state)
- [8. Calling your own backend](#8-calling-your-own-backend)
- [9. Local storage](#9-local-storage)
- [10. When no plugin is registered](#10-when-no-plugin-is-registered)
- [11. Host-to-plugin communication](#11-host-to-plugin-communication)
- [12. Testing](#12-testing)
- [13. Rules, and what is deliberately absent](#13-rules-and-what-is-deliberately-absent)
- [14. Adding a slot to the core](#14-adding-a-slot-to-the-core)

## 1. Shape

A plugin is a plain object. Two kinds of contribution:

| Kind       | Receives           | Renders            | Combined by                                 |
| ---------- | ------------------ | ------------------ | ------------------------------------------- |
| `slots`    | the slot's props   | _at_ a point       | `.map` — every contributor, in array order  |
| `wrappers` | props + `children` | _around_ a subtree | `.reduceRight` — array order is outer→inner |

```ts
export interface AcPlugin {
  name: string // identity: error reports, test assertions, toggling
  slots?: PluginSlots
  wrappers?: PluginWrappers
}
```

Plugins are an **array**, not a keyed map. A map holds one value per key, so a second plugin at the
same slot would silently replace the first, and two wrappers around one subtree would be impossible.

The consuming app compiles the core into its own bundle, so plugins are ordinary React in the same
React instance. There is no module federation, no iframe, and no runtime loading.

## 2. Where plugins mount

`NEW` marks what the plugin system adds. Everything else already exists.

```
┌─ your app's entry ─────────────────────────────────────────────────────┐
createRoot(#root).render(
 <StrictMode>
  <YourProviders>                     // your query client, your API client
   <YourSharedState>                  // NEW  above <App> ⇒ above EVERY plugin (§11)
    <App {...appPropsFactory()}
         uiSettings={uiSettings}
         extensions={plugins} />      // NEW  the only new prop

┌─ core src/App.tsx ────────────────────────────────────────────────────┐
<QueryClientProvider>                 // CORE query client — not yours
 <TRPCProvider>                        // CORE tRPC → /api/trpc
  <DbProvider db>                      // IndexedDB (Dexie)
   <UiSettingsContext>                 // icons, labels, areas
    <ExtensionsContext value={plugins}> // NEW  what every slot component reads
     <RouterProvider router />

┌─ routes/__root.tsx → routes/_layout.tsx ──────────────────────────────┐
      <div className="min-h-screen"><Outlet /></div>
       <AppCatalogLayout><AppCatalogPage />

┌─ ui/layout/AppCatalogLayout.tsx + ui/layout/TopLevelProviders.tsx ────┐
         <TopLevelProviders>
          <ThemeProvider><TooltipProvider><AuthModalProvider>
           <AuthProvider>             // useUser() lives HERE — BELOW <App>, so a
            <Suspense>                //   provider above <App> cannot call it (§7)
             <GlobalConfigProvider>
          <AppCatalogProvider>        // resources[], approvalMethods
           <AppCatalogFiltersProvider><MainLayout>

┌─ ui/pages/AppCatalogPage.tsx:178 ─────────────────────────────────────┐
             <Suspense fallback={null}>   // ⚠ fallback is null — see §6
              <AppDetailPanel />          // lazy(): loads on first open

┌─ ui/catalog/AppDetailPanel.tsx ───────────────────────────────────────┐
              <div role="dialog" aria-modal>        // the detail card is a modal
               <div key={shownSlug}>                // remounts per resource — §11
                <ResourceDetailProvider ...> // NEW  wrapper slot
                 {subResource ? <SubResourceDetailPanel /> : <AppDetails />}
                 // ⚠ exactly ONE of these renders, and they are different
                 //   layouts, so a leaf slot needs an anchor in both files

╞═ A ─ ui/detail/AppDetails.tsx ════════════════════════════════════════╡
                  <DetailTabs band={band}>
                   // band: always mounted, never scrolls away, NOT a tab
                   <AppDoor app />
                   <ResourceDetailAccessActions ... />   // NEW
                   <Button>Suggest a change</Button>
                   <ResourceDetailHeaderNotice ... />    // NEW
                   {active.render()}
                    // ⚠ ONLY the active tab mounts, and Overview is first, so a
                    //   slot inside a TAB is invisible until a second click

╞═ B ─ ui/components/SubResourceDetailPanel.tsx ════════════════════════╡
                  <div className="flex h-full flex-col p-6">
                   <h2>{subResource.displayName}</h2>
                   <ResourceDetailAccessActions ... />   // NEW
                   {hasAnyAccess && (                           // ⚠ slot sits ABOVE
                     <AccessRequestSection ... />                //   this gate, or it
                   )}                                           //   vanishes when a
                   // this file has NO band and NO DetailTabs    //   resource has no
                                                                //   access metadata
```

Three placement traps are visible above, and all three have bitten:

1. **Tab panels mount only while active**, and Overview is first. A slot inside a tab is invisible
   until a second click. Put always-available actions in the band.
2. **`SubResourceDetailPanel` gates its access region.** A slot inside that gate disappears for
   resources with no access metadata — usually the ones that need help most.
3. **The two panels are different layouts.** One slot id needs a call site in each.

## 3. The registry

One file per feature, all under the extensions module. A single growing `SlotSpec` would be a
merge-conflict magnet and would separate a slot from the code it serves.

```
core/src/modules/extensions/
  core.ts                 makeSlot · makeWrapper · slotFactory · wrapperFactory
                          ExtensionsContext · AssertDisjoint  — knows no feature
  features/
    resourceDetail.ts     spec + components for the detail card
    serviceDesk.ts        the next feature, self-contained
  index.ts                composes SlotSpec / WrapperSpec, assembles `Plugin`
```

```ts
// core.ts — feature-agnostic
/** Binds a feature's spec once, so each slot names itself exactly once. */
export function slotFactory<S>() {
  return <N extends keyof S & string>(name: N) => makeSlot<S[N]>(name)
}

/** Compile error naming any slot id two features both claim. */
export type AssertDisjoint<A, B> = Extract<keyof A, keyof B> extends never ? true : { DUPLICATE_SLOT_ID: Extract<keyof A, keyof B> }
```

```ts
// features/resourceDetail.ts — spec and components colocated
export interface ResourceDetailSlots {
  resourceDetailAccessActions: {
    resource: Resource // what the panel shows (a top-level app OR a sub-resource)
    parent?: Resource // set only on a sub-resource view
    subResources: Resource[] // children of (parent ?? resource)
    user: PluginUser | null
  }
  resourceSubResourceRowActions: {
    resource: Resource // the child this table row is showing
    parent: Resource // always set here, unlike the header slot above
    user: PluginUser | null
  }
}
export interface ResourceDetailWrappers {
  resourceDetailProvider: { resource: Resource; parent?: Resource }
}

const mkSlot = slotFactory<ResourceDetailSlots>()
const mkWrap = wrapperFactory<ResourceDetailWrappers>()

export const ResourceDetailAccessActions = mkSlot('resourceDetailAccessActions')
export const ResourceSubResourceRowActions = mkSlot('resourceSubResourceRowActions')
export const ResourceDetailProvider = mkWrap('resourceDetailProvider')
```

```ts
// features/serviceDesk.ts — adding a feature touches no shared type
export interface ServiceDeskSlots {
  serviceDeskRowActions: { deskId: string; user: PluginUser | null }
}
const mk = slotFactory<ServiceDeskSlots>()
export const ServiceDeskRowActions = mk('serviceDeskRowActions')
```

```ts
// index.ts — the only file that knows every feature
// Guard first: an id claimed twice is a compile error that NAMES the id.
const _disjoint: AssertDisjoint<ResourceDetailSlots, ServiceDeskSlots> = true

export type SlotSpec = ResourceDetailSlots & ServiceDeskSlots
export type WrapperSpec = ResourceDetailWrappers

// Components are re-exported as they are. There is deliberately no `Plugin.*`
// namespace object: only the core's own call sites render a slot — a plugin
// author registers handlers and never calls one — so assembling one would add a
// layer with no consumer.

export type PluginSlots = { [N in keyof SlotSpec]?: (p: SlotSpec[N]) => ReactNode }
export type PluginWrappers = {
  [N in keyof WrapperSpec]?: (p: WrapperSpec[N] & { children: ReactNode }) => ReactNode
}
export interface AcPlugin {
  name: string
  slots?: PluginSlots
  wrappers?: PluginWrappers
}
```

Adding a feature means a new file plus two lines in the barrel. No shared type is edited.

Call sites use the composed namespace, so a slot name is never written as a string:

```tsx
// modules/appCatalog/ui/detail/AppDetails.tsx
import { Plugin } from '~/modules/extensions'
;<ResourceDetailAccessActions resource={app} parent={parent} subResources={children} user={user} />
```

**Why an intersection plus an explicit guard, not `interface SlotSpec extends A, B`.** An
intersection accepts anything: two features claiming one id would silently intersect their payloads
into `A & B`, a slot nothing can satisfy. `extends` errors, but with a generic "incompatibly
declared" message. `AssertDisjoint` names the offending id in the error text.

Errors this produces, verified under `strict: true`:

```
TS2322  Type 'boolean' is not assignable to type
        '{ DUPLICATE_SLOT_ID: "resourceDetailAccessActions"; }'
TS2345  Argument of type '"resourceDetailAcessActions"' is not assignable to parameter
        of type '"resourceDetailAccessActions" | "resourceSubResourceRowActions"'
TS2339  Property 'user' does not exist on type '{ resource: Resource; }'
TS2353  'nopeNotASlot' does not exist in type 'PluginSlots'
```

And the call site stays fully checked:

```tsx
<ResourceDetailAccessActions resource={app} />
// ✗ Property 'subResources' is missing … and 'user' is missing
<ResourceDetailAccessActions {...props} activeTab={tab} />
// ✗ Property 'activeTab' does not exist
```

### Why `WrapperSpec` is separate

Not a typing preference — the two kinds differ at runtime:

|                | leaf slot                       | wrapper                                         |
| -------------- | ------------------------------- | ----------------------------------------------- |
| combinator     | `.map`, all contributors render | `.reduceRight`, folded                          |
| error fallback | `null`, the addition disappears | `children`, **the core's subtree must survive** |
| `children`     | not passed                      | injected into the handler                       |

Merged, the core would have to infer which it is, and the only signal available is "does the payload
happen to contain `children`" — an implicit discriminator that turns a leaf into a wrapper the day
someone names a prop `children`. A `kind` marker field is more typing than a second interface.

The split is internal: both kinds live in the same per-feature file, and a call site renders each
the same way, so it never has to know which kind it is using.

## 4. Writing a plugin

One plugin per directory. Only `index.ts` is imported from outside it, which makes a plugin
deletable by removing the folder and one line.

Tests are the exception: put them wherever the consuming app's runner already looks, not beside
the plugin. A colocated `__tests__/` is silently invisible to a runner configured with a
`dir` — the tests simply never run, and nothing reports it.

```
your-app/src/plugins/
  access-requests/
    index.ts              the AcPlugin object — the ONLY public file
    matches.ts            which resources this plugin applies to
    AccessProvider.tsx    per-resource context (a wrapper contribution)
    useAccess.ts          the hook its components share
    storage.ts            namespaced local storage (§9)
    ManageButton.tsx
  index.ts                export const plugins = [accessRequests, ...]
```

```tsx
// plugins/access-requests/index.ts
export const accessRequests: AcPlugin = {
  name: 'access-requests',
  wrappers: {
    resourceDetailProvider: ({ resource, parent, children }) => (matches(resource, parent) ? <AccessProvider resourceSlug={resource.slug}>{children}</AccessProvider> : children), // not ours: pass through untouched
  },
  slots: {
    resourceDetailAccessActions: (props) => (matches(props.resource, props.parent) ? <ManageButton {...props} /> : null),
  },
}

// plugins/index.ts — must be a module-level constant (§11)
export const plugins: AcPlugin[] = [accessRequests, deprecationNotice]
```

The plugin owns every "does this apply to me?" test. The core never learns which resources are
special, which is what keeps it free of deployment specifics.

## 5. Failure containment

Each contribution is wrapped individually, so one broken plugin cannot take down the page or its
peers. The fallback differs by kind, and that difference matters:

```tsx
// leaf: the contribution disappears, the core's layout is unaffected
<ErrorBoundary key={p.name} fallback={null}
               onError={(e) => reportSlotError(p.name, slotName, e)}>
  {render(props)}
</ErrorBoundary>

// wrapper: fall back to `children`, NEVER null — a broken wrapper
// must not blank the core subtree it was merely decorating
<ErrorBoundary key={p.name} fallback={acc}>
  {render({ ...rest, children: acc })}
</ErrorBoundary>
```

**What an error boundary does not catch.** React boundaries catch errors thrown during render and in
effects. They do **not** catch:

- event handlers — a throwing `onClick` escapes to `window.onerror`
- rejected promises in `async` code
- anything after the component has unmounted

So a plugin must handle its own event and async failures. A boundary is a backstop against a broken
render, not an excuse to skip `try`/`catch` in a click handler.

**Report, don't swallow.** `fallback={null}` makes a crash indistinguishable from "no plugin
registered". Route `onError` into whatever the host surfaces errors through so a failure is visible
in tests (see §12) and in logs, rather than appearing as a silently missing button.

## 6. Suspense and async

**The trap:** `AppCatalogPage.tsx:208` wraps the lazily-loaded detail panel in
`<Suspense fallback={null}>`. A plugin that suspends anywhere inside the detail card — any
`useSuspenseQuery`, any lazy import — would bubble to _that_ boundary, and because its fallback is
`null` **the entire detail card would disappear** until the plugin's data arrived.

The core prevents that by giving every contribution its own `Suspense`, so the suspension is
contained to the slot's own region. The two fallbacks differ on purpose:

- **Leaf slots** fall back to `null`. The contribution's region is simply absent until it resolves,
  which is the same as that plugin not being registered — nothing else on the card is affected.
- **Wrappers** fall back to the children they were wrapping, matching their error fallback. A
  wrapper only decorates, so neither failing nor suspending may blank the subtree. The consequence:
  while suspended its descendants see no context from it, so a wrapper whose children depend on that
  context should not suspend at all — render children and fetch inside its own subtree.

So the contract is containment, not a skeleton. Two things follow for a plugin author:

1. If you want a loading state rather than a blank region, render it yourself. The core's `null`
   fallback deliberately shows nothing, because it cannot know what shape your contribution has.
2. Prefer non-suspending data access (`useQuery` with an explicit `isPending` branch) over
   `useSuspenseQuery`. The loading state then renders inside the plugin, where it belongs.

```tsx
// plugin component: own the loading state, do not export it upward
const { data, isPending, error } = useAccessQuery(resource.slug)
if (error) return null // a failed side panel is not worth an error state
if (isPending) return <Skeleton />
```

## 7. Reading host state

Host state reaches plugins **as slot props**, not as exported hooks. `resourceDetailAccessActions`
receives `resource`, `parent`, `subResources` and `user` because the call sites already have them.

This is deliberate:

- **Props are the versioned contract.** The slot spec says exactly what a plugin may rely on. An
  exported hook is an unbounded second API surface.
- **Props make plugins unit-testable.** A plugin component is a function of its props; testing it
  needs no provider tree.
- **Hook-based access is not available anyway.** `useUser` and `useAppCatalogContext` are not in the
  package's public entry, and `package.json` declares no exports wildcard, so a deep import does not
  resolve.

`user` is a structural type, not the core's internal `User`:

```ts
export interface PluginUser {
  email?: string | null
  isAdmin: boolean
}
```

A plugin that needs host state no slot carries should get a **new field on that slot's spec**, which
is one core edit and a version bump for the consumer — not a new exported hook.

### The provider-height constraint

A provider placed above `<App>` (see the tree) sits above `AuthProvider` and `AppCatalogProvider`,
both of which live _inside_ the router. Such a provider therefore **cannot call host hooks**. Data
flows one way: host → props → plugin → your own store → another plugin.

## 8. Calling your own backend

The core's tRPC client and query client are for the core's own API. A plugin calling a
deployment-specific endpoint uses the consuming app's client, mounted in the app's own providers
**above `<App>`** — so it is in scope for every plugin, and the core never sees it.

```tsx
// your app: one provider above <App>, typed by your own router
const { TRPCProvider, useTRPC } = createTRPCContext<YourAppRouter>()

// inside a plugin component, deep in the core's tree
const trpc = useTRPC()
const { data } = useQuery(trpc.access.pending.queryOptions({ slug }))
```

End-to-end type safety comes from importing your router's **type** from your own backend package.
The core is not involved and needs no release when your API changes.

Two things to know:

- **There are two query clients.** The core's and yours. Use your provider's hooks for your data;
  calling the core's `useQuery` would store your keys in the core's cache.
- **The core does not persist its query cache** (the persister dependency is present but unused), so
  do not assume plugin data survives a reload. Persist deliberately if you need it (§9).

## 9. Local storage

The host already uses `localStorage`, with two different conventions:

```
ac_auth_user          modules/auth/AuthContext.tsx:22
app-catalog:search    modules/appCatalog/hooks/useSessionSyncedState.ts:62
```

Plugins must not collide with those or with each other. Namespace every key by plugin name and keep
the accessor in one file per plugin:

```ts
// plugins/access-requests/storage.ts
const ns = (key: string) => `plugin:access-requests:${key}`

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(ns(key))
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    } // quota, private mode, or corrupt JSON
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(ns(key), JSON.stringify(value))
    } catch {
      /* quota */
    }
  },
}
```

Two non-obvious points:

- **Always wrap in `try`/`catch`.** `localStorage` throws on quota exhaustion and is unavailable in
  some privacy modes. An uncaught throw during render takes out the plugin's boundary for everyone.
- **Handle the first visit explicitly.** A value written by one component and read by another is
  absent on a first load and present after a reload, so a plugin can look correct in every manual
  check and still be wrong for a new visitor. Test with empty storage and no reload.

## 10. When no plugin is registered

`extensions` is optional. With no plugins — which is the open-source default and the state of the
example app — `use(ExtensionsContext) ?? []` yields an empty array, every leaf slot renders `null`,
and every wrapper passes `children` through untouched. The UI is byte-identical to one with no slots
at all.

This is a **requirement, not a happy accident**:

> Slots are additive. The core's UI must be complete and coherent with zero plugins registered. A
> slot must never be the only way to reach something the core needs.

Guard it with a test that asserts the core renders identically with no plugins (§12), and keep one
demo plugin registered in the example app so the path stays exercised in this repository rather than
only downstream.

## 11. Host-to-plugin communication

Default direction is one-way: the host passes props down and asks the plugin nothing. Prefer it. Two
cases genuinely need more.

### Plugin-to-plugin state

Two slots render in different subtrees, so neither sees the other's `useState`. The shared provider
must be above both — which the consuming app already has, since its own providers wrap `<App>`
entirely. The host mediates nothing.

```tsx
// your app — your own context, no core involvement
const Ctx = createContext<Store | null>(null)
export function YourSharedState({ children }) {
  const [pendingFor, setPendingFor] = useState<string | null>(null)
  return <Ctx value={{ pendingFor, setPendingFor }}>{children}</Ctx>
}
// plugin A's slot writes · plugin B's slot reads and re-renders
```

Context crosses `lazy()`, `Suspense` and the router. Portals preserve it too — a portal moves the DOM
node, not the React tree — so the detail card being a modal changes nothing.

**Scope by placement**, not by bookkeeping:

| Scope        | Provider goes                 | Lives as long as              |
| ------------ | ----------------------------- | ----------------------------- |
| Session      | your app entry, above `<App>` | the browser tab               |
| Per-resource | a `wrappers` contribution     | the card showing one resource |
| Per-slot     | `useState` in the component   | that component                |

Per-resource works because the wrapper slot lands inside `AppDetailPanel`'s `key={shownSlug}`, and
the host remounts that subtree when the card navigates between resources. A plugin gets correct
per-resource lifetime without writing cleanup. Note `shownSlug` is `subResource?.slug ?? app.slug`,
so moving from a parent to one of its children also remounts: state that must survive that hop
belongs in session scope, keyed.

### Does a slot have a contributor?

Sometimes the host needs to lay out around a contribution — a heading, a divider, a tab chip count.

`plugins.some(p => p.slots?.[name])` answers "is anything registered", which is **not** the same as
"will anything render": a plugin may be registered and return `null` for this particular resource.
Treating registration as presence produces empty headings.

Preferences, in order:

1. **Let the plugin own its whole visual block**, heading included. Then the host does not need to
   know, and this problem disappears. Design slots this way.
2. If the host truly owns the surrounding layout, let a plugin declare an optional predicate the host
   can ask before rendering — and accept that it is a second source of truth that can drift from the
   render function.
3. Do not infer presence from registration.

### Capabilities: when the host needs a value only a plugin has

If the host must render something it cannot compute — a count in a badge it owns — a plugin can
supply a typed value through a host-declared interface. This inverts the data flow, so it carries a
constraint:

> The plugins array must be a **module-level constant**. The host iterates it in render order, so a
> conditionally built or re-created array changes hook call order between renders and violates the
> rules of hooks.

That constraint is cheap to honour and easy to break accidentally, which is why the recommended
alternative is to give the plugin a slot where the badge goes and let it render its own value. Reach
for capabilities only when the host genuinely owns the layout.

## 12. Testing

The test kit's `given()` accepts `extensions`, so a plugin can be mounted exactly as it ships.

Required cases — the first four are about failure, which is where this system earns its keep:

| Case                         | Assert                                                       |
| ---------------------------- | ------------------------------------------------------------ |
| Plugin throws during render  | the host still renders; the error is reported, not swallowed |
| Wrapper throws               | `children` still render — the core subtree survives          |
| Plugin suspends              | only the plugin's own region shows a fallback (§6)           |
| No plugins registered        | output is identical to the pre-slot baseline (§10)           |
| Two plugins at one slot      | both render, in array order                                  |
| A plugin that returns `null` | no empty heading or stray divider is left behind             |

```tsx
it('contains a crashing plugin', async () => {
  const boom: AcPlugin = {
    name: 'boom',
    slots: {
      resourceDetailAccessActions: () => {
        throw new Error('x')
      },
    },
  }
  await given({ extensions: [boom] }).appDetailOpen('some-slug')
  expect(screen.getByRole('dialog')).toBeInTheDocument() // host survived
  expect(getGlobalError().messages).toContain('x') // and the failure is visible
})
```

Because the payoff of the typed registry is at compile time, assert that too: `@ts-expect-error` or
`expect-type` cases for a missing prop, an extra prop, a misspelled slot name, and a handler reading
a field its slot does not pass.

Finally, keep a test asserting that **both** detail panels render a registered contribution. The two
panels already duplicate access rendering, and one slot id with two call sites is a drift risk.

## 13. Rules, and what is deliberately absent

- Slot names are object keys, never strings. A typo cannot compile.
- Plugins are order-independent, except for wrapper nesting. The moment one plugin needs another to
  have run first, you are building dependency resolution.
- The plugins array is a module-level constant (§11).
- A plugin owns its loading, empty and error states.
- Style with theme tokens (`--primary`, `--muted-foreground`, `--border`), never hard-coded colours,
  so a retheme reaches plugins. Note the host's component classes sit **outside** any `@layer`, so
  they outrank Tailwind's `utilities` layer: a utility on an element that also carries a component
  class loses, and needs `!` or a plain rule ordered after the host stylesheet.
- Keep plugin UI in the consuming app's source tree. Tailwind emits only utilities it can see in
  scanned sources; utilities written inside a published `dist` never compile. An extracted plugin
  package must ship plain CSS or add its own `@source`.

| Not built                                      | Why                                                                                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slot payload versioning and downgrade adapters | A consumer pins an exact core version, so a payload change surfaces as a compile error at its own bump. Compile-time failure beats a silently unrendered plugin. |
| Lifecycle hooks (`init` / `destroy`)           | React mount and unmount already are the lifecycle.                                                                                                               |
| Host-mediated plugin-to-plugin messaging       | A provider in the consuming app does it with no host involvement. The host must not become a broker.                                                             |
| Runtime discovery or dynamic registration      | Plugins compile into the same bundle; the array is known at build time.                                                                                          |
| Inter-plugin dependency resolution             | Order-independence is a rule, not a feature to support.                                                                                                          |
| A style-registration API                       | Tailwind already scans the consuming app's sources and the app owns the tokens.                                                                                  |
| A `matches` predicate on `AcPlugin`            | Would remove the repeated guard in each contribution. Worth it at roughly fifteen plugins, not five.                                                             |
| Route-registration slots                       | Needs `appPropsFactory()` to take parameters; it takes none today and has two callers. Add when a plugin needs its own page.                                     |

## 14. Adding a slot to the core

Two hazards sit between a new slot and a consumer actually getting its types.
Both fail silently, so neither shows up in review or in the core's own suite.

### Never re-export from a bare directory

```ts
export type { AcPlugin } from './modules/extensions' // ✗ silently breaks consumers
export type { AcPlugin } from './modules/extensions/index' // ✓
```

The first emits `from './modules/extensions.js'` into `dist/esm/index.d.ts`, but the build writes
`dist/esm/modules/extensions/index.d.ts`. The specifier resolves to nothing — and because every
consumer compiles with `skipLibCheck`, the unresolved import is never reported. **Every type behind
that specifier becomes `any`.**

Measured, not theoretical: `keyof SlotSpec` accepted an arbitrary string from a consuming app, and
each slot handler's props were implicitly `any`, while the core's own type tests all passed. The
guarantee breaks only across the package boundary. `./modules/pwa` had shipped the same way, so two
already-public types had been `any` for as long as they had existed.

`publicEntryResolves.test.ts` fails on any bare-directory re-export, naming the offender.

### Type tests belong in a consumer, not in the core

Inside this workspace the broken specifier resolves, so no test here can observe the failure. The
only place it is visible is a package that installs the built artifact. A consuming app should
assert it directly:

```ts
/** True only for `any` — the one type assignable both to and from everything. */
type IsAny<T> = 0 extends 1 & T ? true : false

expectTypeOf<IsAny<SlotSpec>>().toEqualTypeOf<false>()
expectTypeOf<keyof SlotSpec>().toEqualTypeOf<'resourceDetailAccessActions'>()
```

Two notes on running them. Such a guard proves nothing until you have watched it fail — break the
specifier, rebuild, confirm it goes red, restore. And a runner's own typecheck may only cover
`*.test-d.ts`: a `.test.tsx` fixture with a genuine type error can report "no errors" there while
`tsc` rejects it, so run both.

### Checklist for a new slot

1. Declare its payload in the feature's own `extensions.ts`; additive-only.
2. Export the component from the feature, and re-export it through `./modules/<feature>/index`.
3. Call it where the surrounding component already holds the whole payload — not inside a
   conditional that can hide it, and not in a lazily-mounted panel.
4. If the call site is a component that tests mount bare, pass the payload in as a prop rather than
   calling hooks there. `useUser()` throws without a provider; `useOptionalUser()` is the accessor
   that does not.
5. Add a case to the consumer-side type test, and one runtime case proving the slot renders nothing
   when unregistered.
