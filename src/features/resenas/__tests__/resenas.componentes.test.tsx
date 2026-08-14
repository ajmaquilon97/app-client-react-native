import React from 'react';
import { Alert } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { crearQueryClient, conProviders } from '../../../../jest/harness';
import { ESPACIOS_QUERY_KEY } from '@/features/espacios';

import ResenaSection from '../components/ResenaSection';
import EscribirResenaForm from '../components/EscribirResenaForm';
import MiResenaCard from '../components/MiResenaCard';
import EditarResenaModal from '../components/EditarResenaModal';
import { ResenaApiError } from '../errors';
import { resenasEspacioQueryKey, reservasResenablesQueryKey } from '../hooks/useResenas';
import * as resenasService from '../services/resenas.service';
import { Resena, ReservaResenable } from '../types';

/**
 * Una reseña solo puede escribirla quien tuvo una reserva cumplida en ese
 * espacio, y una sola vez por reserva. La sección decide cuál de los tres
 * estados mostrar (escribir / mi reseña / no disponible) y las mutaciones
 * mantienen sincronizados el listado, las reservas reseñables y el promedio de
 * calificación del catálogo.
 */

jest.mock('@/features/auth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

jest.mock('../services/resenas.service', () => ({
  fetchResenasEspacio: jest.fn(),
  fetchReservasResenables: jest.fn(),
  crearResena: jest.fn(),
  actualizarResena: jest.fn(),
  eliminarResena: jest.fn(),
}));

const service = resenasService as jest.Mocked<typeof resenasService>;

const ESPACIO_ID = 10;
const RESERVA_ID = 77;

const resena = (overrides: Partial<Resena> = {}): Resena =>
  ({
    id: 1,
    reservaId: RESERVA_ID,
    titulo: 'Excelente cancha',
    descripcion: 'El césped estaba impecable.',
    calificacion: 5,
    fechaCreacion: '2026-08-01T14:30:00',
    ...overrides,
  }) as Resena;

const resenable = (reservaId = RESERVA_ID): ReservaResenable => ({ reservaId }) as ReservaResenable;

let queryClient: QueryClient;
let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = crearQueryClient();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  service.fetchResenasEspacio.mockResolvedValue([]);
  service.fetchReservasResenables.mockResolvedValue([resenable()]);
  service.crearResena.mockResolvedValue(resena());
  service.actualizarResena.mockResolvedValue(resena());
  service.eliminarResena.mockResolvedValue(undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
  queryClient.clear();
});

