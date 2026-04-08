'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Property } from '@vesta/shared/types/property';
import { formatUF } from '@/lib/format';

const SANTIAGO_CENTER = { lng: -70.6483, lat: -33.4489 };

export function PropertyMap({ properties }: { properties: Property[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [SANTIAGO_CENTER.lng, SANTIAGO_CENTER.lat],
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onLoad = () => {
      document.querySelectorAll('.vesta-marker').forEach((el) => el.remove());

      const bounds = new maplibregl.LngLatBounds();
      let hasValidCoords = false;

      properties.forEach((p) => {
        if (!p.latitude || !p.longitude) return;
        hasValidCoords = true;

        const el = document.createElement('div');
        el.className = 'vesta-marker';
        el.style.cssText = `
          background: #0f172a;
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          font-family: Inter, system-ui, sans-serif;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          transition: all 0.2s ease;
          border: 2px solid transparent;
        `;
        el.textContent = p.price_uf ? formatUF(p.price_uf) : '$';

        el.addEventListener('mouseenter', () => {
          el.style.background = '#6366f1';
          el.style.transform = 'scale(1.1)';
          el.style.zIndex = '10';
        });
        el.addEventListener('mouseleave', () => {
          el.style.background = '#0f172a';
          el.style.transform = 'scale(1)';
          el.style.zIndex = '';
        });

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false, maxWidth: '240px' }).setHTML(`
          <div style="font-family:Inter,system-ui,sans-serif">
            <p style="font-weight:700;font-size:14px;margin:0 0 4px;color:#0f172a">${p.title}</p>
            <p style="font-size:12px;color:#64748b;margin:0 0 8px">${p.commune_name ?? ''}</p>
            <a href="/propiedad/${p.slug}" style="font-size:12px;color:#6366f1;font-weight:600;text-decoration:none">Ver detalle →</a>
          </div>
        `);

        new maplibregl.Marker({ element: el })
          .setLngLat([p.longitude, p.latitude])
          .setPopup(popup)
          .addTo(map);

        bounds.extend([p.longitude, p.latitude]);
      });

      if (hasValidCoords) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
    };

    if (map.loaded()) onLoad();
    else map.on('load', onLoad);
  }, [properties]);

  return <div ref={containerRef} className="h-full w-full" />;
}
