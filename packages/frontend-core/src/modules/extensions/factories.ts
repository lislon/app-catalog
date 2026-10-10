import { makeSlot, makeWrapper } from './makeSlot'

/**
 * Binds one feature's slot spec, so each slot names itself exactly once and the
 * name is checked against that feature's own spec.
 *
 *   const mkSlot = slotFactory<AppCatalogSlots>()
 *   export const ResourceDetailAccessActions = mkSlot('resourceDetailAccessActions')
 *                                               // ^ typo here is a compile error
 */
export function slotFactory<TSpec>() {
  return <TName extends keyof TSpec & string>(name: TName) =>
    makeSlot<TSpec[TName]>(name)
}

export function wrapperFactory<TSpec>() {
  return <TName extends keyof TSpec & string>(name: TName) =>
    makeWrapper<TSpec[TName]>(name)
}
