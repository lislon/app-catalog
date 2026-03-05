import 'dotenv-defaults/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.AC_CORE_DATABASE_URL ?? '',
  },
})
