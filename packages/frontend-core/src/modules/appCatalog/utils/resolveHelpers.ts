import type {
  Group,
  Person,
  SubResource,
} from '@igstack/app-catalog-backend-core'

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

export function getSubResourcesForApp(
  subResources: SubResource[],
  appSlug: string,
): SubResource[] {
  return subResources.filter((sr) => sr.appSlug === appSlug)
}
