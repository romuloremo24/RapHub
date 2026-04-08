'use client'

import { useRef, useCallback } from 'react'
import Map, { Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import { useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Zona } from '@/lib/types'

const MAP_STYLE = process.env.NEXT_PUBLIC_MAPLIBRE_STYLE ?? 'https://tiles.openfreemap.org/styles/liberty'
const CHILE_CENTER = { longitude: -71.0, latitude: -35.5 }
const INITIAL_ZOOM = 5

const TYPE_COLORS: Record<string, string> = {
  deportiva: '#f4622a',
  boulder: '#3b82f6',
  trad: '#2d6a4f',
  hielo: '#e2e8f0',
  mixta: '#a855f7',
  multipitch: '#f59e0b',
}

function getDominantColor(tipos: string[]): string {
  return TYPE_COLORS[tipos[0]] ?? '#f4622a'
}

interface ZonasMapProps {
  zonas: Zona[]
  highlightedZonaId?: string
  onZonaHover?: (zonaId: string | null) => void
  onZonaClick?: (zona: Zona) => void
  center?: { longitude: number; latitude: number }
  zoom?: number
  className?: string
}

export function ZonasMap({
  zonas,
  highlightedZonaId,
  onZonaHover,
  onZonaClick,
  center = CHILE_CENTER,
  zoom = INITIAL_ZOOM,
  className = 'h-full w-full',
}: ZonasMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [popupZona, setPopupZona] = useState<Zona | null>(null)

  const handleMarkerClick = useCallback(
    (zona: Zona) => {
      setPopupZona(zona)
      onZonaClick?.(zona)
    },
    [onZonaClick]
  )

  return (
    <div className={className}>
      <Map
        ref={mapRef}
        initialViewState={{ ...center, zoom }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
      >
        <NavigationControl position="top-right" />

        {zonas.map(zona => {
          const isHighlighted = zona.id === highlightedZonaId
          const color = getDominantColor(zona.tipos)
          return (
            <Marker
              key={zona.id}
              longitude={zona.lng}
              latitude={zona.lat}
              anchor="center"
            >
              <button
                className="relative flex items-center justify-center"
                onClick={() => handleMarkerClick(zona)}
                onMouseEnter={() => onZonaHover?.(zona.id)}
                onMouseLeave={() => onZonaHover?.(null)}
                aria-label={zona.nombre}
              >
                <span
                  className="block rounded-full border-2 border-white shadow-lg transition-transform"
                  style={{
                    width: isHighlighted ? 20 : 14,
                    height: isHighlighted ? 20 : 14,
                    backgroundColor: color,
                    transform: isHighlighted ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
              </button>
            </Marker>
          )
        })}

        {popupZona && (
          <Popup
            longitude={popupZona.lng}
            latitude={popupZona.lat}
            anchor="bottom"
            closeOnClick={false}
            onClose={() => setPopupZona(null)}
            className="[&_.maplibregl-popup-content]:!bg-roca-light [&_.maplibregl-popup-content]:!text-nieve [&_.maplibregl-popup-content]:!rounded-lg [&_.maplibregl-popup-content]:!border [&_.maplibregl-popup-content]:!border-gris [&_.maplibregl-popup-content]:!p-3 [&_.maplibregl-popup-content]:!shadow-xl"
          >
            <div className="max-w-[200px]">
              <h3 className="font-heading text-sm font-semibold">{popupZona.nombre}</h3>
              <p className="mt-1 text-xs text-nieve-dim">
                {popupZona.tipos.join(' · ')} · {popupZona.num_vias} vías
              </p>
              {popupZona.grado_min && popupZona.grado_max && (
                <p className="mt-1 text-xs text-nieve-dim">
                  {popupZona.grado_min} – {popupZona.grado_max}
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
