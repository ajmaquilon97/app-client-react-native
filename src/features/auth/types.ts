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

export interface RegistroInput {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

export interface RegistroResult extends AuthTokens {
  id: string;
}
