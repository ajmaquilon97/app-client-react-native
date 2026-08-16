import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import { Espacio } from '@/features/espacios';

import DatafastPaymentModal from '../components/DatafastPaymentModal';
import PaymentModal from '../components/PaymentModal';
import { DATAFAST_CONFIG, PAYMENT_PROVIDER, getPaymentConfig } from '../config';
import * as datafastService from '../services/datafast.service';

/**
 * Checkout de Datafast. El widget de la pasarela vive dentro de un WebView y
 * "termina" navegando a un scheme propio (`datafast-checkout://…`) con el
 * `resourcePath` de la transacción; la app intercepta esa navegación, nunca la
 * deja ocurrir, y le pide al backend que verifique el resultado real.
 *
 * Se prueban las cuatro salidas del flujo: no se pudo abrir el checkout, pago
 * aprobado, pago rechazado y respuesta ilegible de la pasarela.
 */

jest.mock('../services/datafast.service', () => ({
  crearCheckoutDatafast: jest.fn(),
  verificarPagoDatafast: jest.fn(),
}));

jest.mock('../services/datafastDirectUat', () => ({
  crearCheckoutDatafastDirecto: jest.fn(),
  verificarPagoDatafastDirecto: jest.fn(),
  registrarTransaccionDirecta: jest.fn(),
}));

const service = datafastService as jest.Mocked<typeof datafastService>;

const URL_RESULTADO = `${DATAFAST_CONFIG.shopperResultUrl}?resourcePath=%2Fv1%2Fcheckouts%2FABC%2Fpayment`;

const espacio = { id: 10, nombre: 'Cancha El Campín', unidad: 'hora' } as Espacio;

const renderModal = (props: Partial<React.ComponentProps<typeof DatafastPaymentModal>> = {}) =>
  render(
    <DatafastPaymentModal
      visible
      espacio={espacio}
      fecha="20/08/2026 · 10:00–12:00"
      cantidad={2}
      total="66.00"
      reservaId={99}
      onClose={jest.fn()}
      onSuccess={jest.fn()}
      {...props}
    />,
    { wrapper: ConTema },
  );

/** Simula que el widget terminó y navegó al scheme de resultado. */
async function terminaElWidget(url = URL_RESULTADO) {
  const webview = screen.getByTestId('webview');
  await fireEvent(webview, 'shouldStartLoadWithRequest', { url });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  service.crearCheckoutDatafast.mockResolvedValue({ checkoutId: 'CHK-1' });
  service.verificarPagoDatafast.mockResolvedValue({
    aprobado: true,
    transactionId: 'TX-9001',
    resultCode: '000.100.110',
    mensaje: 'Aprobada',
    reserva: { id: 99 } as never,
  });
});

afterEach(() => (console.log as jest.Mock).mockRestore());

describe('apertura del checkout', () => {
  it('no pinta nada sin espacio', async () => {
    const { toJSON } = await renderModal({ espacio: null });

    expect(toJSON()).toBeNull();
  });

  it('no pinta nada sin reserva creada', async () => {
    const { toJSON } = await renderModal({ reservaId: null });

    expect(toJSON()).toBeNull();
  });

  it('pide el checkout al backend al abrirse', async () => {
    await renderModal();

    await waitFor(() => expect(service.crearCheckoutDatafast).toHaveBeenCalledWith(99));
  });

  it('no pide nada mientras el modal está cerrado', async () => {
    await renderModal({ visible: false });

    expect(service.crearCheckoutDatafast).not.toHaveBeenCalled();
  });

  it('avisa mientras crea el checkout', async () => {
    service.crearCheckoutDatafast.mockReturnValue(new Promise(() => {}));
    await renderModal();

    expect(screen.getByText('Iniciando pago con Datafast…')).toBeTruthy();
  });

  it('carga el widget con el checkoutId recibido', async () => {
    await renderModal();

    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());
    expect(screen.getByTestId('webview').props.source.html).toContain('CHK-1');
  });

  it('muestra el error si el backend no pudo abrir el checkout', async () => {
    service.crearCheckoutDatafast.mockRejectedValue(new Error('Comercio no habilitado.'));
    await renderModal();

    await waitFor(() => expect(screen.getByText('Comercio no habilitado.')).toBeTruthy());
    expect(screen.queryByTestId('webview')).toBeNull();
  });

  it('reintentar vuelve a pedir el checkout', async () => {
    service.crearCheckoutDatafast.mockRejectedValueOnce(new Error('Timeout'));
    await renderModal();
    await waitFor(() => expect(screen.getByText('Reintentar pago')).toBeTruthy());

    await fireEvent.press(screen.getByText('Reintentar pago'));

    await waitFor(() => expect(service.crearCheckoutDatafast).toHaveBeenCalledTimes(2));
  });
});

