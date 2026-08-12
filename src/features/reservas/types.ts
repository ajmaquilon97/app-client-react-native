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

/* -------------------------------------------------------------------------- */
/*  Disponibilidad y aforo                                                     */
/* -------------------------------------------------------------------------- */

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

/** Mismo shape que devuelve `GET /api/aforo/dia`. */
export interface AforoDia {
  fecha: string;
  capacidadTotal: number;
  vendida: number;
  disponible: number;
}

/* -------------------------------------------------------------------------- */
/*  Facturación                                                                */
/* -------------------------------------------------------------------------- */

export interface FacturacionInput {
  identificacion: string;
  nombre: string;
  correo: string;
}

export interface CrearReservaInput {
  espacioId: number;
  fechaInicio: string;
  fechaFin: string;
  totalHoras: number;
  /**
   * Opcional — si el cliente no completa estos datos, se manda "consumidor
   * final". Pendiente de contrato en backend (ver FEEDBACK_BACKEND_FACTURACION.md):
   * `ReservaRequest` hoy tiene `additionalProperties: false`, así que hasta que
   * backend lo acepte explícitamente es posible que se rechace o se ignore.
   */
  facturacion?: FacturacionInput;
  /**
   * Cantidad de entradas para espacios `cupo_compartido` (piscinas). Backend
   * valida el aforo del día contra este valor y responde 409 si se excede (ver
   * docs/instrucciones-equipo-mobile-modalidades-reserva.md §2.3-2.4).
   */
  pax?: number;
}

/**
 * GET /api/reservas/{id}/factura — estado de las facturas electrónicas (SRI).
 * Una reserva pagada genera dos: fee de plataforma y alquiler del espacio.
 * El swagger no publica un schema formal, así que los campos opcionales son una
 * suposición defensiva: la UI debe tolerar que cualquiera falte.
 */
export type EstadoFactura =
  | 'Procesando'
  | 'Recibida'
  | 'Autorizada'
  | 'Devuelta'
  | 'No autorizada'
  | 'Error';

export interface FacturaStatus {
  id: string;
  tipoFactura: string | null;
  estado: EstadoFactura | string;
  numeroComprobante: string | null;
  claveAcceso: string | null;
  fechaEmision: string | null;
  fechaAutorizacion: string | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  motivoRechazo: string | null;
}

export type TipoFactura = 'fee_plataforma' | 'reserva_espacio';

/**
 * GET /api/mobile/reservas/{reservaId}/facturas (plural) — facturas ya
 * AUTORIZADAS con sus URLs de descarga. Ver docs/feedback-mobile-facturacion.md.
 * `pdfUrl`/`xmlUrl` son URLs pre-firmadas de S3 que expiran en
 * `urlsExpiranEnSegundos` (hoy 3600): pedir fresco antes de descargar, nunca cachear.
 */
export interface FacturaDescarga {
  facturaId: string;
  reservaId: number;
  codigoReserva: string;
  tipoFactura: TipoFactura | string;
  /** Ya viene traducido a lenguaje de usuario — usar tal cual. */
  descripcion: string;
  emisorRazonSocial: string;
  /** Esto distingue una factura de otra (el legal es el mismo en las dos). */
  emisorNombreComercial: string | null;
  numeroComprobante: string;
  claveAcceso: string;
  numeroAutorizacion: string | null;
  /** ISO-8601 sin sufijo de zona — el valor está en UTC. */
  fechaAutorizacion: string | null;
  subtotal: number;
  iva: number;
  total: number;
  pdfUrl: string | null;
  xmlUrl: string | null;
  urlsExpiranEnSegundos: number;
  nombreArchivoPdf: string;
  nombreArchivoXml: string;
}
