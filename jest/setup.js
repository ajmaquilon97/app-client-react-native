// Módulos nativos que no existen en el entorno de Jest. `jest-expo` cubre los
// del SDK de Expo; los de terceros hay que declararlos aquí.

// El almacenamiento seguro es nativo: en Jest se sustituye por espías que cada
// suite programa a su gusto. Por defecto se comporta como un llavero vacío.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Insets de la zona segura: sin ventana real, el paquete trae su propio mock
// con valores fijos.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// El WebView (mapa del espacio, checkout de Datafast/Kushki) es una vista
// nativa. En Jest se sustituye por un componente inerte que solo conserva sus
// props, para poder afirmar sobre el HTML/URL que se le pasa.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref, testID: props.testID ?? 'webview' }),
  );
  WebView.displayName = 'WebView';
  return { WebView, default: WebView, __esModule: true };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
    signOut: jest.fn(),
    revokeAccess: jest.fn(),
  },
  isErrorWithCode: jest.fn(() => false),
  isSuccessResponse: jest.fn(() => false),
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));
