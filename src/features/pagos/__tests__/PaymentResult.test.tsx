import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import PaymentResult from '../components/PaymentResult';

/**
 * Pantalla final del pago. Es lo último que ve el cliente, así que tiene dos
 * reglas propias: en el caso exitoso redirige sola a las reservas pasado un
 * momento, y en el fallido nunca redirige — el cliente decide si reintenta o
 * abandona.
 */

const renderResultado = (props: Partial<React.ComponentProps<typeof PaymentResult>> = {}) =>
  render(
    <PaymentResult
      status="success"
      amount="66.00"
      fecha="20/08/2026"
      onContinue={jest.fn()}
      onRetry={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />,
    { wrapper: ConTema },
  );

describe('pago autorizado', () => {
  it('confirma la transacción y muestra el desglose', async () => {
    await renderResultado({ transactionId: 'TX-9001' });

    expect(screen.getByText('¡Pago Autorizado!')).toBeTruthy();
    expect(screen.getByText('TX-9001')).toBeTruthy();
    expect(screen.getByText('$66.00')).toBeTruthy();
    expect(screen.getByText('20/08/2026')).toBeTruthy();
  });

  it('omite la fila del código si el backend no lo devolvió', async () => {
    await renderResultado();

    expect(screen.queryByText('Código de Reserva:')).toBeNull();
    expect(screen.getByText('Monto Debitado:')).toBeTruthy();
  });

  it('permite continuar de inmediato sin esperar la redirección', async () => {
    const onContinue = jest.fn();
    await renderResultado({ onContinue });

    await fireEvent.press(screen.getByText('Ver mis reservas'));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('redirige sola a las reservas pasados unos segundos', async () => {
    jest.useFakeTimers();
    const onContinue = jest.fn();
    await renderResultado({ onContinue });

    expect(onContinue).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('cancela la redirección si la pantalla se cierra antes', async () => {
    jest.useFakeTimers();
    const onContinue = jest.fn();
    const { unmount } = await renderResultado({ onContinue });

    await act(async () => {
      unmount();
    });
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(onContinue).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('pago rechazado', () => {
  it('muestra el motivo que devolvió la pasarela', async () => {
    await renderResultado({ status: 'error', errorMessage: 'Fondos insuficientes.' });

    expect(screen.getByText('Pago Rechazado')).toBeTruthy();
    expect(screen.getByText('Fondos insuficientes.')).toBeTruthy();
  });

  it('cae a un mensaje genérico si la pasarela no explica el rechazo', async () => {
    await renderResultado({ status: 'error' });

    expect(screen.getByText(/No pudimos procesar tu pago/)).toBeTruthy();
  });

  it('ofrece reintentar', async () => {
    const onRetry = jest.fn();
    await renderResultado({ status: 'error', onRetry });

    await fireEvent.press(screen.getByText('Reintentar pago'));

    expect(onRetry).toHaveBeenCalled();
  });

  it('ofrece abandonar el flujo', async () => {
    const onCancel = jest.fn();
    await renderResultado({ status: 'error', onCancel });

    await fireEvent.press(screen.getByText('Cancelar'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('nunca redirige solo tras un rechazo', async () => {
    jest.useFakeTimers();
    const onContinue = jest.fn();
    await renderResultado({ status: 'error', onContinue });

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(onContinue).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