describe('ResenaSection', () => {
  const renderSeccion = () =>
    render(<ResenaSection espacioId={ESPACIO_ID} reservaId={RESERVA_ID} />, {
      wrapper: conProviders(queryClient),
    });

  it('ofrece el formulario cuando la reserva está disponible para reseñar', async () => {
    await renderSeccion();

    await waitFor(() => expect(screen.getByText('Cuéntanos cómo te fue')).toBeTruthy());
  });

  it('muestra la reseña ya escrita en vez del formulario', async () => {
    service.fetchResenasEspacio.mockResolvedValue([resena()]);
    await renderSeccion();

    await waitFor(() => expect(screen.getByText('Excelente cancha')).toBeTruthy());
    expect(screen.queryByText('Cuéntanos cómo te fue')).toBeNull();
  });

  it('avisa cuando la reserva ya no admite reseña', async () => {
    service.fetchReservasResenables.mockResolvedValue([resenable(999)]);
    await renderSeccion();

    await waitFor(() =>
      expect(screen.getByText('Esta reserva ya no está disponible para reseñar.')).toBeTruthy(),
    );
  });

  it('permite reintentar si alguna de las dos consultas falla', async () => {
    service.fetchResenasEspacio.mockRejectedValue(new Error('Backend caído'));
    await renderSeccion();

    await waitFor(() =>
      expect(screen.getByText('⚠️ No se pudo cargar la información de reseñas.')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(service.fetchResenasEspacio).toHaveBeenCalledTimes(2));
  });
});

describe('EscribirResenaForm', () => {
  const renderFormulario = () =>
    render(<EscribirResenaForm espacioId={ESPACIO_ID} reservaId={RESERVA_ID} />, {
      wrapper: conProviders(queryClient),
    });

  const completar = async (titulo = 'Muy buena', descripcion = 'Todo perfecto.') => {
    await fireEvent.press(screen.getByLabelText('4 estrellas'));
    await fireEvent.changeText(screen.getByPlaceholderText('Título de tu reseña'), titulo);
    await fireEvent.changeText(
      screen.getByPlaceholderText('Cuéntanos los detalles de tu experiencia'),
      descripcion,
    );
  };

  it('exige una calificación antes que nada', async () => {
    await renderFormulario();

    await fireEvent.press(screen.getByText('Publicar reseña'));

    expect(screen.getByText('Selecciona una calificación de 1 a 5 estrellas.')).toBeTruthy();
    expect(service.crearResena).not.toHaveBeenCalled();
  });

  it('exige un título', async () => {
    await renderFormulario();
    await fireEvent.press(screen.getByLabelText('5 estrellas'));

    await fireEvent.press(screen.getByText('Publicar reseña'));

    expect(screen.getByText('El título es obligatorio.')).toBeTruthy();
  });

  it('exige una descripción', async () => {
    await renderFormulario();
    await fireEvent.press(screen.getByLabelText('5 estrellas'));
    await fireEvent.changeText(screen.getByPlaceholderText('Título de tu reseña'), 'Bien');

    await fireEvent.press(screen.getByText('Publicar reseña'));

    expect(screen.getByText('La descripción es obligatoria.')).toBeTruthy();
  });

  it('lleva la cuenta de caracteres de cada campo', async () => {
    await renderFormulario();

    await fireEvent.changeText(screen.getByPlaceholderText('Título de tu reseña'), 'Hola');

    expect(screen.getByText('4/200')).toBeTruthy();
    expect(screen.getByText('0/1000')).toBeTruthy();
  });

  it('recorta el título al máximo que acepta el backend', async () => {
    await renderFormulario();

    await fireEvent.changeText(screen.getByPlaceholderText('Título de tu reseña'), 'x'.repeat(250));

    expect(screen.getByText('200/200')).toBeTruthy();
  });

  it('recorta la descripción al máximo que acepta el backend', async () => {
    await renderFormulario();

    await fireEvent.changeText(
      screen.getByPlaceholderText('Cuéntanos los detalles de tu experiencia'),
      'y'.repeat(1200),
    );

    expect(screen.getByText('1000/1000')).toBeTruthy();
  });

  it('publica con los textos recortados y vacía el formulario', async () => {
    await renderFormulario();
    await completar('  Muy buena  ', '  Todo perfecto.  ');

    await fireEvent.press(screen.getByText('Publicar reseña'));

    await waitFor(() =>
      expect(service.crearResena).toHaveBeenCalledWith(ESPACIO_ID, {
        reservaId: RESERVA_ID,
        titulo: 'Muy buena',
        descripcion: 'Todo perfecto.',
        calificacion: 4,
      }),
    );
    await waitFor(() => expect(screen.getByText('0/200')).toBeTruthy());
  });

  it('inserta la reseña nueva al principio del listado cacheado', async () => {
    const previa = resena({ id: 2, reservaId: 88, titulo: 'De otra reserva' });
    queryClient.setQueryData<Resena[]>(resenasEspacioQueryKey(ESPACIO_ID), [previa]);
    await renderFormulario();
    await completar();

    await fireEvent.press(screen.getByText('Publicar reseña'));

    await waitFor(() =>
      expect(queryClient.getQueryData<Resena[]>(resenasEspacioQueryKey(ESPACIO_ID))).toEqual([
        resena(),
        previa,
      ]),
    );
  });

  it('la reserva reseñada deja de estar disponible', async () => {
    queryClient.setQueryData<ReservaResenable[]>(reservasResenablesQueryKey(ESPACIO_ID), [
      resenable(),
      resenable(88),
    ]);
    await renderFormulario();
    await completar();

    await fireEvent.press(screen.getByText('Publicar reseña'));

    await waitFor(() =>
      expect(
        queryClient.getQueryData<ReservaResenable[]>(reservasResenablesQueryKey(ESPACIO_ID)),
      ).toEqual([resenable(88)]),
    );
  });

  it('refresca el catálogo, que lleva el promedio de calificación', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    await renderFormulario();
    await completar();

    await fireEvent.press(screen.getByText('Publicar reseña'));

    await waitFor(() =>
      expect(invalidar).toHaveBeenCalledWith({ queryKey: ESPACIOS_QUERY_KEY }),
    );
  });

  it('avisa aparte si la reserva ya tenía reseña', async () => {
    service.crearResena.mockRejectedValue(new ResenaApiError('Esta reserva ya fue reseñada.', 409));
    await renderFormulario();
    await completar();

    await fireEvent.press(screen.getByText('Publicar reseña'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudo publicar',
        'Esta reserva ya fue reseñada.',
        expect.anything(),
      ),
    );
  });

  it('muestra en línea los errores por campo del backend', async () => {
    service.crearResena.mockRejectedValue(
      new ResenaApiError('Datos inválidos', 400, {
        titulo: ['El título es muy corto.'],
        calificacion: ['Fuera de rango.'],
      }),
    );
    await renderFormulario();
    await completar();

    await fireEvent.press(screen.getByText('Publicar reseña'));

    await waitFor(() =>
      expect(screen.getByText('El título es muy corto. Fuera de rango.')).toBeTruthy(),
    );
  });

  it('cae al aviso genérico ante cualquier otro fallo', async () => {
    service.crearResena.mockRejectedValue(new Error('Sin conexión'));
    await renderFormulario();
    await completar();

    await fireEvent.press(screen.getByText('Publicar reseña'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudo publicar tu reseña',
        'Sin conexión',
        expect.anything(),
      ),
    );
  });
});

