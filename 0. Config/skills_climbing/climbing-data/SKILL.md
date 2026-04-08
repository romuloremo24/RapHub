---
name: climbing-data
description: >
  Datos específicos de escalada chilena: zonas, sectores, vías, gimnasios, sistema
  de grados y editor de topos. Usar este skill cuando se trabaje con: el editor de
  topos (Konva.js), sistema de conversión de grados (francés/YDS/Hueco), seed de
  datos iniciales de zonas chilenas, componente TopoViewer o TopoEditor, tipos
  TypeScript del dominio de escalada, lógica de filtros de vías por grado/tipo,
  datos de gimnasios de Chile, o cualquier lógica de negocio específica del dominio
  de la escalada. También usar cuando el usuario pregunte sobre grados de escalada,
  cómo ingresar datos de una zona específica, o cómo implementar el topo interactivo.
---

# EscalaChile — Skill de Datos y Dominio

Conocimiento específico del dominio de escalada para el proyecto EscalaChile.

## Sistema de grados

Chile usa principalmente el **sistema francés**. Siempre mostrar en francés por default.

### Tabla de conversión completa

```typescript
// src/lib/grades.ts

export type GradeSystem = 'french' | 'yds' | 'uiaa' | 'hueco'
export type ClimbLevel = 'principiante' | 'intermedio' | 'avanzado' | 'experto' | 'elite'

export const GRADE_TABLE: Record<string, {
  yds: string, uiaa: string, level: ClimbLevel, colorClass: string
}> = {
  // Principiante (verde)
  '3':   { yds: '5.4',   uiaa: 'III',  level: 'principiante', colorClass: 'bg-green-700 text-white' },
  '4':   { yds: '5.5',   uiaa: 'IV',   level: 'principiante', colorClass: 'bg-green-700 text-white' },
  '4a':  { yds: '5.6',   uiaa: 'IV+',  level: 'principiante', colorClass: 'bg-green-600 text-white' },
  '4b':  { yds: '5.7',   uiaa: 'V-',   level: 'principiante', colorClass: 'bg-green-600 text-white' },
  '4c':  { yds: '5.8',   uiaa: 'V',    level: 'principiante', colorClass: 'bg-green-600 text-white' },
  '5a':  { yds: '5.9',   uiaa: 'V+',   level: 'principiante', colorClass: 'bg-green-500 text-white' },
  '5b':  { yds: '5.10a', uiaa: 'VI-',  level: 'principiante', colorClass: 'bg-green-500 text-white' },
  '5c':  { yds: '5.10b', uiaa: 'VI',   level: 'principiante', colorClass: 'bg-green-500 text-white' },
  // Intermedio (azul)
  '6a':  { yds: '5.10b', uiaa: 'VI+',  level: 'intermedio', colorClass: 'bg-blue-600 text-white' },
  '6a+': { yds: '5.10c', uiaa: 'VI+',  level: 'intermedio', colorClass: 'bg-blue-600 text-white' },
  '6b':  { yds: '5.10d', uiaa: 'VII-', level: 'intermedio', colorClass: 'bg-blue-500 text-white' },
  '6b+': { yds: '5.11a', uiaa: 'VII',  level: 'intermedio', colorClass: 'bg-blue-500 text-white' },
  '6c':  { yds: '5.11b', uiaa: 'VII',  level: 'intermedio', colorClass: 'bg-blue-500 text-white' },
  '6c+': { yds: '5.11c', uiaa: 'VII+', level: 'intermedio', colorClass: 'bg-blue-400 text-white' },
  // Avanzado (naranja)
  '7a':  { yds: '5.11d', uiaa: 'VII+', level: 'avanzado', colorClass: 'bg-orange-500 text-white' },
  '7a+': { yds: '5.12a', uiaa: 'VIII-',level: 'avanzado', colorClass: 'bg-orange-500 text-white' },
  '7b':  { yds: '5.12b', uiaa: 'VIII', level: 'avanzado', colorClass: 'bg-orange-500 text-white' },
  '7b+': { yds: '5.12c', uiaa: 'VIII', level: 'avanzado', colorClass: 'bg-orange-500 text-white' },
  '7c':  { yds: '5.12d', uiaa: 'VIII+',level: 'avanzado', colorClass: 'bg-orange-600 text-white' },
  '7c+': { yds: '5.13a', uiaa: 'VIII+',level: 'avanzado', colorClass: 'bg-orange-600 text-white' },
  // Experto (rojo)
  '8a':  { yds: '5.13b', uiaa: 'IX-',  level: 'experto', colorClass: 'bg-red-600 text-white' },
  '8a+': { yds: '5.13c', uiaa: 'IX',   level: 'experto', colorClass: 'bg-red-600 text-white' },
  '8b':  { yds: '5.13d', uiaa: 'IX',   level: 'experto', colorClass: 'bg-red-600 text-white' },
  '8b+': { yds: '5.14a', uiaa: 'IX+',  level: 'experto', colorClass: 'bg-red-700 text-white' },
  '8c':  { yds: '5.14b', uiaa: 'IX+',  level: 'experto', colorClass: 'bg-red-700 text-white' },
  '8c+': { yds: '5.14c', uiaa: 'X-',   level: 'experto', colorClass: 'bg-red-700 text-white' },
  // Élite (morado)
  '9a':  { yds: '5.14d', uiaa: 'X',    level: 'elite', colorClass: 'bg-purple-700 text-white' },
  '9a+': { yds: '5.15a', uiaa: 'X+',   level: 'elite', colorClass: 'bg-purple-700 text-white' },
  '9b':  { yds: '5.15b', uiaa: 'XI-',  level: 'elite', colorClass: 'bg-purple-800 text-white' },
  '9b+': { yds: '5.15c', uiaa: 'XI',   level: 'elite', colorClass: 'bg-purple-800 text-white' },
  '9c':  { yds: '5.15d', uiaa: 'XI+',  level: 'elite', colorClass: 'bg-purple-900 text-white' },
}

// Boulder — sistema Hueco/V
export const BOULDER_GRADES: Record<string, {
  french: string, level: ClimbLevel, colorClass: string
}> = {
  'VB': { french: '4a-4c', level: 'principiante', colorClass: 'bg-green-700 text-white' },
  'V0': { french: '5a-5b', level: 'principiante', colorClass: 'bg-green-600 text-white' },
  'V1': { french: '5c-6a', level: 'principiante', colorClass: 'bg-green-500 text-white' },
  'V2': { french: '6a+',   level: 'intermedio',   colorClass: 'bg-blue-600 text-white' },
  'V3': { french: '6b',    level: 'intermedio',   colorClass: 'bg-blue-500 text-white' },
  'V4': { french: '6b+',   level: 'intermedio',   colorClass: 'bg-blue-400 text-white' },
  'V5': { french: '6c-7a', level: 'avanzado',     colorClass: 'bg-orange-500 text-white' },
  'V6': { french: '7a',    level: 'avanzado',     colorClass: 'bg-orange-500 text-white' },
  'V7': { french: '7a+',   level: 'avanzado',     colorClass: 'bg-orange-600 text-white' },
  'V8': { french: '7b-7b+',level: 'experto',      colorClass: 'bg-red-600 text-white' },
  'V9': { french: '7c',    level: 'experto',      colorClass: 'bg-red-600 text-white' },
  'V10':{ french: '7c+',   level: 'experto',      colorClass: 'bg-red-700 text-white' },
  'V11':{ french: '8a',    level: 'experto',      colorClass: 'bg-red-700 text-white' },
  'V12':{ french: '8a+',   level: 'elite',        colorClass: 'bg-purple-700 text-white' },
  'V13':{ french: '8b',    level: 'elite',        colorClass: 'bg-purple-700 text-white' },
  'V14':{ french: '8b+',   level: 'elite',        colorClass: 'bg-purple-800 text-white' },
  'V15':{ french: '8c',    level: 'elite',        colorClass: 'bg-purple-800 text-white' },
  'V16':{ french: '8c+',   level: 'elite',        colorClass: 'bg-purple-900 text-white' },
  'V17':{ french: '9a',    level: 'elite',        colorClass: 'bg-purple-900 text-white' },
}

export function getGradeColor(grade: string): string {
  return GRADE_TABLE[grade]?.colorClass ?? 'bg-gray-500 text-white'
}

export function convertGrade(grade: string, to: GradeSystem): string {
  if (to === 'yds') return GRADE_TABLE[grade]?.yds ?? grade
  if (to === 'uiaa') return GRADE_TABLE[grade]?.uiaa ?? grade
  return grade
}

// Ordenar grados (para filtros de rango)
export const GRADE_ORDER = Object.keys(GRADE_TABLE)
```

