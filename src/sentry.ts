import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [new BrowserTracing()],
    tracesSampleRate: 0.2
  })
}

export { Sentry } 