import { setTokenProvider } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/config/api';

import { fetchEspacios, mapApiToEspacio } from '../services/espacios.service';

/** Un DTO completo del backend; cada test cambia solo lo que le interesa. */
function espacioApi(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    titulo: 'Cancha El Campín',
    descripcion: 'Césped sintético',
    propietarioNombre: 'Carlos Mendoza',
    tipoEspacioId: 1,
    tipoEspacioNombre: 'Cancha de fútbol',
    ciudadNombre: 'Quito',
    provinciaNombre: 'Pichincha',
    linkUbicacion: 'https://maps.google.com/?q=-0.180653,-78.467834',
    referencia: 'Junto al parque',
    validarAforo: false,
    maxCapacidad: 22,
    fechaCreacion: '2021-05-03T10:00:00Z',
    imagenPortada: 'https://cdn/x.jpg',
    imagenesGaleria: null,
    tarifaHoy: { modalidad: null, precio: 25, unidad: 'hora', esPromocion: false },
    ...overrides,
  } as never;
}

describe('mapApiToEspacio', () => {
  it('traduce los nombres del backend al modelo de dominio', () => {
    const e = mapApiToEspacio(espacioApi());

    expect(e).toMatchObject({
      id: 1,
      nombre: 'Cancha El Campín',
      subcategoria: 'Cancha de fútbol',
      precio: 25,
      unidad: 'hora',
      maxCapacidad: 22,
    });
    expect(e.anfitrion.nombre).toBe('Carlos Mendoza');
  });

  it('deduce la categoría a partir del nombre del tipo de espacio', () => {
    expect(mapApiToEspacio(espacioApi({ tipoEspacioNombre: 'Cancha sintética' })).categoria).toBe(
      'canchas',
    );
    expect(mapApiToEspacio(espacioApi({ tipoEspacioNombre: 'Piscina semiolímpica' })).categoria).toBe(
      'piscinas',
    );
    expect(mapApiToEspacio(espacioApi({ tipoEspacioNombre: 'Salón de eventos' })).categoria).toBe(
      'salones',
    );
    // Sin coincidencia cae en canchas, no revienta.
    expect(mapApiToEspacio(espacioApi({ tipoEspacioNombre: 'Coworking' })).categoria).toBe('canchas');
  });

  it('arma la ubicación con provincia, ciudad y referencia', () => {
    expect(mapApiToEspacio(espacioApi()).ubicacion).toBe('Pichincha, Quito, Junto al parque');
  });

  it('omite las partes vacías de la ubicación', () => {
    const e = mapApiToEspacio(espacioApi({ provinciaNombre: null, ciudadNombre: null }));
    expect(e.ubicacion).toBe('Junto al parque');
  });

  it('cae a un texto legible si no hay ninguna parte de la ubicación', () => {
    const e = mapApiToEspacio(
      espacioApi({ provinciaNombre: null, ciudadNombre: null, referencia: '' }),
    );
    expect(e.ubicacion).toBe('Ubicación no disponible');
  });

  it('extrae las coordenadas del link de Google Maps', () => {
    const e = mapApiToEspacio(espacioApi());
    expect(e.latitud).toBeCloseTo(-0.180653);
    expect(e.longitud).toBeCloseTo(-78.467834);
  });

  it('deja las coordenadas en null si el link no las trae', () => {
    const e = mapApiToEspacio(espacioApi({ linkUbicacion: 'https://maps.app.goo.gl/abc' }));
    expect(e.latitud).toBeNull();
    expect(e.longitud).toBeNull();
  });

  it('usa precio 0 y unidad "hora" cuando no hay tarifa del día', () => {
    const e = mapApiToEspacio(espacioApi({ tarifaHoy: null }));
    expect(e.precio).toBe(0);
    expect(e.unidad).toBe('hora');
  });

  it('usa una imagen de respaldo si el espacio no tiene portada', () => {
    const e = mapApiToEspacio(espacioApi({ imagenPortada: null }));
    expect(e.imagen).toContain('unsplash.com');
  });

  it('arma el registro del anfitrión con el año de creación', () => {
    const e = mapApiToEspacio(espacioApi({ fechaCreacion: '2019-11-02T00:00:00Z' }));
    expect(e.anfitrion.registro).toBe('Miembro desde 2019');
  });

  it('conserva modalidadReserva cuando el backend la manda', () => {
    expect(mapApiToEspacio(espacioApi({ modalidadReserva: 'cupo_compartido' })).modalidadReserva).toBe(
      'cupo_compartido',
    );
    // Y la deja sin definir si no viene, para que el fallback local decida.
    expect(mapApiToEspacio(espacioApi()).modalidadReserva).toBeUndefined();
  });
});

describe('fetchEspacios', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    setTokenProvider({
      getAccessToken: async () => 'token',
      refresh: async () => 'token-nuevo',
      onAuthFailure: async () => {},
    });
  });

  afterEach(() => setTokenProvider(null));

  it('pide el catálogo y devuelve modelo de dominio, no el DTO', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      url: '',
      headers: {} as Headers,
      text: async () => JSON.stringify([espacioApi()]),
    } as unknown as Response);

    const espacios = await fetchEspacios();

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/mobile/espacios`);
    expect(espacios).toHaveLength(1);
    // `titulo` es del backend: no debe sobrevivir al mapeo.
    expect(espacios[0]).not.toHaveProperty('titulo');
    expect(espacios[0].nombre).toBe('Cancha El Campín');
  });
});
