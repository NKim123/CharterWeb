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
    <div className="space-y-12 animate-fade-in">
      {/* Trip Summary – placed first */}
      {summary && (
        <section>
          <h2 className="text-3xl font-bold mb-6 text-brand-900 flex items-center gap-2">
            🎣 Trip Summary
          </h2>
          <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-xl shadow-soft border border-gray-100 p-8">
            <p className="text-base text-gray-700 whitespace-pre-line leading-relaxed">{summary}</p>
          </div>
        </section>
      )}

      {/* Points of Interest / Waypoints */}
      {(pointsOfInterest && pointsOfInterest.length > 0) || (waypoints && waypoints.length > 0) ? (
        <section>
          <h2 className="text-3xl font-bold mb-6 text-brand-900 flex items-center gap-2">
            📍 Points of Interest
          </h2>
          <ol className="relative border-l-2 border-accent-300">
            {(pointsOfInterest ?? waypoints ?? []).map((wp, idx) => (
              <li key={wp.id || idx} className="mb-10 ml-8">
                <span className="absolute -left-4 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-bold ring-4 ring-white shadow-soft">
                  {idx + 1}
                </span>
                <div className="bg-gradient-to-br from-white to-gray-50/30 rounded-xl shadow-soft border border-gray-100 p-6">
                  <h3 className="text-xl font-bold text-brand-800 flex items-center gap-2 mb-2">
                    {wp.name}
                  </h3>
                  <p className="text-base text-gray-700 mt-2 leading-relaxed">{wp.description}</p>
                  {wp.techniques?.length > 0 && (
                    <div className="mt-4">
                      <span className="text-sm font-semibold text-gray-800 mb-2 block">🎣 Techniques:</span>
                      <div className="flex flex-wrap gap-2">
                        {wp.techniques.map((technique, techIdx) => (
                          <span key={techIdx} className="px-3 py-1 bg-accent-100 text-accent-800 text-sm font-medium rounded-full border border-accent-200">
                            {technique}
                          </span>
                        ))}
                      </div>
                    </div>
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
          <h2 className="text-3xl font-bold mb-6 text-brand-900 flex items-center gap-2">
            🧠 Decision Guide
          </h2>
          <ul className="space-y-3">
            {decisionTree.map((step, idx) => (
              <li key={idx} className="bg-gradient-to-br from-white to-gray-50/30 rounded-xl shadow-soft border border-gray-100 p-5">
                <p className="text-base text-gray-700 leading-relaxed">
                  <span className="font-semibold text-gray-800">{step.condition}</span>, then <span className="font-medium text-accent-700">{step.action}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Weather Summary */}
      {weatherSummary && (
        <section>
          <h2 className="text-3xl font-bold mb-6 text-brand-900 flex items-center gap-2">
            ☁️ Weather Summary
          </h2>
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-soft border border-blue-100 p-8">
            <p className="text-base text-gray-700 whitespace-pre-line leading-relaxed">{weatherSummary}</p>
          </div>
        </section>
      )}

      {/* Regulations */}
      {regulations && (
        <section>
          <h2 className="text-3xl font-bold mb-6 text-brand-900 flex items-center gap-2">
            ⚖️ Regulations
          </h2>
          <div className="bg-gradient-to-br from-red-50 to-white rounded-xl shadow-soft border border-red-100 p-8 space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-800">License Required:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                regulations.licenseRequired 
                  ? 'bg-red-100 text-red-800 border border-red-200' 
                  : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
                {regulations.licenseRequired ? 'Yes' : 'No'}
              </span>
            </div>
            {regulations.catchLimits && Object.keys(regulations.catchLimits).length > 0 && (
              <div>
                <p className="text-base font-semibold text-gray-800 mb-3">🎣 Catch Limits:</p>
                <ul className="space-y-2">
                  {Object.entries(regulations.catchLimits).map(([species, limit]) => (
                    <li key={species} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="font-medium text-gray-700">{species}</span>
                      <span className="px-2 py-1 bg-accent-100 text-accent-800 text-sm font-medium rounded">{limit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {regulations.sizeLimits && Object.keys(regulations.sizeLimits).length > 0 && (
              <div>
                <p className="text-base font-semibold text-gray-800 mb-3">📏 Size Limits:</p>
                <ul className="space-y-2">
                  {Object.entries(regulations.sizeLimits).map(([species, range]) => (
                    <li key={species} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="font-medium text-gray-700">{species}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">{range.min} - {range.max} in</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {regulations.closedAreas && regulations.closedAreas.length > 0 && (
              <div>
                <p className="text-base font-semibold text-gray-800 mb-3">⛔ Closed Areas:</p>
                <ul className="space-y-2">
                  {regulations.closedAreas.map((area) => (
                    <li key={area} className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 font-medium">{area}</li>
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
          <h2 className="text-3xl font-bold mb-6 text-brand-900 flex items-center gap-2">
            💡 Pro Tips
          </h2>
          <ul className="grid sm:grid-cols-2 gap-6">
            {tips.map((tip, idx) => (
              <li key={idx} className="bg-gradient-to-br from-yellow-50 to-white rounded-xl shadow-soft border border-yellow-200 p-6">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-500 text-lg flex-shrink-0">✨</span>
                  <p className="text-base text-gray-700 leading-relaxed">{tip}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tides & Moon Phase */}
      {(tides || moonPhase) && (
        <section>
          <h2 className="text-3xl font-bold mb-6 text-brand-900 flex items-center gap-2">
            🌊 Tides & Moon
          </h2>
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-soft border border-blue-200 p-6">
            {tides && (
              <div className="mb-4">
                <p className="text-base text-gray-700 mb-2">
                  <span className="font-semibold text-blue-700">🔴 Next High:</span> {tides.nextHigh} • 
                  <span className="font-semibold text-blue-700">🔵 Next Low:</span> {tides.nextLow}
                </p>
              </div>
            )}
            {moonPhase && (
              <p className="text-base text-gray-700">
                <span className="font-semibold text-purple-700">🌙 Moon Phase:</span> {moonPhase}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Gear Recommendations */}
      {(gear && gear.length > 0) || (checklist && checklist.length > 0) ? (
        <section>
          <h2 className="text-3xl font-bold mb-6 text-brand-900 flex items-center gap-2">
            🎣 Gear & Checklist
          </h2>
          {gear && gear.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                ⚙️ Recommended Gear
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {gear.map((g, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-white rounded-lg shadow-soft border border-green-200">
                    <span className="text-green-500 text-lg">✓</span>
                    <span className="text-base text-gray-700 font-medium">{g}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {checklist && checklist.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                ✅ Pre-Trip Checklist
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {checklist.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg shadow-soft border border-orange-200">
                    <input type="checkbox" className="w-5 h-5 text-accent-500 rounded border-gray-300 focus:ring-accent-400" />
                    <span className="text-base text-gray-700">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
} 