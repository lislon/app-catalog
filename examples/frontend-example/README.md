# App Catalog Frontend Example

Clean, minimal React frontend example for app-catalog. Connects to backend-example and demonstrates proper integration with frontend-core.

## Quick Start

```bash
# Terminal 1 - Start backend first
cd app-catalog/examples/backend-example
pnpm run dev

# Terminal 2 - Start frontend
cd app-catalog/examples/frontend-example
pnpm install
pnpm run dev

# Open http://localhost:4000
```

## What's Included

- **React + Vite**: Fast development with HMR
- **tRPC integration**: Type-safe API calls to backend
- **Better Auth**: Email/password authentication
- **Minimal setup**: No monitoring, no complex context wrappers

## Development

The frontend proxies `/api/*` requests to backend on port 4001. Make sure the backend is running first.

### Hot Module Replacement (HMR)

The dev server watches frontend-core source files for changes. When you modify code in `app-catalog/packages/frontend-core/src`, Vite automatically reloads the browser (< 1 second).

This makes the example perfect for developing core library features without rebuilding.

## Scripts

- `pnpm run dev` - Start dev server on port 4000
- `pnpm run build` - Build for production
- `pnpm run start` - Run production build
- `pnpm run test:unit` - Run tests
- `pnpm run test:eslint` - Lint check

## Troubleshooting

**Port 4000 already in use**

```bash
lsof -ti:4000 | xargs kill -9
```

**Backend connection errors**

- Verify backend is running on port 4001
- Check backend logs for errors
- Try restarting both servers
