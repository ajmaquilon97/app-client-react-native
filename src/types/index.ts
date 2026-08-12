/**
 * Solo quedan aquí los tipos de sesión, que pasan a `features/auth` en la
 * fase 7. El resto vive en la feature que los usa:
 *
 *   - catálogo de espacios → src/features/espacios/types.ts
 *   - reservas, disponibilidad, aforo y facturación → src/features/reservas/types.ts
 *   - listas de favoritos → src/features/favoritos/types.ts
 *   - invitados → src/features/invitados/types.ts
 *   - recepción / kiosco → src/features/recepcion/types.ts
 *   - reseñas → src/features/resenas/types.ts
 */

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
