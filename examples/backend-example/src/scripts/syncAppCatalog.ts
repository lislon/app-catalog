#!/usr/bin/env node
/**
 * Sync App Catalog Script
 *
 * This script syncs the appCatalog data to the database using the
 * syncAppCatalog function from @igstack/app-catalog-backend-core.
 *
 * Usage:
 *   pnpm run db:sync-catalog
 */

import type { Resource } from '@igstack/app-catalog-backend-core'
import {
  connectDb,
  disconnectDb,
  syncAppCatalog,
} from '@igstack/app-catalog-backend-core'
import { config as loadEnv } from 'dotenv-defaults'

loadEnv()

// Sample app catalog data for fallback
const sampleAppCatalog: Resource[] = [
  {
    id: 'car-shop-sales',
    slug: 'car-shop-sales',
    displayName: 'Car Shop Sales',
    abbreviation: 'Sales',
    description: 'Sales management system for the car dealership',
    accessRequest: {
      approvalMethodSlug: 'it-support',
      comments: 'Request access through IT Support ticketing system',
    },
    teams: ['sales', 'engineering'],
    tags: ['sales', 'crm'],
    appUrl: 'https://car-shop.example.com/sales',
  },
  {
    id: 'billing-app',
    slug: 'billing-app',
    displayName: 'Billing App',
    abbreviation: 'Billing',
    description: 'Invoice and billing management application',
    accessRequest: {
      approvalMethodSlug: 'self-service-portal',
      comments: 'Request access through the admin portal',
      urls: [{ url: 'https://admin.example.com/access' }],
    },
    teams: ['finance', 'engineering'],
    tags: ['billing', 'finance'],
    appUrl: 'https://billing.example.com',
  },
  {
    id: 'pet-shop-app',
    slug: 'pet-shop-app',
    displayName: 'Pet Shop App',
    abbreviation: 'Pet Shop',
    description: 'Pet shop management and inventory system',
    accessRequest: {
      approvalMethodSlug: 'it-support',
      comments: 'Contact IT Support for access',
    },
    teams: ['retail', 'operations'],
    tags: ['retail', 'inventory'],
    appUrl: 'https://pet-shop.example.com',
  },
  {
    id: 'monitoring-dashboard',
    slug: 'monitoring-dashboard',
    displayName: 'Monitoring Dashboard',
    abbreviation: 'Monitoring',
    description: 'System monitoring and alerting dashboard',
    accessRequest: {
      approvalMethodSlug: 'self-service-portal',
      urls: [
        {
          label: 'Monitoring Access Guide',
          url: 'https://docs.example.com/monitoring-access',
        },
      ],
    },
    teams: ['engineering', 'sre'],
    tags: ['monitoring', 'observability'],
    appUrl: 'https://monitoring.example.com',
    links: [{ url: 'https://wiki.example.com/monitoring' }],
  },
]

async function loadAppCatalog(): Promise<Resource[]> {
  try {
    // Optional local catalog file - OK if it doesn't exist
     
    // @ts-expect-error - local/appCatalog.ts is optional and may not exist
    const module = await import('../local/appCatalog.js')
    const appCatalog = module.appCatalog || module.default
    console.log('Loaded app catalog from local/appCatalog.ts')
    return appCatalog
  } catch {
    console.log('Using sample app catalog (local/appCatalog.ts not found)')
    return sampleAppCatalog
  }
}

async function main() {
  try {
    console.log('Starting app catalog sync...')

    await connectDb()
    const catalog = await loadAppCatalog()
    const result = await syncAppCatalog(catalog, [], [])

    console.log(`Sync complete! Total apps in catalog: ${result.total}`)
  } catch (error) {
    console.error('Error syncing app catalog:', error)
    process.exit(1)
  } finally {
    await disconnectDb()
  }
}

main()
