import React, { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
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
  enableSummary?: boolean // NEW optional prop to toggle summary behaviour
}

export function MapView({ waypoints, height = '500px', enableSummary = false }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const initialCenter: [number, number] = waypoints.length
      ? (waypoints[0].coordinates as [number, number])
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
        ).addTo(mapRef.current as any)
      })

      // Fit bounds if multiple waypoints
      if (waypoints.length > 1) {
        const bounds = waypoints.reduce((b, wp) => b.extend(wp.coordinates as [number, number]), new mapboxgl.LngLatBounds(waypoints[0].coordinates as [number, number], waypoints[0].coordinates as [number, number]))
        mapRef.current?.fitBounds(bounds, { padding: 60 })
      }
    })

    mapRef.current.on('error', (e: any) => {
      console.error('Mapbox error', e.error);
    })

    // Summary click-handler (enabled only when prop is true & user holds Ctrl/Cmd)
    if (enableSummary) {
      mapRef.current.on('click', async (e: any) => {
        const { lngLat } = e
        if (!(e.originalEvent.metaKey || e.originalEvent.ctrlKey)) return

        const functionsUrl = (import.meta.env.VITE_FUNCTIONS_URL as string) || `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1`

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string
        }

        // Try to include user JWT if available (helps with RLS-enabled functions; safe to omit)
        try {
          const { supabase } = await import('../lib/supabaseClient')
          const { data } = await supabase.auth.getSession()
          const token = data.session?.access_token
          if (token) headers.Authorization = `Bearer ${token}`
        } catch (_err) {
          // continue without auth header
        }

        try {
          const res = await fetch(`${functionsUrl}/summarize_pin`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ lon: lngLat.lng, lat: lngLat.lat })
          })

          if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(text || `Request failed with ${res.status}`)
          }

          const json = await res.json().catch(() => ({}))
          const content = json?.summary || 'No summary available for this spot.'
          new mapboxgl.Popup().setLngLat(lngLat).setHTML(`<p>${content}</p>`).addTo(mapRef.current as any)
        } catch (err) {
          console.error('Summarize click error:', err)
          new mapboxgl.Popup()
            .setLngLat(lngLat)
            .setHTML(`<p class=\"text-sm\">Couldn\\'t load summary.</p>`) 
            .addTo(mapRef.current as any)
        }
      })
    }

    return () => {
      mapRef.current?.remove()
      mapRef.current = null // allow re-init after StrictMode remount
    }
  }, [waypoints, enableSummary])

  return <div ref={mapContainer} style={{ width: '100%', height }} />
} 