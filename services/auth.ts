// services/auth.ts - pełna wersja z rozszerzonym logowaniem
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_USER_KEY = '@solar_for_you_user_data';
const AUTH_SESSION_KEY = '@solar_for_you_session';

export interface User {
  email: string;
  access: string;
  name?: string; // Dodane pole name
}

export interface LoginResponse {
  success: boolean;
  message: string;
  access?: string;
  name?: string; // Dodane pole name
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Pomocnicza funkcja do zapisywania danych użytkownika
async function saveUserData(email: string, access: string, name?: string) {
  const userData: User = { 
    email, 
    access,
    name
  };
  console.log('💾 Zapisywanie danych użytkownika:', JSON.stringify(userData, null, 2));
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
}

export const auth = {
  // Logowanie
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      console.log('🔐 Próba logowania dla użytkownika:', email);
      
      // Dokładne dopasowanie do kodu Flask, który szuka 'username' jako klucza
      console.log('📤 Wysyłanie danych:', { username: email, password: '***' });
      
      const response = await api.post<LoginResponse>('/login-mobile', { 
        username: email,
        password 
      });
      
      console.log('📥 Otrzymana odpowiedź:', JSON.stringify(response, null, 2));
      console.log('📋 Czy zawiera pole name?', response.name !== undefined);
      
      if (response && response.success) {
        console.log('📝 Zapisuję dane użytkownika z polem name:', response.name);
        await saveUserData(email, response.access || 'user', response.name);
        return response;
      } else {
        return {
          success: false,
          message: response.message || 'Nieznany błąd podczas logowania'
        };
      }
      
    } catch (error) {
      console.error('❌ Błąd logowania:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd podczas logowania';
      return {
        success: false,
        message: errorMessage
      };
    }
  },
  
  // Wylogowywanie
  logout: async (): Promise<boolean> => {
    try {
      console.log('🚪 Wylogowywanie użytkownika');
      
      // Usuń dane z AsyncStorage
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
      
      console.log('✅ Wylogowanie udane');
      return true;
    } catch (error) {
      console.error('❌ Błąd wylogowania:', error);
      throw error;
    }
  },
  
  // Sprawdzenie stanu autentykacji
  checkAuth: async (): Promise<AuthState> => {
    try {
      console.log('🔍 Sprawdzanie stanu autentykacji');
      
      const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
      const user = userData ? JSON.parse(userData) : null;
      
      console.log('👤 Znaleziony użytkownik:', user ? JSON.stringify(user, null, 2) : 'brak');
      
      return {
        user,
        isAuthenticated: !!user,
      };
    } catch (error) {
      console.error('❌ Błąd sprawdzania autentykacji:', error);
      return {
        user: null,
        isAuthenticated: false,
      };
    }
  },
  
  // Pobranie zapisanych danych użytkownika
  getUserData: async (): Promise<User | null> => {
    try {
      const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
      const user = userData ? JSON.parse(userData) : null;
      console.log('👤 Pobrano dane użytkownika:', user ? JSON.stringify(user, null, 2) : 'brak');
      console.log('🏷️ Czy zawiera pole name?', user?.name !== undefined);
      return user;
    } catch (error) {
      console.error('❌ Błąd pobierania danych użytkownika:', error);
      return null;
    }
  },
  
  // Pobranie tokenu sesji
  getSessionToken: async (): Promise<string | null> => {
    try {
      const token = await AsyncStorage.getItem(AUTH_SESSION_KEY);
      console.log('🔑 Pobrano token sesji:', token ? 'dostępny' : 'brak');
      return token;
    } catch (error) {
      console.error('❌ Błąd pobierania tokenu sesji:', error);
      return null;
    }
  },
};