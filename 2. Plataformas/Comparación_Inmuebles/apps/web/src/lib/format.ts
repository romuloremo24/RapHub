export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

export function formatUF(value: number): string {
  return `UF ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}`;
}

export function formatArea(m2: number): string {
  return `${new Intl.NumberFormat('es-CL').format(m2)} m²`;
}
