import { Espacio } from '@/types';

export const ESPACIOS_DATA: Espacio[] = [
  {
    id: 1,
    nombre: 'Complejo Deportivo El Campín',
    categoria: 'canchas',
    subcategoria: 'Fútbol Sintética',
    ubicacion: 'Norte de la Ciudad',
    precio: 25,
    unidad: 'hora',
    rating: 4.8,
    reviews: 124,
    imagen:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Espectacular cancha de fútbol 7 con césped sintético de última generación, iluminación LED profesional, camerinos y parqueadero vigilado.',
    servicios: ['Iluminación', 'Parqueadero', 'Duchas', 'Cafetería'],
  },
  {
    id: 2,
    nombre: 'Club Tenis Grand Slam',
    categoria: 'canchas',
    subcategoria: 'Tenis de Arcilla',
    ubicacion: 'Vía Samborondón',
    precio: 35,
    unidad: 'hora',
    rating: 4.9,
    reviews: 86,
    imagen:
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Canchas de polvo de ladrillo oficiales. Excelente mantenimiento diario. Alquiler de raquetas y pelotas disponible en recepción.',
    servicios: ['Entrenador', 'Iluminación', 'Tienda Pro', 'Lockers'],
  },
  {
    id: 3,
    nombre: 'Piscina Temperada Oasis',
    categoria: 'piscinas',
    subcategoria: 'Familiar y Climatizada',
    ubicacion: 'Urdesa Central',
    precio: 45,
    unidad: 'bloque (4 hrs)',
    rating: 4.7,
    reviews: 98,
    imagen:
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Piscina con temperatura regulada a 28°C perfecta para eventos familiares, nado libre o terapia. Cuenta con área de barbacoa opcional.',
    servicios: ['Parrilla', 'Salvavidas', 'Sillas Reclinables', 'WIFI'],
  },
  {
    id: 4,
    nombre: 'La Laguna Club & Pool',
    categoria: 'piscinas',
    subcategoria: 'Recreativa con Tobogán',
    ubicacion: 'Vía a la Costa',
    precio: 60,
    unidad: 'día entero',
    rating: 4.9,
    reviews: 142,
    imagen:
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Paraje tropical con piscina infinita, cascada artificial y tobogán para niños. Espacio ideal para pasar un día de sol inigualable.',
    servicios: ['Bar Húmedo', 'Cabañas', 'Música Ambiente', 'Parque Infantil'],
  },
  {
    id: 5,
    nombre: 'Salón de Eventos Royal Palace',
    categoria: 'salones',
    subcategoria: 'Matrimonios y Corporativos',
    ubicacion: 'Centro Financiero',
    precio: 120,
    unidad: 'evento',
    rating: 4.9,
    reviews: 210,
    imagen:
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Elegante salón de eventos con capacidad para 150 personas. Acústica de primera, aire acondicionado centralizado y suite de preparación.',
    servicios: ['Catering', 'Sonido/Luces', 'Seguridad Privada', 'Climatización'],
  },
  {
    id: 6,
    nombre: 'Salón Jardín Las Orquídeas',
    categoria: 'salones',
    subcategoria: 'Cumpleaños y Baby Showers',
    ubicacion: 'La Aurora',
    precio: 80,
    unidad: 'hora',
    rating: 4.6,
    reviews: 74,
    imagen:
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Salón semiabierto rodeado de hermosos jardines. Perfecto para eventos de día o atardeceres. Cocina equipada para uso del banquetero.',
    servicios: ['Jardín exterior', 'Cocina', 'Mobiliario Básico', 'Estacionamiento'],
  },
];
