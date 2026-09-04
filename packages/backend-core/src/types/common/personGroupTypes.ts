/**
 * Person & Group Types
 *
 * Persons represent individuals (employees, contacts).
 * Groups represent named sets of persons (teams, distribution lists).
 */

export interface Person {
  slug: string
  firstName: string
  lastName: string
  email?: string
}

export interface Group {
  slug: string
  displayName?: string
  email?: string
  memberSlugs: string[]
}

/**
 * An individual or a named set of them. Fields that hold responsibility
 * (owner, approvers) reference either kind, by slug — resolve the slug against
 * both the persons and the groups collection.
 */
export type PersonOrGroup = Person | Group
