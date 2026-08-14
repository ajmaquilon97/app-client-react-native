import React from 'react';
import { Alert } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import { crearQueryClient, conProviders } from '../../../../jest/harness';

import AsignarInvitadosForm from '../components/AsignarInvitadosForm';
import InvitadoRow from '../components/InvitadoRow';
import EditarInvitadoModal from '../components/EditarInvitadoModal';
import { InvitadoApiError } from '../errors';
import { invitadosQueryKey } from '../hooks/useInvitados';
import * as invitadosService from '../services/invitados.service';
import { Invitado } from '../types';

/**
 * Módulo de invitaciones QR desde el lado del anfitrión: repartir entradas del
 * pool de la reserva, corregir datos (que regenera credenciales) y reenviar la
 * credencial con los límites que impone el backend — 3 reenvíos y 5 minutos de
 * espera entre uno y otro.
 */

jest.mock('../services/invitados.service', () => ({
  asignarInvitados: jest.fn(),
  fetchInvitados: jest.fn(),
  reenviarInvitado: jest.fn(),
  editarInvitado: jest.fn(),
}));

const service = invitadosService as jest.Mocked<typeof invitadosService>;

const RESERVA_ID = 55;

const invitado = (overrides: Partial<Invitado> = {}): Invitado =>
  ({
    id: 'inv-1',
    nombre: 'Kelly Ramírez',
    correo: 'kelly@agora.ec',
    estado: 'Enviado',
    ...overrides,
  }) as Invitado;

let queryClient: QueryClient;
let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = crearQueryClient();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  service.asignarInvitados.mockResolvedValue([]);
  service.reenviarInvitado.mockResolvedValue(undefined);
  service.editarInvitado.mockResolvedValue(invitado());
});

afterEach(() => {
  alertSpy.mockRestore();
  queryClient.clear();
});

describe('AsignarInvitadosForm', () => {
  const renderFormulario = (disponibleEstimado: number | null = 5) =>
    render(
      <AsignarInvitadosForm reservaId={RESERVA_ID} disponibleEstimado={disponibleEstimado} />,
      { wrapper: conProviders(queryClient) },
    );

  const llenarFila = async (indice: number, nombre: string, correo: string) => {
    const nombres = screen.getAllByPlaceholderText('Nombre');
    const correos = screen.getAllByPlaceholderText('correo@ejemplo.com');
    await fireEvent.changeText(nombres[indice], nombre);
    await fireEvent.changeText(correos[indice], correo);
  };

  it('arranca con una sola fila y sin opción de quitarla', async () => {
    await renderFormulario();

    expect(screen.getByText('Invitado 1')).toBeTruthy();
    expect(screen.queryByText('Quitar')).toBeNull();
  });

  it('anuncia cuántas entradas quedan del pool', async () => {
    await renderFormulario(3);

    expect(screen.getByText('Puedes agregar hasta 3 invitado(s) más.')).toBeTruthy();
  });

  it('omite el aviso si todavía no se conoce el cupo', async () => {
    await renderFormulario(null);

    expect(screen.queryByText(/Puedes agregar hasta/)).toBeNull();
  });

  it('agrega filas hasta el cupo disponible y no más', async () => {
    await renderFormulario(2);

    await fireEvent.press(screen.getByText('+ Agregar otro invitado'));
    expect(screen.getByText('Invitado 2')).toBeTruthy();

    await fireEvent.press(screen.getByText('+ Agregar otro invitado'));
    expect(screen.queryByText('Invitado 3')).toBeNull();
  });

  it('permite quitar una fila cuando hay más de una', async () => {
    await renderFormulario();
    await fireEvent.press(screen.getByText('+ Agregar otro invitado'));

    await fireEvent.press(screen.getAllByText('Quitar')[1]);

    expect(screen.queryByText('Invitado 2')).toBeNull();
  });

  it('exige el nombre de cada invitado', async () => {
    await renderFormulario();
    await llenarFila(0, '   ', 'kelly@agora.ec');

    await fireEvent.press(screen.getByText('Asignar invitados'));

    expect(screen.getByText('Completa el nombre de cada invitado.')).toBeTruthy();
    expect(service.asignarInvitados).not.toHaveBeenCalled();
  });

  it('exige un correo con formato válido', async () => {
    await renderFormulario();
    await llenarFila(0, 'Kelly', 'kelly-arroba-agora');

    await fireEvent.press(screen.getByText('Asignar invitados'));

    expect(
      screen.getByText('Revisa que todos los correos tengan un formato válido.'),
    ).toBeTruthy();
    expect(service.asignarInvitados).not.toHaveBeenCalled();
  });

  it('manda los datos ya recortados y limpia el formulario al terminar', async () => {
    await renderFormulario();
    await llenarFila(0, '  Kelly Ramírez  ', '  kelly@agora.ec  ');

    await fireEvent.press(screen.getByText('Asignar invitados'));

    await waitFor(() =>
      expect(service.asignarInvitados).toHaveBeenCalledWith(RESERVA_ID, [
        { nombre: 'Kelly Ramírez', correo: 'kelly@agora.ec' },
      ]),
    );
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText('Nombre')[0].props.value).toBe(''),
    );
  });

  it('refresca la lista de invitados tras asignar', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    await renderFormulario();
    await llenarFila(0, 'Kelly', 'kelly@agora.ec');

    await fireEvent.press(screen.getByText('Asignar invitados'));

    await waitFor(() =>
      expect(invalidar).toHaveBeenCalledWith({ queryKey: invitadosQueryKey(RESERVA_ID) }),
    );
  });

  it('avisa aparte cuando el backend responde que no hay cupo', async () => {
    service.asignarInvitados.mockRejectedValue(
      new InvitadoApiError('Solo quedan 2 entradas.', 409),
    );
    await renderFormulario();
    await llenarFila(0, 'Kelly', 'kelly@agora.ec');

    await fireEvent.press(screen.getByText('Asignar invitados'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No hay suficiente cupo',
        'Solo quedan 2 entradas.',
        expect.anything(),
      ),
    );
  });

  it('muestra en línea los errores de validación del backend', async () => {
    service.asignarInvitados.mockRejectedValue(
      new InvitadoApiError('Datos inválidos', 400, { hasFieldErrors: true }),
    );
    await renderFormulario();
    await llenarFila(0, 'Kelly', 'kelly@agora.ec');

    await fireEvent.press(screen.getByText('Asignar invitados'));

    await waitFor(() => expect(screen.getByText(/Revisa los datos ingresados/)).toBeTruthy());
  });

  it('cae al aviso genérico ante cualquier otro fallo', async () => {
    service.asignarInvitados.mockRejectedValue(new Error('Servidor no disponible'));
    await renderFormulario();
    await llenarFila(0, 'Kelly', 'kelly@agora.ec');

    await fireEvent.press(screen.getByText('Asignar invitados'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudieron asignar los invitados',
        'Servidor no disponible',
        expect.anything(),
      ),
    );
  });
});

