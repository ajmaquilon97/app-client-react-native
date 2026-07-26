import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { LatLng } from '@/utils/geo';

interface UserLocationState {
  coords: LatLng | null;
  loading: boolean;
  error: string | null;
}

export function useUserLocation(enabled: boolean): UserLocationState {
  const [state, setState] = useState<UserLocationState>({
    coords: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (__DEV__) console.log('[useUserLocation] permiso de ubicación:', status);

        if (status !== 'granted') {
          if (!cancelled) {
            setState({ coords: null, loading: false, error: 'Permiso de ubicación denegado.' });
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(async currentPositionError => {
          if (__DEV__) {
            console.log(
              '[useUserLocation] getCurrentPositionAsync falló, probando última ubicación conocida:',
              currentPositionError,
            );
          }
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (!lastKnown) throw currentPositionError;
          return lastKnown;
        });

        if (__DEV__) {
          console.log(
            '[useUserLocation] posición obtenida:',
            position.coords.latitude,
            position.coords.longitude,
          );
        }

        if (!cancelled) {
          setState({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (__DEV__) console.log('[useUserLocation] error obteniendo la ubicación:', err);
        if (!cancelled) {
          setState({ coords: null, loading: false, error: 'No se pudo obtener tu ubicación.' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
