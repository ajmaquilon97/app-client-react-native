import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import CustomTabBar from '../navigation/CustomTabBar';

/**
 * La barra de pestañas es propia (no la de Expo Router) porque el diseño pide
 * iconos y estados que el componente por defecto no expone. Lo que hay que
 * garantizar es el contrato con el navegador: emitir `tabPress` y respetar que
 * un listener pueda cancelar la navegación.
 */

const RUTAS = [
  { name: 'index', key: 'k-index' },
  { name: 'calendario', key: 'k-calendario' },
  { name: 'favoritos', key: 'k-favoritos' },
  { name: 'ajustes', key: 'k-ajustes' },
];

function renderBarra(indiceActivo = 0, emitReturn: { defaultPrevented: boolean } = {
  defaultPrevented: false,
}) {
  const emit = jest.fn(() => emitReturn);
  const navigate = jest.fn();
  const vista = render(
    <CustomTabBar
      state={{ index: indiceActivo, routes: RUTAS }}
      descriptors={{}}
      navigation={{ emit, navigate }}
    />,
    { wrapper: ConTema },
  );
  return { vista, emit, navigate };
}

describe('CustomTabBar', () => {
  it('rotula las cuatro pestañas en español', async () => {
    const { vista } = renderBarra();
    await vista;

    expect(screen.getByText('Inicio')).toBeTruthy();
    expect(screen.getByText('Calendario')).toBeTruthy();
    expect(screen.getByText('Favoritos')).toBeTruthy();
    expect(screen.getByText('Ajustes')).toBeTruthy();
  });

  it('emite tabPress y navega al tocar una pestaña inactiva', async () => {
    const { vista, emit, navigate } = renderBarra(0);
    await vista;

    await fireEvent.press(screen.getByText('Calendario'));

    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'k-calendario',
      canPreventDefault: true,
    });
    expect(navigate).toHaveBeenCalledWith('calendario');
  });

  it('no vuelve a navegar a la pestaña que ya está activa', async () => {
    const { vista, emit, navigate } = renderBarra(1);
    await vista;

    await fireEvent.press(screen.getByText('Calendario'));

    expect(emit).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('respeta que un listener cancele la navegación', async () => {
    const { vista, navigate } = renderBarra(0, { defaultPrevented: true });
    await vista;

    await fireEvent.press(screen.getByText('Favoritos'));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('usa el nombre de la ruta si no hay etiqueta ni icono definidos', async () => {
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    await render(
      <CustomTabBar
        state={{ index: 0, routes: [{ name: 'recepcion', key: 'k-recepcion' }] }}
        descriptors={{}}
        navigation={{ emit, navigate: jest.fn() }}
      />,
      { wrapper: ConTema },
    );

    expect(screen.getByText('recepcion')).toBeTruthy();
  });
});