describe('MiResenaCard', () => {
  const renderTarjeta = (datos: Resena = resena()) =>
    render(<MiResenaCard espacioId={ESPACIO_ID} resena={datos} />, {
      wrapper: conProviders(queryClient),
    });

  it('muestra calificación, título, descripción y fecha', async () => {
    await renderTarjeta();

    expect(screen.getByText('5.0')).toBeTruthy();
    expect(screen.getByText('Excelente cancha')).toBeTruthy();
    expect(screen.getByText('El césped estaba impecable.')).toBeTruthy();
  });

  it('interpreta como UTC la fecha que llega sin zona horaria', async () => {
    await renderTarjeta(resena({ fechaCreacion: '2026-08-01T14:30:00' }));
    const conZona = await render(
      <MiResenaCard espacioId={ESPACIO_ID} resena={resena({ fechaCreacion: '2026-08-01T14:30:00Z' })} />,
      { wrapper: conProviders(queryClient) },
    );

    // Ambas formas tienen que rendir la misma fecha.
    expect(conZona.toJSON()).toBeTruthy();
  });

  it('pide confirmación antes de eliminar', async () => {
    await renderTarjeta();

    await fireEvent.press(screen.getByText('Eliminar'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Eliminar reseña',
      expect.stringContaining('no se puede deshacer'),
      expect.arrayContaining([expect.objectContaining({ text: 'Cancelar' })]),
    );
    expect(service.eliminarResena).not.toHaveBeenCalled();
  });

  it('elimina al confirmar y la quita del listado cacheado', async () => {
    queryClient.setQueryData<Resena[]>(resenasEspacioQueryKey(ESPACIO_ID), [
      resena(),
      resena({ id: 2, reservaId: 88 }),
    ]);
    await renderTarjeta();
    await fireEvent.press(screen.getByText('Eliminar'));

    // Se ejecuta la acción destructiva del diálogo nativo.
    const botones = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await botones.find(b => b.text === 'Eliminar')?.onPress?.();

    await waitFor(() => expect(service.eliminarResena).toHaveBeenCalledWith(ESPACIO_ID, 1));
    await waitFor(() =>
      expect(queryClient.getQueryData<Resena[]>(resenasEspacioQueryKey(ESPACIO_ID))).toEqual([
        resena({ id: 2, reservaId: 88 }),
      ]),
    );
  });

  it('avisa si el backend rechaza el borrado', async () => {
    service.eliminarResena.mockRejectedValue(new Error('No autorizado'));
    await renderTarjeta();
    await fireEvent.press(screen.getByText('Eliminar'));

    const botones = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await botones.find(b => b.text === 'Eliminar')?.onPress?.();

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudo eliminar',
        'No autorizado',
        expect.anything(),
      ),
    );
  });

  it('abre el formulario de edición', async () => {
    await renderTarjeta();

    await fireEvent.press(screen.getByText('Editar'));

    expect(screen.getByText('Editar reseña')).toBeTruthy();
  });
});

