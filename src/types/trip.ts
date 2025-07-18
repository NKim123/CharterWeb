export interface TripPlan {
  id: string
  location: string
  date: string
  targetSpecies: string[]
  createdAt: string
  status: 'pending' | 'completed' | 'failed'
  plan?: TripItinerary
}

export interface TripItinerary {
  waypoints: Waypoint[]
  weather: WeatherInfo
  regulations: RegulationInfo
  tips: string[]
  tides?: TideInfo
  moonPhase?: string
  gear?: string[]
  checklist?: string[]
}

export interface Waypoint {
  id: string
  name: string
  coordinates: [number, number]
  type: 'launch' | 'fishing' | 'landing'
  description: string
  bestTime: string
  techniques: string[]
}

export interface WeatherInfo {
  temperature: number
  conditions: string
  windSpeed: number
  windDirection: string
  visibility: number
}

export interface RegulationInfo {
  licenseRequired: boolean
  catchLimits: Record<string, number>
  sizeLimits: Record<string, { min: number; max: number }>
  closedAreas: string[]
}

export interface TideInfo {
  nextHigh: string
  nextLow: string
  extremes?: Array<{ time: string; type: 'High' | 'Low'; height: number }>
} 