## Editor de Topos (Konva.js)

Un "topo" es una fotografía de una pared de roca con líneas dibujadas encima
mostrando el recorrido de cada vía.

### Estructura de datos del canvas

```typescript
// Guardado como JSONB en supabase.topos.canvas_data
interface TopoCanvasData {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  lines: TopoLine[]
}

interface TopoLine {
  viaId: string           // UUID de la vía en supabase
  viaName: string         // Para mostrar sin join
  grade: string           // Grado francés
  color: string           // Color hex asignado automáticamente
  label: string           // Número en la foto (1, 2, 3...)
  // Puntos en coordenadas RELATIVAS (0 a 1) para ser responsive
  points: Array<{x: number, y: number}>
  // Posición del label (relativa también)
  labelX: number
  labelY: number
}
```

### Componente TopoViewer

```tsx
// components/topo/TopoViewer.tsx
'use client'
import { Stage, Layer, Image, Line, Circle, Text, Group } from 'react-konva'
import { useImage } from 'react-konva-utils'

interface TopoViewerProps {
  topo: {
    foto_url: string
    canvas_data: TopoCanvasData
  }
  vias: Via[]
  highlightedViaId?: string   // Vía resaltada (desde hover en lista)
  onViaHover?: (viaId: string | null) => void
  onViaClick?: (viaId: string) => void
}

export function TopoViewer({ topo, vias, highlightedViaId, onViaHover, onViaClick }: TopoViewerProps) {
  const [image] = useImage(topo.foto_url)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })

  // Calcular tamaño responsive manteniendo aspect ratio
  useEffect(() => {
    if (!containerRef.current || !image) return
    const containerWidth = containerRef.current.offsetWidth
    const aspectRatio = image.height / image.width
    setSize({
      width: containerWidth,
      height: containerWidth * aspectRatio
    })
  }, [image, containerRef.current?.offsetWidth])

  // Convertir coordenadas relativas → píxeles
  const toPixel = (relX: number, relY: number) => ({
    x: relX * size.width,
    y: relY * size.height
  })

  return (
    <div ref={containerRef} className="w-full">
      <Stage width={size.width} height={size.height}>
        <Layer>
          {/* Imagen de fondo */}
          <Image image={image} width={size.width} height={size.height} />

          {/* Líneas de cada vía */}
          {topo.canvas_data.lines.map(line => {
            const isHighlighted = line.viaId === highlightedViaId
            const pixelPoints = line.points.flatMap(p => [
              p.x * size.width,
              p.y * size.height
            ])
            return (
              <Group key={line.viaId}>
                {/* Línea de la ruta */}
                <Line
                  points={pixelPoints}
                  stroke={isHighlighted ? '#ffffff' : line.color}
                  strokeWidth={isHighlighted ? 4 : 2.5}
                  tension={0.4}          // Suavizar la línea
                  lineCap="round"
                  lineJoin="round"
                  shadowColor="black"
                  shadowBlur={isHighlighted ? 10 : 4}
                  shadowOpacity={0.8}
                  hitStrokeWidth={20}    // Área de click más grande
                  onMouseEnter={() => onViaHover?.(line.viaId)}
                  onMouseLeave={() => onViaHover?.(null)}
                  onClick={() => onViaClick?.(line.viaId)}
                />
                {/* Label numerado */}
                <Group
                  x={line.labelX * size.width}
                  y={line.labelY * size.height}
                  onMouseEnter={() => onViaHover?.(line.viaId)}
                  onMouseLeave={() => onViaHover?.(null)}
                  onClick={() => onViaClick?.(line.viaId)}
                >
                  <Circle
                    radius={12}
                    fill={isHighlighted ? '#ffffff' : line.color}
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={1}
                  />
                  <Text
                    text={line.label}
                    fontSize={11}
                    fontStyle="bold"
                    fill={isHighlighted ? '#000000' : '#ffffff'}
                    align="center"
                    verticalAlign="middle"
                    offsetX={6}
                    offsetY={6}
                    width={12}
                    height={12}
                  />
                </Group>
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}
```

