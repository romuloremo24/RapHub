let cachedUF: { value: number; date: string } | null = null;

export async function getUFValue(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  if (cachedUF && cachedUF.date === today) return cachedUF.value;

  const res = await fetch('https://mindicador.cl/api/uf');
  const data = await res.json();
  const value = data.serie?.[0]?.valor;
  if (!value) throw new Error('Failed to fetch UF value');

  cachedUF = { value, date: today };
  return value;
}

export function clpToUF(clp: number, ufValue: number): number {
  return Math.round((clp / ufValue) * 100) / 100;
}

export function ufToCLP(uf: number, ufValue: number): number {
  return Math.round(uf * ufValue);
}
