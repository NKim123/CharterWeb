import React, { useEffect, useRef, useState } from 'react'
// @ts-ignore – mapbox-gl types optional
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

interface LocationPickerProps {
  onSelect: (locationName: string) => void
  onClose: () => void
}

export function LocationPicker({ onSelect, onClose }: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  const [marker, setMarker] = useState<mapboxgl.Marker | null>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mapContainer.current) return

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-98.5795, 39.8283], // USA center
      zoom: 3
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl())

    mapRef.current.on('click', async (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat
      if (marker) marker.remove()
      const newMarker = new mapboxgl.Marker({ color: '#f43f5e' }).setLngLat([lng, lat]).addTo(mapRef.current!)
      setMarker(newMarker)
      setLoading(true)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        const json = await res.json()
        setDisplayName(json.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      } catch (_err) {
        setDisplayName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      mapRef.current?.remove()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center px-4 py-2 border-b">
          <h2 className="text-lg font-semibold">Select Fishing Location</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div ref={mapContainer} className="flex-1" />
        <div className="p-4 border-t space-y-2">
          {loading ? <p className="text-sm text-gray-600">Finding location...</p> : displayName && <p className="text-sm">Selected: {displayName}</p>}
          <button
            onClick={() => {
              if (!displayName) return
              onSelect(displayName)
              onClose()
            }}
            disabled={!displayName}
            className="bg-accent text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Use This Location
          </button>
        </div>
      </div>
    </div>
  )
} 