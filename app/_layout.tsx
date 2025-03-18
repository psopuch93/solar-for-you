// app/_layout.tsx
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../utils/ThemeContext';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';

// Ignoruj niektóre ostrzeżenia (opcjonalnie)
LogBox.ignoreLogs([
  'Async Storage has been extracted from react-native core',
]);

// Zapobiegaj automatycznemu ukrywaniu ekranu ładowania
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Tutaj możesz załadować niestandardowe czcionki, np.:
    // 'OpenSans-Regular': require('../assets/fonts/OpenSans-Regular.ttf'),
    // 'OpenSans-Bold': require('../assets/fonts/OpenSans-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Ukryj ekran ładowania po załadowaniu czcionek
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Jeśli czcionki nie zostały załadowane, zwracamy null
  // (ekran ładowania pozostanie widoczny)
  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { theme, isDarkMode } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="brigade" />
        <Stack.Screen name="progress-report" />
      </Stack>
    </>
  );
}