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
  registro: (input: RegistroInput) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
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

  const getAccessToken = useCallback(async (): Promise<string> => {
    if (accessToken && !authService.isJwtExpired(accessToken)) {
      return accessToken;
    }
    if (!refreshToken || !user) {
      throw new Error('No hay una sesión activa.');
    }
    const tokens = await authService.refreshTokens(refreshToken);
    await persistSession(tokens.accessToken, tokens.refreshToken, user);
    return tokens.accessToken;
  }, [accessToken, refreshToken, user, persistSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isBootstrapping,
        login,
        registro,
        logout,
        getAccessToken,
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
