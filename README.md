# CharterAI – Fishing Trip Planner

## 1. Project Vision
CharterAI helps anglers of all skill levels plan memorable fishing trips.  
Given a location, date, target species and a few preferences, the app combines real-time data (NOAA, USGS, local regulations), generative AI and map visualisation to output a day-by-day itinerary, safety tips and tackle recommendations.  

## 2. High-Level Architecture
```
┌──────────────────────────┐          ┌──────────────────────────────┐
│        Front-End         │  HTTPS   │           Back-End           │
│  • React + Vite (PWA)    │◀────────▶│  • Supabase Edge Functions   │
│  • TailwindCSS UI        │          │  • Postgres (Supabase DB)    │
│  • Mapbox GL JS maps     │          │  • OpenAI (via Edge FN)      │
└──────────────────────────┘          └──────────────────────────────┘
```
• **Frontend** is deployed to Vercel, served as a Progressive Web App (offline-enabled).  
• **Supabase** provides authentication, Postgres storage and serverless **Edge Functions** written in TypeScript (Deno).  
• **OpenAI** is called from `plan_trip` / `chat_guide` Edge Functions to generate itineraries and Q&A responses.  
• **Sentry** captures runtime errors and performance traces.

## 3. Tech-Stack Cheat-Sheet
| Layer | Technology | Why | Key Files |
|-------|------------|-----|-----------|
| UI | React 18 + TypeScript | Familiar, strongly-typed | `src/` |
| Styling | TailwindCSS 3 | Utility-first, fast prototyping | `tailwind.config.ts`, `src/index.css` |
| Build | Vite 5 | Instant dev server, PWA plugin | `vite.config.ts` |
| Maps | Mapbox GL JS | Outdoor-optimised tiles & vector data | `src/components/MapView.tsx` |
| Form Validation | zod + react-hook-form | Type-safe validation schema | `src/schemas/trip.ts`, `TripPlanningForm` |
| Auth / Data | Supabase | Magic-link auth, Postgres, Edge FN | `src/lib/supabaseClient.ts`, `contexts/AuthContext.tsx` |
| Storage (offline) | IndexedDB via idb-keyval | Cache trips locally | `src/lib/storage.ts` |
| Error Monitoring | Sentry | Prod diagnostics | `src/sentry.ts` |
| CI/CD | GitHub Actions → Vercel & Supabase | Zero-downtime deploys | `.github/workflows/deploy.yml` |

## 4. Repository Tour
```
.
├── src/               # React client
│   ├── api/           # Thin wrappers around Supabase Edge Functions
│   │   └── planTrip.ts
│   ├── components/    # UI atoms & molecules (Tailwind)
│   │   ├── TripPlanningForm.tsx   # Multi-step form with zod validation
│   │   ├── MapView.tsx            # Mapbox visualiser for itinerary way-points
│   │   ├── ChatGuide.tsx          # Streaming chat UI powered by SSE
│   │   ├── Header.tsx, Login.tsx  # Misc.
│   ├── contexts/      # React Context providers
│   │   └── AuthContext.tsx        # Wraps Supabase auth client
│   ├── pages/         # Route-level components (via react-router)
│   │   └── AdminPage.tsx          # Usage analytics (stub)
│   ├── lib/           # Shared helpers – storage, supabase client
│   ├── schemas/       # zod validation & shared types
│   └── App.tsx        # Top-level router & feature composition
├── supabase/
│   └── functions/     # Deno Edge Functions (serverless)
│       ├── plan_trip/ index.ts    # Generates (mock) itinerary
│       └── chat_guide/            # TODO – interactive Q&A
├── tailwind.config.ts # Design-system tokens
└── vite.config.ts     # Build & PWA configuration
```

## 5. Key Front-End Flows
1. **Authentication** – `Login.tsx` calls `supabase.auth.signInWithOtp`.  Session state is provided globally by `AuthContext`.  
2. **Trip Planning** – Once signed-in, `App` renders `TripPlanningForm`.  On submit:  
   a. Front-end invokes `plan_trip` Edge Function (`src/api/planTrip.ts`).  
   b. Stub function currently returns a hard-coded itinerary & metadata.  
   c. Response is cached locally via `idb-keyval` (`saveTrip`).
