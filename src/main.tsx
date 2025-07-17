import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { Sentry } from './sentry'
 
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
) 