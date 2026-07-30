import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { Usuario } from '@/types';
import * as authService from '@/services/auth.service';
import { ApiError } from '@/services/apiError';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

interface RegistroInput {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: Usuario | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  registro: (input: RegistroInput) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
  fetchAuthorized: <T>(request: (accessToken: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistSession = useCallback(
    async (newAccessToken: string, newRefreshToken: string, usuario: Usuario) => {
      if (__DEV__) {
        console.log('[Auth] Sesión establecida', {
          usuarioId: usuario.id,
          correo: usuario.correo,
          accessToken: newAccessToken,
        });
      }
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setUser(usuario);
    },
    [],
  );

  const clearSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const storedAccessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

        if (!storedAccessToken || !storedRefreshToken) {
          return;
        }

        let accessToken = storedAccessToken;
        let userId = authService.decodeJwtSubject(accessToken);

        try {
          if (!userId) throw new Error('token sin sub');
          const usuario = await authService.fetchUsuario(userId, accessToken);
          setUser(usuario);
          setAccessToken(accessToken);
          setRefreshToken(storedRefreshToken);
          return;
        } catch {
          const tokens = await authService.refreshTokens(storedRefreshToken);
          accessToken = tokens.accessToken;
          userId = authService.decodeJwtSubject(accessToken);
          if (!userId) throw new Error('token renovado sin sub');
          const usuario = await authService.fetchUsuario(userId, accessToken);
          await persistSession(tokens.accessToken, tokens.refreshToken, usuario);
        }
      } catch {
        await clearSession();
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, [persistSession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken, refreshToken: newRefreshToken } = await authService.login(
        email,
        password,
      );
      const userId = authService.decodeJwtSubject(accessToken);
      if (!userId) throw new Error('No se pudo interpretar la sesión recibida.');
      const usuario = await authService.fetchUsuario(userId, accessToken);
      await persistSession(accessToken, newRefreshToken, usuario);
    },
    [persistSession],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const { accessToken, refreshToken: newRefreshToken } =
        await authService.loginWithGoogle(idToken);
      const userId = authService.decodeJwtSubject(accessToken);
      if (!userId) throw new Error('No se pudo interpretar la sesión recibida.');
      const usuario = await authService.fetchUsuario(userId, accessToken);
      await persistSession(accessToken, newRefreshToken, usuario);
    },
    [persistSession],
  );

  const registro = useCallback(
    async (input: RegistroInput) => {
      const { id, accessToken, refreshToken: newRefreshToken } = await authService.registro(
        input,
      );
      const usuario = await authService.fetchUsuario(id, accessToken);
      await persistSession(accessToken, newRefreshToken, usuario);
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    await clearSession();
  }, [refreshToken, clearSession]);

  // Fuerza un refresh contra el backend, sin importar lo que diga el JWT localmente.
  // Si el refresh token también es inválido, no hay forma de recuperar la sesión.
  const refreshSession = useCallback(async (): Promise<string> => {
    if (!refreshToken || !user) {
      throw new Error('No hay una sesión activa.');
    }
    const tokens = await authService.refreshTokens(refreshToken);
    await persistSession(tokens.accessToken, tokens.refreshToken, user);
    return tokens.accessToken;
  }, [refreshToken, user, persistSession]);

  const getAccessToken = useCallback(async (): Promise<string> => {
    if (accessToken && !authService.isJwtExpired(accessToken)) {
      return accessToken;
    }
    try {
      return await refreshSession();
    } catch (err) {
      // El refresh token expiró o fue revocado: no hay sesión que salvar, cerramos sesión.
      await clearSession();
      throw err;
    }
  }, [accessToken, refreshSession, clearSession]);

  // Ejecuta `request` con un access token válido. Si el backend responde 401 pese a que el
  // token parecía vigente localmente (reloj desincronizado, token revocado, etc.), fuerza un
  // refresh y reintenta una sola vez. Si el refresh también falla, cierra la sesión en vez de
  // dejar la UI en un estado autenticado "roto" que nunca puede recuperar datos.
  const fetchAuthorized = useCallback(
    async <T,>(request: (accessToken: string) => Promise<T>): Promise<T> => {
      const token = await getAccessToken();
      try {
        return await request(token);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) {
          throw err;
        }
        try {
          const freshToken = await refreshSession();
          return await request(freshToken);
        } catch {
          await clearSession();
          throw err;
        }
      }
    },
    [getAccessToken, refreshSession, clearSession],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isBootstrapping,
        login,
        loginWithGoogle,
        registro,
        logout,
        getAccessToken,
        fetchAuthorized,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
