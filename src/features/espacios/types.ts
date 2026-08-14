export type Categoria = 'canchas' | 'piscinas' | 'salones';

export type FiltroRapido = 'cercanos' | 'puntuacion' | 'inmediato';

/**
 * Cómo se reserva el espacio: una franja horaria en exclusiva, o entradas
 * sueltas contra el aforo del día. Ver
 * docs/instrucciones-equipo-mobile-modalidades-reserva.md.
 */
export type ModalidadReserva = 'franja_exclusiva' | 'cupo_compartido';

export interface Anfitrion {
  nombre: string;
  avatar: string;
  registro: string;
  verificado: boolean;
}

export interface Comentario {
  usuario: string;
  rating: number;
  fecha: string;
  texto: string;
}

/** Modelo de dominio. El DTO del backend no sale del servicio. */
export interface Espacio {
  id: number;
  nombre: string;
  categoria: Categoria;
  subcategoria: string;
  ubicacion: string;
  precio: number;
  unidad: string;
  rating: number;
  reviews: number;
  distancia: number;
  latitud: number | null;
  longitud: number | null;
  disponibleHoy: boolean;
  imagen: string;
  descripcion: string;
  servicios: string[];
  anfitrion: Anfitrion;
  normas: string[];
  comentarios: Comentario[];
  // Ver ModalidadReserva arriba — undefined hasta que backend lo confirme.
  modalidadReserva?: ModalidadReserva;
  maxCapacidad?: number;
  // Si true, el espacio tiene control de aforo (control de acceso por
  // invitados) — ver docs/frontend-spec-control-acceso.md.
  validarAforo?: boolean;
}
