import React from 'react'
import type { TripItinerary } from '../types/trip'

interface ItineraryDetailsProps {
  itinerary: TripItinerary
}

export function ItineraryDetails({ itinerary }: ItineraryDetailsProps) {
  if (!itinerary) return null

  const { pointsOfInterest, waypoints, weather, regulations, tips, tides, moonPhase, gear, checklist, decisionTree, summary } = itinerary

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
      {/* Trip Summary – placed first */}
      {summary && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Trip Summary</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-700 whitespace-pre-line">{summary}</p>
          </div>
        </section>
      )}

      {/* Points of Interest / Waypoints */}
      {(pointsOfInterest && pointsOfInterest.length > 0) || (waypoints && waypoints.length > 0) ? (
        <section>
          <h2 className="text-2xl font-bold mb-6">Points of Interest</h2>
          <ol className="relative border-l border-accent">
            {(pointsOfInterest ?? waypoints ?? []).map((wp, idx) => (
              <li key={wp.id || idx} className="mb-10 ml-6">
                <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-xs font-medium ring-8 ring-white">
                  {idx + 1}
                </span>
                <div className="bg-white rounded-lg shadow p-5">
                  <h3 className="text-lg font-semibold text-brand flex items-center gap-2">
                    {wp.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{wp.description}</p>
                  {wp.techniques?.length > 0 && (
                    <p className="text-sm mt-3"><span className="font-medium">Techniques:</span> {wp.techniques.join(', ')}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Decision Tree */}
      {decisionTree && decisionTree.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Decision Guide</h2>
          <ul className="space-y-3">
            {decisionTree.map((step, idx) => (
              <li key={idx} className="bg-white rounded-lg shadow p-4 text-sm text-gray-700">
                <p><span className="font-medium">{step.condition}</span>, then {step.action}</p>
              </li>
            ))}
          </ul>
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

      {/* Tides & Moon Phase */}
      {(tides || moonPhase) && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Tides & Moon</h2>
          {tides && (
            <p className="text-sm mb-2 text-gray-700">
              Next High: {tides.nextHigh} • Next Low: {tides.nextLow}
            </p>
          )}
          {moonPhase && (
            <p className="text-sm text-gray-700">Moon Phase: {moonPhase}</p>
          )}
        </section>
      )}

      {/* Gear Recommendations */}
      {(gear && gear.length > 0) || (checklist && checklist.length > 0) ? (
        <section>
          <h2 className="text-2xl font-bold mb-6">Gear & Checklist</h2>
          {gear && gear.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Recommended Gear</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {gear.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {checklist && checklist.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Pre-Trip Checklist</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
} 