import React from 'react';
import { Text } from 'react-native';
import { act, render, screen, fireEvent } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import ScreenState from '../feedback/ScreenState';
import QueryBoundary, { BoundaryQuery } from '../feedback/QueryBoundary';
import DeferredContent from '../feedback/DeferredContent';

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

describe('DeferredContent', () => {
  // `requestIdleCallback` se intercepta para decidir en el test cuándo queda
  // ocioso el hilo: con el real, el momento del montaje no es determinista.
  let tareasOciosas: (() => void)[] = [];
  const requestOriginal = globalThis.requestIdleCallback;
  const cancelOriginal = globalThis.cancelIdleCallback;

  beforeEach(() => {
    tareasOciosas = [];
    globalThis.requestIdleCallback = ((cb: () => void) =>
      tareasOciosas.push(cb)) as unknown as typeof globalThis.requestIdleCallback;
    globalThis.cancelIdleCallback = jest.fn();
  });

  afterEach(() => {
    globalThis.requestIdleCallback = requestOriginal;
    globalThis.cancelIdleCallback = cancelOriginal;
  });

  const quedarOcioso = async () => {
    await act(async () => {
      tareasOciosas.forEach(tarea => tarea());
    });
  };

  it('pinta el indicador con su mensaje antes de montar el contenido', async () => {
    await render(
      <DeferredContent message="Preparando el espacio…">
        {() => <Text>Contenido pesado</Text>}
      </DeferredContent>,
      { wrapper: ConTema },
    );

    expect(screen.getByText('Preparando el espacio…')).toBeTruthy();
    expect(screen.queryByText('Contenido pesado')).toBeNull();
  });

  it('monta el contenido cuando el hilo queda ocioso', async () => {
    await render(
      <DeferredContent message="Preparando el espacio…">
        {() => <Text>Contenido pesado</Text>}
      </DeferredContent>,
      { wrapper: ConTema },
    );

    await quedarOcioso();

    expect(screen.getByText('Contenido pesado')).toBeTruthy();
    expect(screen.queryByText('Preparando el espacio…')).toBeNull();
  });

  // Es la razón de ser del componente: si el árbol se construyera igual durante
  // la espera, aplazar el montaje no ahorraría nada.
  it('no construye el árbol pesado mientras espera', async () => {
    const construir = jest.fn(() => <Text>Contenido pesado</Text>);

    await render(<DeferredContent>{construir}</DeferredContent>, { wrapper: ConTema });

    expect(construir).not.toHaveBeenCalled();

    await quedarOcioso();

    expect(construir).toHaveBeenCalled();
  });

  it('no pinta nada mientras está inactivo', async () => {
    await render(
      <DeferredContent active={false} message="Preparando el espacio…">
        {() => <Text>Contenido pesado</Text>}
      </DeferredContent>,
      { wrapper: ConTema },
    );

    expect(screen.queryByText('Preparando el espacio…')).toBeNull();
    expect(screen.queryByText('Contenido pesado')).toBeNull();
  });

  // Sin el rearme, la segunda apertura de una hoja mostraría el contenido de la
  // anterior durante un frame en vez del indicador.
  it('vuelve al indicador cuando se cierra y se reabre', async () => {
    const vista = await render(
      <DeferredContent active message="Preparando el espacio…">
        {() => <Text>Contenido pesado</Text>}
      </DeferredContent>,
      { wrapper: ConTema },
    );

    await quedarOcioso();
    expect(screen.getByText('Contenido pesado')).toBeTruthy();

    await vista.rerender(
      <DeferredContent active={false} message="Preparando el espacio…">
        {() => <Text>Contenido pesado</Text>}
      </DeferredContent>,
    );
    await vista.rerender(
      <DeferredContent active message="Preparando el espacio…">
        {() => <Text>Contenido pesado</Text>}
      </DeferredContent>,
    );

    expect(screen.getByText('Preparando el espacio…')).toBeTruthy();
    expect(screen.queryByText('Contenido pesado')).toBeNull();
  });

  it('admite un indicador propio en lugar del de la app', async () => {
    await render(
      <DeferredContent fallback={<Text>Abriendo…</Text>}>
        {() => <Text>Contenido pesado</Text>}
      </DeferredContent>,
      { wrapper: ConTema },
    );

    expect(screen.getByText('Abriendo…')).toBeTruthy();
  });
});
