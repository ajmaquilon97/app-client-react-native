import {
  formatDistanceKm,
  haversineDistanceKm,
  parseLatLngFromGoogleMapsUrl,
} from '@/shared/utils/geo';

describe('parseLatLngFromGoogleMapsUrl', () => {
  it('extrae las coordenadas del parámetro q', () => {
    expect(parseLatLngFromGoogleMapsUrl('https://maps.google.com/?q=-0.180653,-78.467834')).toEqual({
      latitude: -0.180653,
      longitude: -78.467834,
    });
  });

  it('funciona cuando q no es el primer parámetro', () => {
    expect(parseLatLngFromGoogleMapsUrl('https://maps.google.com/maps?hl=es&q=2.5,-79.9')).toEqual({
      latitude: 2.5,
      longitude: -79.9,
    });
  });

  it('devuelve null si la URL no trae coordenadas', () => {
    expect(parseLatLngFromGoogleMapsUrl('https://maps.app.goo.gl/abc123')).toBeNull();
    expect(parseLatLngFromGoogleMapsUrl('https://maps.google.com/?q=Parque+La+Carolina')).toBeNull();
  });

  it('tolera null, undefined y cadena vacía', () => {
    expect(parseLatLngFromGoogleMapsUrl(null)).toBeNull();
    expect(parseLatLngFromGoogleMapsUrl(undefined)).toBeNull();
    expect(parseLatLngFromGoogleMapsUrl('')).toBeNull();
  });
});

describe('haversineDistanceKm', () => {
  const quito = { latitude: -0.1807, longitude: -78.4678 };
  const guayaquil = { latitude: -2.1894, longitude: -79.8891 };

  it('calcula la distancia entre dos puntos conocidos', () => {
    // Quito–Guayaquil en línea recta son ~275 km.
    expect(haversineDistanceKm(quito, guayaquil)).toBeCloseTo(275, -1);
  });

  it('da cero para el mismo punto', () => {
    expect(haversineDistanceKm(quito, quito)).toBe(0);
  });

  it('es simétrica', () => {
    expect(haversineDistanceKm(quito, guayaquil)).toBeCloseTo(
      haversineDistanceKm(guayaquil, quito),
      10,
    );
  });
});

describe('formatDistanceKm', () => {
  it('usa metros por debajo del kilómetro', () => {
    expect(formatDistanceKm(0.35)).toBe('350 m');
    expect(formatDistanceKm(0)).toBe('0 m');
  });

  it('usa kilómetros con un decimal a partir de 1', () => {
    expect(formatDistanceKm(1)).toBe('1.0 km');
    expect(formatDistanceKm(12.34)).toBe('12.3 km');
  });
});
