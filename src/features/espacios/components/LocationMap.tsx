import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface LocationMapProps {
  latitude: number;
  longitude: number;
}

export default function LocationMap({ latitude, longitude }: LocationMapProps) {
  const mapSrc = `https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;

  // Google exige que esta URL viva dentro de un <iframe> real; si el WebView
  // navega directo a mapSrc, Google la trata como documento de nivel superior
  // y muestra "The Google Maps Embed API must be used in an iframe". Por eso
  // envolvemos la URL en un HTML local con un iframe adentro.
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>html, body, iframe { margin: 0; padding: 0; width: 100%; height: 100%; border: 0; }</style>
  </head>
  <body>
    <iframe src="${mapSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
  </body>
</html>`;

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={StyleSheet.absoluteFill}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      onError={e => {
        if (__DEV__) console.log('[LocationMap] error cargando WebView:', e.nativeEvent);
      }}
    />
  );
}
