export type GradeSystem = 'french' | 'yds' | 'uiaa' | 'hueco'
export type ClimbLevel = 'principiante' | 'intermedio' | 'avanzado' | 'experto' | 'elite'

export const GRADE_TABLE: Record<string, {
  yds: string; uiaa: string; level: ClimbLevel; colorClass: string
}> = {
  '3':   { yds: '5.4',   uiaa: 'III',  level: 'principiante', colorClass: 'bg-green-700 text-white' },
  '4':   { yds: '5.5',   uiaa: 'IV',   level: 'principiante', colorClass: 'bg-green-700 text-white' },
  '4a':  { yds: '5.6',   uiaa: 'IV+',  level: 'principiante', colorClass: 'bg-green-600 text-white' },
  '4b':  { yds: '5.7',   uiaa: 'V-',   level: 'principiante', colorClass: 'bg-green-600 text-white' },
  '4c':  { yds: '5.8',   uiaa: 'V',    level: 'principiante', colorClass: 'bg-green-600 text-white' },
  '5a':  { yds: '5.9',   uiaa: 'V+',   level: 'principiante', colorClass: 'bg-green-500 text-white' },
  '5b':  { yds: '5.10a', uiaa: 'VI-',  level: 'principiante', colorClass: 'bg-green-500 text-white' },
  '5c':  { yds: '5.10b', uiaa: 'VI',   level: 'principiante', colorClass: 'bg-green-500 text-white' },
  '6a':  { yds: '5.10b', uiaa: 'VI+',  level: 'intermedio', colorClass: 'bg-blue-600 text-white' },
  '6a+': { yds: '5.10c', uiaa: 'VI+',  level: 'intermedio', colorClass: 'bg-blue-600 text-white' },
  '6b':  { yds: '5.10d', uiaa: 'VII-', level: 'intermedio', colorClass: 'bg-blue-500 text-white' },
  '6b+': { yds: '5.11a', uiaa: 'VII',  level: 'intermedio', colorClass: 'bg-blue-500 text-white' },
  '6c':  { yds: '5.11b', uiaa: 'VII',  level: 'intermedio', colorClass: 'bg-blue-500 text-white' },
  '6c+': { yds: '5.11c', uiaa: 'VII+', level: 'intermedio', colorClass: 'bg-blue-400 text-white' },
  '7a':  { yds: '5.11d', uiaa: 'VII+', level: 'avanzado', colorClass: 'bg-orange-500 text-white' },
  '7a+': { yds: '5.12a', uiaa: 'VIII-', level: 'avanzado', colorClass: 'bg-orange-500 text-white' },
  '7b':  { yds: '5.12b', uiaa: 'VIII', level: 'avanzado', colorClass: 'bg-orange-500 text-white' },
  '7b+': { yds: '5.12c', uiaa: 'VIII', level: 'avanzado', colorClass: 'bg-orange-500 text-white' },
  '7c':  { yds: '5.12d', uiaa: 'VIII+', level: 'avanzado', colorClass: 'bg-orange-600 text-white' },
  '7c+': { yds: '5.13a', uiaa: 'VIII+', level: 'avanzado', colorClass: 'bg-orange-600 text-white' },
  '8a':  { yds: '5.13b', uiaa: 'IX-',  level: 'experto', colorClass: 'bg-red-600 text-white' },
  '8a+': { yds: '5.13c', uiaa: 'IX',   level: 'experto', colorClass: 'bg-red-600 text-white' },
  '8b':  { yds: '5.13d', uiaa: 'IX',   level: 'experto', colorClass: 'bg-red-600 text-white' },
  '8b+': { yds: '5.14a', uiaa: 'IX+',  level: 'experto', colorClass: 'bg-red-700 text-white' },
  '8c':  { yds: '5.14b', uiaa: 'IX+',  level: 'experto', colorClass: 'bg-red-700 text-white' },
  '8c+': { yds: '5.14c', uiaa: 'X-',   level: 'experto', colorClass: 'bg-red-700 text-white' },
  '9a':  { yds: '5.14d', uiaa: 'X',    level: 'elite', colorClass: 'bg-purple-700 text-white' },
  '9a+': { yds: '5.15a', uiaa: 'X+',   level: 'elite', colorClass: 'bg-purple-700 text-white' },
  '9b':  { yds: '5.15b', uiaa: 'XI-',  level: 'elite', colorClass: 'bg-purple-800 text-white' },
  '9b+': { yds: '5.15c', uiaa: 'XI',   level: 'elite', colorClass: 'bg-purple-800 text-white' },
  '9c':  { yds: '5.15d', uiaa: 'XI+',  level: 'elite', colorClass: 'bg-purple-900 text-white' },
}

export const BOULDER_GRADES: Record<string, {
  french: string; level: ClimbLevel; colorClass: string
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
  'V8': { french: '7b-7b+', level: 'experto',     colorClass: 'bg-red-600 text-white' },
  'V9': { french: '7c',    level: 'experto',      colorClass: 'bg-red-600 text-white' },
  'V10': { french: '7c+',  level: 'experto',      colorClass: 'bg-red-700 text-white' },
  'V11': { french: '8a',   level: 'experto',      colorClass: 'bg-red-700 text-white' },
  'V12': { french: '8a+',  level: 'elite',        colorClass: 'bg-purple-700 text-white' },
  'V13': { french: '8b',   level: 'elite',        colorClass: 'bg-purple-700 text-white' },
  'V14': { french: '8b+',  level: 'elite',        colorClass: 'bg-purple-800 text-white' },
  'V15': { french: '8c',   level: 'elite',        colorClass: 'bg-purple-800 text-white' },
  'V16': { french: '8c+',  level: 'elite',        colorClass: 'bg-purple-900 text-white' },
  'V17': { french: '9a',   level: 'elite',        colorClass: 'bg-purple-900 text-white' },
}

export const GRADE_ORDER = Object.keys(GRADE_TABLE)

export function getGradeColor(grade: string): string {
  if (grade.startsWith('V')) {
    return BOULDER_GRADES[grade]?.colorClass ?? 'bg-gray-500 text-white'
  }
  return GRADE_TABLE[grade]?.colorClass ?? 'bg-gray-500 text-white'
}

export function getGradeLevel(grade: string): ClimbLevel | undefined {
  if (grade.startsWith('V')) return BOULDER_GRADES[grade]?.level
  return GRADE_TABLE[grade]?.level
}

export function convertGrade(grade: string, to: GradeSystem): string {
  if (to === 'yds') return GRADE_TABLE[grade]?.yds ?? grade
  if (to === 'uiaa') return GRADE_TABLE[grade]?.uiaa ?? grade
  if (to === 'hueco' && grade.startsWith('V')) return grade
  return grade
}

export function compareGrades(a: string, b: string): number {
  const indexA = GRADE_ORDER.indexOf(a)
  const indexB = GRADE_ORDER.indexOf(b)
  if (indexA === -1 || indexB === -1) return 0
  return indexA - indexB
}

export function filterViasByGrade<T extends { grado: string }>(
  vias: T[],
  min: string,
  max: string
): T[] {
  return vias.filter(v => compareGrades(v.grado, min) >= 0 && compareGrades(v.grado, max) <= 0)
}
