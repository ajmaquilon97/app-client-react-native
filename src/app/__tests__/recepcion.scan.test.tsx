import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { ConTema } from '../../../jest/harness';
import RecepcionScanScreen from '../recepcion/scan';

/**
 * El modo kiosco desactiva a propósito todas las vías de escape del sistema: el
 * botón físico de atrás está interceptado, el gesto de retroceso desactivado en
 * el layout y la sesión sobrevive al cierre de la app. Por eso el botón de
 * salida de esta pantalla no es un adorno: es la única forma de salir sin
 * esperar a que caduque el PIN, y su ausencia deja al anfitrión atrapado.
 */

// `require` dentro de la fábrica: `jest.mock` se eleva por encima de los
// `import`, así que aquí todavía no existen los módulos importados arriba.
jest.mock('expo-camera', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  const { View } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    CameraView: (props: Record<string, unknown>) =>
      ReactMock.createElement(View, { ...props, testID: 'camara' }),
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  };
});

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

// El prefijo `mock` es lo único que Jest permite referenciar desde la fábrica
// de `jest.mock`, que se eleva por encima de las declaraciones del módulo.
const mockLogoutKiosk = jest.fn();
const mockFetchAuthorizedKiosk = jest.fn();

jest.mock('@/features/recepcion', () => ({
  useKioskAuth: () => ({
    fetchAuthorizedKiosk: mockFetchAuthorizedKiosk,
    logoutKiosk: mockLogoutKiosk,
  }),
  validarQr: jest.fn(),
}));

const renderPantalla = () => render(<RecepcionScanScreen />, { wrapper: ConTema });

/** Botones del diálogo nativo de la última llamada a `Alert.alert`. */
const botonesDelDialogo = (spy: jest.SpyInstance) =>
  spy.mock.calls[spy.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => alertSpy.mockRestore());

describe('salida del modo recepción', () => {
  it('ofrece siempre una salida visible', async () => {
    await renderPantalla();

    expect(screen.getByLabelText('Salir del modo recepción')).toBeTruthy();
  });

  it('pide confirmación antes de cerrar la sesión de kiosco', async () => {
    await renderPantalla();

    await fireEvent.press(screen.getByLabelText('Salir del modo recepción'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Salir del modo recepción',
      expect.stringContaining('PIN del anfitrión'),
      expect.arrayContaining([expect.objectContaining({ text: 'Cancelar' })]),
    );
    expect(mockLogoutKiosk).not.toHaveBeenCalled();
  });

  it('cierra la sesión al confirmar', async () => {
    await renderPantalla();
    await fireEvent.press(screen.getByLabelText('Salir del modo recepción'));

    botonesDelDialogo(alertSpy).find(b => b.text === 'Salir')?.onPress?.();

    expect(mockLogoutKiosk).toHaveBeenCalled();
  });

  it('no cierra nada si el anfitrión cancela', async () => {
    await renderPantalla();
    await fireEvent.press(screen.getByLabelText('Salir del modo recepción'));

    botonesDelDialogo(alertSpy).find(b => b.text === 'Cancelar')?.onPress?.();

    expect(mockLogoutKiosk).not.toHaveBeenCalled();
  });
});

describe('validación de entradas', () => {
  it('valida el código corto escrito a mano', async () => {
    mockFetchAuthorizedKiosk.mockResolvedValue({ nombre: 'Kelly Ramírez' });
    await renderPantalla();

    await fireEvent.changeText(
      screen.getByPlaceholderText('Código corto (6 caracteres)'),
      'A1B2C3',
    );
    await fireEvent.press(screen.getByText('Validar'));

    await waitFor(() => expect(screen.getByText('Kelly Ramírez')).toBeTruthy());
    expect(screen.getByText('Ingreso registrado')).toBeTruthy();
  });

  it('la salida sigue disponible tras validar una entrada', async () => {
    mockFetchAuthorizedKiosk.mockResolvedValue({ nombre: 'Kelly Ramírez' });
    await renderPantalla();

    await fireEvent.changeText(
      screen.getByPlaceholderText('Código corto (6 caracteres)'),
      'A1B2C3',
    );
    await fireEvent.press(screen.getByText('Validar'));
    await waitFor(() => expect(screen.getByText('Ingreso registrado')).toBeTruthy());

    expect(screen.getByLabelText('Salir del modo recepción')).toBeTruthy();
  });
});
