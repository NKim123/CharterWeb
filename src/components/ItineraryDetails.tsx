import React from 'react'
import type { TripItinerary } from '../types/trip'

interface ItineraryDetailsProps {
  itinerary: TripItinerary
}

export function ItineraryDetails({ itinerary }: ItineraryDetailsProps) {
  if (!itinerary) return null

  const { waypoints, weather, regulations, tips } = itinerary

  // Create a concise weather summary fallback in case of varied structures
  const weatherSummary = (() => {
    if (!weather) return null
    if (typeof weather === 'string') return weather

    const w: any = weather
    // Direct key probes for common fields
    const direct =
      w.summary ||
      w.detailedForecast ||
      w.shortForecast ||
      w.conditions ||
      w.condition ||
      w.forecast ||
      w.text ||
      w.description ||
      undefined

    if (direct) return direct

    // Nested "details" object common from NOAA response
    const nested =
      w.details?.detailedForecast ||
      w.details?.shortForecast ||
      w.details?.summary ||
      undefined

    if (nested) return nested

    // Fallback: scan object values for first long-ish string
    const scan = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null
      for (const value of Object.values(obj)) {
        if (typeof value === 'string' && value.length > 20) return value
        if (typeof value === 'object') {
          const deep = scan(value)
          if (deep) return deep
        }
      }
      return null
    }

    return scan(w)
  })()

  return (
    <div className="space-y-10">
      {/* Waypoints */}
      {waypoints && waypoints.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Waypoints</h2>
          <ol className="relative border-l border-accent">
            {waypoints.map((wp, idx) => (
              <li key={wp.id} className="mb-10 ml-6">
                <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-xs font-medium ring-8 ring-white">
                  {idx + 1}
                </span>
                <div className="bg-white rounded-lg shadow p-5">
                  <h3 className="text-lg font-semibold text-brand flex items-center gap-2">
                    {wp.name}
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent/10 text-accent capitalize">
                      {wp.type}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{wp.description}</p>
                  <div className="text-sm mt-3 space-y-1">
                    <p><span className="font-medium">Best Time:</span> {wp.bestTime}</p>
                    {wp.techniques?.length > 0 && (
                      <p><span className="font-medium">Techniques:</span> {wp.techniques.join(', ')}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Weather Summary */}
      {weatherSummary && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Weather Summary</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-700 whitespace-pre-line">{weatherSummary}</p>
          </div>
        </section>
      )}

      {/* Regulations */}
      {regulations && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Regulations</h2>
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <p className="text-sm"><span className="font-medium">License Required:</span> {regulations.licenseRequired ? 'Yes' : 'No'}</p>
            {regulations.catchLimits && Object.keys(regulations.catchLimits).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Catch Limits:</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {Object.entries(regulations.catchLimits).map(([species, limit]) => (
                    <li key={species}>{species}: {limit}</li>
                  ))}
                </ul>
              </div>
            )}
            {regulations.sizeLimits && Object.keys(regulations.sizeLimits).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Size Limits:</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {Object.entries(regulations.sizeLimits).map(([species, range]) => (
                    <li key={species}>{species}: {range.min} - {range.max} in</li>
                  ))}
                </ul>
              </div>
            )}
            {regulations.closedAreas && regulations.closedAreas.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Closed Areas:</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {regulations.closedAreas.map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Pro Tips</h2>
          <ul className="grid sm:grid-cols-2 gap-4">
            {tips.map((tip, idx) => (
              <li key={idx} className="bg-white rounded-lg shadow p-4 text-sm text-gray-700">
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
} 