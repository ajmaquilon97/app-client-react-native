import { ReactNode, useEffect, useState } from 'react';

import ScreenState from '@/shared/ui/feedback/ScreenState';

interface DeferredContentProps {
  /**
   * Mientras sea falso no se monta nada y el gate queda rearmado, para que la
   * siguiente apertura vuelva a empezar por el indicador.
   */
  active?: boolean;
  /** Texto opcional bajo el indicador. */
  message?: string;
  /** Sustituye al indicador por defecto. */
  fallback?: ReactNode;
  /**
   * Función y no elemento: así el árbol pesado ni siquiera se construye hasta
   * que toca montarlo, que es justo lo que este componente viene a aplazar.
   */
  children: () => ReactNode;
}

/**
 * Seguro contra el indicador eterno: si el hilo de JS nunca llega a estar
 * ocioso, al vencer este plazo se monta igual. Más vale un frame con tirón que
 * una pantalla que no aparece nunca.
 */
const PLAZO_MAXIMO_MS = 500;

/**
 * Aplaza el montaje de un árbol pesado hasta después del primer frame, y
 * mientras tanto pinta el indicador de carga de la app.
 *
 * El problema que resuelve: un contenedor solo puede pintar su primer frame
 * cuando ya montó todo lo que lleva dentro. Si eso incluye imágenes remotas,
 * selectores y un `WebView`, entre el toque del usuario y la aparición de la
 * ventana hay un hueco en el que la app parece colgada — no hay nada que
 * indique que el toque se registró.
 *
 * Aplazar el contenido invierte el orden: primero aparece la ventana con el
 * indicador (barata de pintar), y el trabajo caro ocurre después, ya con
 * respuesta visual en pantalla.
 *
 * Usa `requestIdleCallback` y no `InteractionManager.runAfterInteractions`:
 * este último quedó deprecado en React Native 0.84 y su propia nota de
 * deprecación remite a `requestIdleCallback`.
 *
 * Cuándo NO usarlo: si lo que tarda es una petición de red, el estado de carga
 * lo da la query (`QueryBoundary`), no esto. Ver §7 de docs/ARQUITECTURA.md.
 */
export default function DeferredContent({
  active = true,
  message,
  fallback,
  children,
}: DeferredContentProps) {
  const [listo, setListo] = useState(false);

  // Rearme derivado del cambio de prop en vez de un efecto (React: "You Might
  // Not Need an Effect"), igual que en `useReservaFlow`: con el efecto, React
  // alcanzaba a pintar un frame del contenido viejo antes de reiniciarlo.
  const [activoAnterior, setActivoAnterior] = useState(active);
  if (activoAnterior !== active) {
    setActivoAnterior(active);
    if (!active) setListo(false);
  }

  useEffect(() => {
    if (!active) return;

    // `requestIdleCallback` lo aporta el runtime de React Native, pero la app
    // también compila a web y Safari no lo trae hasta la 17. Sin este respaldo,
    // ahí no sería un aplazamiento peor: sería un `TypeError`.
    if (typeof requestIdleCallback !== 'function') {
      const espera = setTimeout(() => setListo(true), 0);
      return () => clearTimeout(espera);
    }

    const tarea = requestIdleCallback(() => setListo(true), { timeout: PLAZO_MAXIMO_MS });
    return () => cancelIdleCallback(tarea);
  }, [active]);

  if (!active) return null;

  if (!listo) {
    return <>{fallback ?? <ScreenState variant="loading" message={message} />}</>;
  }

  return <>{children()}</>;
}
