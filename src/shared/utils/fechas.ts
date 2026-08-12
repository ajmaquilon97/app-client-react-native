export function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatHora(hora: number): string {
  return `${hora.toString().padStart(2, '0')}:00`;
}

export function toDateOnlyString(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const d = fecha.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toLocalDateTimeString(fecha: Date, hora: number): string {
  const h = hora.toString().padStart(2, '0');
  return `${toDateOnlyString(fecha)}T${h}:00:00`;
}

export function formatRangoReserva(fechaInicioIso: string, fechaFinIso: string): string {
  const inicio = new Date(fechaInicioIso);
  const fin = new Date(fechaFinIso);
  const horaInicio = inicio.getHours();
  const horaFin = fin.getHours();
  return `${formatFecha(inicio)} · ${formatHora(horaInicio)}–${formatHora(horaFin)}`;
}
