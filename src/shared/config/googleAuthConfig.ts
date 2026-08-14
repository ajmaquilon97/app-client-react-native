// Client ID de tipo "Aplicación web" (AgoraClientWeb1) en Google Cloud Console — el mismo
// que ya usa el portal web. GoogleSignin lo necesita como `webClientId` para que el idToken
// resultante traiga este client como audience, que es contra lo que el backend ya valida hoy.
// El client Android (AgoraClientAndroid1, package + SHA-1) no se referencia acá: Android lo
// detecta solo, a partir del `package` configurado en app.json.
export const GOOGLE_WEB_CLIENT_ID =
  '1075326690675-gp4kqt7i3tp2fs0s6vjl62j1plbjobi0.apps.googleusercontent.com';
