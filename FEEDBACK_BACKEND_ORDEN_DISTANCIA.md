# Feedback para backend: ordenar espacios por cercanía (GET /api/mobile/espacios)

## Resumen

Necesitamos que `GET /api/mobile/espacios` pueda devolver los espacios **ordenados de más cercano a más lejano** respecto a la ubicación del usuario. El cliente (app móvil) va a mandar su latitud/longitud actual en cada request; el backend calcula y ordena.

Hoy la distancia se calcula en el cliente contra el `linkUbicacion` de cada espacio (ver `src/utils/geo.ts`), pero solo se usa para mostrarla en el Detalle de Espacio — no para ordenar el listado. Moverlo al backend evita traer los 3 campos de lat/lng por texto y volver a parsear una URL de Google Maps en el cliente, y permite ordenar antes de paginar/limitar resultados.

## Propuesta de contrato

Extender `GET /api/mobile/espacios` con dos query params **opcionales**, sin romper el comportamiento actual:

```
GET /api/mobile/espacios?lat=-2.170998&lng=-79.922359
```

- Si se envían `lat`/`lng`: la respuesta viene ordenada por distancia ascendente, y cada `EspacioMobileResponse` incluye un campo adicional con la distancia ya calculada (ej. `distanciaKm: number`), para no volver a calcularla en el cliente.
- Si no se envían: se mantiene el comportamiento/orden actual (sin romper nada para quien ya consume el endpoint).

Ejemplo de shape agregado:
```json
{
  "id": 7,
  "...": "...campos existentes",
  "distanciaKm": 3.42
}
```

## Recomendaciones para que esto no meta latencia

Sabemos que el stack de backend es **.NET + SQL Server**, así que estas recomendaciones ya vienen concretas a ese motor (no genéricas):

1. **Modelar la ubicación como columnas propias, no parseando `LinkUbicacion`.** Hoy el espacio solo guarda la URL de Google Maps como texto; para poder indexar y ordenar por distancia hace falta que la latitud/longitud existan como datos estructurados en la tabla `Espacios`. Dos opciones:
   - Simple: agregar columnas `Latitud`/`Longitud` (`float` o `decimal(9,6)`).
   - Recomendada si van a usar índice espacial: agregar una columna `geography` (ej. `Ubicacion geography`), poblada con `geography::Point(latitud, longitud, 4326)` (el SRID 4326 es WGS84, el sistema estándar de GPS/lat-lng).

2. **Usar el tipo `geography` nativo de SQL Server + índice espacial**, en vez de calcular Haversine fila por fila en C#:
   ```sql
   ALTER TABLE Espacios ADD Ubicacion geography;
   UPDATE Espacios SET Ubicacion = geography::Point(Latitud, Longitud, 4326);

   CREATE SPATIAL INDEX IX_Espacios_Ubicacion
     ON Espacios(Ubicacion)
     USING GEOGRAPHY_AUTO_GRID;
   ```
   Y luego, para ordenar por cercanía, SQL Server soporta el patrón documentado de **"nearest neighbor query"**: si el `ORDER BY` usa `STDistance()` directamente contra el índice espacial, el optimizador puede resolverlo usando el índice en vez de escanear toda la tabla:
   ```sql
   DECLARE @usuario geography = geography::Point(@lat, @lng, 4326);

   SELECT TOP (@limite) *, Ubicacion.STDistance(@usuario) AS DistanciaMetros
   FROM Espacios
   WHERE Estado = 'activo'
   ORDER BY Ubicacion.STDistance(@usuario);
   ```
   Si usan Entity Framework Core, el paquete `Microsoft.EntityFrameworkCore.SqlServer.NetTopologySuite` agrega soporte para mapear la columna `geography` a `NetTopologySuite.Geometries.Point` y traducir `.Distance(...)` de LINQ a `STDistance` en el SQL generado — no hace falta bajar a SQL crudo para aprovechar el índice.

3. **Para el volumen actual (decenas de espacios), lo anterior es "nice to have", no urgente.** Con el catálogo de hoy, traer los espacios activos con sus `Latitud`/`Longitud` y calcular Haversine en memoria en C# (sobre una `List<Espacio>` pequeña) es perfectamente aceptable — es sub-milisegundo. El índice espacial recién paga la pena cuando el catálogo crezca a un volumen donde el escaneo en memoria empiece a pesar (miles de filas). No es necesario invertir en el punto 2 de una sola vez; el punto 1 (tener lat/lng estructurados) sí conviene resolverlo ya, independientemente de si usan índice espacial ahora o después.

4. **Evitar N+1**: una sola consulta que traiga todos los espacios candidatos con su ubicación, nunca un round-trip a la base de datos por cada espacio.

5. **Validar los límites de `lat`/`lng` recibidos** (-90..90 / -180..180) antes de calcular, para no propagar basura si el cliente manda algo corrupto (GPS con error, permiso denegado, etc.). `geography::Point` de SQL Server además **lanza excepción** si le pasan coordenadas fuera de rango, así que sin esta validación el request terminaría en un 500 en vez de un 400 controlado.

6. **Si calculan Haversine manualmente en C# (mientras no usen `geography`/`STDistance`), no usen Vincenty/fórmulas elipsoidales.** A escala de ciudad la diferencia de precisión es irrelevante para "más cercano primero", y Haversine es mucho más barato (una pasada de trigonometría vs. un cálculo iterativo).

7. **Tener en cuenta que esta respuesta deja de ser cacheable de forma genérica** (depende de la ubicación de cada usuario, además de ya depender del día por `tarifaHoy`). Si en algún momento se cachea parte del payload, que sea solo la parte estática por espacio (imágenes, calificación, descripción), nunca `tarifaHoy` ni `distanciaKm`.

8. **Considerar un radio máximo o paginación** (el `TOP (@limite)` del ejemplo de arriba) si el catálogo de espacios crece mucho, en vez de siempre traer y ordenar la tabla completa en cada request.

## Contexto

- Relacionado con `FEEDBACK_BACKEND_TARIFAS.md` (mismo endpoint, `GET /api/mobile/espacios`).
- Stack de backend confirmado: .NET + SQL Server.
- Cálculo de distancia actual del lado del cliente: `src/utils/geo.ts` (`haversineDistanceKm`), usado hoy solo en `src/components/space/SpaceDetailSheet.tsx`.
- Reportado desde: app-client-react-native, 2026-07-27.
