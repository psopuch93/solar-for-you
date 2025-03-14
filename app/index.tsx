// app/index.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { router } from 'expo-router';
import { auth } from '../services/auth'; // Dodany import auth

// Komponenty
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Checkbox from '../components/common/Checkbox';

// Tymczasowa zaślepka logo (do zastąpienia w przyszłości)
const LOGO_PLACEHOLDER = 'https://placehold.co/200x100/FF9B50/FFFFFF?text=Solar+For+You&font=Montserrat';

export default function LoginScreen() {
  const { theme, isDarkMode, toggleThemeMode } = useTheme();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Funkcja testowa do sprawdzenia połączenia z serwerem
  const testConnection = async () => {
    try {
      console.log('🧪 Testowanie połączenia z backendem...');
      
      // Próba połączenia z serwerem
      const response = await fetch('https://foryougroup.eu.pythonanywhere.com/', {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/json'
        }
      });

      console.log(`✅ Status odpowiedzi: ${response.status}`);
      
      // Próba pobrania zawartości
      const contentType = response.headers.get('content-type') || '';
      let content;
      
      if (contentType.includes('application/json')) {
        content = await response.json();
        console.log('📄 Odpowiedź JSON:', content);
      } else {
        content = await response.text();
        console.log('📄 Odpowiedź tekstowa:', content.substring(0, 200) + '...');
      }
      
      // Wyświetl alert z informacją
      Alert.alert(
        'Test połączenia',
        `Połączenie z serwerem udane!\nStatus: ${response.status}\nTyp odpowiedzi: ${contentType}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Błąd podczas testu połączenia:', error);
      Alert.alert(
        'Błąd połączenia',
        `Nie udało się połączyć z serwerem. Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleLogin = async () => {
    // Walidacja pól
    if (!username.trim() || !password.trim()) {
      setError('Wprowadź nazwę użytkownika i hasło');
      return;
    }

    setError('');
    setLoading(true);

    console.log('👉 Rozpoczynam proces logowania...');
    console.log(`📧 Email: ${username}`);
    console.log(`🔑 Hasło: ${'*'.repeat(password.length)} (${password.length} znaków)`);

    try {
      console.log('🔄 Wywołuję funkcję auth.login()...');
      const response = await auth.login(username, password);
      console.log('📊 Otrzymana odpowiedź:', response);
      
      if (response.success) {
        console.log('✅ Logowanie udane, przekierowuję do dashboardu...');
        // Przejście do ekranu dashboard po udanym logowaniu
        router.replace('/dashboard');
      } else {
        // Wyświetl komunikat błędu
        console.log('❌ Logowanie nieudane:', response.message);
        setError(response.message || 'Błąd logowania. Sprawdź dane i spróbuj ponownie.');
      }
    } catch (err) {
      console.error('❌ Wyjątek podczas logowania:', err);
      setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
    } finally {
      console.log('🏁 Zakończono proces logowania');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView 
      style={[
        styles.safeArea, 
        { backgroundColor: theme.colors.background }
      ]}
    >
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Przycisk przełączania motywu */}
            <TouchableWithoutFeedback onPress={toggleThemeMode}>
              <View style={styles.themeToggle}>
                <Ionicons
                  name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                  size={24}
                  color={theme.colors.text}
                />
              </View>
            </TouchableWithoutFeedback>

            <View style={styles.logoContainer}>
              {/* Zastąp to własnym logotypem */}
              <Image
                source={{ uri: LOGO_PLACEHOLDER }}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              Zaloguj się
            </Text>

            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.error, backgroundColor: `${theme.colors.error}10` }]}>
                {error}
              </Text>
            ) : null}

            <View style={styles.form}>
              <Input
                label="Email"
                value={username}
                onChangeText={setUsername}
                placeholder="Wprowadź adres email"
                autoCapitalize="none"
                keyboardType="email-address"
                icon={<Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />}
              />

              <Input
                label="Hasło"
                value={password}
                onChangeText={setPassword}
                placeholder="Wprowadź hasło"
                secureTextEntry
                icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />}
              />

              <Checkbox
                checked={rememberMe}
                onToggle={() => setRememberMe(!rememberMe)}
                label="Zapamiętaj mnie"
                style={styles.checkbox}
              />

              <Button
                title="Zaloguj się"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              <Button
                title="Test połączenia z serwerem"
                onPress={testConnection}
                variant="outlined"
                style={{ marginTop: 16 }}
              />
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                © 2025 Solar For You. Wszelkie prawa zastrzeżone.
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  themeToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 200,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  checkbox: {
    marginTop: 8,
    marginBottom: 24,
  },
  loginButton: {
    marginTop: 8,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});