### Editor de Topos (para contribuidores)

```tsx
// components/topo/TopoEditor.tsx
// Permite dibujar líneas de rutas sobre una foto
// Estado: 'idle' | 'drawing' | 'placing-label'
// Al click: agrega punto a la línea activa
// Al doble-click: termina la línea
// Al hacer drag: mueve el label
// Guarda en Supabase: supabase.from('topos').upsert({ canvas_data })
```

### Colores automáticos para líneas de topos

```typescript
// Paleta de colores distinguibles (como en 27crags)
export const TOPO_LINE_COLORS = [
  '#FF4136', // Rojo
  '#2ECC40', // Verde
  '#0074D9', // Azul
  '#FF851B', // Naranja
  '#B10DC9', // Morado
  '#FFDC00', // Amarillo
  '#7FDBFF', // Cian
  '#F012BE', // Magenta
  '#01FF70', // Verde lima
  '#FF6B6B', // Coral
]

export function getLineColor(index: number): string {
  return TOPO_LINE_COLORS[index % TOPO_LINE_COLORS.length]
}
```

## Tipos TypeScript del dominio

```typescript
// src/lib/types.ts

export type ClimbType = 'deportiva' | 'boulder' | 'trad' | 'hielo' | 'mixta' | 'multipitch'
export type ClimbLevel = 'principiante' | 'intermedio' | 'avanzado' | 'experto' | 'elite'
export type AccessDifficulty = 'fácil' | 'moderado' | 'difícil' | 'muy difícil'
export type RouteState = 'activa' | 'deteriorada' | 'cerrada' | 'proyecto'
export type GymWallType = 'boulder' | 'lead' | 'top-rope' | 'auto-belay' | 'exterior'

export interface Zona {
  id: string
  nombre: string
  slug: string
  region_id: number
  descripcion?: string
  descripcion_corta?: string
  tipos: ClimbType[]
  lat: number      // extraído de PostGIS
  lng: number      // extraído de PostGIS
  altitud?: number
  distancia_ciudad?: string
  ciudad_referencia?: string
  tipo_roca?: string
  acceso?: string
  acceso_dificultad?: AccessDifficulty
  camping?: boolean
  agua?: boolean
  temporada_recomendada?: string
  num_vias: number
  grado_min?: string
  grado_max?: string
  estrellas?: number
  fotos?: string[]
}

export interface Sector {
  id: string
  zona_id: string
  nombre: string
  slug: string
  descripcion?: string
  lat?: number
  lng?: number
  orientacion?: string
  altura_max?: number
  num_vias: number
  orden: number
}

export interface Via {
  id: string
  sector_id: string
  zona_id: string
  nombre: string
  grado: string          // Sistema francés
  grado_yds?: string
  grado_hueco?: string   // Para boulder
  tipo: ClimbType
  largo?: number
  num_chapas?: number
  inclinacion?: string
  descripcion?: string
  beta?: string
  estrellas?: number
  estado: RouteState
  fotos?: string[]
}

export interface Topo {
  id: string
  sector_id: string
  titulo?: string
  foto_url: string
  foto_width?: number
  foto_height?: number
  canvas_data?: TopoCanvasData
  orden: number
}

export interface Gimnasio {
  id: string
  nombre: string
  slug: string
  ciudad: string
  region_id?: number
  direccion?: string
  lat?: number
  lng?: number
  tipos: GymWallType[]
  altura_max?: number
  area_m2?: number
  descripcion?: string
  horario?: string
  precio_dia?: number
  precio_mensual?: number
  tiene_alquiler?: boolean
  tiene_cursos?: boolean
  web?: string
  instagram?: string
  fotos?: string[]
}
```

