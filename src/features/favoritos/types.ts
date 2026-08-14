// Ver docs/backend_response/favoritos-listas-response.md.

/** GET /api/mobile/listas-favoritos — wishlists del usuario autenticado. */
export interface ListaFavoritos {
  id: number;
  nombre: string;
  cantidadEspacios: number;
  fechaCreacion: string;
}

/** GET /api/mobile/listas-favoritos/{listaId} — `espacioIds` en orden (más reciente primero). */
export interface ListaFavoritosDetalle {
  id: number;
  nombre: string;
  fechaCreacion: string;
  espacioIds: number[];
}
