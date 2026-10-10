import { StrictMode, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  App,
  PwaAutoUpdateProvider,
  appPropsFactory,
} from '@igstack/app-catalog-frontend-core'
import type {
  PwaUpdateHandle,
  UiSettings,
} from '@igstack/app-catalog-frontend-core'
// This app uses the core's route tree unchanged, so it takes the core's router
// — and being a single-`Register` program, importing it from `/router` is
// safe here. A deployment that composes its own tree must not.
import { createAcRouter } from '@igstack/app-catalog-frontend-core/router'
import { registerSW } from 'virtual:pwa-register'
import './index.css'

import { plugins } from './plugins'

const uiSettings: UiSettings = {
  // Bare `#channel` mentions in catalog text link here; drop to keep them plain.
  chatChannelUrlTemplate: 'https://chat.example.com/channels/{name}',
}
const props = {
  ...appPropsFactory({ createRouter: createAcRouter }),
  uiSettings,
  extensions: plugins,
}

function PwaWrapper({ children }: { children: React.ReactNode }) {
  const [handle, setHandle] = useState<PwaUpdateHandle | undefined>(undefined)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const updateSW = registerSW({
      onRegisteredSW(_swUrl, registration) {
        setHandle({ updateSW, registration })
      },
    })
    setHandle({ updateSW, registration: undefined })
  }, [])

  return (
    <PwaAutoUpdateProvider handle={handle} options={{ debug: true }}>
      {children}
    </PwaAutoUpdateProvider>
  )
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <PwaWrapper>
        <App {...props} />
      </PwaWrapper>
    </StrictMode>,
  )
}
