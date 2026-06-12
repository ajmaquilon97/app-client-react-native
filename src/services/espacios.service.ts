import { Espacio, Categoria } from '@/types';

const API_URL = 'https://api-reservas.azurewebsites.net/api/espacios';

interface EspacioAPI {
  id: number;
  titulo: string;
  descripcion: string;
  propietarioId: number;
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
}

function mapTipoToCategoria(tipoNombre: string): Categoria {
  const lower = tipoNombre.toLowerCase();
  if (lower.includes('cancha')) return 'canchas';
  if (lower.includes('piscina')) return 'piscinas';
  if (lower.includes('sal')) return 'salones';
  return 'canchas';
}

function mapApiToEspacio(e: EspacioAPI): Espacio {
  return {
    id: e.id,
    nombre: e.titulo,
    descripcion: e.descripcion,
    categoria: mapTipoToCategoria(e.tipoEspacioNombre),
    subcategoria: e.tipoEspacioNombre,
    ubicacion: `${e.ciudad}, ${e.provincia}`,
    // --- campos pendientes de otros endpoints ---
    precio: 0,
    unidad: 'hora',
    rating: 0,
    reviews: 0,
    distancia: 0,
    disponibleHoy: false,
    imagen: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
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

export async function fetchEspacios(): Promise<Espacio[]> {
  const res = await fetch(API_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Error ${res.status} al obtener espacios`);
  const data: EspacioAPI[] = await res.json();
  return data.map(mapApiToEspacio);
}
