import React, { useEffect, useRef } from 'react'
import mapboxgl, { LngLatLike } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

export interface Waypoint {
  id: string
  name: string
  coordinates: [number, number]
  type: 'launch' | 'fishing' | 'landing'
  description: string
}

interface MapViewProps {
  waypoints: Waypoint[]
  height?: string
}

export function MapView({ waypoints, height = '500px' }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const initialCenter: LngLatLike = waypoints.length
      ? waypoints[0].coordinates as [number, number]
      : [-98.5795, 39.8283] // USA center fallback

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: initialCenter,
      zoom: 5
    })

    mapRef.current.addControl(new mapboxgl.NavigationControl())

    mapRef.current.on('load', () => {
      // Add markers
      waypoints.forEach((wp) => {
        const el = document.createElement('div')
        el.className = 'marker bg-accent rounded-full w-3 h-3 border-2 border-white'
        new mapboxgl.Marker(el).setLngLat(wp.coordinates as [number, number]).setPopup(
          new mapboxgl.Popup({ offset: 24 }).setHTML(
            `<h3 class="font-semibold">${wp.name}</h3><p class="text-sm">${wp.description}</p>`
          )
        ).addTo(mapRef.current as mapboxgl.Map)
      })

      // Fit bounds if multiple waypoints
      if (waypoints.length > 1) {
        const bounds = waypoints.reduce((b, wp) => b.extend(wp.coordinates as [number, number]), new mapboxgl.LngLatBounds(waypoints[0].coordinates as [number, number], waypoints[0].coordinates as [number, number]))
        mapRef.current?.fitBounds(bounds, { padding: 60 })
      }
    })

    mapRef.current.on('error', (e) => {
      console.error('Mapbox error', e.error);
    });

    return () => {
      mapRef.current?.remove()
      mapRef.current = null // allow re-init after StrictMode remount
    }
  }, [waypoints])

  return <div ref={mapContainer} style={{ width: '100%', height }} />
} 