describe('InvitadoRow', () => {
  const renderFila = (datos: Invitado = invitado()) =>
    render(<InvitadoRow reservaId={RESERVA_ID} invitado={datos} />, {
      wrapper: conProviders(queryClient),
    });

  it('muestra nombre, correo y estado del invitado', async () => {
    await renderFila();

    expect(screen.getByText('Kelly Ramírez')).toBeTruthy();
    expect(screen.getByText('kelly@agora.ec')).toBeTruthy();
    expect(screen.getByText('Enviado')).toBeTruthy();
  });

  it('rellena los huecos cuando el invitado llegó incompleto', async () => {
    await renderFila(invitado({ nombre: '', correo: '' }));

    expect(screen.getByText('Sin nombre')).toBeTruthy();
    expect(screen.getByText('Sin correo')).toBeTruthy();
  });

  it('marca a quien ya ingresó y le quita la opción de editar', async () => {
    await renderFila(invitado({ estado: 'Ingresado' }));

    expect(screen.getByText('✓ Ingresó')).toBeTruthy();
    expect(screen.queryByText('Editar')).toBeNull();
  });

  it('reenvía la credencial y lo confirma', async () => {
    await renderFila();

    await fireEvent.press(screen.getByText('Reenviar'));

    await waitFor(() => expect(service.reenviarInvitado).toHaveBeenCalledWith(RESERVA_ID, 'inv-1'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Reenviada',
        'Se reenvió la credencial al correo del invitado.',
        expect.anything(),
      ),
    );
  });

  it('al agotar los 3 reenvíos deshabilita el botón para siempre', async () => {
    service.reenviarInvitado.mockRejectedValue(
      new InvitadoApiError('Límite de reenvíos alcanzado', 400),
    );
    await renderFila();

    await fireEvent.press(screen.getByText('Reenviar'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Límite alcanzado',
        expect.stringContaining('3 veces'),
        expect.anything(),
      ),
    );

    await fireEvent.press(screen.getByText('Reenviar'));
    expect(service.reenviarInvitado).toHaveBeenCalledTimes(1);
  });

  it('respeta el Retry-After del 429 y muestra la cuenta atrás', async () => {
    jest.useFakeTimers();
    service.reenviarInvitado.mockRejectedValue(
      new InvitadoApiError('Demasiadas solicitudes', 429, { retryAfterSeconds: 120 }),
    );
    await renderFila();

    await fireEvent.press(screen.getByText('Reenviar'));

    await waitFor(() => expect(screen.getByText('Reenviar (120s)')).toBeTruthy());

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText('Reenviar (117s)')).toBeTruthy();

    jest.useRealTimers();
  });

  it('usa 5 minutos de espera si el backend no manda Retry-After', async () => {
    jest.useFakeTimers();
    service.reenviarInvitado.mockRejectedValue(
      new InvitadoApiError('Demasiadas solicitudes', 429),
    );
    await renderFila();

    await fireEvent.press(screen.getByText('Reenviar'));

    await waitFor(() => expect(screen.getByText('Reenviar (300s)')).toBeTruthy());
    jest.useRealTimers();
  });

  it('vuelve a habilitar el reenvío cuando expira la espera', async () => {
    jest.useFakeTimers();
    service.reenviarInvitado.mockRejectedValue(
      new InvitadoApiError('Demasiadas solicitudes', 429, { retryAfterSeconds: 2 }),
    );
    await renderFila();

    await fireEvent.press(screen.getByText('Reenviar'));
    await waitFor(() => expect(screen.getByText('Reenviar (2s)')).toBeTruthy());

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Reenviar')).toBeTruthy();
    jest.useRealTimers();
  });

  it('avisa con el mensaje del backend ante otros fallos', async () => {
    service.reenviarInvitado.mockRejectedValue(new Error('Correo rebotado'));
    await renderFila();

    await fireEvent.press(screen.getByText('Reenviar'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudo reenviar',
        'Correo rebotado',
        expect.anything(),
      ),
    );
  });

  it('abre el formulario de corrección desde la fila', async () => {
    await renderFila();

    await fireEvent.press(screen.getByText('Editar'));

    expect(screen.getByText('Corregir invitado')).toBeTruthy();
  });
});

