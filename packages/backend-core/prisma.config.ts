import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Note: Using process.env instead of env() helper because prisma generate
// doesn't need a database URL but still loads this config file.
// The env() helper would throw an error if AC_CORE_DATABASE_URL is not set.

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.AC_CORE_DATABASE_URL ?? '',
  },
})
