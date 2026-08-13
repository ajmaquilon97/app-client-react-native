import React from 'react';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import SearchBar from '../SearchBar';

const renderBuscador = (props: Partial<React.ComponentProps<typeof SearchBar>> = {}) =>
  render(<SearchBar value="" onChangeText={jest.fn()} {...props} />, { wrapper: ConTema });

describe('SearchBar', () => {
  it('muestra el placeholder por defecto cuando está vacío', async () => {
    await renderBuscador();

    expect(
      screen.getByPlaceholderText('Buscar canchas, piscinas o salones...'),
    ).toBeTruthy();
  });

  it('acepta un placeholder propio', async () => {
    await renderBuscador({ placeholder: 'Buscar en mis favoritos' });

    expect(screen.getByPlaceholderText('Buscar en mis favoritos')).toBeTruthy();
  });

  it('avisa de cada cambio de texto', async () => {
    const onChangeText = jest.fn();
    await renderBuscador({ onChangeText });

    await fireEvent.changeText(screen.getByPlaceholderText(/Buscar canchas/), 'piscina');

    expect(onChangeText).toHaveBeenCalledWith('piscina');
  });

  it('no ofrece el botón de limpiar mientras no hay texto', async () => {
    await renderBuscador({ value: '' });

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('ofrece limpiar en cuanto hay texto', async () => {
    await renderBuscador({ value: 'cancha' });

    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('al limpiar vacía el texto y avisa a quien lo pidió', async () => {
    const onChangeText = jest.fn();
    const onClear = jest.fn();
    await renderBuscador({ value: 'cancha', onChangeText, onClear });

    await userEvent.press(screen.getByRole('button'));

    expect(onChangeText).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalled();
  });

  it('limpiar funciona aunque no le pasen onClear', async () => {
    const onChangeText = jest.fn();
    await renderBuscador({ value: 'cancha', onChangeText });

    await userEvent.press(screen.getByRole('button'));

    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('puede montarse como solo lectura, para usarse de botón hacia el buscador', async () => {
    await renderBuscador({ value: '', editable: false, pointerEvents: 'none' });

    expect(screen.getByPlaceholderText(/Buscar canchas/).props.editable).toBe(false);
  });
});
