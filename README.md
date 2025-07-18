# CharterAI - AI-Powered Fishing Trip Planner

## 🎣 Overview

CharterAI is a modern web application that helps fishing enthusiasts plan personalized fishing trips using AI. Users can input their preferences (location, date, target species, experience level) and receive detailed trip itineraries with map visualizations and an AI-powered chat guide for questions.

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks and functional components
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **React Router Dom** - Client-side routing for navigation
- **Tailwind CSS** - Utility-first CSS framework for styling
- **React Hook Form + Zod** - Form handling and validation
- **Mapbox GL** - Interactive maps for visualizing fishing locations

### Backend & Infrastructure
- **Supabase** - Backend-as-a-Service (Database, Auth, Edge Functions)
- **Supabase Edge Functions** - Serverless functions running on Deno
- **PostgreSQL** - Database (via Supabase)
- **Vercel** - Frontend deployment and hosting

### State Management & Storage
- **React Context** - Authentication state management
- **IndexedDB** (via idb-keyval) - Client-side trip data persistence
- **Supabase Auth** - User authentication with magic links

### Development Tools
- **Sentry** - Error monitoring and performance tracking
- **PWA (Progressive Web App)** - Offline capabilities and app-like experience
- **GitHub Actions** - CI/CD pipeline for automated deployment

## 📁 Project Structure

```
src/
├── api/                    # Backend API integrations
│   └── planTrip.ts        # Trip planning API calls
├── components/            # Reusable UI components
│   ├── ChatGuide.tsx     # AI chat interface
│   ├── Header.tsx        # Navigation header
│   ├── Login.tsx         # Authentication form
│   ├── MapView.tsx       # Interactive map component
│   └── TripPlanningForm.tsx # Main form for trip input
├── contexts/             # React Context providers
│   └── AuthContext.tsx   # Authentication state management
├── lib/                  # Utility libraries
│   ├── storage.ts        # IndexedDB operations
│   └── supabaseClient.ts # Supabase configuration
├── pages/                # Main application pages
│   └── AdminPage.tsx     # Admin dashboard
├── schemas/              # Data validation schemas
│   └── trip.ts           # Zod schemas for trip data
├── types/                # TypeScript type definitions
│   └── trip.ts           # Trip-related interfaces
├── App.tsx               # Main application component
└── main.tsx              # Application entry point

supabase/
└── functions/            # Serverless backend functions
    ├── _shared/          # Shared utilities
    │   └── cors.ts       # CORS headers
    └── plan_trip/        # Trip planning logic
        └── index.ts      # Main planning function
```

## 🔧 Component Documentation

### 1. App.tsx - Main Application Entry Point
**Purpose**: Orchestrates the entire application, handles routing, and manages global state.

**Key Features**:
- **Routing**: Uses React Router to handle navigation between main app and admin page
- **Authentication Gate**: Renders login form if user not authenticated
- **Trip Planning Flow**: Manages the complete trip planning workflow
- **State Management**: Handles loading states and trip plan data

**Data Flow**:
1. User submits trip form → `handleSubmit` function
2. Calls `planTrip` API → Supabase Edge Function
3. Receives trip plan → Updates local state
4. Saves to IndexedDB → Displays map and chat interface

### 2. TripPlanningForm.tsx - Trip Input Interface
**Purpose**: Collects user preferences for trip planning with comprehensive form validation.

**Key Features**:
- **Form Validation**: Uses React Hook Form with Zod schema validation
- **Species Selection**: Multi-select checkbox interface for target fish species
- **Dynamic UI**: Real-time validation feedback and loading states
- **Accessibility**: Proper labeling and keyboard navigation

**Form Fields**:
- Location (text input with validation)
- Date (date picker with future date validation)
- Target Species (multi-select with 1-5 species limit)
- Duration (dropdown: half-day, full-day, multi-day)
- Experience Level (dropdown: beginner, intermediate, expert)

**Validation Rules**:
- Location: Required, 1-100 characters
- Date: Required, must be today or future
- Species: 1-5 species required
- All fields have proper error handling

### 3. MapView.tsx - Interactive Map Visualization
**Purpose**: Displays fishing locations and waypoints on an interactive Mapbox map.

**Key Features**:
- **Mapbox Integration**: Uses Mapbox GL for professional mapping
- **Waypoint Markers**: Custom markers for launch, fishing, and landing points
- **Popups**: Click markers to see location details and descriptions
- **Auto-fitting**: Automatically adjusts view to show all waypoints
- **Error Handling**: Graceful fallback for map loading issues

**Technical Details**:
- Initializes with outdoor style for fishing context
- Adds navigation controls for zoom/pan
- Uses cleanup pattern to prevent memory leaks
- Supports StrictMode with proper re-initialization

### 4. ChatGuide.tsx - AI-Powered Trip Assistant
**Purpose**: Provides an interactive chat interface for users to ask questions about their trip.

