/**
 * Resources like kafka topics, database tables, etc.
 */
export interface AcResourceIndexed {
  slug: string
  displayName: string
  defaultFixedValues?: Array<string>
}
