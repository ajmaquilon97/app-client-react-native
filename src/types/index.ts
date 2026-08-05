export type Categoria = 'canchas' | 'piscinas' | 'salones';

export type FiltroRapido = 'cercanos' | 'puntuacion' | 'inmediato';

export type ModalidadReserva = 'franja_exclusiva' | 'cupo_compartido';

// Mismo shape que devuelve `GET /api/aforo/dia` (ver src/services/aforo.service.ts).
export interface AforoDia {
  fecha: string;
  capacidadTotal: number;
  vendida: number;
  disponible: number;
}

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
  // Ver ModalidadReserva arriba — undefined hasta que backend lo confirme.
  modalidadReserva?: ModalidadReserva;
  maxCapacidad?: number;
  // Si true, el espacio tiene control de aforo (control de acceso por invitados) —
  // ver docs/frontend-spec-control-acceso.md.
  validarAforo?: boolean;
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
  subtotal: number;
  comision: number;
  total: number | null;
  pagado: number;
  pendiente: number;
  fechaUltimoPago: string | null;
}

// Control de acceso (invitados, PIN y kiosco) — ver docs/frontend-spec-control-acceso.md
export type EstadoInvitado = 'Pendiente' | 'Enviado' | 'Ingresado';

// Shape de GET .../invitados y PUT .../invitados/{id} (§4.2/§4.4). Nunca trae
// tokenQr/codigoCorto — esas credenciales solo viajan por correo al invitado.
export interface Invitado {
  id: string;
  nombre: string;
  correo: string;
  estado: EstadoInvitado;
}

// Shape de POST .../invitaciones/asignar (§4.1) — deliberadamente distinto de
// Invitado, así lo devuelve el backend para ese endpoint puntual.
export interface InvitacionAsignada {
  id: string;
  reservaId: number;
  nombreInvitado: string | null;
  correoInvitado: string | null;
  enviada: boolean;
  usada: boolean;
  fechaUso: string | null;
}

export interface InvitadoInput {
  nombre: string;
  correo: string;
}

// POST /api/mobile/auth/recepcion (§4.6)
export interface RecepcionLoginResult {
  accessToken: string;
  reservaId: number;
  expiraEn: string;
}

// POST /api/mobile/recepcion/validar-qr (§4.7)
export interface ValidarQrResult {
  invitadoId: string;
  nombre: string;
}

export interface Reserva {
  id: number;
  codigo: string | null;
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
