export type Categoria = 'canchas' | 'piscinas' | 'salones';

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
  imagen: string;
  descripcion: string;
  servicios: string[];
}
