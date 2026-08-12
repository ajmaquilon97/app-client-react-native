// Control de acceso — ver docs/frontend-spec-control-acceso.md.

export type EstadoInvitado = 'Pendiente' | 'Enviado' | 'Ingresado';

/**
 * Shape de GET .../invitados y PUT .../invitados/{id} (§4.2/§4.4). Nunca trae
 * tokenQr/codigoCorto — esas credenciales solo viajan por correo al invitado.
 */
export interface Invitado {
  id: string;
  nombre: string;
  correo: string;
  estado: EstadoInvitado;
}

/**
 * Shape de POST .../invitaciones/asignar (§4.1) — deliberadamente distinto de
 * `Invitado`, así lo devuelve el backend para ese endpoint puntual.
 */
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
