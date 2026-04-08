import type { Operation, PropertyType, Source } from '../types/property';

export const OPERATIONS: { value: Operation; label: string }[] = [
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'venta', label: 'Venta' },
];

export const PROPERTY_TYPES: { value: PropertyType; label: string; icon: string }[] = [
  { value: 'departamento', label: 'Departamento', icon: 'Building2' },
  { value: 'casa', label: 'Casa', icon: 'Home' },
  { value: 'terreno', label: 'Terreno', icon: 'TreePine' },
  { value: 'parcela', label: 'Parcela', icon: 'Mountain' },
  { value: 'oficina', label: 'Oficina', icon: 'Briefcase' },
  { value: 'local-comercial', label: 'Local Comercial', icon: 'Store' },
  { value: 'bodega', label: 'Bodega', icon: 'Warehouse' },
  { value: 'estacionamiento', label: 'Estacionamiento', icon: 'Car' },
];

export const SOURCES: { value: Source; label: string; color: string }[] = [
  { value: 'portalinmobiliario', label: 'Portal Inmobiliario', color: '#FF6600' },
  { value: 'mercadolibre', label: 'MercadoLibre', color: '#FFE600' },
  { value: 'toctoc', label: 'TocToc', color: '#00B4D8' },
  { value: 'yapo', label: 'Yapo.cl', color: '#00A651' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'price_m2_asc', label: 'Menor UF/m²' },
  { value: 'price_m2_desc', label: 'Mayor UF/m²' },
  { value: 'area_desc', label: 'Mayor superficie' },
] as const;

export const BEDROOM_OPTIONS = [
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 5, label: '5+' },
];

export const BATHROOM_OPTIONS = [
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
];
