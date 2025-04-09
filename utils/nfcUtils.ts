// utils/nfcUtils.ts
import { Platform } from 'react-native';

// Bezpieczny import z obsługą błędów
let NfcManager: any = null;
try {
  if (Platform.OS !== 'web') {
    // Dynamiczny import tylko dla platform mobilnych
    NfcManager = require('react-native-nfc-manager').default;
  }
} catch (error) {
  console.log('NFC Manager not available', error);
}

// Funkcja pomocnicza do sprawdzania czy metoda istnieje
const hasMethod = (obj: any, methodName: string): boolean => {
  return obj && typeof obj[methodName] === 'function';
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
    
    // Bezpieczne sprawdzanie czy metoda istnieje
    if (!hasMethod(NfcManager, 'isSupported')) {
      console.log('NfcManager.isSupported is not a function');
      return false;
    }
    
    return await NfcManager.isSupported();
  } catch (error) {
    console.error('Error checking NFC support:', error);
    return false;
  }
};

// Funkcja do przerwania skanowania NFC
export const cancelNfcScan = async (): Promise<void> => {
  if (Platform.OS === 'web' || !NfcManager) {
    return;
  }
  
  try {
    if (hasMethod(NfcManager, 'cancelTechnologyRequest')) {
      await NfcManager.cancelTechnologyRequest();
    }
  } catch (error) {
    console.error('Error canceling NFC scan:', error);
  }
};

// Funkcja do obsługi odczytu różnych typów tagów NFC
export const readNfcTag = async (): Promise<string | null> => {
  if (Platform.OS === 'web' || !NfcManager) {
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
    
    // Próbujemy NfcA (standardowy protokół ISO/IEC 14443-3A)
    try {
      if (hasMethod(NfcManager, 'requestTechnology') && 
          NfcManager.NfcTech && 
          NfcManager.NfcTech.NfcA) {
        
        await NfcManager.requestTechnology(NfcManager.NfcTech.NfcA);
        
        if (hasMethod(NfcManager, 'getTag')) {
          const tag = await NfcManager.getTag();
          
          if (tag && tag.id) {
            return tag.id;
          }
        }
      }
    } catch (nfca_error) {
      console.log('Not an NfcA tag or error:', nfca_error);
      await cancelNfcScan();
    }
    
    // Próbujemy Isodep (standardowy protokół ISO/IEC 14443-4)
    try {
      if (hasMethod(NfcManager, 'requestTechnology') && 
          NfcManager.NfcTech && 
          NfcManager.NfcTech.IsoDep) {
        
        await NfcManager.requestTechnology(NfcManager.NfcTech.IsoDep);
        
        if (hasMethod(NfcManager, 'getTag')) {
          const tag = await NfcManager.getTag();
          
          if (tag && tag.id) {
            return tag.id;
          }
        }
      }
    } catch (isodep_error) {
      console.log('Not an IsoDep tag or error:', isodep_error);
      await cancelNfcScan();
    }
    
    // Próbujemy ogólnego skanowania
    try {
      if (hasMethod(NfcManager, 'registerTagEvent')) {
        return new Promise((resolve) => {
          const cleanUp = () => {
            NfcManager.unregisterTagEvent().catch(() => {});
          };
          
          NfcManager.registerTagEvent(
            (tag) => {
              if (tag && tag.id) {
                cleanUp();
                resolve(tag.id);
              } else {
                resolve(null);
              }
            },
            (error) => {
              console.log('Error registering tag event:', error);
              cleanUp();
              resolve(null);
            }
          ).catch((error) => {
            console.log('Error in registerTagEvent:', error);
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