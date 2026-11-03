// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as dbClient from '../db/client'
import type { PrismaClient } from '../generated/prisma/client'
import {
  getApprovalMethodsFromPrisma,
  getServiceDesksFromPrisma,
} from '../modules/appCatalog/service'

const portal = {
  key: 'HELP',
  area: 'IT',
  requestTypes: [
    {
      id: '7',
      name: 'Hardware request',
      url: 'https://desk.example.com/portal/1/create/7',
      fields: [{ name: 'Item', required: true, options: ['Laptop', 'Dock'] }],
    },
  ],
}

function given(rows: object[]) {
  vi.spyOn(dbClient, 'getDbClient').mockReturnValue({
    dbApprovalMethod: { findMany: vi.fn().mockResolvedValue(rows) },
  } as unknown as PrismaClient)
}

const deskRow = {
  slug: 'help-desk',
  type: 'service',
  displayName: 'Help Desk',
  config: { url: 'https://desk.example.com/portal/1', portal },
}
const customRow = {
  slug: 'ask-owner',
  type: 'custom',
  displayName: 'Ask the owner',
  config: {},
}

describe('service desk portals', () => {
  afterEach(() => vi.restoreAllMocks())

  it('leaves the portal out of the main catalog payload', async () => {
    given([deskRow, customRow])

    expect(await getApprovalMethodsFromPrisma()).toEqual([
      {
        slug: 'help-desk',
        displayName: 'Help Desk',
        type: 'service',
        config: { url: 'https://desk.example.com/portal/1' },
      },
      {
        slug: 'ask-owner',
        displayName: 'Ask the owner',
        type: 'custom',
        config: {},
      },
    ])
  })

  it('returns only service desks, portal included, for the Service Desks view', async () => {
    given([deskRow, customRow])

    expect(await getServiceDesksFromPrisma()).toEqual([
      {
        slug: 'help-desk',
        displayName: 'Help Desk',
        type: 'service',
        config: { url: 'https://desk.example.com/portal/1', portal },
      },
    ])
  })
})
