export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generatePropertySlug(
  type: string,
  bedrooms: number | null,
  bathrooms: number | null,
  commune: string,
  id: string
): string {
  const parts = [type.slice(0, 5)];
  if (bedrooms) parts.push(`${bedrooms}d`);
  if (bathrooms) parts.push(`${bathrooms}b`);
  parts.push(slugify(commune));
  parts.push(id.slice(0, 8));
  return parts.join('-');
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}

export function formatUF(amount: number): string {
  return `UF ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount)}`;
}
