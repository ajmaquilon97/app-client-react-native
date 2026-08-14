import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import { Espacio } from '../types';
import SpaceCard from '../components/SpaceCard';
import CategoryCard from '../components/CategoryCard';
import QuickFilters from '../components/QuickFilters';
import EmptyState from '../components/EmptyState';
import LocationMap from '../components/LocationMap';

function espacio(overrides: Partial<Espacio> = {}): Espacio {
  return {
    id: 1,
    nombre: 'Cancha El Campín',
    categoria: 'canchas',
    subcategoria: 'Cancha de fútbol',
    ubicacion: 'Pichincha, Quito',
    precio: 25,
    unidad: 'hora',
    rating: 4.5,
    reviews: 12,
    distancia: 1.2,
    disponibleHoy: true,
    imagen: 'https://cdn/x.jpg',
    imagenes: [],
    maxCapacidad: 22,
    validarAforo: false,
    latitud: null,
    longitud: null,
    anfitrion: { nombre: 'Carlos', registro: 'Miembro desde 2021' },
    descripcion: '',
    ...overrides,
  } as Espacio;
}

describe('SpaceCard', () => {
  const renderTarjeta = (props: Partial<React.ComponentProps<typeof SpaceCard>> = {}) =>
    render(
      <SpaceCard
        espacio={espacio()}
        isFavorite={false}
        onPress={jest.fn()}
        onToggleFavorite={jest.fn()}
        {...props}
      />,
      { wrapper: ConTema },
    );

  it('muestra los datos que el usuario usa para decidir', async () => {
    await renderTarjeta();

    expect(screen.getByText('Cancha El Campín')).toBeTruthy();
    expect(screen.getByText('Cancha de fútbol')).toBeTruthy();
    expect(screen.getByText('Pichincha, Quito')).toBeTruthy();
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('/ hora')).toBeTruthy();
  });

  it('pinta la categoría en mayúsculas en la insignia', async () => {
    await renderTarjeta();

    expect(screen.getByText('CANCHAS')).toBeTruthy();
  });

  it('entrega el espacio completo al abrirlo, no solo su id', async () => {
    const onPress = jest.fn();
    await renderTarjeta({ onPress });

    await fireEvent.press(screen.getByText('Cancha El Campín'));

    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('alterna el favorito sin abrir el espacio', async () => {
    const onPress = jest.fn();
    const onToggleFavorite = jest.fn();
    await renderTarjeta({ onPress, onToggleFavorite });

    await fireEvent.press(screen.getByLabelText('Añadir a favoritos'));

    expect(onToggleFavorite).toHaveBeenCalledWith(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('cambia la etiqueta del corazón según el estado', async () => {
    await renderTarjeta({ isFavorite: true });

    expect(screen.getByLabelText('Quitar de favoritos')).toBeTruthy();
  });

  it('la pulsación larga sobre el corazón abre las listas, si hay handler', async () => {
    const onLongPressFavorite = jest.fn();
    await renderTarjeta({ onLongPressFavorite });

    await fireEvent(screen.getByLabelText('Añadir a favoritos'), 'longPress');

    expect(onLongPressFavorite).toHaveBeenCalledWith(1);
  });
});

describe('CategoryCard', () => {
  it('rotula las canchas deportivas', async () => {
    await render(<CategoryCard categoria="canchas" isActive={false} onPress={jest.fn()} />, {
      wrapper: ConTema,
    });

    expect(screen.getByText('Canchas')).toBeTruthy();
    expect(screen.getByText('Deportivas')).toBeTruthy();
  });

  it('rotula las piscinas recreativas', async () => {
    await render(<CategoryCard categoria="piscinas" isActive={false} onPress={jest.fn()} />, {
      wrapper: ConTema,
    });

    expect(screen.getByText('Piscinas')).toBeTruthy();
    expect(screen.getByText('Recreativas')).toBeTruthy();
  });

  it('rotula los salones de eventos', async () => {
    await render(<CategoryCard categoria="salones" isActive onPress={jest.fn()} />, {
      wrapper: ConTema,
    });

    expect(screen.getByText('Salones')).toBeTruthy();
    expect(screen.getByText('De Eventos')).toBeTruthy();
  });

  it('informa qué categoría se eligió', async () => {
    const onPress = jest.fn();
    await render(<CategoryCard categoria="piscinas" isActive={false} onPress={onPress} />, {
      wrapper: ConTema,
    });

    await fireEvent.press(screen.getByText('Piscinas'));

    expect(onPress).toHaveBeenCalledWith('piscinas');
  });
});

describe('QuickFilters', () => {
  it('ofrece los tres filtros rápidos', async () => {
    await render(<QuickFilters active={null} onSelect={jest.fn()} />, { wrapper: ConTema });

    expect(screen.getByText('Más cercanos')).toBeTruthy();
    expect(screen.getByText('Mejor puntuados')).toBeTruthy();
    expect(screen.getByText('Disponibilidad inmediata')).toBeTruthy();
  });

  it('activa el filtro que se pulsa', async () => {
    const onSelect = jest.fn();
    await render(<QuickFilters active={null} onSelect={onSelect} />, { wrapper: ConTema });

    await fireEvent.press(screen.getByText('Mejor puntuados'));

    expect(onSelect).toHaveBeenCalledWith('puntuacion');
  });

  it('pulsar el filtro ya activo lo desactiva', async () => {
    const onSelect = jest.fn();
    await render(<QuickFilters active="cercanos" onSelect={onSelect} />, { wrapper: ConTema });

    await fireEvent.press(screen.getByText('Más cercanos'));

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('EmptyState', () => {
  it('explica que no hubo resultados y ofrece restablecer', async () => {
    const onReset = jest.fn();
    await render(<EmptyState onReset={onReset} />, { wrapper: ConTema });

    expect(screen.getByText('Sin resultados')).toBeTruthy();

    await fireEvent.press(screen.getByText('Restablecer'));
    expect(onReset).toHaveBeenCalled();
  });
});

describe('LocationMap', () => {
  it('envuelve el mapa de Google en un iframe local, no navega directo', async () => {
    await render(<LocationMap latitude={-2.170998} longitude={-79.922359} />, {
      wrapper: ConTema,
    });

    const html = screen.getByTestId('webview').props.source.html as string;
    expect(html).toContain('<iframe');
    expect(html).toContain('https://www.google.com/maps?q=-2.170998,-79.922359&z=15&output=embed');
  });
});
