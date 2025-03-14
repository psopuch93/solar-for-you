// utils/ThemeContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { getTheme, Theme } from '../styles/theme';

const THEME_PREFERENCE_KEY = '@solar_for_you_theme_preference';

interface ThemeContextProps {
  isDarkMode: boolean;
  theme: Theme;
  toggleThemeMode: () => void;
  setThemeMode: (isDark: boolean) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextProps>({
  isDarkMode: false,
  theme: getTheme(false),
  toggleThemeMode: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const deviceColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(deviceColorScheme === 'dark');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Ładowanie preferencji motywu z AsyncStorage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedThemePreference = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedThemePreference !== null) {
          setIsDarkMode(savedThemePreference === 'dark');
        }
      } catch (error) {
        console.error('Błąd podczas ładowania preferencji motywu:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, []);

  // Zapisywanie preferencji motywu do AsyncStorage
  const saveThemePreference = async (isDark: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Błąd podczas zapisywania preferencji motywu:', error);
    }
  };

  const toggleThemeMode = () => {
    setIsDarkMode((prevMode) => {
      const newMode = !prevMode;
      saveThemePreference(newMode);
      return newMode;
    });
  };

  const setThemeMode = (isDark: boolean) => {
    setIsDarkMode(isDark);
    saveThemePreference(isDark);
  };

  const theme = getTheme(isDarkMode);

  const contextValue: ThemeContextProps = {
    isDarkMode,
    theme,
    toggleThemeMode,
    setThemeMode,
  };

  if (isLoading) {
    // Możesz tu pokazać ekran ładowania
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => useContext(ThemeContext);