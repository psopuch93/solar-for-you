// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Narzędzia do obsługi lokalnego przechowywania danych
 */
export const storage = {
  /**
   * Zapisuje wartość pod określonym kluczem
   * @param {string} key - Klucz
   * @param {any} value - Wartość (zostanie zserializowana do JSON)
   */
  set: async <T>(key: string, value: T): Promise<boolean> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error('Storage Set Error:', error);
      return false;
    }
  },

  /**
   * Pobiera wartość dla określonego klucza
   * @param {string} key - Klucz
   * @returns {Promise<T | null>} - Zdeserializowana wartość
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue !== null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Storage Get Error:', error);
      return null;
    }
  },

  /**
   * Usuwa wartość dla określonego klucza
   * @param {string} key - Klucz
   */
  remove: async (key: string): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage Remove Error:', error);
      return false;
    }
  },

  /**
   * Czyści wszystkie dane zapisane przez aplikację
   */
  clear: async (): Promise<boolean> => {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage Clear Error:', error);
      return false;
    }
  },

  /**
   * Pobiera wszystkie klucze
   * @returns {Promise<string[]>} - Lista kluczy
   */
  getAllKeys: async (): Promise<string[]> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys]; // Konwersja readonly array na zwykłą array
    } catch (error) {
      console.error('Storage GetAllKeys Error:', error);
      return [];
    }
  },

  /**
   * Wykonuje operację na wielu kluczach jednocześnie
   * @param {readonly string[]} keys - Lista kluczy
   * @returns {Promise<[string, any][]>} - Lista wartości
   */
  multiGet: async (keys: readonly string[]): Promise<[string, any][]> => {
    try {
      const result = await AsyncStorage.multiGet(keys);
      return result.map(([key, value]) => {
        try {
          return [key, value !== null ? JSON.parse(value) : null];
        } catch {
          return [key, value];
        }
      });
    } catch (error) {
      console.error('Storage MultiGet Error:', error);
      return [];
    }
  },
};