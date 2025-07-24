# CharterAI - AI-Powered Fishing Trip Planner

## 🎣 Overview

CharterAI is a comprehensive AI-powered web application that helps fishing enthusiasts plan personalized fishing trips. Users input their preferences and receive detailed, intelligent itineraries with real-time data integration, interactive maps, and AI-powered guidance. The platform combines advanced weather forecasting, tide data, water conditions, and AI expertise to create actionable trip plans.

## 🚀 Key Features

### 🎯 Intelligent Trip Planning
- **Time-Based Scheduling**: Precise start/end time planning instead of generic duration presets
- **Advanced Filtering**: 38+ fish species, multiple fishing styles (fly, spin, cast), platform selection (shore/boat)
- **Multi-Day Support**: Plan trips spanning 2-14 days with comprehensive itineraries
- **Experience-Tailored**: Beginner, intermediate, and expert-specific recommendations

### 🗺️ Interactive Mapping
- **Mapbox Integration**: Professional outdoor-style maps optimized for fishing
- **Location Picker**: Click-to-select locations with reverse geocoding
- **Points of Interest**: Strategic fishing spots with coordinates and techniques
- **Pin Summarizer**: AI-powered location analysis for any map coordinate

### 🌊 Real-Time Data Integration
- **NOAA Weather**: Live weather forecasts and conditions
- **USGS Water Data**: Current water levels and flow rates
- **Tide Predictions**: High/low tide times and extremes
- **Moon Phase**: Calculated lunar phases for optimal fishing times

### 🤖 AI-Powered Intelligence
- **Decision Trees**: Dynamic if/then guidance that adapts to changing conditions
- **Gear Recommendations**: Tailored equipment lists with specific lure and tackle suggestions
- **Smart Checklists**: Experience-appropriate preparation lists
- **RAG Knowledge Base**: Fishing expertise retrieval and application

### 💬 Interactive AI Guide
- **Streaming Chat**: Real-time AI assistant for trip-related questions
- **Context-Aware**: Understands your specific trip plan and conditions
- **Persistent History**: Conversation continuity across sessions

### 🔄 Advanced Trip Management
- **Trip History**: Save and access all previous trip plans
- **Rescheduling**: Intelligent trip rescheduling with preserved preferences
- **Public Sharing**: Share trip plans with shareable links
- **Offline Storage**: IndexedDB persistence for offline access

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for fast builds and hot module replacement
- **Tailwind CSS** for responsive, modern styling
- **React Router Dom** for client-side navigation
- **React Hook Form + Zod** for robust form validation
- **Mapbox GL JS** for professional mapping capabilities
- **Sentry** for error monitoring and performance tracking

### Backend & Infrastructure  
- **Supabase** as Backend-as-a-Service (PostgreSQL, Auth, Edge Functions)
- **Deno Runtime** for serverless Edge Functions
- **OpenAI GPT-4o** for intelligent itinerary generation
- **Stripe** for subscription and billing management
- **Vercel** for frontend hosting and deployment

### Data & APIs
- **NOAA Weather Service** for meteorological data
- **USGS Water Services** for hydrological conditions  
- **WorldTides API** for tide predictions
- **Nominatim/OpenStreetMap** for geocoding and reverse geocoding

### State & Storage
- **React Context** for authentication state
- **IndexedDB** (via idb-keyval) for client-side persistence
- **Supabase Auth** with magic link authentication
- **Row Level Security (RLS)** for data protection

## 📁 Project Architecture

