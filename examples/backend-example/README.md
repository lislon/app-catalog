# App Catalog Backend Example

Clean, minimal backend example for app-catalog. Uses PostgreSQL via docker-compose and includes 25 realistic SaaS applications as mock data.

## Quick Start

```bash
cd app-catalog/examples/backend-example
pnpm install
pnpm run dev
```

Server runs at http://localhost:4001

## What's Included

- **25 realistic apps**: Slack, GitHub, Jira, Salesforce, DataDog, and more
- **Authentication**: Better Auth with email/password (no OAuth by default)
- **Database**: PostgreSQL via docker-compose
- **Mock data**: Auto-synced on startup from `src/data/mockData.ts`

## Development

### With SQLite (Default)

```bash
pnpm run dev
```

The database file `dev.db` is created automatically on first run.

### With PostgreSQL (Backup)

```bash
# Copy PostgreSQL config
cp .env.postgres .env

# Start PostgreSQL + backend
pnpm run dev:postgres
```

## Adding Mock Apps

Edit `src/data/mockData.ts`:

```typescript
export const mockAppCatalog: AppForCatalog[] = [
  {
    id: 'my-app',
    slug: 'my-app',
    displayName: 'My App',
    description: 'What it does',
    teams: ['Engineering'],
    tags: ['category:development', 'origin:internal'],
    appUrl: 'https://my-app.example.com',
    accessRequest: {
      approvalMethodId: 'it-helpdesk',
      requestPrompt: 'Can I get access to My App',
    },
  },
  // ...
]
```

Restart the server - data resyncs automatically.

## Scripts

- `pnpm run dev` - Start with SQLite (tsx watch, auto-reload)
- `pnpm run dev:postgres` - Start with PostgreSQL (docker-compose + tsx watch)
- `pnpm run build` - Build for production
- `pnpm run start` - Run production build
- `pnpm run db:reset` - Delete SQLite database
- `pnpm run db:reset:postgres` - Reset PostgreSQL (docker-compose down/up)

## Troubleshooting

**Port 4001 already in use**

```bash
lsof -ti:4001 | xargs kill -9
```

**Database errors**

```bash
# SQLite
pnpm run db:reset
pnpm run dev

# PostgreSQL
pnpm run db:reset:postgres
```

**Mock data not appearing**

- Check server logs for sync errors
- Verify `src/data/mockData.ts` has no TypeScript errors
- Restart server (tsx watch should auto-reload)
