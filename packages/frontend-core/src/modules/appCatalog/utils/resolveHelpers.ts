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

/** The immediate parent of a resource (undefined for a root or if missing). */
export function getParentResource(
  resources: Resource[],
  resource: Pick<Resource, 'parentSlug'>,
): Resource | undefined {
  if (!resource.parentSlug) return undefined
  return resources.find((r) => r.slug === resource.parentSlug)
}

/**
 * The prerequisite chain for a resource: its ancestors that carry an access
 * policy, ordered ROOT → nearest parent. Used to surface the two-step access
 * pattern ("get <parent> access first, then this resource"), which the domain
 * model computes from the tree but users can't see otherwise (#38 item D).
 * Guards against cycles.
 */
export function getAccessPrerequisiteChain(
  resources: Resource[],
  resource: Pick<Resource, 'parentSlug'>,
): Resource[] {
  const chain: Resource[] = []
  const seen = new Set<string>()
  let current = getParentResource(resources, resource)
  while (current && !seen.has(current.slug)) {
    seen.add(current.slug)
    if (current.accessRequest) chain.unshift(current)
    current = getParentResource(resources, current)
  }
  return chain
}

/** @deprecated Use getChildResources instead */
export const getSubResourcesForApp = getChildResources
