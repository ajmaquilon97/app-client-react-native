// Los tipos del catálogo de espacios viven ahora en
// src/features/espacios/types.ts.

// Mismo shape que devuelve `GET /api/aforo/dia`. Pasa a features/reservas en la fase 6.
export interface AforoDia {
  fecha: string;
  capacidadTotal: number;
  vendida: number;
  disponible: number;
}

// Los tipos de listas de favoritos viven ahora en src/features/favoritos/types.ts.

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

// Los tipos de invitados y de recepción/kiosco viven ahora en
// src/features/invitados/types.ts y src/features/recepcion/types.ts.

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

// GET /api/reservas/{id}/factura — estado de las facturas electrónicas (SRI) de la
// reserva. Una reserva pagada genera dos: fee de plataforma y alquiler del espacio.
// El swagger no publica un schema formal para `FacturaStatusResponse` (solo la
// describe en prosa), así que los campos opcionales/nullable son una suposición
// defensiva hasta confirmar con backend — la UI debe tolerar que cualquiera falte.
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

// Los tipos de reseñas viven ahora en src/features/resenas/types.ts.

// GET /api/mobile/reservas/{reservaId}/facturas (plural) — arreglo plano de las
// facturas ya AUTORIZADAS de una reserva, con sus URLs de descarga. Ver
// docs/feedback-mobile-facturacion.md. Ordenado de la más reciente a la más antigua.
// pdfUrl/xmlUrl son URLs pre-firmadas de S3 que expiran en `urlsExpiranEnSegundos`
// (hoy 3600) — pedir fresco justo antes de descargar, nunca cachear.
export type TipoFactura = 'fee_plataforma' | 'reserva_espacio';

export interface FacturaDescarga {
  facturaId: string;
  reservaId: number;
  codigoReserva: string;
  tipoFactura: TipoFactura | string;
  // Ya viene traducido a lenguaje de usuario — usar tal cual, no re-traducir el enum.
  descripcion: string;
  emisorRazonSocial: string;
  // Este sí distingue una factura de otra (el legal es el mismo en las dos) — usar
  // como título de cada fila, no `tipoFactura`.
  emisorNombreComercial: string | null;
  numeroComprobante: string;
  claveAcceso: string;
  numeroAutorizacion: string | null;
  // ISO-8601 sin sufijo de zona — el valor está en UTC.
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
