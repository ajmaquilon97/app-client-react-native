import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { ConTema } from '../../../../jest/harness';
import { ApiError } from '@/shared/api/errors';

import AuthButton from '../components/AuthButton';
import AuthTextField from '../components/AuthTextField';
import GoogleButton from '../components/GoogleButton';
import { useAuth } from '../context/AuthContext';

/**
 * Componentes de la pantalla de acceso. El caso con más aristas es el botón de
 * Google: el SDK nativo distingue "cancelado", "ya en curso" y "error real", y
 * cada uno tiene que terminar de forma distinta.
 */

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const router = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
const loginWithGoogle = jest.fn();
const signIn = GoogleSignin.signIn as jest.Mock;
const hasPlayServices = GoogleSignin.hasPlayServices as jest.Mock;
const esRespuestaExitosa = isSuccessResponse as unknown as jest.Mock;
const esErrorConCodigo = isErrorWithCode as unknown as jest.Mock;

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  (useRouter as jest.Mock).mockReturnValue(router);
  (useAuth as jest.Mock).mockReturnValue({ loginWithGoogle });
  hasPlayServices.mockResolvedValue(true);
  esRespuestaExitosa.mockReturnValue(true);
  esErrorConCodigo.mockReturnValue(false);
  signIn.mockResolvedValue({ data: { idToken: 'id-token-google' } });
  loginWithGoogle.mockResolvedValue(undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
  (console.log as jest.Mock).mockRestore();
});

describe('AuthButton', () => {
  it('muestra la etiqueta y responde al toque', async () => {
    const onPress = jest.fn();
    await render(<AuthButton label="Iniciar sesión" onPress={onPress} />, { wrapper: ConTema });

    await fireEvent.press(screen.getByText('Iniciar sesión'));

    expect(onPress).toHaveBeenCalled();
  });

  it('mientras carga oculta la etiqueta y no responde', async () => {
    const onPress = jest.fn();
    await render(<AuthButton label="Iniciar sesión" onPress={onPress} loading />, {
      wrapper: ConTema,
    });

    expect(screen.queryByText('Iniciar sesión')).toBeNull();
  });

  it('deshabilitado no dispara la acción', async () => {
    const onPress = jest.fn();
    await render(<AuthButton label="Continuar" onPress={onPress} disabled />, {
      wrapper: ConTema,
    });

    await fireEvent.press(screen.getByText('Continuar'));

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('AuthTextField', () => {
  it('muestra la etiqueta del campo', async () => {
    await render(<AuthTextField label="Correo" placeholder="tu@correo.com" />, {
      wrapper: ConTema,
    });

    expect(screen.getByText('Correo')).toBeTruthy();
  });

  it('muestra el error de validación cuando lo hay', async () => {
    await render(<AuthTextField label="Correo" error="Correo inválido" />, { wrapper: ConTema });

    expect(screen.getByText('Correo inválido')).toBeTruthy();
  });

  it('un campo normal no oculta el texto ni ofrece el ojo', async () => {
    await render(<AuthTextField label="Correo" placeholder="tu@correo.com" />, {
      wrapper: ConTema,
    });

    expect(screen.getByPlaceholderText('tu@correo.com').props.secureTextEntry).toBe(false);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('un campo de contraseña arranca oculto', async () => {
    await render(<AuthTextField label="Contraseña" placeholder="••••••" isPassword />, {
      wrapper: ConTema,
    });

    expect(screen.getByPlaceholderText('••••••').props.secureTextEntry).toBe(true);
  });

  it('el ojo alterna la visibilidad de la contraseña', async () => {
    await render(<AuthTextField label="Contraseña" placeholder="••••••" isPassword />, {
      wrapper: ConTema,
    });

    await fireEvent.press(screen.getByLabelText('Mostrar contraseña'));
    expect(screen.getByPlaceholderText('••••••').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByLabelText('Ocultar contraseña'));
    expect(screen.getByPlaceholderText('••••••').props.secureTextEntry).toBe(true);
  });

  it('propaga los cambios de texto', async () => {
    const onChangeText = jest.fn();
    await render(
      <AuthTextField label="Correo" placeholder="tu@correo.com" onChangeText={onChangeText} />,
      { wrapper: ConTema },
    );

    await fireEvent.changeText(screen.getByPlaceholderText('tu@correo.com'), 'kelly@agora.ec');

    expect(onChangeText).toHaveBeenCalledWith('kelly@agora.ec');
  });
});

describe('GoogleButton', () => {
  const renderBoton = () =>
    render(<GoogleButton label="Continuar con Google" />, { wrapper: ConTema });

  it('canjea el idToken de Google y entra a la app', async () => {
    await renderBoton();

    await fireEvent.press(screen.getByText('Continuar con Google'));

    await waitFor(() => expect(loginWithGoogle).toHaveBeenCalledWith('id-token-google'));
    expect(hasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('si el usuario cancela el selector no pasa nada', async () => {
    esRespuestaExitosa.mockReturnValue(false);
    await renderBoton();

    await fireEvent.press(screen.getByText('Continuar con Google'));

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(loginWithGoogle).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('avisa si Google no devuelve idToken', async () => {
    signIn.mockResolvedValue({ data: {} });
    await renderBoton();

    await fireEvent.press(screen.getByText('Continuar con Google'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudo iniciar sesión con Google',
        expect.stringContaining('Google no devolvió un token válido.'),
      ),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('ignora en silencio un login que ya estaba en curso', async () => {
    const err = Object.assign(new Error('in progress'), {
      code: statusCodes.IN_PROGRESS,
    });
    signIn.mockRejectedValue(err);
    esErrorConCodigo.mockReturnValue(true);
    await renderBoton();

    await fireEvent.press(screen.getByText('Continuar con Google'));

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('incluye el código del SDK en el aviso de error', async () => {
    const err = Object.assign(new Error('Play Services desactualizado'), {
      code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE,
    });
    signIn.mockRejectedValue(err);
    esErrorConCodigo.mockReturnValue(true);
    await renderBoton();

    await fireEvent.press(screen.getByText('Continuar con Google'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const detalle = alertSpy.mock.calls[0][1] as string;
    expect(detalle).toContain('Código: PLAY_SERVICES_NOT_AVAILABLE');
    expect(detalle).toContain('Play Services desactualizado');
  });

  it('incluye el status HTTP cuando falla el canje contra el backend', async () => {
    loginWithGoogle.mockRejectedValue(new ApiError('Ese correo ya está en uso.', 409));
    await renderBoton();

    await fireEvent.press(screen.getByText('Continuar con Google'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const detalle = alertSpy.mock.calls[0][1] as string;
    expect(detalle).toContain('HTTP: 409');
    expect(detalle).toContain('Ese correo ya está en uso.');
  });

  it('describe también lo que no es un Error', async () => {
    signIn.mockRejectedValue('fallo raro del SDK');
    await renderBoton();

    await fireEvent.press(screen.getByText('Continuar con Google'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertSpy.mock.calls[0][1]).toContain('Error desconocido: fallo raro del SDK');
  });

});
