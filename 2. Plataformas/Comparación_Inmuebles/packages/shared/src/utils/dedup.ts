import { createHash } from 'crypto';

export function contentHash(title: string, address: string | null, bedrooms: number | null, bathrooms: number | null, area: number | null): string {
  const raw = [
    title.toLowerCase().trim(),
    (address || '').toLowerCase().trim(),
    bedrooms ?? '',
    bathrooms ?? '',
    area ?? '',
  ].join('|');
  return createHash('md5').update(raw).digest('hex');
}

function areaBucket(area: number): number {
  return Math.round(area / 5) * 5;
}

export function fingerprint(address: string | null, operation: string, propertyType: string, area: number | null): string {
  const raw = [
    (address || '').toLowerCase().replace(/\s+/g, ' ').trim(),
    operation,
    propertyType,
    area ? areaBucket(area) : '',
  ].join('|');
  return createHash('md5').update(raw).digest('hex');
}
