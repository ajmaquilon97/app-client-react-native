export type Categoria = 'canchas' | 'piscinas' | 'salones';

export type FiltroRapido = 'cercanos' | 'puntuacion' | 'inmediato';

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
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string | null;
  correo: string;
  username: string;
  tipoUsuarioId: number;
  tipoUsuarioNombre: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TarifaDelDia {
  modalidad: string | null;
  precio: number;
  unidad: string | null;
  esPromocion: boolean;
}

export type EstadoHora = 'available' | 'blocked' | 'reserved' | 'closed' | 'maintenance';

export interface HoraEstado {
  hora: number;
  estado: EstadoHora | string;
}

export interface Disponibilidad {
  espacioId: number;
  fecha: string;
  tarifa: TarifaDelDia | null;
  horas: HoraEstado[];
}

export type EstadoReserva = 'pendiente' | 'confirmada' | 'reagendada' | 'cancelada' | 'finalizada';
export type EstadoPago = 'pendiente' | 'pagado_parcialmente' | 'pagado' | 'reembolsado';
export type Asistencia = 'no_registrado' | 'asistio' | 'no_asistio';

export interface ReservaCliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
}

export interface ReservaPago {
  total: number | null;
  pagado: number;
  pendiente: number;
  fechaUltimoPago: string | null;
}

export interface Reserva {
  id: number;
  espacioId: number;
  espacioTitulo: string;
  cliente: ReservaCliente;
  fechaInicio: string;
  fechaFin: string;
  totalHoras: number;
  pax: number;
  estado: EstadoReserva;
  estadoPago: EstadoPago;
  asistencia: Asistencia;
  pago: ReservaPago;
  fechaCreacion: string;
}
