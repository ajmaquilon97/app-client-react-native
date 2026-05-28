export type Categoria = 'canchas' | 'piscinas' | 'salones';

export type FiltroRapido = 'cercanos' | 'puntuacion' | 'inmediato';

export interface Anfitrion {
  nombre: string;
  avatar: string;
  registro: string;
  verificado: boolean;
}

export interface Comentario {
  usuario: string;
  rating: number;
  fecha: string;
  texto: string;
}

export interface Espacio {
  id: number;
  nombre: string;
  categoria: Categoria;
  subcategoria: string;
  ubicacion: string;
  precio: number;
  unidad: string;
  rating: number;
  reviews: number;
  distancia: number;
  disponibleHoy: boolean;
  imagen: string;
  descripcion: string;
  servicios: string[];
  anfitrion: Anfitrion;
  normas: string[];
  comentarios: Comentario[];
}
