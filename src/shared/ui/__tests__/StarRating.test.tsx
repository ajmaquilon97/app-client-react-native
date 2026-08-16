import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import StarRating from '../StarRating';
import StarRatingInput from '../StarRatingInput';

describe('StarRating (solo lectura)', () => {
  it('muestra la puntuación con un decimal', async () => {
    await render(<StarRating rating={4} />, { wrapper: ConTema });

    expect(screen.getByText('4.0')).toBeTruthy();
  });

  it('redondea a un decimal las puntuaciones con más precisión', async () => {
    await render(<StarRating rating={4.267} />, { wrapper: ConTema });

    expect(screen.getByText('4.3')).toBeTruthy();
  });

  it('oculta el número de reseñas salvo que se pida', async () => {
    await render(<StarRating rating={4.5} reviews={12} />, { wrapper: ConTema });

    expect(screen.queryByText('(12 reseñas)')).toBeNull();
  });

  it('muestra el número de reseñas cuando se pide', async () => {
    await render(<StarRating rating={4.5} reviews={12} showCount />, { wrapper: ConTema });

    expect(screen.getByText('(12 reseñas)')).toBeTruthy();
  });

  it('no muestra el contador si no hay número de reseñas que mostrar', async () => {
    await render(<StarRating rating={4.5} showCount />, { wrapper: ConTema });

    expect(screen.queryByText(/reseñas/)).toBeNull();
  });

  it('acepta el tamaño mediano sin romperse', async () => {
    await render(<StarRating rating={5} size="md" reviews={3} showCount />, { wrapper: ConTema });

    expect(screen.getByText('5.0')).toBeTruthy();
    expect(screen.getByText('(3 reseñas)')).toBeTruthy();
  });
});

describe('StarRatingInput (editable)', () => {
  it('ofrece las cinco estrellas', async () => {
    await render(<StarRatingInput value={0} onChange={jest.fn()} />, { wrapper: ConTema });

    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.getByLabelText('1 estrella')).toBeTruthy();
    expect(screen.getByLabelText('5 estrellas')).toBeTruthy();
  });

  it('reporta la estrella pulsada', async () => {
    const onChange = jest.fn();
    await render(<StarRatingInput value={0} onChange={onChange} />, { wrapper: ConTema });

    await fireEvent.press(screen.getByLabelText('4 estrellas'));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('no reacciona cuando está deshabilitado', async () => {
    const onChange = jest.fn();
    await render(<StarRatingInput value={3} onChange={onChange} disabled />, {
      wrapper: ConTema,
    });

    await fireEvent.press(screen.getByLabelText('5 estrellas'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('acepta un tamaño de estrella propio', async () => {
    await render(<StarRatingInput value={2} onChange={jest.fn()} size={44} />, {
      wrapper: ConTema,
    });

    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});
