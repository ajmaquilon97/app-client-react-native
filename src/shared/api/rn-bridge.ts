/**
 * Puentes de React Query con React Native.
 *
 * En web, React Query se entera solo de que la pestaña volvió al frente y de que
 * hay conexión. En nativo no existe ninguna de las dos señales, así que hay que
 * conectarlas a mano: sin esto la app nunca refresca al volver de segundo plano
 * ni al recuperar la red. Ver la guía de React Native de TanStack Query.
 */

import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';

let initialised = false;

/** Idempotente: en desarrollo el fast refresh puede reevaluar el módulo. */
export function initQueryBridge(): void {
  if (initialised) return;
  initialised = true;

  onlineManager.setEventListener(setOnline => {
    let gotFirstEvent = false;

    const subscription = Network.addNetworkStateListener(state => {
      gotFirstEvent = true;
      setOnline(!!state.isConnected);
    });

    // El listener solo dispara en los cambios: el estado inicial hay que pedirlo.
    Network.getNetworkStateAsync()
      .then(state => {
        if (!gotFirstEvent) setOnline(!!state.isConnected);
      })
      .catch(() => {});

    return subscription.remove;
  });

  AppState.addEventListener('change', status => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  });
}
