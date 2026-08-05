import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as recepcionService from '@/services/recepcion.service';

// Sesión de kiosco: completamente separada de AuthContext (ver
// docs/frontend-spec-control-acceso.md — el JWT de recepción no representa a un
// usuario, no tiene refresh token, y nunca debe pisar la sesión del cliente).
const KIOSK_ACCESS_TOKEN_KEY = 'kiosk_access_token';
const KIOSK_RESERVA_ID_KEY = 'kiosk_reserva_id';
const KIOSK_EXPIRA_EN_KEY = 'kiosk_expira_en';

interface KioskSession {
  accessToken: string;
  reservaId: number;
  expiraEn: string;
}

interface KioskAuthContextValue {
  session: KioskSession | null;
  isKioskAuthenticated: boolean;
  isBootstrapping: boolean;
  loginKiosk: (pin: string) => Promise<void>;
  logoutKiosk: () => Promise<void>;
  fetchAuthorizedKiosk: <T>(request: (accessToken: string) => Promise<T>) => Promise<T>;
}

const KioskAuthContext = createContext<KioskAuthContextValue | null>(null);

interface KioskAuthProviderProps {
  children: ReactNode;
}

export const KioskAuthProvider: React.FC<KioskAuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistSession = useCallback(async (newSession: KioskSession) => {
    await SecureStore.setItemAsync(KIOSK_ACCESS_TOKEN_KEY, newSession.accessToken);
    await SecureStore.setItemAsync(KIOSK_RESERVA_ID_KEY, String(newSession.reservaId));
    await SecureStore.setItemAsync(KIOSK_EXPIRA_EN_KEY, newSession.expiraEn);
    setSession(newSession);
  }, []);

  const clearSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(KIOSK_ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(KIOSK_RESERVA_ID_KEY);
    await SecureStore.deleteItemAsync(KIOSK_EXPIRA_EN_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [accessToken, reservaIdRaw, expiraEn] = await Promise.all([
          SecureStore.getItemAsync(KIOSK_ACCESS_TOKEN_KEY),
          SecureStore.getItemAsync(KIOSK_RESERVA_ID_KEY),
          SecureStore.getItemAsync(KIOSK_EXPIRA_EN_KEY),
        ]);

        if (!accessToken || !reservaIdRaw || !expiraEn) return;

        // No hay refresh para kiosco — si ya venció, ni intentamos restaurarla.
        if (new Date(expiraEn).getTime() <= Date.now()) {
          await clearSession();
          return;
        }

        setSession({ accessToken, reservaId: Number(reservaIdRaw), expiraEn });
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, [clearSession]);

  const loginKiosk = useCallback(
    async (pin: string) => {
      const result = await recepcionService.loginRecepcion(pin);
      await persistSession(result);
    },
    [persistSession],
  );

  const logoutKiosk = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  // Sin refresh-and-retry: el 401 se maneja donde se llama (para mostrar el mensaje
  // del backend antes de volver a la pantalla de PIN).
  const fetchAuthorizedKiosk = useCallback(
    async <T,>(request: (accessToken: string) => Promise<T>): Promise<T> => {
      if (!session) throw new Error('No hay una sesión de kiosco activa.');
      return request(session.accessToken);
    },
    [session],
  );

  return (
    <KioskAuthContext.Provider
      value={{
        session,
        isKioskAuthenticated: !!session,
        isBootstrapping,
        loginKiosk,
        logoutKiosk,
        fetchAuthorizedKiosk,
      }}>
      {children}
    </KioskAuthContext.Provider>
  );
};

export function useKioskAuth(): KioskAuthContextValue {
  const ctx = useContext(KioskAuthContext);
  if (!ctx) {
    throw new Error('useKioskAuth must be used within KioskAuthProvider');
  }
  return ctx;
}
