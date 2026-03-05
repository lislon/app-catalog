import { defineConfig } from 'prisma/config'

// Note: Environment variables should be loaded by the calling context
// (e.g., via dotenv-defaults in the application entry point)
// The Prisma CLI will use the AC_CORE_DATABASE_URL from the environment
// where it's executed (e.g., examples/backend-example/.env.defaults)

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.AC_CORE_DATABASE_URL ?? '',
  },
})
