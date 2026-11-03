import { describe, expect, it } from 'vitest'
import type { ServiceRequestType } from '@igstack/app-catalog-backend-core'
import {
  effectiveQuery,
  searchServiceDesks,
} from '~/modules/appCatalog/ui/serviceDesks/searchServiceDesks'
import type { PortalDesk } from '~/modules/appCatalog/ui/serviceDesks/searchServiceDesks'

function form(
  id: string,
  name: string,
  extra: Partial<ServiceRequestType> = {},
): ServiceRequestType {
  return {
    id,
    name,
    url: `https://desk.example.com/create/${id}`,
    fields: [],
    ...extra,
  }
}

function desk(
  slug: string,
  key: string,
  name: string,
  forms: ServiceRequestType[],
  description?: string,
): PortalDesk {
  return {
    slug,
    displayName: name,
    type: 'service',
    config: {
      url: `https://desk.example.com/${slug}`,
      description,
      portal: { key, requestTypes: forms },
    },
  }
}

const help = desk('help', 'HELP', 'Help Desk', [form('1', 'Portal support')])
const helpx = desk('helpx', 'HELPX', 'Help Extra', [form('2', 'Data pull')])
const ops = desk('ops', 'OPS', 'Operations Support', [
  form('3', 'Database access', {
    description: 'Access to a production database',
    fields: [
      {
        name: 'Component/s',
        required: true,
        options: ['Orders DB', 'Ledger DB', "Billing DB - OPS doesn't handle"],
      },
    ],
  }),
])
const tickets = desk('tickets', 'TIX', 'Ticket Desk', [
  form('4', 'Request for HELP reports'),
])

const forms = (q: string, desks = [tickets, ops, helpx, help]) =>
  searchServiceDesks(desks, q).map(
    (r) => `${r.desk.config.portal.key}/${r.form.name}`,
  )

describe('searchServiceDesks', () => {
  it('ranks an exact key first, then a key prefix, then text', () => {
    expect(forms('help')).toEqual([
      'HELP/Portal support',
      'HELPX/Data pull',
      'TIX/Request for HELP reports',
    ])
  })

  it('returns every form of a desk found by name', () => {
    expect(forms('operations')).toEqual(['OPS/Database access'])
  })

  it('finds a form by a dropdown option and reports which one matched', () => {
    const [hit] = searchServiceDesks([ops], 'ledger')
    expect(hit?.fieldMatches).toEqual([
      {
        field: ops.config.portal.requestTypes[0]!.fields[0],
        matched: ['Ledger DB'],
      },
    ])
  })

  it('never matches an option the desk marks as not handled', () => {
    expect(forms('billing')).toEqual([])
  })

  it('puts a text match above a dropdown match', () => {
    const orders = desk('orders', 'ORD', 'Fulfilment desk', [
      form('5', 'Orders outage'),
    ])
    expect(forms('orders', [ops, orders])).toEqual([
      'ORD/Orders outage',
      'OPS/Database access',
    ])
  })
})

describe('effectiveQuery', () => {
  const findsOrders = (q: string) => q.toLowerCase() === 'orders'

  it('rereads a query typed on the Cyrillic layout', () => {
    expect(effectiveQuery('щквукы', findsOrders)).toBe('orders')
  })

  it('falls back to a phonetic transliteration', () => {
    expect(effectiveQuery('ордерс', findsOrders)).toBe('orders')
  })

  it('keeps a query that already finds something', () => {
    expect(effectiveQuery('orders', findsOrders)).toBe('orders')
  })
})
