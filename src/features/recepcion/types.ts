// Control de acceso, modo kiosco — ver docs/frontend-spec-control-acceso.md.

/** POST /api/mobile/auth/recepcion (§4.6) */
export interface RecepcionLoginResult {
  accessToken: string;
  reservaId: number;
  expiraEn: string;
}

/** POST /api/mobile/recepcion/validar-qr (§4.7) */
export interface ValidarQrResult {
  invitadoId: string;
  nombre: string;
}
