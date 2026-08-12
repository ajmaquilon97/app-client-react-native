import {
  esMismoDia,
  formatHora,
  toDateOnlyString,
  toLocalDateTimeString,
} from '@/shared/utils/fechas';

describe('esMismoDia', () => {
  it('ignora la hora', () => {
    expect(esMismoDia(new Date(2026, 7, 11, 0, 5), new Date(2026, 7, 11, 23, 55))).toBe(true);
  });

  it('distingue días, meses y años', () => {
    expect(esMismoDia(new Date(2026, 7, 11), new Date(2026, 7, 12))).toBe(false);
    expect(esMismoDia(new Date(2026, 7, 11), new Date(2026, 8, 11))).toBe(false);
    expect(esMismoDia(new Date(2026, 7, 11), new Date(2025, 7, 11))).toBe(false);
  });
});

describe('formatHora', () => {
  it('rellena con cero a la izquierda', () => {
    expect(formatHora(0)).toBe('00:00');
    expect(formatHora(9)).toBe('09:00');
    expect(formatHora(18)).toBe('18:00');
  });
});

describe('toDateOnlyString', () => {
  it('usa el día local, no el UTC', () => {
    // Un 1 de enero a las 00:30 locales sigue siendo día 1 aunque en UTC ya sea otro.
    expect(toDateOnlyString(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
  });

  it('rellena mes y día con dos dígitos', () => {
    expect(toDateOnlyString(new Date(2026, 8, 5))).toBe('2026-09-05');
  });
});

describe('toLocalDateTimeString', () => {
  it('pega la hora a la fecha sin sufijo de zona', () => {
    expect(toLocalDateTimeString(new Date(2026, 7, 11), 7)).toBe('2026-08-11T07:00:00');
    expect(toLocalDateTimeString(new Date(2026, 7, 11), 21)).toBe('2026-08-11T21:00:00');
  });
});
