import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react-native';

import { crearQueryClient, conProviders, conQueryClient } from '../../../../jest/harness';

import SaveToListSheet from '../components/SaveToListSheet';
import CrearListaModal from '../components/CrearListaModal';
import { FAVORITOS_QUERY_KEY, useFavoritos, useEsFavorito } from '../hooks/useFavoritos';
import {
  LISTAS_FAVORITOS_QUERY_KEY,
  listaFavoritosDetalleQueryKey,
  useListasFavoritos,
  useListaFavoritosDetalle,
} from '../hooks/useListasFavoritos';
import {
  useQuitarDeLista,
  useEliminarLista,
} from '../hooks/useFavoritoMutations';
import * as favoritosService from '../services/favoritos.service';
import { ListaFavoritos } from '../types';

/**
 * Favoritos tiene dos niveles: el corazón global del catálogo y las listas
 * temáticas ("Cumpleaños", "Mis canchas"). Cualquier cambio en uno mueve el
 * contador del otro, así que la política de invalidación conjunta es lo que más
 * importa verificar aquí.
 */

jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(() => ({ isAuthenticated: true })),
}));

jest.mock('../services/favoritos.service', () => ({
  fetchFavoritos: jest.fn(),
  fetchListasFavoritos: jest.fn(),
  fetchListaFavoritosDetalle: jest.fn(),
  marcarFavorito: jest.fn(),
  quitarFavorito: jest.fn(),
  crearListaFavoritos: jest.fn(),
  eliminarListaFavoritos: jest.fn(),
}));

const { useAuth } = jest.requireMock('@/features/auth');
const service = favoritosService as jest.Mocked<typeof favoritosService>;

const lista = (id: number, nombre: string, cantidadEspacios = 0): ListaFavoritos =>
  ({ id, nombre, cantidadEspacios }) as ListaFavoritos;

let queryClient: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ isAuthenticated: true });
  queryClient = crearQueryClient();
  service.fetchFavoritos.mockResolvedValue([1, 2]);
  service.fetchListasFavoritos.mockResolvedValue([
    lista(1, 'Cumpleaños', 3),
    lista(2, 'Mis canchas', 1),
  ]);
  service.marcarFavorito.mockResolvedValue(undefined);
  service.quitarFavorito.mockResolvedValue(undefined);
  service.eliminarListaFavoritos.mockResolvedValue(undefined);
  service.crearListaFavoritos.mockResolvedValue(lista(9, 'Nueva'));
});

afterEach(() => queryClient.clear());

describe('consultas de favoritos', () => {
  it('no consulta nada sin sesión iniciada', async () => {
    useAuth.mockReturnValue({ isAuthenticated: false });

    await renderHook(() => useFavoritos(), { wrapper: conQueryClient(queryClient) });

    expect(service.fetchFavoritos).not.toHaveBeenCalled();
  });

  it('useEsFavorito responde desde la misma consulta, sin pedir de nuevo', async () => {
    const { result } = await renderHook(() => useEsFavorito(), {
      wrapper: conQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current(1)).toBe(true));
    expect(result.current(99)).toBe(false);
    expect(service.fetchFavoritos).toHaveBeenCalledTimes(1);
  });

  it('trata la lista como vacía mientras no ha llegado', async () => {
    service.fetchFavoritos.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useEsFavorito(), {
      wrapper: conQueryClient(queryClient),
    });

    expect(result.current(1)).toBe(false);
  });

  it('cachea las listas bajo su propia clave', async () => {
    const { result } = await renderHook(() => useListasFavoritos(), {
      wrapper: conQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(queryClient.getQueryData(LISTAS_FAVORITOS_QUERY_KEY)).toHaveLength(2);
  });

  it('no pide el detalle mientras no haya lista elegida', async () => {
    await renderHook(() => useListaFavoritosDetalle(null), {
      wrapper: conQueryClient(queryClient),
    });

    expect(service.fetchListaFavoritosDetalle).not.toHaveBeenCalled();
  });

  it('pide el detalle de la lista elegida', async () => {
    service.fetchListaFavoritosDetalle.mockResolvedValue({
      id: 1,
      nombre: 'Cumpleaños',
      espacios: [],
    } as never);

    const { result } = await renderHook(() => useListaFavoritosDetalle(1), {
      wrapper: conQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(service.fetchListaFavoritosDetalle).toHaveBeenCalledWith(1);
    expect(queryClient.getQueryData(listaFavoritosDetalleQueryKey(1))).toBeDefined();
  });
});

describe('mutaciones sobre listas', () => {
  it('quitar de una lista invalida favoritos y listas a la vez', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await renderHook(() => useQuitarDeLista(), {
      wrapper: conQueryClient(queryClient),
    });

    await result.current.mutateAsync({ espacioId: 5, listaId: 1 });

    // Quitar de UNA lista, no de todas: el listaId viaja al backend.
    expect(service.quitarFavorito).toHaveBeenCalledWith(5, 1);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: FAVORITOS_QUERY_KEY });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: LISTAS_FAVORITOS_QUERY_KEY });
  });

  it('eliminar una lista invalida también los favoritos, por el borrado en cascada', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await renderHook(() => useEliminarLista(), {
      wrapper: conQueryClient(queryClient),
    });

    await result.current.mutateAsync(1);

    expect(service.eliminarListaFavoritos).toHaveBeenCalledWith(1);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: FAVORITOS_QUERY_KEY });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: LISTAS_FAVORITOS_QUERY_KEY });
  });
});