**Key Features**:
- **Streaming Responses**: Real-time AI responses using Server-Sent Events
- **Message History**: Maintains conversation context
- **Auto-scroll**: Automatically scrolls to show new messages
- **Loading States**: Visual feedback during AI processing

**Technical Implementation**:
- Uses EventSource parser for streaming data
- Implements proper cleanup for stream connections
- Handles connection errors gracefully
- Updates UI incrementally as responses arrive

### 5. AuthContext.tsx - Authentication Management
**Purpose**: Manages user authentication state and provides auth methods throughout the app.

**Key Features**:
- **Magic Link Auth**: Passwordless authentication via email
- **Session Management**: Persistent login state across browser sessions
- **Auto-logout**: Handles session expiration
- **Context Provider**: Makes auth state available globally

**Authentication Flow**:
1. User enters email → `signInWithEmail`
2. Supabase sends magic link → User clicks link
3. Session established → `onAuthStateChange` updates state
4. App renders authenticated content

### 6. AdminPage.tsx - Administrative Dashboard
**Purpose**: Provides administrative oversight with token usage tracking and error monitoring.

**Key Features**:
- **Role-based Access**: Only accessible to users with admin role
- **Token Tracking**: Monitors AI API usage and costs
- **Error Logs**: Displays system errors and edge function issues
- **Data Tables**: Organized display of administrative data

**Current Implementation**:
- Uses stub data (needs real Supabase queries)
- Simple role checking via user metadata
- Basic table layout for data presentation

### 7. Storage Utilities (lib/storage.ts)
**Purpose**: Manages client-side persistence of trip data using IndexedDB.

**Key Features**:
- **Trip Persistence**: Saves trip plans locally for offline access
- **CRUD Operations**: Complete create, read, update, delete functionality
- **Key Management**: Organized storage with consistent naming
- **Async Operations**: Promise-based API for all storage operations

**Storage Schema**:
```typescript
StoredTrip {
  id: string        // Unique trip identifier
  data: unknown     // Complete trip plan data
}
```

## 🌐 Backend Architecture

### Supabase Edge Functions

#### plan_trip Function
**Purpose**: Generates personalized fishing trip itineraries based on user input.

**Current Status**: Fully integrated – calls OpenAI (jsr:@openai/openai), NOAA Weather, USGS Water Services, plus a small RAG knowledge base. Results are persisted to Supabase `trips` table via RLS-aware insert.
**Location**: `supabase/functions/plan_trip/index.ts`

**Input Schema**:
```typescript
{
  location: string
  date: string
  targetSpecies: string[]
  duration: 'half-day' | 'full-day' | 'multi-day'
  experience: 'beginner' | 'intermediate' | 'expert'
}
```

**Output Schema**:
```typescript
{
  plan_id: string
  itinerary: {
    waypoints: Waypoint[]
    weather: WeatherInfo
    regulations: RegulationInfo
    tips: string[]
  }
  generated_at: string
}
```

**Recent Enhancements**:
 - ✅ NOAA weather forecast integration
 - ✅ USGS water-condition integration
 - ✅ OpenAI itinerary generation (GPT-4o)
 - ✅ RAG fishing knowledge snippets
 - ✅ Supabase persistence & RLS policies

#### chat_guide Function
**Purpose**: Provides AI-powered assistance for trip-related questions.

**Current Status**: Referenced in frontend but implementation not visible
**Expected Features**:
- Streaming responses for real-time interaction
- Context awareness of user's trip plan
- Knowledge base about fishing techniques and locations

## 🎨 Styling and UI