## Datos iniciales — Zonas prioritarias

Usar estas coordenadas y datos verificados para el seed:

```typescript
// scripts/seed-zonas.ts
const zonasIniciales = [
  // REGIÓN METROPOLITANA
  {
    nombre: 'Las Palestras',
    region: 'metropolitana',
    lng: -70.38, lat: -33.60,
    tipos: ['deportiva'],
    tipo_roca: 'Toba volcánica',
    altitud: 1450,
    ciudad_referencia: 'Santiago',
    distancia_ciudad: '60 km sur-este, Cajón del Maipo',
    num_vias: 70,
    grado_min: '5a', grado_max: '7c',
    temporada_recomendada: 'Sept–Mayo',
    acceso_dificultad: 'fácil',
    camping: false, agua: false,
    descripcion_corta: 'El sector más emblemático de Santiago con 70+ rutas en toba volcánica, acceso en 2 min a pie desde el estacionamiento.'
  },
  {
    nombre: 'Torrecillas',
    region: 'metropolitana',
    lng: -70.36, lat: -33.59,
    tipos: ['multipitch', 'trad', 'deportiva'],
    tipo_roca: 'Toba volcánica',
    altitud: 1500,
    ciudad_referencia: 'Santiago',
    distancia_ciudad: '60 km sur-este, Cajón del Maipo',
    num_vias: 30,
    grado_min: '5b', grado_max: '7a',
    temporada_recomendada: 'Sept–Mayo',
    acceso_dificultad: 'moderado',
    camping: false, agua: false,
    descripcion_corta: 'Imponentes torres de toba con multilargos de hasta 350m. Acceso al Fundo El Manzano ($10.000 CLP). No recomendado para principiantes.'
  },
  {
    nombre: 'Los Trapenses',
    region: 'metropolitana',
    lng: -70.554, lat: -33.349,
    tipos: ['deportiva'],
    tipo_roca: 'Volcánica',
    altitud: 980,
    ciudad_referencia: 'Santiago',
    distancia_ciudad: '20 km noreste, Las Condes',
    num_vias: 27,
    grado_min: '5b', grado_max: '7b+',
    temporada_recomendada: 'Todo el año',
    acceso_dificultad: 'fácil',
    camping: false, agua: false,
    descripcion_corta: '27 rutas en 6 sectores, muy cercano a Santiago. Buena opción para principiantes e intermedios.'
  },
  {
    nombre: 'Jurassic Park',
    region: 'metropolitana',
    lng: -70.65, lat: -33.25,
    tipos: ['boulder'],
    tipo_roca: 'Granito',
    altitud: 700,
    ciudad_referencia: 'Santiago',
    distancia_ciudad: '35 km norte, Chicureo',
    num_vias: 57,
    grado_min: 'V1', grado_max: 'V12',
    temporada_recomendada: 'Abril–Octubre',
    acceso_dificultad: 'fácil',
    camping: false, agua: false,
    descripcion_corta: '57 problemas de boulder en granito desde V1 hasta V12. El sector de boulder más completo de Santiago.'
  },
  // REGIÓN DE VALPARAÍSO
  {
    nombre: 'Las Chilcas',
    region: 'valparaiso',
    lng: -70.72, lat: -32.85,
    tipos: ['deportiva', 'multipitch', 'trad'],
    tipo_roca: 'Conglomerado',
    altitud: 620,
    ciudad_referencia: 'Santiago',
    distancia_ciudad: '80 km norte por Ruta 5',
    num_vias: 120,
    grado_min: '5b', grado_max: '8c+',
    temporada_recomendada: 'Todo el año',
    acceso_dificultad: 'fácil',
    camping: true, agua: false,
    descripcion_corta: 'El sector de escalada deportiva más duro de Chile. 120+ rutas hasta 8c+ en conglomerado con agujeros y monodedos. 2 minutos desde la Ruta 5.'
  },
  // REGIÓN DEL MAULE
  {
    nombre: 'Valle de los Cóndores',
    region: 'maule',
    lng: -70.68, lat: -35.57,
    tipos: ['deportiva', 'trad', 'multipitch'],
    tipo_roca: 'Basalto / Volcánica',
    altitud: 1800,
    ciudad_referencia: 'Talca',
    distancia_ciudad: '100 km este de Talca',
    num_vias: 450,
    grado_min: '5a', grado_max: '9a',
    temporada_recomendada: 'Oct–Abril',
    acceso_dificultad: 'difícil',
    camping: true, agua: true,
    descripcion_corta: 'El mayor destino de escalada de Chile con 450+ vías en 17 sectores. Alberga "La Sensación de Bloque", el primer 9a de Chile. Visitado por Ondra, Honnold y Megos.'
  },
  // REGIÓN DE LOS LAGOS
  {
    nombre: 'Valle Cochamó',
    region: 'los-lagos',
    lng: -72.30, lat: -41.50,
    tipos: ['trad', 'multipitch'],
    tipo_roca: 'Granito',
    altitud: 200,
    ciudad_referencia: 'Puerto Varas',
    distancia_ciudad: '100 km sur de Puerto Varas (4-6h a pie)',
    num_vias: 200,
    grado_min: '5.7', grado_max: '5.13d',
    temporada_recomendada: 'Dic–Marzo',
    acceso_dificultad: 'muy difícil',
    camping: true, agua: true,
    descripcion_corta: '"El Yosemite de Sudamérica". Paredes de granito de hasta 1,000m en un valle remoto. Acceso solo a pie (12km, 4-6h) o a caballo. Temporada de verano únicamente.'
  },
  // REGIÓN DE AYSÉN
  {
    nombre: 'Villa Cerro Castillo',
    region: 'aysen',
    lng: -72.18, lat: -46.10,
    tipos: ['deportiva'],
    tipo_roca: 'Basalto',
    altitud: 700,
    ciudad_referencia: 'Coyhaique',
    distancia_ciudad: '95 km sur de Coyhaique, Carretera Austral',
    num_vias: 200,
    grado_min: '5a', grado_max: '8b',
    temporada_recomendada: 'Nov–Marzo',
    acceso_dificultad: 'fácil',
    camping: true, agua: true,
    descripcion_corta: 'El epicentro actual de la escalada en Chile con 200+ rutas en 6 sectores de basalto. A pasos del pueblo con servicios básicos.'
  },
  {
    nombre: 'Muralla China',
    region: 'aysen',
    lng: -72.06, lat: -45.57,
    tipos: ['deportiva'],
    tipo_roca: 'Caliza',
    altitud: 800,
    ciudad_referencia: 'Coyhaique',
    distancia_ciudad: '15 km de Coyhaique',
    num_vias: 34,
    grado_min: '5.10a', grado_max: '5.13c',
    temporada_recomendada: 'Oct–Abril',
    acceso_dificultad: 'fácil',
    camping: false, agua: false,
    descripcion_corta: 'La única zona de caliza de calidad en Chile. 34 vías de 5.10a a 5.13c comparables en calidad a zonas españolas y francesas.'
  }
]
```