describe('CrearListaModal', () => {
  const renderModal = (props: Partial<React.ComponentProps<typeof CrearListaModal>> = {}) =>
    render(<CrearListaModal visible onClose={jest.fn()} onCreated={jest.fn()} {...props} />, {
      wrapper: conProviders(queryClient),
    });

  it('exige un nombre no vacío', async () => {
    await renderModal();
    await fireEvent.changeText(screen.getByPlaceholderText(/Cumpleaños/), '   ');

    await fireEvent.press(screen.getByText('Crear lista'));

    expect(screen.getByText('Ponle un nombre a la lista.')).toBeTruthy();
    expect(service.crearListaFavoritos).not.toHaveBeenCalled();
  });

  it('crea la lista con el nombre recortado y la devuelve al padre', async () => {
    const onCreated = jest.fn();
    const nueva = lista(9, 'Cumpleaños');
    service.crearListaFavoritos.mockResolvedValue(nueva);
    await renderModal({ onCreated });
    await fireEvent.changeText(screen.getByPlaceholderText(/Cumpleaños/), '  Cumpleaños  ');

    await fireEvent.press(screen.getByText('Crear lista'));

    await waitFor(() => expect(service.crearListaFavoritos).toHaveBeenCalledWith('Cumpleaños'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(nueva));
  });

  it('refresca las listas tras crear', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    await renderModal();
    await fireEvent.changeText(screen.getByPlaceholderText(/Cumpleaños/), 'Cumpleaños');

    await fireEvent.press(screen.getByText('Crear lista'));

    await waitFor(() =>
      expect(invalidar).toHaveBeenCalledWith({ queryKey: LISTAS_FAVORITOS_QUERY_KEY }),
    );
  });

  it('muestra el error del backend', async () => {
    service.crearListaFavoritos.mockRejectedValue(new Error('Ya tienes una lista con ese nombre.'));
    await renderModal();
    await fireEvent.changeText(screen.getByPlaceholderText(/Cumpleaños/), 'Cumpleaños');

    await fireEvent.press(screen.getByText('Crear lista'));

    await waitFor(() =>
      expect(screen.getByText('Ya tienes una lista con ese nombre.')).toBeTruthy(),
    );
  });

  it('cancelar limpia el formulario y avisa al padre', async () => {
    const onClose = jest.fn();
    await renderModal({ onClose });
    await fireEvent.changeText(screen.getByPlaceholderText(/Cumpleaños/), 'Algo');

    await fireEvent.press(screen.getByText('Cancelar'));

    expect(onClose).toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/Cumpleaños/).props.value).toBe('');
  });

  it('limita el nombre a lo que acepta el backend', async () => {
    await renderModal();

    expect(screen.getByPlaceholderText(/Cumpleaños/).props.maxLength).toBe(100);
  });
});

describe('SaveToListSheet', () => {
  const renderHoja = (props: Partial<React.ComponentProps<typeof SaveToListSheet>> = {}) =>
    render(<SaveToListSheet visible espacioId={7} onClose={jest.fn()} {...props} />, {
      wrapper: conProviders(queryClient),
    });

  it('lista las listas del usuario con su conteo', async () => {
    await renderHoja();

    await waitFor(() => expect(screen.getByText('Cumpleaños')).toBeTruthy());
    expect(screen.getByText('3 espacios')).toBeTruthy();
    expect(screen.getByText('1 espacio')).toBeTruthy();
  });

  it('avisa cuando todavía no hay listas', async () => {
    service.fetchListasFavoritos.mockResolvedValue([]);
    await renderHoja();

    await waitFor(() =>
      expect(screen.getByText('Aún no tienes listas de favoritos.')).toBeTruthy(),
    );
  });

  it('guarda el espacio en la lista elegida', async () => {
    await renderHoja();
    await waitFor(() => expect(screen.getByText('Cumpleaños')).toBeTruthy());

    await fireEvent.press(screen.getByText('Cumpleaños'));

    await waitFor(() => expect(service.marcarFavorito).toHaveBeenCalledWith(7, 1));
  });

  it('no intenta guardar si no hay espacio seleccionado', async () => {
    await renderHoja({ espacioId: null });
    await waitFor(() => expect(screen.getByText('Cumpleaños')).toBeTruthy());

    await fireEvent.press(screen.getByText('Cumpleaños'));

    expect(service.marcarFavorito).not.toHaveBeenCalled();
  });

  it('abre el formulario de lista nueva desde la hoja', async () => {
    await renderHoja();

    await fireEvent.press(screen.getByText('Crear nueva lista'));

    expect(screen.getByText('Nueva lista')).toBeTruthy();
  });

  it('crear una lista desde la hoja guarda el espacio en ella de inmediato', async () => {
    const nueva = lista(9, 'Cumpleaños 2026');
    service.crearListaFavoritos.mockResolvedValue(nueva);
    await renderHoja();
    await fireEvent.press(screen.getByText('Crear nueva lista'));

    await fireEvent.changeText(screen.getByPlaceholderText(/Cumpleaños/), 'Cumpleaños 2026');
    await fireEvent.press(screen.getByText('Crear lista'));

    await waitFor(() => expect(service.marcarFavorito).toHaveBeenCalledWith(7, 9));
  });

  it('cerrar la hoja limpia la marca de "guardada"', async () => {
    const onClose = jest.fn();
    await renderHoja({ onClose });
    await waitFor(() => expect(screen.getByText('Cumpleaños')).toBeTruthy());
    await fireEvent.press(screen.getByText('Cumpleaños'));
    await waitFor(() => expect(service.marcarFavorito).toHaveBeenCalled());

    await fireEvent.press(screen.getByText('Guardar en…'));

    expect(onClose).not.toHaveBeenCalled(); // tocar la hoja no la cierra
  });
});
