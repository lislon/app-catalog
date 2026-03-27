import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { App, appPropsFactory } from '@igstack/app-catalog-frontend-core'
import type { UiSettings } from '@igstack/app-catalog-frontend-core'
import './index.css'

const uiSettings: UiSettings = {}
const props = { ...appPropsFactory(), uiSettings }

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <App {...props} />
    </StrictMode>,
  )
}
