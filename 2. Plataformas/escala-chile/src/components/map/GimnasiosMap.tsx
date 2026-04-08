'use client'

import { useRef, useCallback, useState } from 'react'
import Map, { Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Gimnasio } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

const MAP_STYLE = process.env.NEXT_PUBLIC_MAPLIBRE_STYLE ?? 'https://tiles.openfreemap.org/styles/liberty'
const SANTIAGO_CENTER = { longitude: -70.6, latitude: -33.45 }

interface GimnasiosMapProps {
  gimnasios: Gimnasio[]
  highlightedId?: string
  onGimnasioHover?: (id: string | null) => void
  className?: string
}

export function GimnasiosMap({
  gimnasios,
  highlightedId,
  onGimnasioHover,
  className = 'h-full w-full',
}: GimnasiosMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [popupGym, setPopupGym] = useState<Gimnasio | null>(null)

  const handleClick = useCallback((gym: Gimnasio) => {
    setPopupGym(gym)
  }, [])

  return (
    <div className={className}>
      <Map
        ref={mapRef}
        initialViewState={{ ...SANTIAGO_CENTER, zoom: 11 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
      >
        <NavigationControl position="top-right" />

        {gimnasios.map(gym => {
          if (gym.lng == null || gym.lat == null) return null
          const isHighlighted = gym.id === highlightedId
          return (
            <Marker key={gym.id} longitude={gym.lng} latitude={gym.lat} anchor="center">
              <button
                className="flex items-center justify-center"
                onClick={() => handleClick(gym)}
                onMouseEnter={() => onGimnasioHover?.(gym.id)}
                onMouseLeave={() => onGimnasioHover?.(null)}
                aria-label={gym.nombre}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-lg transition-transform"
                  style={{
                    backgroundColor: '#f4622a',
                    transform: isHighlighted ? 'scale(1.3)' : 'scale(1)',
                  }}
                >
                  G
                </span>
              </button>
            </Marker>
          )
        })}

        {popupGym && popupGym.lng != null && popupGym.lat != null && (
          <Popup
            longitude={popupGym.lng}
            latitude={popupGym.lat}
            anchor="bottom"
            closeOnClick={false}
            onClose={() => setPopupGym(null)}
            className="[&_.maplibregl-popup-content]:!bg-roca-light [&_.maplibregl-popup-content]:!text-nieve [&_.maplibregl-popup-content]:!rounded-lg [&_.maplibregl-popup-content]:!border [&_.maplibregl-popup-content]:!border-gris [&_.maplibregl-popup-content]:!p-3"
          >
            <div className="max-w-[200px]">
              <h3 className="font-heading text-sm font-semibold">{popupGym.nombre}</h3>
              <p className="mt-1 text-xs text-nieve-dim">{popupGym.ciudad}</p>
              {popupGym.precio_dia != null && (
                <p className="mt-1 text-xs">
                  Día: <span className="font-medium text-naranja">{formatPrice(popupGym.precio_dia)}</span>
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