3. **Visualisation** – `MapView` places Mapbox markers for each waypoint and auto-fits bounds.  
4. **Guided Chat** – `ChatGuide` streams Server-Sent Events (SSE) from the **not-yet-implemented** `chat_guide` function, allowing users to ask follow-up questions about their itinerary.  
5. **Admin** – `/admin` route (role-gated) displays token usage & logs.  Data is stubbed until proper DB tables are wired-up.

## 6. Supabase Edge Functions
### 6.1 `plan_trip`
Located at `supabase/functions/plan_trip/index.ts`.
• Validates incoming payload `{ location, date, targetSpecies, duration, experience }`.  
• TODO: Fetch live environmental data → feed into OpenAI prompt.  
• Currently returns a single launch waypoint, weather/regulation placeholders and a `plan_id`.

### 6.2 `chat_guide` (🚧 pending)
To be created in `supabase/functions/chat_guide/` and wired to `/chat_guide` route.  The function will:
1. Accept `{ plan_id, messages[] }` (OpenAI-style chat format).  
2. Retrieve plan context from Postgres / former `plan_trip` call.  
3. Stream OpenAI chat completions using SSE (EventSource‐Parser on client-side).

## 7. Environment Variables
All secrets are injected via **Vercel/Netlify env UI** or local `.env`:
```
VITE_SUPABASE_URL=<project>.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
VITE_FUNCTIONS_URL=https://<project>.functions.supabase.co
VITE_MAPBOX_TOKEN=pk.XXXXXXXXXXXXXXXX
VITE_SENTRY_DSN=https://<dsn>@o0.ingest.sentry.io/0
OPENAI_API_KEY=sk-live-serverless (Edge Function secret)
```
Make sure the same variables (minus the `VITE_` prefix) are configured in Supabase function settings when needed.

## 8. Local Development
```bash
# 1. Install deps
npm ci

# 2. Start Vite dev server (frontend)
npm run dev  # http://localhost:5173

# 3. Start Supabase local stack (requires supabase CLI)
supabase start                                # DB + auth
supabase functions serve plan_trip --no-verify-jwt
# (chat_guide once implemented)
```
The dev server proxies to the local Edge Function at `http://localhost:54321/functions/v1/plan_trip`.

## 9. Deployment Pipeline
Git pushes to `main` trigger **GitHub Actions**:
1. Build React app → Deploy to Vercel (`amondnet/vercel-action`).  
2. On success, Supabase CLI deploys Edge Functions (`plan_trip`, `chat_guide`).

## 10. Current Status & Roadmap
| Area | Status | Next Steps |
|------|--------|-----------|
| React UI / Tailwind | ✅ MVP screens complete | Polish responsive styles, accessibility pass |
| Auth (Supabase) | ✅ Magic-link works | Enable OAuth providers (Google, Apple) |
| Trip Planning Edge Function | 🟡 Returns mock data | Integrate NOAA/USGS APIs, RAG pipeline, OpenAI prompt engineering |
| Chat Guide Edge Function | 🔴 Not started | Build `chat_guide`, add vector search to provide citations |
| Local storage | ✅ Trip caching in IndexedDB | Add quota checks & cleanup routine |
| Admin Dashboard | 🟡 UI stub | Hook to Postgres tables for token usage & logs |
| PWA / Offline | ✅ Service Worker caching | Add offline form queueing, push notifications |
| CI/CD | ✅ Vercel + Supabase deploys | Add unit tests & lint step |
| Documentation | 🟡 This README added | Add file-level JSDoc, architecture diagrams |
| Testing | 🔴 None | Add Vitest & React Testing Library |

Legend: ✅ Complete 🟡 Partial 🔴 Todo

---
### Contributing
1. Create a feature branch: `git checkout -b feat/my-feature`.  
2. Follow ESLint/Tailwind conventions; run `npm run format` (optional).  
3. Open a PR against `main`, fill the PR template.

Welcome aboard – happy coding and tight lines! 🎣