describe('EditarResenaModal', () => {
  const renderModal = (props: Partial<React.ComponentProps<typeof EditarResenaModal>> = {}) =>
    render(
      <EditarResenaModal
        visible
        espacioId={ESPACIO_ID}
        resena={resena()}
        onClose={jest.fn()}
        {...props}
      />,
      { wrapper: conProviders(queryClient) },
    );

  it('no pinta nada mientras está cerrado', async () => {
    await renderModal({ visible: false });

    expect(screen.queryByText('Editar reseña')).toBeNull();
  });

  it('no pinta nada sin reseña que editar', async () => {
    await renderModal({ resena: null });

    expect(screen.queryByText('Editar reseña')).toBeNull();
  });

  it('arranca con los valores actuales de la reseña', async () => {
    await renderModal();

    expect(screen.getByPlaceholderText('Título de tu reseña').props.value).toBe(
      'Excelente cancha',
    );
    expect(
      screen.getByPlaceholderText('Cuéntanos los detalles de tu experiencia').props.value,
    ).toBe('El césped estaba impecable.');
  });

  it('exige que quede al menos una estrella', async () => {
    await renderModal({ resena: resena({ calificacion: 0 }) });

    await fireEvent.press(screen.getByText('Guardar cambios'));

    expect(screen.getByText('Selecciona una calificación de 1 a 5 estrellas.')).toBeTruthy();
    expect(service.actualizarResena).not.toHaveBeenCalled();
  });

  it('exige un título', async () => {
    await renderModal();
    await fireEvent.changeText(screen.getByPlaceholderText('Título de tu reseña'), '   ');

    await fireEvent.press(screen.getByText('Guardar cambios'));

    expect(screen.getByText('El título es obligatorio.')).toBeTruthy();
  });

  it('exige una descripción', async () => {
    await renderModal();
    await fireEvent.changeText(
      screen.getByPlaceholderText('Cuéntanos los detalles de tu experiencia'),
      '  ',
    );

    await fireEvent.press(screen.getByText('Guardar cambios'));

    expect(screen.getByText('La descripción es obligatoria.')).toBeTruthy();
  });

  it('guarda los cambios y cierra', async () => {
    const onClose = jest.fn();
    const actualizada = resena({ titulo: 'Buena, no excelente', calificacion: 4 });
    service.actualizarResena.mockResolvedValue(actualizada);
    queryClient.setQueryData<Resena[]>(resenasEspacioQueryKey(ESPACIO_ID), [resena()]);
    await renderModal({ onClose });

    await fireEvent.changeText(
      screen.getByPlaceholderText('Título de tu reseña'),
      'Buena, no excelente',
    );
    await fireEvent.press(screen.getByLabelText('4 estrellas'));
    await fireEvent.press(screen.getByText('Guardar cambios'));

    await waitFor(() =>
      expect(service.actualizarResena).toHaveBeenCalledWith(ESPACIO_ID, 1, {
        titulo: 'Buena, no excelente',
        descripcion: 'El césped estaba impecable.',
        calificacion: 4,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(queryClient.getQueryData<Resena[]>(resenasEspacioQueryKey(ESPACIO_ID))).toEqual([
      actualizada,
    ]);
  });

  it('muestra los errores por campo sin cerrar', async () => {
    const onClose = jest.fn();
    service.actualizarResena.mockRejectedValue(
      new ResenaApiError('Datos inválidos', 400, { descripcion: ['Muy corta.'] }),
    );
    await renderModal({ onClose });

    await fireEvent.press(screen.getByText('Guardar cambios'));

    await waitFor(() => expect(screen.getByText('Muy corta.')).toBeTruthy());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del backend ante otros fallos', async () => {
    service.actualizarResena.mockRejectedValue(new Error('Ya no puedes editarla.'));
    await renderModal();

    await fireEvent.press(screen.getByText('Guardar cambios'));

    await waitFor(() => expect(screen.getByText('Ya no puedes editarla.')).toBeTruthy());
  });
});
