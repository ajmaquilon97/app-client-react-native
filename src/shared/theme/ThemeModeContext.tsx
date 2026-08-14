import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

const THEME_MODE_KEY = 'theme_mode';

interface ThemeModeContextValue {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

interface ThemeModeProviderProps {
  children: ReactNode;
}

export const ThemeModeProvider: React.FC<ThemeModeProviderProps> = ({ children }) => {
  const deviceScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(THEME_MODE_KEY).catch(() => null);
      if (isThemeMode(stored)) {
        setModeState(stored);
      }
    })();
  }, []);

  const setMode = useCallback((newMode: ThemeMode): void => {
    setModeState(newMode);
    SecureStore.setItemAsync(THEME_MODE_KEY, newMode).catch(() => {});
  }, []);

  const colorScheme: ColorScheme =
    mode === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : mode;

  return (
    <ThemeModeContext.Provider value={{ mode, colorScheme, setMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
};

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return ctx;
}
