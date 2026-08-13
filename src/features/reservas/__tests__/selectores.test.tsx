import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import DaySelector from '../components/DaySelector';
import HourRangeSelector from '../components/HourRangeSelector';
import TicketQuantitySelector from '../components/TicketQuantitySelector';
import { AforoDia, HoraEstado } from '../types';

/**
 * Los tres selectores son la interfaz de la reserva. Las reglas que se prueban
 * aquí son las que impiden pedir algo que el backend rechazaría después: horas
 * ya ocupadas, rangos que cruzan un hueco tomado y entradas por encima del cupo.
 */

const HOY = new Date(2026, 7, 13); // jueves 13/08/2026

describe('DaySelector', () => {
  const renderDias = (selectedDate: Date | null = null, onSelect = jest.fn()) =>
    render(<DaySelector hoy={HOY} selectedDate={selectedDate} onSelect={onSelect} />, {
      wrapper: ConTema,
    });

  it('ofrece dos semanas a partir de hoy', async () => {
    await renderDias();

    // El primer chip se rotula "Hoy"; los otros trece llevan el día de semana.
    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.getAllByText(/^(Dom|Lun|Mar|Mié|Jue|Vie|Sáb)$/)).toHaveLength(13);
  });

  it('rotula cada chip con el día del mes', async () => {
    await renderDias();

    expect(screen.getByText('13')).toBeTruthy(); // hoy
    expect(screen.getByText('26')).toBeTruthy(); // el día 14 de la lista
  });

  it('devuelve la fecha completa del día elegido', async () => {
    const onSelect = jest.fn();
    await renderDias(null, onSelect);

    await fireEvent.press(screen.getByText('15'));

    const elegida = onSelect.mock.calls[0][0] as Date;
    expect(elegida.getFullYear()).toBe(2026);
    expect(elegida.getMonth()).toBe(7);
    expect(elegida.getDate()).toBe(15);
  });

  it('cruza el fin de mes sin saltarse días', async () => {
    const onSelect = jest.fn();
    await render(
      <DaySelector hoy={new Date(2026, 7, 28)} selectedDate={null} onSelect={onSelect} />,
      { wrapper: ConTema },
    );

    await fireEvent.press(screen.getByText('2')); // 2 de septiembre

    const elegida = onSelect.mock.calls[0][0] as Date;
    expect(elegida.getMonth()).toBe(8);
    expect(elegida.getDate()).toBe(2);
  });

  it('marca como activo el día ya seleccionado', async () => {
    await renderDias(new Date(2026, 7, 16));

    // No revienta y sigue ofreciendo los catorce días.
    expect(screen.getByText('16')).toBeTruthy();
  });
});

describe('HourRangeSelector', () => {
  const renderHoras = (props: Partial<React.ComponentProps<typeof HourRangeSelector>> = {}) =>
    render(
      <HourRangeSelector
        horaDesde={null}
        horaHasta={null}
        onChangeDesde={jest.fn()}
        onChangeHasta={jest.fn()}
        {...props}
      />,
      { wrapper: ConTema },
    );

  it('ofrece la jornada completa de 07:00 a 22:00 como hora de inicio', async () => {
    await renderHoras();

    expect(screen.getByText('07:00')).toBeTruthy();
    expect(screen.getByText('22:00')).toBeTruthy();
  });

  it('pide elegir el inicio antes de mostrar las horas de fin', async () => {
    await renderHoras();

    expect(screen.getByText('Elige primero la hora de inicio.')).toBeTruthy();
  });

  it('informa la hora de inicio elegida', async () => {
    const onChangeDesde = jest.fn();
    await renderHoras({ onChangeDesde });

    await fireEvent.press(screen.getByTestId('hora-desde-10'));

    expect(onChangeDesde).toHaveBeenCalledWith(10);
  });

  it('la hora de fin siempre es posterior al inicio', async () => {
    await renderHoras({ horaDesde: 20 });

    // Solo quedan 21:00, 22:00 y 23:00 (fin de la última franja).
    expect(screen.getByTestId('hora-hasta-21')).toBeTruthy();
    expect(screen.getByTestId('hora-hasta-23')).toBeTruthy();
    expect(screen.queryByTestId('hora-hasta-20')).toBeNull();
    expect(screen.queryByTestId('hora-hasta-19')).toBeNull();
  });

  it('informa la hora de fin elegida', async () => {
    const onChangeHasta = jest.fn();
    await renderHoras({ horaDesde: 10, onChangeHasta });

    await fireEvent.press(screen.getByTestId('hora-hasta-12'));

    expect(onChangeHasta).toHaveBeenCalledWith(12);
  });

  it('deshabilita como inicio las horas ya ocupadas', async () => {
    const horasEstado: HoraEstado[] = [{ hora: 9, estado: 'booked' }];
    const onChangeDesde = jest.fn();
    await renderHoras({ horasEstado, onChangeDesde });

    await fireEvent.press(screen.getByTestId('hora-desde-9'));

    expect(onChangeDesde).not.toHaveBeenCalled();
  });

  it('corta el rango en el primer hueco ocupado después del inicio', async () => {
    const horasEstado: HoraEstado[] = [{ hora: 12, estado: 'booked' }];
    await renderHoras({ horaDesde: 10, horasEstado });

    // Se puede reservar 10→11 y 10→12, pero no 10→13: la franja 12–13 está tomada.
    expect(screen.getByTestId('hora-hasta-11')).toBeTruthy();
    expect(screen.getByTestId('hora-hasta-12')).toBeTruthy();
    expect(screen.queryByTestId('hora-hasta-13')).toBeNull();
  });

  it('trata como libre cualquier hora sin estado reportado', async () => {
    await renderHoras({ horaDesde: 21, horasEstado: [{ hora: 8, estado: 'booked' }] });

    expect(screen.getByTestId('hora-hasta-22')).toBeTruthy();
    expect(screen.getByTestId('hora-hasta-23')).toBeTruthy();
  });
});

