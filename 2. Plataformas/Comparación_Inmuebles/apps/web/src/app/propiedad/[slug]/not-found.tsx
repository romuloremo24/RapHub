import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-text">Propiedad no encontrada</h1>
      <p className="mt-2 text-text-muted">Es posible que haya sido eliminada o que el enlace sea incorrecto.</p>
      <a href="/" className="mt-6 inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light">
        <ArrowLeft size={16} /> Volver al inicio
      </a>
    </div>
  );
}
