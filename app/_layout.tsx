// app/_layout.tsx - z bezpieczną inicjalizacją NFC
import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../utils/ThemeContext';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';

// Ignoruj niektóre ostrzeżenia
LogBox.ignoreLogs([
  'Async Storage has been extracted from react-native core',
]);

// Bezpieczny import NFC
let NfcManager: any = null;
try {
  if (Platform.OS !== 'web') {
    NfcManager = require('react-native-nfc-manager').default;
  }
} catch (error) {
  console.log('NFC Manager not available in layout', error);
}

// Zapobiegaj automatycznemu ukrywaniu ekranu ładowania
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Tutaj możesz załadować niestandardowe czcionki, np.:
    // 'OpenSans-Regular': require('../assets/fonts/OpenSans-Regular.ttf'),
    // 'OpenSans-Bold': require('../assets/fonts/OpenSans-Bold.ttf'),
  });

  // Inicjalizacja NFC po załadowaniu aplikacji
  useEffect(() => {
    // Inicjalizuj NFC tylko na platformach mobilnych
    if (Platform.OS !== 'web' && NfcManager) {
      const initNfc = async () => {
        try {
          // Sprawdź, czy NfcManager ma metodę isSupported
          if (typeof NfcManager.isSupported !== 'function') {
            console.log('NfcManager.isSupported is not a function');
            return;
          }
          
          // Sprawdź, czy urządzenie obsługuje NFC
          const isSupported = await NfcManager.isSupported();
          
          if (isSupported) {
            // Sprawdź, czy NfcManager ma metodę start
            if (typeof NfcManager.start !== 'function') {
              console.log('NfcManager.start is not a function');
              return;
            }
            
            // Inicjalizuj NFC Manager
            await NfcManager.start();
            console.log('NFC initialized successfully');
          } else {
            console.log('NFC is not supported on this device');
          }
        } catch (error) {
          console.error('Error initializing NFC:', error);
        }
      };
      
      initNfc();
      
      // Cleanup przy odmontowaniu
      return () => {
        if (NfcManager) {
          try {
            if (typeof NfcManager.cancelTechnologyRequest === 'function') {
              NfcManager.cancelTechnologyRequest().catch(() => {});
            }
            
            if (typeof NfcManager.unregisterTagEvent === 'function') {
              NfcManager.unregisterTagEvent().catch(() => {});
            }
          } catch (error) {
            console.error('Error during NFC cleanup:', error);
          }
        }
      };
    }
  }, []);

  // Efekt do ukrycia ekranu ładowania po załadowaniu czcionek
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