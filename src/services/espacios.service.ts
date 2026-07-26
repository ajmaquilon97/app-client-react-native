import { Espacio, Categoria } from '@/types';
import { API_BASE_URL } from '@/config/api';
import { parseLatLngFromGoogleMapsUrl } from '@/utils/geo';

const API_URL = `${API_BASE_URL}/mobile/espacios`;

interface TarifaHoyAPI {
  modalidad: string | null;
  precio: number;
  unidad: string | null;
  esPromocion: boolean;
}

interface EspacioAPI {
  id: number;
  titulo: string;
  descripcion: string;
  propietarioNombre: string;
  tipoEspacioId: number;
  tipoEspacioNombre: string;
  ciudad: string;
  provincia: string;
  linkUbicacion: string;
  referencia: string;
  validarAforo: boolean;
  maxCapacidad: number;
  fechaCreacion: string;
  imagenPortada: string | null;
  imagenesGaleria: string[] | null;
  tarifaHoy: TarifaHoyAPI | null;
}

const IMAGEN_FALLBACK =
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80';

function mapTipoToCategoria(tipoNombre: string): Categoria {
  const lower = tipoNombre.toLowerCase();
  if (lower.includes('cancha')) return 'canchas';
  if (lower.includes('piscina')) return 'piscinas';
  if (lower.includes('sal')) return 'salones';
  return 'canchas';
}

function mapApiToEspacio(e: EspacioAPI): Espacio {
  const coords = parseLatLngFromGoogleMapsUrl(e.linkUbicacion);

  if (__DEV__) {
    if (coords) {
      console.log(`[espacios] #${e.id} coords parseadas:`, coords, 'desde', e.linkUbicacion);
    } else {
      console.log(`[espacios] #${e.id} NO se pudo parsear linkUbicacion:`, e.linkUbicacion);
    }
  }

  return {
    id: e.id,
    nombre: e.titulo,
    descripcion: e.descripcion,
    categoria: mapTipoToCategoria(e.tipoEspacioNombre),
    subcategoria: e.tipoEspacioNombre,
    ubicacion: `${e.ciudad}, ${e.provincia}`,
    precio: e.tarifaHoy?.precio ?? 0,
    unidad: e.tarifaHoy?.unidad ?? 'hora',
    latitud: coords?.latitude ?? null,
    longitud: coords?.longitude ?? null,
    // --- campos pendientes de otros endpoints ---
    rating: 0,
    reviews: 0,
    distancia: 0,
    disponibleHoy: false,
    imagen: e.imagenPortada ?? IMAGEN_FALLBACK,
    servicios: [],
    anfitrion: {
      nombre: e.propietarioNombre,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      registro: `Miembro desde ${new Date(e.fechaCreacion).getFullYear()}`,
      verificado: false,
    },
    normas: [],
    comentarios: [],
  };
}

export async function fetchEspacios(accessToken: string): Promise<Espacio[]> {
  const res = await fetch(API_URL, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Error ${res.status} al obtener espacios`);
  const data: EspacioAPI[] = await res.json();
  return data.map(mapApiToEspacio);
}
