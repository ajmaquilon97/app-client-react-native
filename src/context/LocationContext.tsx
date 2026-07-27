import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import * as Location from 'expo-location';
import { LatLng } from '@/utils/geo';

interface LocationContextValue {
  coords: LatLng | null;
  loading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  refresh: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | null>(null);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (__DEV__) console.log('[Location] permiso de ubicación:', status);

      if (status !== 'granted') {
        setCoords(null);
        setError('Permiso de ubicación denegado.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(async currentPositionError => {
        if (__DEV__) {
          console.log(
            '[Location] getCurrentPositionAsync falló, probando última ubicación conocida:',
            currentPositionError,
          );
        }
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (!lastKnown) throw currentPositionError;
        return lastKnown;
      });

      if (__DEV__) {
        console.log(
          '[Location] posición obtenida:',
          position.coords.latitude,
          position.coords.longitude,
        );
      }

      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (err) {
      if (__DEV__) console.log('[Location] error obteniendo la ubicación:', err);
      setCoords(null);
      setError('No se pudo obtener tu ubicación.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Solicita el permiso y captura la ubicación una vez, al abrir la app.
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <LocationContext.Provider value={{ coords, loading, error, permissionStatus, refresh }}>
      {children}
    </LocationContext.Provider>
  );
};

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocationContext must be used within LocationProvider');
  }
  return ctx;
}
