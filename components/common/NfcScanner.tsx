// components/common/NfcScanner.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import Button from './Button';
import { checkNfcSupport, cancelNfcScan } from '../../utils/nfcUtils';

// Bezpieczny import z obsługą błędów
let NfcManager: any = null;
let NfcTech: any = null;
try {
  if (Platform.OS !== 'web') {
    // Dynamiczny import tylko dla platform mobilnych
    const NfcPackage = require('react-native-nfc-manager');
    NfcManager = NfcPackage.default;
    NfcTech = NfcPackage.NfcTech;
  }
} catch (error) {
  console.log('NFC Manager not available', error);
}

interface NfcScannerProps {
  visible: boolean;
  onClose: () => void;
  onTagFound: (tagId: string) => void;
}

const NfcScanner: React.FC<NfcScannerProps> = ({ visible, onClose, onTagFound }) => {
  const { theme } = useTheme();
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Przygotowanie do skanowania...');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Sprawdź, czy urządzenie obsługuje NFC
    const checkIsSupported = async () => {
      if (Platform.OS === 'web') {
        setIsSupported(false);
        setError('NFC nie jest dostępne w przeglądarce.');
        return;
      }
      
      if (!NfcManager) {
        setIsSupported(false);
        setError('Moduł NFC nie jest dostępny w tej aplikacji.');
        return;
      }
      
      try {
        const supported = await checkNfcSupport();
        setIsSupported(supported);
        
        if (supported) {
          if (typeof NfcManager.start === 'function') {
            await NfcManager.start();
          } else {
            setError('Nie można uruchomić NFC - brak metody start.');
          }
        } else {
          setError('To urządzenie nie obsługuje NFC.');
        }
      } catch (err) {
        console.error('Error checking NFC support:', err);
        setIsSupported(false);
        setError('Błąd podczas sprawdzania obsługi NFC.');
      }
    };

    if (visible) {
      checkIsSupported();
    }

    return () => {
      // Zatrzymaj NFC, gdy komponent zostanie odmontowany
      if (visible && Platform.OS !== 'web' && NfcManager) {
        cancelNfcScan().catch(() => {});
      }
    };
  }, [visible]);

  useEffect(() => {
    // Rozpocznij skanowanie, gdy modal jest widoczny i NFC jest obsługiwane
    if (visible && isSupported) {
      startScan();
    }
  }, [visible, isSupported]);

  const startScan = async () => {
    if (Platform.OS === 'web' || !NfcManager || !NfcTech) {
      setError('NFC nie jest dostępne na tej platformie.');
      return;
    }
    
    setIsScanning(true);
    setMessage('Przyłóż kartę NFC pracownika...');
    setError(null);

    try {
      // Sprawdź, czy funkcje NFC są dostępne
      if (typeof NfcManager.registerTagEvent !== 'function') {
        setError('Funkcja skanowania NFC nie jest dostępna.');
        setIsScanning(false);
        return;
      }
      
      // Zarejestruj zdarzenie tagów
      const cleanUp = () => {
        if (NfcManager && typeof NfcManager.unregisterTagEvent === 'function') {
          NfcManager.unregisterTagEvent().catch(() => {});
        }
      };
      
      await NfcManager.registerTagEvent(
        (tag: any) => {
          if (tag && tag.id) {
            setMessage('Karta odczytana pomyślnie!');
            onTagFound(tag.id);
            
            // Zatrzymaj skanowanie i zamknij modal po krótkim czasie
            setTimeout(() => {
              cleanUp();
              onClose();
            }, 1500);
          } else {
            setError('Nie udało się odczytać ID karty.');
            cleanUp();
          }
        },
        (error: any) => {
          console.warn('Error during NFC scan:', error);
          setError('Wystąpił błąd podczas skanowania. Spróbuj ponownie.');
          cleanUp();
        }
      );
      
      // Ustaw timeout dla zabezpieczenia
      setTimeout(() => {
        if (isScanning) {
          setError('Upłynął limit czasu skanowania. Spróbuj ponownie.');
          cleanUp();
          setIsScanning(false);
        }
      }, 20000); // 20 sekund limit
      
    } catch (err) {
      console.warn('Error setting up NFC scan:', err);
      setError('Wystąpił błąd podczas inicjowania skanowania. Spróbuj ponownie.');
      setIsScanning(false);
    }
  };

  // Spróbuj ponownie zeskanować kartę
  const handleRetry = () => {
    if (isSupported) {
      startScan();
    }
  };

  // Anuluj skanowanie
  const handleCancel = async () => {
    if (Platform.OS !== 'web' && NfcManager) {
      try {
        await cancelNfcScan();
      } catch (error) {
        console.error('Error canceling scan:', error);
      }
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCancel}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.contentContainer}>
            {!isSupported && isSupported !== null ? (
              <>
                <Ionicons name="warning-outline" size={50} color={theme.colors.warning} />
                <Text style={[styles.errorText, { color: theme.colors.text }]}>
                  {error || 'To urządzenie nie obsługuje NFC.'}
                </Text>
                <Button
                  title="Zamknij"
                  onPress={handleCancel}
                  variant="outlined"
                  style={styles.button}
                />
              </>
            ) : (
              <>
                {isScanning ? (
                  <View style={styles.scanningContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <View style={styles.nfcIconContainer}>
                      <Ionicons name="radio-outline" size={80} color={theme.colors.primary} />
                      <Ionicons name="card-outline" size={50} color={theme.colors.primary} style={styles.cardIcon} />
                    </View>
                    <Text style={[styles.message, { color: theme.colors.text }]}>
                      {message}
                    </Text>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancel}
                    >
                      <Text style={[styles.cancelText, { color: theme.colors.primary }]}>
                        Anuluj skanowanie
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.resultContainer}>
                    {error ? (
                      <>
                        <Ionicons name="alert-circle-outline" size={50} color={theme.colors.error} />
                        <Text style={[styles.errorText, { color: theme.colors.error }]}>
                          {error}
                        </Text>
                        <Button
                          title="Spróbuj ponownie"
                          onPress={handleRetry}
                          style={styles.button}
                        />
                      </>
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={50} color={theme.colors.success} />
                        <Text style={[styles.message, { color: theme.colors.text }]}>
                          {message}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  scanningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  nfcIconContainer: {
    position: 'relative',
    marginVertical: 20,
    height: 100,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    position: 'absolute',
    bottom: 0,
    right: -15,
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 10,
  },
  cancelButton: {
    marginTop: 20,
    padding: 10,
  },
  cancelText: {
    fontSize: 16,
  },
  resultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 10,
  },
  button: {
    marginTop: 15,
  },
});

export default NfcScanner;