// Ver docs/bacend_request/backend-resenas-spec.md.

/**
 * `fechaCreacion` siempre está en UTC, pero el GET la devuelve sin sufijo "Z"
 * (POST/PUT sí lo incluyen) — hay que forzar UTC al parsear en ambos casos.
 */
export interface Resena {
  id: number;
  usuarioId: string;
  usuarioNombre: string;
  espacioId: number;
  reservaId: number;
  titulo: string;
  descripcion: string;
  calificacion: number;
  fechaCreacion: string;
}

/**
 * Reservas propias del usuario en ese espacio que todavía habilitan una reseña
 * (no canceladas, ya terminadas y sin reseña activa). `[]` significa que no hay
 * que mostrar el botón "Escribir reseña".
 */
export interface ReservaResenable {
  reservaId: number;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface CrearResenaInput {
  reservaId: number;
  titulo: string;
  descripcion: string;
  calificacion: number;
}

export interface ResenaInput {
  titulo: string;
  descripcion: string;
  calificacion: number;
}