```
CharterWeb/
├── src/
│   ├── api/                    # API integrations
│   │   ├── planTrip.ts        # Core trip planning
│   │   ├── subscription.ts    # Billing & usage
│   │   ├── trips.ts          # Trip management  
│   │   └── profile.ts        # User profiles
│   │
│   ├── components/            # React components
│   │   ├── TripPlanningForm.tsx    # Enhanced form with time fields
│   │   ├── TripPlanningWizard.tsx  # Multi-step planning flow
│   │   ├── LocationPicker.tsx      # Map-based location selection
│   │   ├── ItineraryDetails.tsx    # Rich itinerary display
│   │   ├── MapView.tsx            # Interactive Mapbox maps
│   │   ├── ChatGuide.tsx          # Streaming AI chat
│   │   ├── Header.tsx             # Navigation with auth
│   │   ├── Login.tsx              # Magic link authentication
│   │   ├── PricingModal.tsx       # Subscription management
│   │   └── BackToTop.tsx          # UX enhancement
│   │
│   ├── pages/                 # Application pages
│   │   ├── AdminPage.tsx      # Usage analytics & monitoring
│   │   ├── TripHistory.tsx    # Trip management dashboard
│   │   ├── SharedTrip.tsx     # Public trip sharing
│   │   └── ProfilePage.tsx    # User profile management
│   │
│   ├── contexts/              # State management
│   │   └── AuthContext.tsx    # Authentication state
│   │
│   ├── lib/                   # Utilities
│   │   ├── supabaseClient.ts  # Database client
│   │   ├── storage.ts         # IndexedDB operations
│   │   ├── stripe.ts          # Payment processing
│   │   └── security.ts        # Security utilities
│   │
│   ├── schemas/               # Data validation
│   │   └── trip.ts           # Zod schemas & validation
│   │
│   └── types/                 # TypeScript definitions
│       └── trip.ts           # Interface definitions
│
├── supabase/
│   ├── functions/             # Edge Functions
│   │   ├── plan_trip/         # Core trip generation
│   │   ├── chat_guide/        # AI chat assistant  
│   │   ├── reschedule/        # Trip rescheduling
│   │   ├── summarize_pin/     # Location analysis
│   │   ├── create-checkout-session/  # Stripe integration
│   │   ├── create-customer-portal/   # Billing management
│   │   └── stripe-webhook/           # Payment webhooks
│   │
│   └── sql/                   # Database schema & migrations
│
├── package.json               # Dependencies & scripts
├── tailwind.config.ts         # Styling configuration
├── vite.config.ts            # Build configuration
└── vercel.json               # Deployment settings
```

## 🔧 Core Components

### TripPlanningForm
**Enhanced Planning Interface**
- Time-window planning (startTime/endTime) with validation
- 38+ fish species selection with search functionality
- Fishing style multi-select (fly, spin, cast)
- Platform selection (shore, boat) with conditional logic
- Multi-day trip support with day count validation
- Map-based location picker integration

**Current Form Schema:**
```typescript
{
  location: string;          // Manual or map-selected (≤200 chars)
  date: string;             // YYYY-MM-DD format (today or future)
  startTime: string;        // HH:MM format (default: 06:00)
  endTime: string;          // HH:MM format (must be after startTime)
  targetSpecies: string[];  // 1-5 species from expanded list
  styles: string[];         // ≥1 from ['fly', 'spin', 'cast']
  platform: string;        // 'shore' | 'boat'
  experience: string;       // 'beginner' | 'intermediate' | 'expert'
  numDays?: number;         // 2-14 days for multi-day trips
}
```

### ItineraryDetails
**Comprehensive Trip Display**
- **Summary**: 3-4 sentence trip overview generated by AI
- **Points of Interest**: Strategic fishing locations with coordinates and techniques
- **Decision Tree**: Conditional guidance based on real-time factors
- **Weather & Water**: Integrated NOAA and USGS data
- **Tide Information**: High/low times with extremes
- **Moon Phase**: Current lunar phase for fishing optimization
- **Gear Recommendations**: Tailored equipment lists with specifics
- **Checklist**: Experience-appropriate preparation items
- **Expert Tips**: AI-generated fishing insights

### MapView  
**Interactive Fishing Maps**
- Mapbox outdoor-style optimized for fishing environments
- Custom markers for points of interest with popups
- Click-to-summarize functionality using AI analysis
- Auto-fitting bounds to show all fishing locations
- Navigation controls for zoom and pan

### ChatGuide
**AI-Powered Trip Assistant**
- Streaming GPT-4o responses for real-time interaction
- Context-aware of specific trip plans and conditions
- Persistent conversation history across sessions
- Auto-scrolling interface with loading states
- Integration with trip-specific knowledge base

## 🌐 Backend Architecture

### Supabase Edge Functions

#### plan_trip Function
**Core Trip Generation Engine**
- **Input Validation**: Comprehensive validation and sanitization
- **Rate Limiting**: 10 generations per hour per user
- **Data Integration**: Parallel fetching of weather, water, and tide data
- **AI Generation**: GPT-4o powered itinerary creation with structured output
- **Database Persistence**: Trip storage with preferences for rescheduling
- **Usage Tracking**: Token usage monitoring for billing

