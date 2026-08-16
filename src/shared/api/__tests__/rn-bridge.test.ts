import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

import { initQueryBridge } from '../rn-bridge';

/**
 * En web React Query detecta sola el foco de la pestaña y el estado de la red.
 * En nativo no existe ninguna de las dos señales: sin este puente la app no
 * refresca al volver de segundo plano ni al recuperar la conexión.
 */

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(),
  getNetworkStateAsync: jest.fn(),
}));

const network = Network as jest.Mocked<typeof Network>;

const remove = jest.fn();
let notificarCambioDeRed: ((state: { isConnected: boolean }) => void) | undefined;
let notificarCambioDeApp: ((status: string) => void) | undefined;

beforeAll(() => {
  network.addNetworkStateListener.mockImplementation(((listener: unknown) => {
    notificarCambioDeRed = listener as typeof notificarCambioDeRed;
    return { remove };
  }) as never);
  network.getNetworkStateAsync.mockResolvedValue({ isConnected: true } as never);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_evento: string, cb: never) => {
    notificarCambioDeApp = cb as unknown as typeof notificarCambioDeApp;
    return { remove: jest.fn() };
  }) as never);

  // El módulo guarda un flag de "ya inicializado": una sola llamada para todos
  // los tests, igual que en la app real.
  initQueryBridge();
});

describe('estado de la red', () => {
  it('registra un listener de red al inicializar', () => {
    expect(network.addNetworkStateListener).toHaveBeenCalled();
    expect(notificarCambioDeRed).toBeDefined();
  });

  it('marca la app como offline al perder la conexión', () => {
    notificarCambioDeRed?.({ isConnected: false });

    expect(onlineManager.isOnline()).toBe(false);
  });

  it('la vuelve a marcar online al recuperarla', () => {
    notificarCambioDeRed?.({ isConnected: true });

    expect(onlineManager.isOnline()).toBe(true);
  });

  it('consulta el estado inicial, que el listener no reporta', () => {
    expect(network.getNetworkStateAsync).toHaveBeenCalled();
  });
});

describe('foco de la aplicación', () => {
  it('se suscribe a los cambios de estado de la app', () => {
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('pierde el foco al pasar a segundo plano', () => {
    notificarCambioDeApp?.('background');

    expect(focusManager.isFocused()).toBe(false);
  });

  it('lo recupera al volver al frente', () => {
    notificarCambioDeApp?.('active');

    expect(focusManager.isFocused()).toBe(true);
  });
});

describe('idempotencia', () => {
  it('una segunda llamada no vuelve a suscribirse', () => {
    const llamadasPrevias = network.addNetworkStateListener.mock.calls.length;

    initQueryBridge();

    expect(network.addNetworkStateListener.mock.calls.length).toBe(llamadasPrevias);
  });
});
