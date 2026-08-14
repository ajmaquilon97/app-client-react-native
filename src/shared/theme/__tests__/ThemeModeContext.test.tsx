import React from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { ThemeModeProvider, useThemeMode } from '../ThemeModeContext';

/**
 * El modo de tema combina dos fuentes: la preferencia guardada por el usuario y
 * el esquema que reporta el sistema operativo. Se prueba la resolución entre
 * ambas y que una preferencia corrupta en el llavero no rompa el arranque.
 */

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const esquemaDelSistema = useColorScheme as unknown as jest.Mock;

const CLAVE = 'theme_mode';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeModeProvider>{children}</ThemeModeProvider>
);

const montarTema = () => renderHook(() => useThemeMode(), { wrapper });

beforeEach(() => {
  jest.clearAllMocks();
  esquemaDelSistema.mockReturnValue('light');
  secureStore.getItemAsync.mockResolvedValue(null);
});

describe('preferencia guardada', () => {
  it('arranca en "system" cuando el usuario nunca eligió', async () => {
    const { result } = await montarTema();

    expect(result.current.mode).toBe('system');
  });

  it('restaura la preferencia guardada', async () => {
    secureStore.getItemAsync.mockResolvedValue('dark');

    const { result } = await montarTema();

    await waitFor(() => expect(result.current.mode).toBe('dark'));
    expect(secureStore.getItemAsync).toHaveBeenCalledWith(CLAVE);
  });

  it('ignora un valor guardado que no es un modo válido', async () => {
    secureStore.getItemAsync.mockResolvedValue('fucsia');

    const { result } = await montarTema();

    expect(result.current.mode).toBe('system');
  });

  it('no rompe el arranque si el llavero falla al leer', async () => {
    secureStore.getItemAsync.mockRejectedValue(new Error('llavero bloqueado'));

    const { result } = await montarTema();

    expect(result.current.mode).toBe('system');
  });
});

describe('resolución del esquema de color', () => {
  it('sigue al sistema en modo "system"', async () => {
    esquemaDelSistema.mockReturnValue('dark');

    const { result } = await montarTema();

    expect(result.current.colorScheme).toBe('dark');
  });

  it('cae a claro si el sistema no reporta esquema', async () => {
    esquemaDelSistema.mockReturnValue(null);

    const { result } = await montarTema();

    expect(result.current.colorScheme).toBe('light');
  });

  it('la elección explícita del usuario gana sobre el sistema', async () => {
    esquemaDelSistema.mockReturnValue('dark');
    const { result } = await montarTema();

    await act(async () => {
      result.current.setMode('light');
    });

    expect(result.current.mode).toBe('light');
    expect(result.current.colorScheme).toBe('light');
  });
});

describe('setMode', () => {
  it('aplica el cambio y lo persiste', async () => {
    const { result } = await montarTema();

    await act(async () => {
      result.current.setMode('dark');
    });

    expect(result.current.colorScheme).toBe('dark');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(CLAVE, 'dark');
  });

  it('aplica el cambio aunque no se pueda persistir', async () => {
    secureStore.setItemAsync.mockRejectedValue(new Error('llavero bloqueado'));
    const { result } = await montarTema();

    await act(async () => {
      result.current.setMode('dark');
    });

    expect(result.current.mode).toBe('dark');
  });
});

describe('useThemeMode', () => {
  it('falla de forma explícita fuera del provider', async () => {
    await expect(renderHook(() => useThemeMode())).rejects.toThrow(
      'useThemeMode must be used within ThemeModeProvider',
    );
  });
});
