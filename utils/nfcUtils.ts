// utils/nfcUtils.ts
import { Platform } from 'react-native';

// Bezpieczny import z obsługą błędów
let NfcManager: any = null;
let NfcTech: any = null;

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
        NfcTech = NfcPackage.NfcTech;
        console.log('NFC Manager imported successfully');
      } else {
        console.log('NFC Package imported but is invalid', NfcPackage);
      }
    } else {
      console.log('react-native-nfc-manager is not available');
    }
  } catch (error) {
    console.log('Error importing NFC Manager:', error);
  }
} else {
  console.log('NFC import skipped - web platform detected');
}

// Funkcja pomocnicza do sprawdzania czy metoda istnieje
const hasMethod = (obj: any, methodName: string): boolean => {
  if (!obj) return false;
  if (typeof obj !== 'object' && typeof obj !== 'function') return false;
  
  try {
    return typeof obj[methodName] === 'function';
  } catch (error) {
    console.error(`Error checking if ${methodName} exists:`, error);
    return false;
  }
};

// Funkcja sprawdzająca dostępność NFC
export const checkNfcSupport = async (): Promise<boolean> => {
  // Najpierw sprawdź, czy biblioteka w ogóle jest dostępna
  if (!NfcManager) {
    console.log('NFC Manager is not available');
    return false;
  }
  
  try {
    if (Platform.OS === 'web') {
      return false;
    }
    
    // Dodatkowe zabezpieczenie - zweryfikuj że NfcManager to obiekt
    if (typeof NfcManager !== 'object') {
      console.log('NfcManager is not an object');
      return false;
    }
    
    // Bezpieczne sprawdzanie czy metoda istnieje
    if (!hasMethod(NfcManager, 'isSupported')) {
      console.log('NfcManager.isSupported is not a function');
      return false;
    }
    
    // Dodatkowe zabezpieczenie dla wyniku
    try {
      const isSupported = await NfcManager.isSupported();
      return Boolean(isSupported); // Konwersja do boolean w razie gdyby wynik był nieokreślony
    } catch (innerError) {
      console.error('Error in NfcManager.isSupported:', innerError);
      return false;
    }
  } catch (error) {
    console.error('Error checking NFC support:', error);
    return false;
  }
};

// Funkcja do przerwania skanowania NFC
export const cancelNfcScan = async (): Promise<void> => {
  if (!NfcManager) {
    return;
  }
  
  try {
    // Bezpieczne anulowanie requestów NFC
    if (hasMethod(NfcManager, 'cancelTechnologyRequest')) {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
    }
    
    if (hasMethod(NfcManager, 'unregisterTagEvent')) {
      await NfcManager.unregisterTagEvent().catch(() => {});
    }
  } catch (error) {
    console.error('Error canceling NFC scan:', error);
  }
};

// Funkcja do obsługi odczytu różnych typów tagów NFC
export const readNfcTag = async (): Promise<string | null> => {
  if (!NfcManager || !NfcTech) {
    console.log('NFC Manager or NfcTech is not available');
    return null;
  }
  
  try {
    // Sprawdź, czy NFC jest obsługiwane
    if (!hasMethod(NfcManager, 'isSupported') || !hasMethod(NfcManager, 'start')) {
      console.log('Required NFC methods are not available');
      return null;
    }
    
    const isSupported = await NfcManager.isSupported();
    if (!isSupported) {
      console.log('NFC is not supported on this device');
      return null;
    }
    
    // Zainicjuj NFC
    await NfcManager.start();
    
    // Próbujemy ogólnego skanowania
    try {
      if (hasMethod(NfcManager, 'registerTagEvent')) {
        return new Promise((resolve) => {
          const cleanUp = () => {
            if (hasMethod(NfcManager, 'unregisterTagEvent')) {
              NfcManager.unregisterTagEvent().catch(() => {});
            }
          };
          
          NfcManager.registerTagEvent(
            (tag: any) => {
              if (tag && tag.id) {
                cleanUp();
                resolve(tag.id);
              } else {
                cleanUp();
                resolve(null);
              }
            },
            (error: any) => {
              console.log('Error registering tag event:', error);
              cleanUp();
              resolve(null);
            }
          ).catch((error: any) => {
            console.log('Error in registerTagEvent:', error);
            cleanUp();
            resolve(null);
          });
          
          // Ustaw timeout dla ochrony
          setTimeout(() => {
            cleanUp();
            resolve(null);
          }, 10000); // 10 sekund timeout
        });
      }
    } catch (register_error) {
      console.log('Error in general tag scanning:', register_error);
      await cancelNfcScan();
    }
    
    // Jeśli dotarliśmy tutaj, nie udało się odczytać żadnego obsługiwanego typu tagu
    return null;
    
  } catch (error) {
    console.error('Error reading NFC tag:', error);
    return null;
  } finally {
    // Zawsze zwolnij zasoby NFC
    await cancelNfcScan();
  }
};

// Funkcja pomocnicza do przekształcenia surowych danych tagu na czytelny format
export const formatTagId = (tagId: string): string => {
  // Usuwamy ewentualne prefiksy/suffiksy i formatujemy zgodnie z potrzebami
  const cleanTagId = tagId.replace(/:/g, '').toUpperCase();
  
  // Dodajemy spacje co 2 znaki dla lepszej czytelności
  let formattedTagId = '';
  for (let i = 0; i < cleanTagId.length; i += 2) {
    formattedTagId += cleanTagId.substr(i, 2) + ' ';
  }
  
  return formattedTagId.trim();
};