// app/_layout.tsx - z bezpieczną inicjalizacją NFC
import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../utils/ThemeContext';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { checkNfcSupport } from '../utils/nfcUtils';

// Ignoruj niektóre ostrzeżenia
LogBox.ignoreLogs([
  'Async Storage has been extracted from react-native core',
]);

// Bezpieczny import NFC
let NfcManager: any = null;

// Zmodyfikowany, bardziej bezpieczny sposób importu NFC
if (Platform.OS !== 'web') {
  try {
    // Najpierw sprawdźmy czy moduł jest dostępny bez przypisywania
    const hasModule = (() => {
      try {
        return !!require.resolve('react-native-nfc-manager');
      } catch (e) {
        return false;
      }
    })();

    if (hasModule) {
      // Importujemy tylko jeśli moduł istnieje
      const NfcPackage = require('react-native-nfc-manager');
      if (NfcPackage && typeof NfcPackage === 'object') {
        NfcManager = NfcPackage.default || NfcPackage;
        console.log('NFC Manager imported successfully in layout');
      } else {
        console.log('NFC Package imported in layout but is invalid', NfcPackage);
      }
    } else {
      console.log('react-native-nfc-manager is not available in layout');
    }
  } catch (error) {
    console.log('Error importing NFC Manager in layout:', error);
  }
} else {
  console.log('NFC import skipped in layout - web platform detected');
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
    if (Platform.OS !== 'web') {
      const initNfc = async () => {
        try {
          console.log('Checking NFC support...');
          
          // Sprawdź, czy NfcManager jest dostępny zanim użyjemy checkNfcSupport
          if (!NfcManager) {
            console.log('NfcManager is not available, skipping NFC initialization');
            return;
          }
          
          // Dodatkowe sprawdzenie, czy NfcManager jest prawidłowym obiektem
          if (typeof NfcManager !== 'object') {
            console.log('NfcManager is not an object, skipping NFC initialization');
            return;
          }

          // Sprawdzenie czy urządzenie obsługuje NFC
          const isSupported = await checkNfcSupport();
          console.log('NFC support check result:', isSupported);
          
          if (isSupported) {
            // Bezpieczna inicjalizacja NFC Manager
            if (typeof NfcManager.start === 'function') {
              try {
                await NfcManager.start();
                console.log('NFC initialized successfully');
              } catch (startError) {
                console.error('Error starting NFC:', startError);
              }
            } else {
              console.log('NfcManager.start is not a function');
            }
          } else {
            console.log('NFC is not supported on this device');
          }
        } catch (error) {
          console.error('Error in NFC initialization process:', error);
        }
      };
      
      // Wywołaj inicjalizację z opóźnieniem dla pewności, że aplikacja już się załadowała
      const timer = setTimeout(() => {
        initNfc().catch(err => {
          console.error('Uncaught error in NFC initialization:', err);
        });
      }, 1000);
      
      // Cleanup przy odmontowaniu
      return () => {
        clearTimeout(timer);
        
        try {
          if (NfcManager) {
            // Funkcje bezpiecznego czyszczenia
            const safeCleanup = async () => {
              try {
                if (typeof NfcManager.cancelTechnologyRequest === 'function') {
                  await NfcManager.cancelTechnologyRequest().catch(() => {});
                }
                
                if (typeof NfcManager.unregisterTagEvent === 'function') {
                  await NfcManager.unregisterTagEvent().catch(() => {});
                }
              } catch (cleanupError) {
                console.error('Error during NFC cleanup:', cleanupError);
              }
            };
            
            safeCleanup();
          }
        } catch (error) {
          console.error('Error during NFC cleanup:', error);
        }
      };
    }
  }, []);

  // Efekt do ukrycia ekranu ładowania po załadowaniu czcionek
  useEffect(() => {
    if (fontsLoaded) {
      // Ukryj ekran ładowania po załadowaniu czcionek
      SplashScreen.hideAsync().catch(error => {
        console.warn('Error hiding splash screen:', error);
      });
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