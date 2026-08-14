import React from 'react';
import * as Location from 'expo-location';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { LocationProvider, useLocationContext } from '../LocationContext';

/**
 * La ubicación alimenta el orden por distancia del catálogo. El contexto tiene
 * que degradar bien: sin permiso, sin GPS o con el GPS lento, la app sigue
 * funcionando con `coords` en null en vez de quedarse colgada.
 */

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const location = Location as jest.Mocked<typeof Location>;

const posicion = (latitude: number, longitude: number) =>
  ({ coords: { latitude, longitude } }) as Location.LocationObject;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LocationProvider>{children}</LocationProvider>
);

async function montarUbicacion() {
  const { result } = await renderHook(() => useLocationContext(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  location.requestForegroundPermissionsAsync.mockResolvedValue({
    status: 'granted',
  } as Location.LocationPermissionResponse);
  location.getCurrentPositionAsync.mockResolvedValue(posicion(-2.170998, -79.922359));
});

afterEach(() => {
  (console.log as jest.Mock).mockRestore();
});

describe('captura inicial', () => {
  it('pide permiso y publica las coordenadas al montar', async () => {
    const result = await montarUbicacion();

    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(result.current.coords).toEqual({ latitude: -2.170998, longitude: -79.922359 });
    expect(result.current.permissionStatus).toBe('granted');
    expect(result.current.error).toBeNull();
  });

  it('no consulta el GPS si el usuario negó el permiso', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as Location.LocationPermissionResponse);

    const result = await montarUbicacion();

    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(result.current.coords).toBeNull();
    expect(result.current.error).toBe('Permiso de ubicación denegado.');
  });
});

describe('degradación ante fallos del GPS', () => {
  it('usa la última ubicación conocida si la lectura en vivo falla', async () => {
    location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS sin señal'));
    location.getLastKnownPositionAsync.mockResolvedValue(posicion(-0.180653, -78.467834));

    const result = await montarUbicacion();

    expect(result.current.coords).toEqual({ latitude: -0.180653, longitude: -78.467834 });
    expect(result.current.error).toBeNull();
  });

  it('reporta error si no hay lectura en vivo ni última conocida', async () => {
    location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS sin señal'));
    location.getLastKnownPositionAsync.mockResolvedValue(null);

    const result = await montarUbicacion();

    expect(result.current.coords).toBeNull();
    expect(result.current.error).toBe('No se pudo obtener tu ubicación.');
  });

  it('reporta error si el permiso mismo revienta', async () => {
    location.requestForegroundPermissionsAsync.mockRejectedValue(new Error('servicio caído'));

    const result = await montarUbicacion();

    expect(result.current.error).toBe('No se pudo obtener tu ubicación.');
    expect(result.current.loading).toBe(false);
  });
});

describe('refresh manual', () => {
  it('vuelve a consultar y limpia el error anterior', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
    } as Location.LocationPermissionResponse);
    const result = await montarUbicacion();
    expect(result.current.error).toBe('Permiso de ubicación denegado.');

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.coords).toEqual({ latitude: -2.170998, longitude: -79.922359 });
  });
});

describe('useLocationContext', () => {
  it('falla de forma explícita fuera del provider', async () => {
    await expect(renderHook(() => useLocationContext())).rejects.toThrow(
      'useLocationContext must be used within LocationProvider',
    );
  });
});
