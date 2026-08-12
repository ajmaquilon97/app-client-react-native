import { api } from '@/shared/api/client';
import { parseLatLngFromGoogleMapsUrl } from '@/shared/utils/geo';

import { Categoria, Espacio, ModalidadReserva } from '../types';

interface TarifaHoyAPI {
  modalidad: string | null;
  precio: number;
  unidad: string | null;
  esPromocion: boolean;
}

/** Forma cruda del backend: no sale de este archivo. */
interface EspacioAPI {
  id: number;
  titulo: string;
  descripcion: string;
  propietarioNombre: string;
  tipoEspacioId: number;
  tipoEspacioNombre: string;
  ciudadNombre: string | null;
  provinciaNombre: string | null;
  linkUbicacion: string;
  referencia: string;
  validarAforo: boolean;
  maxCapacidad: number;
  fechaCreacion: string;
  imagenPortada: string | null;
  imagenesGaleria: string[] | null;
  tarifaHoy: TarifaHoyAPI | null;
  modalidadReserva?: ModalidadReserva;
}

const IMAGEN_FALLBACK =
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80';

const AVATAR_FALLBACK =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80';

function mapTipoToCategoria(tipoNombre: string): Categoria {
  const lower = tipoNombre.toLowerCase();
  if (lower.includes('cancha')) return 'canchas';
  if (lower.includes('piscina')) return 'piscinas';
  if (lower.includes('sal')) return 'salones';
  return 'canchas';
}

/** Exportado solo para poder probar el mapeo sin pasar por la red. */
export function mapApiToEspacio(e: EspacioAPI): Espacio {
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
    ubicacion:
      [e.provinciaNombre, e.ciudadNombre, e.referencia].filter(Boolean).join(', ') ||
      'Ubicación no disponible',
    precio: e.tarifaHoy?.precio ?? 0,
    unidad: e.tarifaHoy?.unidad ?? 'hora',
    latitud: coords?.latitude ?? null,
    longitud: coords?.longitude ?? null,
    modalidadReserva: e.modalidadReserva,
    maxCapacidad: e.maxCapacidad,
    validarAforo: e.validarAforo,
    // --- campos pendientes de otros endpoints ---
    rating: 0,
    reviews: 0,
    distancia: 0,
    disponibleHoy: false,
    imagen: e.imagenPortada ?? IMAGEN_FALLBACK,
    servicios: [],
    anfitrion: {
      nombre: e.propietarioNombre,
      avatar: AVATAR_FALLBACK,
      registro: `Miembro desde ${new Date(e.fechaCreacion).getFullYear()}`,
      verificado: false,
    },
    normas: [],
    comentarios: [],
  };
}

export async function fetchEspacios(): Promise<Espacio[]> {
  const data = await api.get<EspacioAPI[]>('/mobile/espacios', {
    fallback: 'No se pudieron obtener los espacios.',
  });
  return data.map(mapApiToEspacio);
}
