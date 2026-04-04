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
