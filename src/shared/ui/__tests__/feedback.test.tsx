import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import ScreenState from '../feedback/ScreenState';
import QueryBoundary, { BoundaryQuery } from '../feedback/QueryBoundary';

describe('ScreenState', () => {
  it('en "cargando" ignora el título y la acción: solo va el indicador', async () => {
    await render(
      <ScreenState variant="loading" title="Sin conexión" actionLabel="Reintentar" onAction={jest.fn()} />,
      { wrapper: ConTema },
    );

    expect(screen.queryByText('Sin conexión')).toBeNull();
    expect(screen.queryByText('Reintentar')).toBeNull();
  });

  it('en "cargando" puede acompañar con un mensaje', async () => {
    await render(<ScreenState variant="loading" message="Buscando espacios..." />, {
      wrapper: ConTema,
    });

    expect(screen.getByText('Buscando espacios...')).toBeTruthy();
  });

  it('en "error" muestra título y mensaje', async () => {
    await render(
      <ScreenState variant="error" title="Sin conexión" message="Revisa tu red." />,
      { wrapper: ConTema },
    );

    expect(screen.getByText('Sin conexión')).toBeTruthy();
    expect(screen.getByText('Revisa tu red.')).toBeTruthy();
  });

  it('solo ofrece acción si le dan una', async () => {
    await render(<ScreenState variant="error" title="Sin conexión" />, { wrapper: ConTema });

    expect(screen.queryByText('Reintentar')).toBeNull();
  });

  it('etiqueta la acción como "Reintentar" por defecto y la ejecuta', async () => {
    const onAction = jest.fn();
    await render(<ScreenState variant="error" title="Sin conexión" onAction={onAction} />, {
      wrapper: ConTema,
    });

    await fireEvent.press(screen.getByText('Reintentar'));

    expect(onAction).toHaveBeenCalled();
  });

  it('acepta una etiqueta de acción propia', async () => {
    await render(
      <ScreenState
        variant="empty"
        title="Sin favoritos"
        actionLabel="Explorar espacios"
        onAction={jest.fn()}
      />,
      { wrapper: ConTema },
    );

    expect(screen.getByText('Explorar espacios')).toBeTruthy();
  });
});

describe('QueryBoundary', () => {
  const consulta = <T,>(over: Partial<BoundaryQuery<T>>): BoundaryQuery<T> => ({
    data: undefined,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
    ...over,
  });

  const contenido = (items: string[]) => <Text>{items.join(', ')}</Text>;

  it('muestra el estado de carga mientras la consulta está pendiente', async () => {
    await render(
      <QueryBoundary query={consulta<string[]>({ isPending: true })} loadingMessage="Cargando...">
        {contenido}
      </QueryBoundary>,
      { wrapper: ConTema },
    );

    expect(screen.getByText('Cargando...')).toBeTruthy();
  });

  it('muestra el error con textos por defecto y permite reintentar', async () => {
    const refetch = jest.fn();
    await render(
      <QueryBoundary query={consulta<string[]>({ isError: true, refetch })}>
        {contenido}
      </QueryBoundary>,
      { wrapper: ConTema },
    );

    expect(screen.getByText('No se pudo cargar la información')).toBeTruthy();
    expect(screen.getByText('Revisa tu conexión e inténtalo de nuevo.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Reintentar'));
    expect(refetch).toHaveBeenCalled();
  });

  it('acepta textos de error propios', async () => {
    await render(
      <QueryBoundary
        query={consulta<string[]>({ isError: true })}
        errorTitle="No hay reservas"
        errorMessage="Vuelve a intentarlo en un momento.">
        {contenido}
      </QueryBoundary>,
      { wrapper: ConTema },
    );

    expect(screen.getByText('No hay reservas')).toBeTruthy();
  });

  it('trata "sin datos" como error: no puede pintar lo que no llegó', async () => {
    await render(
      <QueryBoundary query={consulta<string[]>({ data: undefined })}>{contenido}</QueryBoundary>,
      { wrapper: ConTema },
    );

    expect(screen.getByText('No se pudo cargar la información')).toBeTruthy();
  });

  it('muestra el vacío cuando la lista llegó sin elementos', async () => {
    await render(
      <QueryBoundary query={consulta<string[]>({ data: [] })} empty={<Text>Nada por aquí</Text>}>
        {contenido}
      </QueryBoundary>,
      { wrapper: ConTema },
    );

    expect(screen.getByText('Nada por aquí')).toBeTruthy();
  });

  it('pinta la lista vacía si no le dieron un estado vacío', async () => {
    await render(
      <QueryBoundary query={consulta<string[]>({ data: [] })}>{contenido}</QueryBoundary>,
      { wrapper: ConTema },
    );

    expect(screen.queryByText('No se pudo cargar la información')).toBeNull();
  });

  it('admite otra definición de "vacío" que la lista sin elementos', async () => {
    await render(
      <QueryBoundary
        query={consulta<string[]>({ data: ['—'] })}
        isEmpty={items => items.every(i => i === '—')}
        empty={<Text>Todo en blanco</Text>}>
        {contenido}
      </QueryBoundary>,
      { wrapper: ConTema },
    );

    expect(screen.getByText('Todo en blanco')).toBeTruthy();
  });

  it('entrega los datos a los hijos cuando todo fue bien', async () => {
    await render(
      <QueryBoundary query={consulta<string[]>({ data: ['Cancha', 'Piscina'] })}>
        {contenido}
      </QueryBoundary>,
      { wrapper: ConTema },
    );

    expect(screen.getByText('Cancha, Piscina')).toBeTruthy();
  });
});