## Datos iniciales — Gimnasios de Santiago

```typescript
const gimnasiosSantiago = [
  {
    nombre: 'BlocLab', ciudad: 'Providencia',
    lng: -70.6159, lat: -33.4279,
    direccion: 'Pedro de Valdivia 1985',
    tipos: ['boulder'],
    area_m2: 600,
    precio_dia: 7500, precio_mensual: 65000,
    web: 'bloclab.cl', instagram: 'bloclab_climbing',
    descripcion: 'El mejor gimnasio de boulder de Santiago. 600m² en dos zonas, Kilter Board y Tension Board reclinable.',
    tiene_alquiler: true, tiene_cursos: true
  },
  {
    nombre: 'Gimnasio El Muro', ciudad: 'La Reina',
    lng: -70.5681, lat: -33.4549,
    direccion: 'Av. Larraín 6228',
    tipos: ['lead', 'boulder', 'top-rope'],
    altura_max: 13, area_m2: 450,
    precio_dia: 6000, precio_mensual: 55000,
    web: 'gimnasioelmuro.cl', instagram: 'elmuro.cl',
    descripcion: 'El más completo en lead con 13m de altura y 22 líneas de cuerda. 60 rutas rotativamente.',
    tiene_alquiler: true, tiene_cursos: true
  },
  {
    nombre: 'Bhanga Climbing', ciudad: 'Peñalolén',
    lng: -70.5546, lat: -33.4818,
    direccion: 'Consistorial 2100, Mall Alto Peñalolén',
    tipos: ['boulder', 'lead'],
    precio_dia: 6500, precio_mensual: 58000,
    web: 'bhanga.cl', instagram: 'bhangaclimbing',
    descripcion: 'El muro de boulder más alto de Chile. Dentro del Mall Alto Peñalolén.',
    tiene_alquiler: true, tiene_cursos: true
  },
  {
    nombre: 'Hangar Boulder', ciudad: 'San Miguel',
    lng: -70.6584, lat: -33.5003,
    direccion: 'Alcalde Pedro Alarcón 750',
    tipos: ['boulder', 'lead'],
    precio_dia: 6000, precio_mensual: 52000,
    web: 'hangarboulder.cl', instagram: 'hangar.boulder',
    descripcion: 'Excelente muro de boulder y deportiva en San Miguel. Buena relación precio-calidad.',
    tiene_alquiler: true, tiene_cursos: true
  },
  {
    nombre: 'Casa Boulder', ciudad: 'Providencia',
    lng: -70.6266, lat: -33.4367,
    direccion: 'Av. Italia 875',
    tipos: ['boulder'],
    precio_dia: 5500, precio_mensual: 48000,
    web: 'casaboulder.cl', instagram: 'gimnasiocasaboulder',
    tiene_alquiler: true, tiene_cursos: true
  },
  {
    nombre: 'IronWall', ciudad: 'Las Condes',
    lng: -70.5702, lat: -33.4059,
    direccion: 'Av. Pdte. Riesco 5330, nivel -2',
    tipos: ['boulder'],
    area_m2: 535,
    precio_dia: 7000, precio_mensual: 62000,
    web: 'ironwall.cl', instagram: 'ironwall.cl',
    tiene_alquiler: true, tiene_cursos: true
  },
  {
    nombre: 'Monos Climbing', ciudad: 'Maipú',
    lng: -70.7655, lat: -33.5194,
    direccion: 'Bailén 2223',
    tipos: ['boulder'],
    precio_dia: 5000, precio_mensual: 45000,
    web: 'monosclimbing.cl',
    tiene_alquiler: false, tiene_cursos: true
  }
]
```

## Lógica de filtros de vías

```typescript
// Ordenamiento correcto de grados franceses para filtros range
export function compareGrades(a: string, b: string): number {
  const indexA = GRADE_ORDER.indexOf(a)
  const indexB = GRADE_ORDER.indexOf(b)
  return indexA - indexB
}

// Filtrar vías por rango de grado
export function filterViasByGrade(vias: Via[], min: string, max: string): Via[] {
  return vias.filter(v => {
    const grade = v.grado
    return compareGrades(grade, min) >= 0 && compareGrades(grade, max) <= 0
  })
}
```

## Archivos de referencia

Lee estos archivos para más detalle:
- `references/topo-editor-full.tsx` — Implementación completa del editor de topos
- `references/seed-complete.ts` — Seed completo con todas las zonas de Chile
