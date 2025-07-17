# CharterAI Web App Documentation

## Overview
CharterAI is a progressive web app that helps anglers build AI-generated fishing trip itineraries and chat with an AI guide.  The front-end runs on **React 18 + TypeScript** bundled by **Vite** while **Tailwind CSS** styles UI, **Mapbox GL JS** renders maps, and **Supabase** supplies auth, database, and serverless Edge Functions.  Error monitoring is optional through **Sentry** and the app is PWA-ready via **vite-plugin-pwa**.  Continuous deployment targets **Vercel**.

```
┌ tech-stack ────────────────────────────────────────────────┐
│ React · TypeScript · Vite · TailwindCSS                   │
│ Mapbox GL JS · Supabase (Auth, DB, Edge Functions)        │
│ idb-keyval · Sentry · PWA (vite-plugin-pwa)               │
└────────────────────────────────────────────────────────────┘
```

---

## Repository Layout

```
.
├─ src/
│  ├─ api/            # Supabase Edge Function wrappers
│  ├─ components/     # Reusable UI building blocks
│  ├─ contexts/       # React context providers (Auth)
│  ├─ lib/            # Generic helpers (storage, supabase client)
│  ├─ pages/          # Route-level pages (Admin dashboard)
│  ├─ schemas/        # Zod validation schemas
│  ├─ types/          # Shared TS interfaces & enums
│  ├─ App.tsx         # Main application shell + router
│  └─ main.tsx        # Vite entrypoint
├─ supabase/          # Edge Function source & migrations (TBD)
├─ tailwind.config.ts # Tailwind theme extensions
├─ vite.config.ts     # Build / PWA configuration
├─ vercel.json        # Vercel rewrites
└─ .github/workflows/ # CI pipeline
```

### Notable Front-End Modules
| Path | Responsibility |
|------|----------------|
| `components/TripPlanningForm.tsx` | Collects location, date, species, etc. Uses **react-hook-form** + **Zod**; calls `planTrip()` on submit. |
| `components/MapView.tsx` | Mapbox wrapper that plots itinerary waypoints and auto-fits bounds. |
| `components/ChatGuide.tsx` | Streaming chat UI that posts to `chat_guide` Edge Function and renders incremental SSE chunks. |
| `contexts/AuthContext.tsx` | Provides `session`, `signInWithEmail`, `signOut` app-wide (Supabase magic-link). |
| `api/planTrip.ts` | Invokes `supabase.functions.invoke('plan_trip')` and returns the itinerary. |
| `lib/storage.ts` | Persists trip plans in IndexedDB (via **idb-keyval**) so users can revisit offline. |
| `pages/AdminPage.tsx` | Role-gated dashboard (`role === 'admin'`). Currently features stubbed token spend & logs. |

### Runtime Flow
1. `main.tsx` bootstraps React under `Sentry.ErrorBoundary`.
2. `App.tsx` sets up React Router with `/` and `/admin` routes.
3. `AppContent` shows `<Login>` until `useAuth()` returns a session.
4. Authenticated users access `<TripPlanningForm>`.
5. On submit, `planTrip()` hits the `plan_trip` Edge Function.
6. Response is cached with `saveTrip()` and visualised via `<MapView>`.
7. Users chat through `<ChatGuide>` which streams replies from `chat_guide` Edge Function.

---

## Supabase Back-End Integration
| Concern | Current Behaviour | TODO |
|---------|-------------------|------|
| Auth | Email magic-link works. | Add OAuth, enforce RLS. |
| Edge Functions | `plan_trip` / `chat_guide` are invoked but source code is **missing**. | Implement TypeScript Edge Functions that call OpenAI, store plans, and stream completions. |
| Database | Admin dashboard uses hard-coded data. | Create tables `trip_plans`, `token_usage`, `edge_logs`; query them in UI. |
| Storage | IndexedDB only. | Optional Supabase Storage sync for cross-device history. |

---

## CI / CD
`.github/workflows/deploy.yml` performs:
1. Build front-end with `npm ci && npm run build` and deploys to Vercel.
2. Deploys Edge Functions via Supabase CLI (`supabase functions deploy plan_trip chat_guide`).

Required GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.

---

## Environment Variables
| Name | Purpose |
|------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key |
| `VITE_MAPBOX_TOKEN` | Mapbox access token |
| `VITE_FUNCTIONS_URL` | Direct Edge Function base URL (optional) |
| `VITE_SENTRY_DSN` | Sentry DSN (optional) |

> Note: Vite only exposes variables prefixed with `VITE_`.

---

## Current Status Matrix
| Area | Status | Needs Work |
|------|--------|-----------|
| Trip Planner UI | ✅ Ready | Species search, multi-step wizard |
| Map Rendering | ✅ Ready | Polylines, offline tiles |
| Chat Guide | ⚠️ UI ready | Backend `chat_guide` implementation; typing indicator |
| Edge Functions | ❌ | OpenAI logic, DB writes, tests |
| Database Schema | ⚠️ | Migrations & RLS |
| Admin Dashboard | 🟡 | Replace stubs with live SQL; dashboards |
| Auth | ✅ | Add OAuth, session refresh handling |
| PWA / Offline | 🟡 | Background sync, update prompt UX |
| Testing | 🚫 | Add unit/integration/e2e tests |
| Observability | 🟡 | Sentry perf spans, Supabase logs |
| CI Enhancements | 🟡 | Lint, type-check, test stages |

Legend: ✅ done, 🟡 partial, ⚠️ blocked, ❌ not started, 🚫 none

---

## Local Development
1. `npm install`
2. Copy `.env.example` ➜ `.env` and fill variables.
3. `npm run dev` — starts Vite at `localhost:5173`.
4. *(Optional)* `supabase start` to run local Postgres & Edge Runtime.

---

## Contribution Guidelines
• Use **Conventional Commits** (`feat:`, `fix:`, `docs:` …).  
• Ensure ESLint/Prettier pass (config coming).  
• Keep test coverage ≥ 80 %.  
• Open a draft PR early.

Happy fishing 🎣