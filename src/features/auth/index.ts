export { AuthProvider, useAuth } from './context/AuthContext';

export { default as AuthButton } from './components/AuthButton';
export { default as AuthTextField } from './components/AuthTextField';
export { default as GoogleButton } from './components/GoogleButton';

export {
  forgotPassword,
  resetPassword,
  enviarSmsOtp,
  verificarSmsOtp,
  checkEmailAvailability,
} from './services/auth.service';

export type { Usuario, AuthTokens, RegistroInput } from './types';
