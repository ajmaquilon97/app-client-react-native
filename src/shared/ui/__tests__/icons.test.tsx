import React from 'react';
import { render } from '@testing-library/react-native';

import * as icons from '../icons';

/**
 * La librería de iconos es SVG puro: no hay lógica que probar más allá de que
 * cada icono se monte y respete el tamaño, el color y — donde aplica — el
 * relleno. Esta suite existe para que un icono roto (un `Path` mal cerrado, un
 * export que desaparece) se detecte en CI y no en el dispositivo.
 */

type ComponenteIcono = React.FC<{ size?: number; color?: string; strokeWidth?: number }>;

const TODOS = Object.entries(icons) as [string, ComponenteIcono][];

type IconoConRelleno = React.FC<{ color?: string; filled?: boolean }>;

/** Iconos con estado de relleno (favoritos, puntuación). */
const CON_RELLENO: [string, IconoConRelleno][] = [
  ['HeartIcon', icons.HeartIcon],
  ['StarIcon', icons.StarIcon],
];

describe('librería de iconos', () => {
  it('exporta los iconos que consume la navegación y las tarjetas', () => {
    const nombres = TODOS.map(([nombre]) => nombre);

    expect(nombres).toEqual(
      expect.arrayContaining([
        'HomeIcon',
        'CalendarIcon',
        'HeartIcon',
        'SettingsIcon',
        'SearchIcon',
        'LocationIcon',
        'StarIcon',
        'GoogleIcon',
      ]),
    );
  });

  it.each(TODOS)('%s se monta con sus valores por defecto', async (_nombre, Icono) => {
    const { toJSON } = await render(<Icono />);

    expect(toJSON()).toBeTruthy();
  });

  it.each(TODOS)('%s acepta tamaño y color propios', async (_nombre, Icono) => {
    const { toJSON } = await render(<Icono size={40} color="#FF0000" strokeWidth={1.5} />);

    const svg = toJSON() as { props: Record<string, unknown> };
    expect(svg.props.width).toBe(40);
    expect(svg.props.height).toBe(40);
  });

  it.each(CON_RELLENO)('%s se pinta relleno cuando está activo', async (_nombre, Icono) => {
    const { toJSON } = await render(<Icono color="#123456" filled />);

    expect((toJSON() as { props: Record<string, unknown> }).props.fill).toBe('#123456');
  });

  it.each(CON_RELLENO)('%s se pinta vacío cuando está inactivo', async (_nombre, Icono) => {
    const { toJSON } = await render(<Icono color="#123456" filled={false} />);

    expect((toJSON() as { props: Record<string, unknown> }).props.fill).toBe('none');
  });

  it('el corazón viene vacío por defecto y la estrella rellena', async () => {
    const corazon = await render(<icons.HeartIcon color="#111" />);
    const estrella = await render(<icons.StarIcon color="#222" />);

    expect((corazon.toJSON() as { props: Record<string, unknown> }).props.fill).toBe('none');
    expect((estrella.toJSON() as { props: Record<string, unknown> }).props.fill).toBe('#222');
  });
});
