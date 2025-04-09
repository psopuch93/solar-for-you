// services/auth.ts - wersja dla Django
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_USER_KEY = '@solar_for_you_user_data';
const AUTH_SESSION_KEY = '@solar_for_you_session';

export interface User {
  email: string;
  username: string;
  access: string;
  name?: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  access?: string;
  redirect?: string;
  user?: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Pomocnicza funkcja do zapisywania danych użytkownika
async function saveUserData(userData: User) {
  console.log('💾 Zapisywanie danych użytkownika:', JSON.stringify(userData, null, 2));
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
}

export const auth = {
  // Logowanie
  login: async (username: string, password: string): Promise<LoginResponse> => {
    try {
      console.log('🔐 Próba logowania dla użytkownika:', username);
      
      // Django oczekuje username i password jako kluczy
      console.log('📤 Wysyłanie danych:', { username: username, password: '***' });
      
      const response = await api.post<any>('/api/login/', { 
        username,
        password 
      });
      
      console.log('📥 Otrzymana odpowiedź:', JSON.stringify(response, null, 2));
      
      if (response && response.success) {
        // Przygotowanie danych użytkownika na podstawie odpowiedzi z Django
        // Zakładamy, że Django zwraca podstawowe dane użytkownika w odpowiedzi
        const userData: User = {
          username: username,
          email: response.email || username,
          access: response.access || 'user',
          first_name: response.first_name,
          last_name: response.last_name,
          name: response.first_name && response.last_name 
            ? `${response.first_name} ${response.last_name}` 
            : undefined
        };
        
        console.log('📝 Zapisuję dane użytkownika:', userData);
        await saveUserData(userData);
        
        return {
          success: true,
          message: 'Logowanie udane',
          access: response.access,
          redirect: response.redirect,
          user: userData
        };
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
      
      // Wywołanie endpointu wylogowania w Django
      try {
        await api.post('/api/logout/', {});
      } catch (e) {
        console.warn('⚠️ Błąd podczas wylogowywania na serwerze, kontynuuję lokalne wylogowanie:', e);
      }
      
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