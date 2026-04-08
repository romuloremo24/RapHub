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
  lng: number
  lat: number
  altitud?: number
  distancia_ciudad?: string
  ciudad_referencia?: string
  tipo_roca?: string
  acceso?: string
  acceso_dificultad?: AccessDifficulty
  estacionamiento?: boolean
  camping?: boolean
  agua?: boolean
  temporada_recomendada?: string
  temporada_inicio?: number
  temporada_fin?: number
  num_vias: number
  grado_min?: string
  grado_max?: string
  estrellas?: number
  num_opiniones?: number
  fotos?: string[]
  fuentes?: string[]
  activa?: boolean
  verificada?: boolean
}

export interface Region {
  id: number
  numero: number
  nombre: string
  nombre_corto?: string
  slug: string
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
  activo?: boolean
}

export interface Via {
  id: string
  sector_id: string
  zona_id: string
  nombre: string
  grado: string
  grado_yds?: string
  grado_hueco?: string
  tipo: ClimbType
  largo?: number
  num_chapas?: number
  inclinacion?: 'placa' | 'vertical' | 'desplomado' | 'techo' | 'mixto'
  descripcion?: string
  beta?: string
  historia?: string
  primera_ascension?: string
  anio_equipado?: number
  estrellas?: number
  num_votos_estrellas?: number
  num_ascensiones?: number
  num_intentos?: number
  estado: RouteState
  fotos?: string[]
}

export interface TopoLine {
  viaId: string
  viaName: string
  grade: string
  color: string
  label: string
  points: Array<{ x: number; y: number }>
  labelX: number
  labelY: number
}

export interface TopoCanvasData {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  lines: TopoLine[]
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
  activo?: boolean
}

export interface TopoVia {
  id: string
  topo_id: string
  via_id: string
  numero_en_topo: number
  path_points?: Array<{ x: number; y: number }>
}

export interface Gimnasio {
  id: string
  nombre: string
  slug: string
  ciudad: string
  region_id?: number
  direccion?: string
  lng?: number
  lat?: number
  tipos: GymWallType[]
  altura_max?: number
  area_m2?: number
  descripcion?: string
  horario?: string
  precio_dia?: number
  precio_mensual?: number
  tiene_alquiler?: boolean
  tiene_cursos?: boolean
  tiene_muro_exterior?: boolean
  web?: string
  instagram?: string
  telefono?: string
  fotos?: string[]
  activo?: boolean
  verificado?: boolean
}