**Enhanced Output Schema:**
```typescript
{
  plan_id: string;
  itinerary: {
    summary: string;
    pointsOfInterest: Array<{
      id: string;
      name: string;
      coordinates: [number, number];
      description: string;
      techniques: string[];
    }>;
    decisionTree: Array<{
      condition: string;
      action: string;
    }>;
    weather: WeatherInfo;
    water: WaterInfo;
    tides: { nextHigh: string; nextLow: string };
    moonPhase: string;
    gear: string[];
    checklist: string[];
    tips: string[];
  };
  generated_at: string;
}
```

#### chat_guide Function
**AI Chat Assistant**
- Streaming response capability using Server-Sent Events
- Trip context awareness with message persistence
- Content filtering and safety measures
- Conversation history management

#### reschedule Function
**Intelligent Trip Rescheduling**
- Retrieves original trip preferences from database
- Accepts new date parameter or defaults to current date
- Invokes plan_trip with updated parameters
- Maintains trip history and generates new plan ID

#### summarize_pin Function
**Location Intelligence**
- Accepts latitude/longitude coordinates
- Generates AI-powered fishing condition summaries
- Provides species and technique recommendations
- Includes safety considerations for offshore locations

#### Stripe Integration Functions
- **create-checkout-session**: Subscription plan purchases
- **create-customer-portal**: Billing management interface
- **stripe-webhook**: Payment event processing

## 💳 Subscription System

### Pricing Tiers
- **Free Tier**: Limited trip generations with basic features
- **Pro Tier**: Unlimited generations with premium features
- **Usage Tracking**: Token consumption monitoring
- **Billing Management**: Self-service portal via Stripe

### Admin Dashboard
- **Usage Analytics**: Token consumption by date and user
- **Error Monitoring**: Edge function error logs with stack traces
- **User Management**: Admin-only user list with roles and metadata
- **Performance Metrics**: System health and usage patterns

## 🗄️ Database Schema

### Core Tables
- **trips**: Trip plans with itineraries and preferences
- **chat_messages**: Conversation history for AI guide
- **token_usage**: API consumption tracking for billing
- **error_logs**: System error monitoring
- **admin_user_list**: User management view (admin-only)

### Security
- **Row Level Security (RLS)**: Fine-grained access control
- **JWT Authentication**: Secure session management
- **Role-based Access**: Admin, user, and public permissions
- **Data Encryption**: All sensitive data encrypted at rest

## 📊 Current Status

### ✅ Production-Ready Features
- [x] **Complete Trip Planning Flow** - Form, validation, generation, display
- [x] **Real-Time Data Integration** - Weather, water, tides, moon phases
- [x] **Interactive Mapping** - Mapbox integration with location picker
- [x] **AI Chat Assistant** - Streaming responses with trip context
- [x] **Trip Management** - History, sharing, rescheduling
- [x] **Subscription System** - Stripe integration with usage tracking
- [x] **Admin Dashboard** - Analytics, monitoring, user management
- [x] **Mobile Responsive** - Optimized for all device sizes
- [x] **Security** - RLS, authentication, input validation
- [x] **Performance** - Optimized builds, caching, error handling

### 🔄 Active Development
- [ ] **Enhanced Testing Suite** - Unit, integration, and E2E tests
- [ ] **Advanced PWA Features** - Offline capabilities, background sync
- [ ] **Performance Optimization** - Bundle size reduction, lazy loading
- [ ] **Accessibility Improvements** - WCAG 2.1 AA compliance
- [ ] **Enhanced Analytics** - User behavior tracking, conversion metrics

### 🎯 Future Roadmap
- [ ] **Mobile Application** - React Native or Expo implementation
- [ ] **Social Features** - Community sharing, trip reports, leaderboards
- [ ] **Advanced AI Features** - Image recognition, voice commands
- [ ] **Integration Expansion** - Additional weather sources, fishing apps
- [ ] **Localization** - Multi-language support
- [ ] **Enterprise Features** - Team management, bulk operations

## 📈 Performance Targets
- **Bundle Size**: ≤250 kB gzipped
- **Lighthouse Score**: Performance ≥90, Accessibility ≥95
- **API Response Time**: ≤3 seconds for trip generation
- **Mobile Performance**: ≥85 on slower devices

**CharterAI** - Transforming fishing trip planning through intelligent AI and real-time data integration.
