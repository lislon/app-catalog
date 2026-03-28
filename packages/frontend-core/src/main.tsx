import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
// import { registerSW } from 'virtual:pwa-register';
import { createBrowserHistory } from '@tanstack/react-router'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { AcDb as DbClass } from './userDb/AcDb'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { AcPlugin } from './modules/pluginCore/types'
import { createQueryClient } from '~/api/infra/createQueryClient'
import { App } from '~/App'
import { createAcRouter } from '~/util/createAcRouter'
import './index.css'

// registerSW();

const trpcClient = createTRPCClient<TRPCRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4000/trpc',
    }),
  ],
})

const db = new DbClass()
const queryClient = createQueryClient({ trpcClient, db })
const plugins: AcPlugin[] = [
  // Future plugins can be added here
]
const router = createAcRouter({
  history: createBrowserHistory(),
  context: {
    queryClient,
    trpcClient,
    db,
    plugins,
    boostrapHealth: {
      bootstrapApiError: undefined,
    },
  },
})

// Render the app

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <App
        router={router}
        queryClient={queryClient}
        trpcClient={trpcClient}
        db={db}
      />
    </StrictMode>,
  )
}
