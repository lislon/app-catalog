import type { Group, Person, Resource } from '@igstack/app-catalog-backend-core'

export function getPersonBySlug(
  persons: Person[],
  slug: string,
): Person | undefined {
  return persons.find((p) => p.slug === slug)
}

export function getGroupBySlug(
  groups: Group[],
  slug: string,
): Group | undefined {
  return groups.find((g) => g.slug === slug)
}

export function getChildResources(
  resources: Resource[],
  parentSlug: string,
): Resource[] {
  return resources.filter((r) => r.parentSlug === parentSlug)
}

export function getRootResources(resources: Resource[]): Resource[] {
  return resources.filter((r) => !r.parentSlug)
}

/** @deprecated Use getChildResources instead */
export const getSubResourcesForApp = getChildResources
