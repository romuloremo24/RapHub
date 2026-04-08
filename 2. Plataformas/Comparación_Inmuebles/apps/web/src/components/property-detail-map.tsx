'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function PropertyDetailMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [lng, lat],
      zoom: 15,
      attributionControl: false,
    });

    new maplibregl.Marker({ color: '#1a365d' })
      .setLngLat([lng, lat])
      .addTo(map);

    return () => map.remove();
  }, [lat, lng]);

  return <div ref={containerRef} className="h-full w-full" />;
}