### Tailwind CSS Configuration
**Custom Theme**:
- **Brand Colors**: Dark navy (#0a1121) for professional appearance
- **Accent Colors**: Teal (#14B8A6) for interactive elements
- **Typography**: Inter font for modern readability
- **Responsive Design**: Mobile-first approach with breakpoints

**Component Patterns**:
- Consistent spacing using Tailwind's scale
- Form styling with focus states and validation feedback
- Loading states with spinners and disabled states
- Card-based layout for content organization

### PWA Configuration
**Features**:
- **Offline Support**: Service worker caching for maps and trip data
- **App-like Experience**: Standalone display mode
- **Performance Optimization**: Caching strategies for external APIs
- **Background Sync**: Planned for offline trip planning

## 📊 Current Project Status

### ✅ Completed Features

#### Core Functionality
- [x] **User Authentication**: Magic link login with Supabase Auth
- [x] **Trip Planning Form**: Complete form with validation using React Hook Form + Zod
- [x] **Map Visualization**: Interactive Mapbox integration with waypoint markers
- [x] **AI-Powered Trip Generation**: Edge Function returns real itineraries using external data & LLM
- [x] **Client-side Storage**: IndexedDB integration for offline trip access
- [x] **Responsive Design**: Mobile-friendly UI with Tailwind CSS

#### Development Infrastructure
- [x] **TypeScript Setup**: Full type safety across frontend and backend
- [x] **Build System**: Vite configuration with fast development and production builds
- [x] **PWA Support**: Service worker and manifest for app-like experience
- [x] **Error Monitoring**: Sentry integration for production error tracking
- [x] **CI/CD Pipeline**: GitHub Actions for automated deployment

#### UI Components
- [x] **TripPlanningForm**: Complete with species selection and validation
- [x] **MapView**: Professional map interface with custom markers
- [x] **ChatGuide**: Frontend interface for AI chat (streaming support)
- [x] **Header/Navigation**: Role-based navigation with admin access
- [x] **Login**: Smooth authentication experience

### 🚧 Development Backlog (pre-launch)

Below is the implementation-aware backlog leading to an initial-release (v1.0).  Items marked ✅ already exist in the codebase and only need verification / polish, whereas items without a mark are new work.

1. Functional Gaps (blocking)
   - ✅ NOAA weather + water conditions (present)
   - Tide & Moon-phase integration → display in itinerary
   - Gear / equipment recommendations (+ checklist UI)
   - Advanced species list (≥50) & fishing styles (fly/spin/cast), shore/boat toggle
   - Multi-day trip support (numDays input & UI)
   - Trip rescheduling endpoint + button in history
   - Map “drop a pin” summariser (Edge Function + Mapbox click)

2. Data, Security & Backend
   - RLS hardening for all tables (chat_messages, token_usage…)
   - Request rate-limiting in Edge Functions
   - pgvector knowledge-base & similarity search
   - Database migration scripts & CI automation
   - Secrets management in Vercel / GitHub Actions
   - (Optional) Stripe metered billing

3. Quality & Reliability
   - Jest / RTL unit tests for UI components
   - Vitest integration tests for plan_trip & chat_guide
   - Playwright E2E for login → plan trip → share flow
   - Performance budget ≤ 250 kB gzip; lazy-load heavy libs
   - Edge-function Sentry instrumentation
   - Accessibility (WCAG 2.1 AA) pass

4. PWA / Offline
   - Cache itinerary + tiles
   - Background sync queue for offline trip generation
   - Manifest & icon polish

5. UI / UX Polish
   - Responsive tweaks <375 px, iOS keyboard
   - Empty/error illustrations
   - Admin dashboard pagination & realtime logs
   - Avatar upload via Supabase Storage

6. Dev-Experience & Docs
   - Contribution guide & pre-commit hooks
   - Architecture diagram in docs/

7. Nice-to-have Post-launch
   - Community reports / leaderboards
   - Mobile shell with Expo

---

## ✅ Newly Implemented Features (June 2025)
1. Tide & Moon data added to itinerary (WorldTides + algorithmic moon phase)  
2. Gear & checklist generation via GPT prompt + UI section  
3. Expanded species list (50+) and new form inputs for fishing style & platform  
4. Multi-day support (numDays field)  
5. Reschedule Edge Function + TripHistory button  
6. Map pin summariser (summarize_pin) with Mapbox click popup

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Mapbox account
- OpenAI API key (for production)

### Environment Variables
```bash
# Frontend (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_FUNCTIONS_URL=your_supabase_functions_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Backend (Supabase Dashboard)
OPENAI_API_KEY=your_openai_api_key
```

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Deploy Supabase functions
supabase functions deploy plan_trip
```

This documentation provides a complete understanding of the CharterAI application architecture, current implementation status, and roadmap for future development. The codebase is well-structured with a modern tech stack, making it ready for both immediate use and future enhancements.

## 🧪 Testing Methodology

The repo now contains new functional surfaces (tide/moon integration, gear, rescheduling, pin summariser).  Use the following layered approach to test:

1. Unit tests (Vitest/Jest)
   - `plan_trip` helpers: `geocodeLocation`, `fetchTideSummary`, `getMoonPhase` (mock fetch).
   - React components: `TripPlanningForm` (validation of new fields), `ItineraryDetails` renders new sections.

2. Integration tests (Vitest)
   - Call `plan_trip` Edge Function locally with `supabase functions serve` and assert JSON schema includes `tides`, `moonPhase`, `gear`, `checklist`.
   - Invoke `reschedule` for an existing trip and verify new plan returned.

3. E2E tests (Playwright)
   - Login → create trip with multi-day & styles selected → confirm itinerary shows tide/moon & gear.
   - Navigate to Trip History → click “Reschedule” → verify alert + new row.
   - On Shared Trip page drop a pin on the map → expect popup with summary text.

4. Performance & Accessibility
   - Run Lighthouse CI in mobile & desktop modes; ensure performance ≥90, a11y ≥95.
   - Bundle analysis via `vite build --report` stays ≤250 kB gzip.

CI Configuration suggestion:  
- `npm run test` → Jest/Vitest  
- `npm run test:e2e` (Playwright) in GitHub Actions with Supabase local emulator.