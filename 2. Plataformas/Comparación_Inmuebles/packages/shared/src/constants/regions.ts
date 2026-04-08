import type { Region } from '../types/geo';

export const REGIONS: Omit<Region, 'id'>[] = [
  { name: 'Arica y Parinacota', slug: 'arica-y-parinacota', code: 'AP' },
  { name: 'Tarapacá', slug: 'tarapaca', code: 'TA' },
  { name: 'Antofagasta', slug: 'antofagasta', code: 'AN' },
  { name: 'Atacama', slug: 'atacama', code: 'AT' },
  { name: 'Coquimbo', slug: 'coquimbo', code: 'CO' },
  { name: 'Valparaíso', slug: 'valparaiso', code: 'VS' },
  { name: 'Región Metropolitana de Santiago', slug: 'region-metropolitana', code: 'RM' },
  { name: "O'Higgins", slug: 'ohiggins', code: 'LI' },
  { name: 'Maule', slug: 'maule', code: 'ML' },
  { name: 'Ñuble', slug: 'nuble', code: 'NB' },
  { name: 'Biobío', slug: 'biobio', code: 'BI' },
  { name: 'La Araucanía', slug: 'la-araucania', code: 'AR' },
  { name: 'Los Ríos', slug: 'los-rios', code: 'LR' },
  { name: 'Los Lagos', slug: 'los-lagos', code: 'LL' },
  { name: 'Aysén', slug: 'aysen', code: 'AI' },
  { name: 'Magallanes y la Antártica Chilena', slug: 'magallanes', code: 'MA' },
];