describe('TicketQuantitySelector', () => {
  const aforo = (disponible: number, capacidadTotal = 50): AforoDia =>
    ({ disponible, capacidadTotal, ocupado: capacidadTotal - disponible }) as unknown as AforoDia;

  const renderEntradas = (
    props: Partial<React.ComponentProps<typeof TicketQuantitySelector>> = {},
  ) =>
    render(
      <TicketQuantitySelector
        cantidad={1}
        onChange={jest.fn()}
        aforo={aforo(10)}
        loading={false}
        error={null}
        {...props}
      />,
      { wrapper: ConTema },
    );

  it('avisa mientras consulta el cupo y no deja elegir todavía', async () => {
    await renderEntradas({ loading: true });

    expect(screen.getByText('Consultando cupo disponible…')).toBeTruthy();
    expect(screen.queryByText('+')).toBeNull();
  });

  it('muestra el error del aforo y no deja elegir', async () => {
    await renderEntradas({ error: 'Aforo no configurado' });

    expect(screen.getByText('⚠️ Aforo no configurado')).toBeTruthy();
    expect(screen.queryByText('+')).toBeNull();
  });

  it('muestra cuántas entradas quedan sobre el total', async () => {
    await renderEntradas({ aforo: aforo(10, 50) });

    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText(/de 50/)).toBeTruthy();
  });

  it('bloquea la compra cuando el día está lleno', async () => {
    await renderEntradas({ aforo: aforo(0, 50) });

    expect(screen.getByText('Sin cupo disponible para este día')).toBeTruthy();
    expect(screen.queryByText('+')).toBeNull();
  });

  it('suma una entrada', async () => {
    const onChange = jest.fn();
    await renderEntradas({ cantidad: 2, onChange });

    await fireEvent.press(screen.getByText('+'));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('resta una entrada', async () => {
    const onChange = jest.fn();
    await renderEntradas({ cantidad: 2, onChange });

    await fireEvent.press(screen.getByText('−'));

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('nunca baja de una entrada', async () => {
    const onChange = jest.fn();
    await renderEntradas({ cantidad: 1, onChange });

    await fireEvent.press(screen.getByText('−'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('nunca sube por encima del cupo disponible', async () => {
    const onChange = jest.fn();
    await renderEntradas({ cantidad: 3, aforo: aforo(3), onChange });

    await fireEvent.press(screen.getByText('+'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('sin dato de aforo deja subir sin tope', async () => {
    const onChange = jest.fn();
    await renderEntradas({ cantidad: 99, aforo: null, onChange });

    await fireEvent.press(screen.getByText('+'));

    expect(onChange).toHaveBeenCalledWith(100);
  });

  it('concuerda el singular y el plural de "entrada"', async () => {
    await renderEntradas({ cantidad: 1 });
    expect(screen.getByText('entrada')).toBeTruthy();
  });

  it('usa el plural con más de una entrada', async () => {
    await renderEntradas({ cantidad: 3 });
    expect(screen.getByText('entradas')).toBeTruthy();
  });
});