describe('EditarInvitadoModal', () => {
  const renderModal = (props: Partial<React.ComponentProps<typeof EditarInvitadoModal>> = {}) =>
    render(
      <EditarInvitadoModal
        visible
        reservaId={RESERVA_ID}
        invitado={invitado()}
        onClose={jest.fn()}
        onSaved={jest.fn()}
        {...props}
      />,
      { wrapper: conProviders(queryClient) },
    );

  it('no pinta nada mientras está cerrado', async () => {
    await renderModal({ visible: false });

    expect(screen.queryByText('Corregir invitado')).toBeNull();
  });

  it('no pinta nada si no hay invitado que corregir', async () => {
    await renderModal({ invitado: null });

    expect(screen.queryByText('Corregir invitado')).toBeNull();
  });

  it('arranca con los datos actuales del invitado', async () => {
    await renderModal();

    expect(screen.getByPlaceholderText('Nombre del invitado').props.value).toBe('Kelly Ramírez');
    expect(screen.getByPlaceholderText('correo@ejemplo.com').props.value).toBe('kelly@agora.ec');
  });

  it('exige un nombre no vacío', async () => {
    await renderModal();
    await fireEvent.changeText(screen.getByPlaceholderText('Nombre del invitado'), '   ');

    await fireEvent.press(screen.getByText('Guardar y reenviar'));

    expect(screen.getByText('El nombre no puede estar vacío.')).toBeTruthy();
    expect(service.editarInvitado).not.toHaveBeenCalled();
  });

  it('exige un correo válido', async () => {
    await renderModal();
    await fireEvent.changeText(screen.getByPlaceholderText('correo@ejemplo.com'), 'sin-arroba');

    await fireEvent.press(screen.getByText('Guardar y reenviar'));

    expect(screen.getByText('Ingresa un correo válido.')).toBeTruthy();
  });

  it('guarda los cambios, avisa al padre y cierra', async () => {
    const onClose = jest.fn();
    const onSaved = jest.fn();
    await renderModal({ onClose, onSaved });
    await fireEvent.changeText(screen.getByPlaceholderText('Nombre del invitado'), 'Kelly R.');

    await fireEvent.press(screen.getByText('Guardar y reenviar'));

    await waitFor(() =>
      expect(service.editarInvitado).toHaveBeenCalledWith(RESERVA_ID, 'inv-1', {
        nombre: 'Kelly R.',
        correo: 'kelly@agora.ec',
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('reemplaza al invitado en el cache sin recargar la lista', async () => {
    const actualizado = invitado({ nombre: 'Kelly R.' });
    service.editarInvitado.mockResolvedValue(actualizado);
    queryClient.setQueryData<Invitado[]>(invitadosQueryKey(RESERVA_ID), [
      invitado(),
      invitado({ id: 'inv-2', nombre: 'Otro' }),
    ]);
    await renderModal();

    await fireEvent.press(screen.getByText('Guardar y reenviar'));

    await waitFor(() =>
      expect(queryClient.getQueryData<Invitado[]>(invitadosQueryKey(RESERVA_ID))).toEqual([
        actualizado,
        expect.objectContaining({ id: 'inv-2' }),
      ]),
    );
  });

  it('muestra el error del backend sin cerrar el formulario', async () => {
    const onClose = jest.fn();
    service.editarInvitado.mockRejectedValue(new Error('Ese correo ya está en la reserva.'));
    await renderModal({ onClose });

    await fireEvent.press(screen.getByText('Guardar y reenviar'));

    await waitFor(() =>
      expect(screen.getByText('Ese correo ya está en la reserva.')).toBeTruthy(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
