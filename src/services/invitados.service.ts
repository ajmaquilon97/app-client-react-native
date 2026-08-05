import { API_BASE_URL } from '@/config/api';
import { Invitado, InvitacionAsignada, InvitadoInput } from '@/types';
import { ApiError, throwIfNotOk } from '@/services/apiError';

// Ver docs/frontend-spec-control-acceso.md — §4.1 usa el namespace no-mobile
// (/api/reservas), el resto usa /api/mobile/reservas.
const RESERVAS_URL = `${API_BASE_URL}/reservas`;
const MOBILE_RESERVAS_URL = `${API_BASE_URL}/mobile/reservas`;

function authHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

// reenviar/asignar/editar necesitan más que throwIfNotOk: reenviar expone el
// header Retry-After del 429, y asignar/editar necesitan distinguir el 400 de
// validación (trae `errors`) del 400 de regla de negocio (invitado ya ingresó,
// tope de reenvíos) — ambos vienen con el mismo status pero deben mostrarse distinto.
export class InvitadoApiError extends ApiError {
  retryAfterSeconds?: number;
  hasFieldErrors?: boolean;

  constructor(
    message: string,
    status: number,
    extra?: { retryAfterSeconds?: number; hasFieldErrors?: boolean },
  ) {
    super(message, status);
    this.name = 'InvitadoApiError';
    this.retryAfterSeconds = extra?.retryAfterSeconds;
    this.hasFieldErrors = extra?.hasFieldErrors;
  }
}

async function throwIfInvitadoError(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;

  const raw = await res.text().catch(() => '');
  if (__DEV__ && raw) console.log(`[invitados] ${res.status} ${res.url}:`, raw);

  let message = fallback;
  let hasFieldErrors = false;
  if (raw) {
    try {
      const body = JSON.parse(raw);
      if (typeof body === 'string') {
        message = body || fallback;
      } else {
        message = body?.message || body?.title || fallback;
        hasFieldErrors = !!body?.errors;
      }
    } catch {
      message = raw;
    }
  }

  let retryAfterSeconds: number | undefined;
  if (res.status === 429) {
    const header = res.headers.get('Retry-After');
    const parsed = header ? Number(header) : NaN;
    retryAfterSeconds = Number.isFinite(parsed) ? parsed : undefined;
  }

  throw new InvitadoApiError(message, res.status, { retryAfterSeconds, hasFieldErrors });
}

// POST /api/reservas/{id}/invitaciones/asignar (§4.1) — reparte entradas del pool a
// la lista de invitados, una por invitado. Incremental y repetible: se puede llamar
// varias veces con pocos invitados cada vez.
export async function asignarInvitados(
  reservaId: number,
  invitados: InvitadoInput[],
  accessToken: string,
): Promise<InvitacionAsignada[]> {
  const res = await fetch(`${RESERVAS_URL}/${reservaId}/invitaciones/asignar`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(invitados),
  });
  await throwIfInvitadoError(res, 'No se pudieron asignar los invitados.');
  return res.json();
}

// GET /api/mobile/reservas/{reservaId}/invitados (§4.2)
export async function fetchInvitados(reservaId: number, accessToken: string): Promise<Invitado[]> {
  const res = await fetch(`${MOBILE_RESERVAS_URL}/${reservaId}/invitados`, {
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(res, 'No se pudieron obtener los invitados.');
  return res.json();
}

// POST .../invitados/{invitadoId}/reenviar (§4.3) — máx. 3 reenvíos, 5 min de espera.
export async function reenviarInvitado(
  reservaId: number,
  invitadoId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${MOBILE_RESERVAS_URL}/${reservaId}/invitados/${invitadoId}/reenviar`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  await throwIfInvitadoError(res, 'No se pudo reenviar la credencial.');
}

// PUT .../invitados/{invitadoId} (§4.4) — corrige nombre/correo y regenera
// credenciales (invalida las anteriores, resetea el contador de reenvíos).
export async function editarInvitado(
  reservaId: number,
  invitadoId: string,
  input: InvitadoInput,
  accessToken: string,
): Promise<Invitado> {
  const res = await fetch(`${MOBILE_RESERVAS_URL}/${reservaId}/invitados/${invitadoId}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
  await throwIfInvitadoError(res, 'No se pudo editar el invitado.');
  return res.json();
}
