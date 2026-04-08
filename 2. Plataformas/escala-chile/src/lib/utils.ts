import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import slugifyLib from 'slugify'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createSlug(text: string): string {
  return slugifyLib(text, { lower: true, strict: true, locale: 'es' })
}

export function formatPrice(clp: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(clp)
}
