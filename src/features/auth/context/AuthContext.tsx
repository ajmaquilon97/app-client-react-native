import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { setTokenProvider } from '@/shared/api/client';

import * as authService from '../services/auth.service';
import { RegistroInput, Usuario } from '../types';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

interface AuthContextValue {
  user: Usuario | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  registro: (input: RegistroInput) => Promise<void>;
  logout: () => Promise<void>;
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
      if (__DEV__) console.log('[AuthContext] loginWithGoogle: invocando authService.loginWithGoogle...');
      const { accessToken, refreshToken: newRefreshToken } =
        await authService.loginWithGoogle(idToken);
      if (__DEV__) console.log('[AuthContext] loginWithGoogle: tokens recibidos del backend.');
      const userId = authService.decodeJwtSubject(accessToken);
      if (__DEV__) console.log('[AuthContext] loginWithGoogle: userId extraído del accessToken:', userId);
      if (!userId) throw new Error('No se pudo interpretar la sesión recibida.');
      const usuario = await authService.fetchUsuario(userId, accessToken);
      if (__DEV__) console.log('[AuthContext] loginWithGoogle: usuario obtenido:', usuario);
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
    // Sin esto, el SDK nativo de Google recuerda la última cuenta y el próximo
    // signIn() la reutiliza en silencio en vez de mostrar el selector de cuentas.
    try {
      await GoogleSignin.signOut();
    } catch {
      // No hay sesión de Google activa (login por email/password) u otro error no crítico.
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

  // El cliente HTTP vive fuera del árbol de React, así que la sesión se le
  // inyecta aquí. Con esto, el 401 → refresh → reintento deja de ser algo que
  // cada llamada tenga que envolver: lo aplica el cliente a todas.
  useEffect(() => {
    setTokenProvider({
      getAccessToken,
      refresh: refreshSession,
      onAuthFailure: clearSession,
    });
    return () => setTokenProvider(null);
  }, [getAccessToken, refreshSession, clearSession]);

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