describe('resultado del widget', () => {
  it('intercepta la navegación al scheme de resultado en vez de seguirla', async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    const permitir = screen
      .getByTestId('webview')
      .props.onShouldStartLoadWithRequest({ url: URL_RESULTADO });

    expect(permitir).toBe(false);
  });

  it('deja pasar cualquier otra navegación del widget', async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    const permitir = screen
      .getByTestId('webview')
      .props.onShouldStartLoadWithRequest({ url: 'https://eu-test.oppwa.com/v1/paymentWidgets.js' });

    expect(permitir).toBe(true);
  });

  it('verifica contra el backend el resourcePath que devolvió la pasarela', async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    await terminaElWidget();

    await waitFor(() =>
      expect(service.verificarPagoDatafast).toHaveBeenCalledWith(
        99,
        '/v1/checkouts/ABC/payment',
      ),
    );
  });

  it('confirma el pago aprobado con su código de transacción', async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    await terminaElWidget();

    await waitFor(() => expect(screen.getByText('¡Pago Autorizado!')).toBeTruthy());
    expect(screen.getByText('TX-9001')).toBeTruthy();
    expect(screen.getByText('$66.00')).toBeTruthy();
  });

  it('avisa al padre que el pago ya quedó registrado en backend', async () => {
    const onSuccess = jest.fn();
    await renderModal({ onSuccess });
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());
    await terminaElWidget();
    await waitFor(() => expect(screen.getByText('Ver mis reservas')).toBeTruthy());

    await fireEvent.press(screen.getByText('Ver mis reservas'));

    expect(onSuccess).toHaveBeenCalledWith({
      transactionId: 'TX-9001',
      amount: '66.00',
      pagoYaRegistrado: true,
    });
  });

  it('muestra el motivo cuando la pasarela rechaza el pago', async () => {
    service.verificarPagoDatafast.mockResolvedValue({
      aprobado: false,
      transactionId: '',
      resultCode: '800.100.151',
      mensaje: 'Tarjeta sin fondos.',
      reserva: { id: 99 } as never,
    });
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    await terminaElWidget();

    await waitFor(() => expect(screen.getByText('Tarjeta sin fondos.')).toBeTruthy());
  });

  it('cae a un mensaje propio si el rechazo llega sin motivo', async () => {
    service.verificarPagoDatafast.mockResolvedValue({
      aprobado: false,
      transactionId: '',
      resultCode: '800.100.151',
      mensaje: '',
      reserva: { id: 99 } as never,
    });
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    await terminaElWidget();

    await waitFor(() => expect(screen.getByText('El pago fue rechazado.')).toBeTruthy());
  });

  it('muestra el error si la verificación contra el backend falla', async () => {
    service.verificarPagoDatafast.mockRejectedValue(new Error('Backend no responde.'));
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    await terminaElWidget();

    await waitFor(() => expect(screen.getByText('Backend no responde.')).toBeTruthy());
  });

  it('avisa si la URL de resultado no trae resourcePath', async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    await terminaElWidget(DATAFAST_CONFIG.shopperResultUrl);

    await waitFor(() =>
      expect(screen.getByText('No se recibió una respuesta válida de Datafast.')).toBeTruthy(),
    );
    expect(service.verificarPagoDatafast).not.toHaveBeenCalled();
  });

  it('procesa el resultado una sola vez aunque lleguen las dos señales', async () => {
    // La verificación queda en vuelo para que el WebView siga montado y pueda
    // emitir la segunda señal, como pasa en Android.
    service.verificarPagoDatafast.mockReturnValue(new Promise(() => {}));
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    await terminaElWidget();
    await fireEvent(screen.getByTestId('webview'), 'navigationStateChange', {
      url: URL_RESULTADO,
    });

    expect(service.verificarPagoDatafast).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Verificando el pago con Datafast…')).toBeTruthy();
  });

  it('también acepta el resultado por onNavigationStateChange, como respaldo', async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    await fireEvent(screen.getByTestId('webview'), 'navigationStateChange', {
      url: URL_RESULTADO,
    });

    await waitFor(() => expect(service.verificarPagoDatafast).toHaveBeenCalled());
  });

  it('ignora una navegación sin URL', async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByTestId('webview')).toBeTruthy());

    await fireEvent(screen.getByTestId('webview'), 'navigationStateChange', { url: '' });

    expect(service.verificarPagoDatafast).not.toHaveBeenCalled();
  });
});

describe('selector de pasarela', () => {
  it('la app está configurada contra Datafast', () => {
    expect(PAYMENT_PROVIDER).toBe('datafast');
    expect(getPaymentConfig()).toBe(DATAFAST_CONFIG);
  });

  it('PaymentModal delega en la pasarela configurada', async () => {
    await render(
      <PaymentModal
        visible
        espacio={espacio}
        fecha="20/08/2026"
        cantidad={2}
        total="66.00"
        reservaId={99}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />,
      { wrapper: ConTema },
    );

    expect(screen.getByText('Pago Datafast (UAT)')).toBeTruthy();
  });
});
