// app/dashboard.tsx - wersja dla Django
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { router } from 'expo-router';
import DashboardItem from '../components/screens/dashboard/DashboardItem';
import Card from '../components/common/Card';
import { auth, User } from '../services/auth';

export default function DashboardScreen() {
  const { theme, isDarkMode, toggleThemeMode } = useTheme();
  const [userData, setUserData] = useState<User | null>(null);

  useEffect(() => {
    // Sprawdź autoryzację przy ładowaniu ekranu
    const checkAuthentication = async () => {
      const authState = await auth.checkAuth();
      
      if (!authState.isAuthenticated) {
        console.log('🔒 Użytkownik nie jest zalogowany, przekierowanie na ekran logowania');
        // Użytkownik nie jest zalogowany, przekieruj na ekran logowania
        router.replace('/');
        return;
      }
      
      // Pobierz dane użytkownika
      const user = await auth.getUserData();
      console.log('👤 Dane użytkownika w dashboard:', JSON.stringify(user, null, 2));
      console.log('🏷️ Czy user zawiera pole name?', user?.name !== undefined);
      setUserData(user);
    };
    
    checkAuthentication();
  }, []);

  // Funkcja do wyciągnięcia pierwszego imienia z pełnego imienia i nazwiska
  const getFirstName = (userData?: User | null): string => {
    console.log('🔍 getFirstName - dane wejściowe:', userData);
    
    // Dla Django sprawdzamy w specyficznej kolejności
    // 1. Próbujemy użyć pola name, które mogliśmy zapisać podczas logowania
    if (userData?.name) {
      console.log('✅ Używam imienia z pola name:', userData.name);
      // Zwróć tylko pierwszą część (imię)
      return userData.name.split(' ')[0];
    }
    
    // 2. Próbujemy użyć pola first_name z Django
    if (userData?.first_name) {
      console.log('✅ Używam first_name z Django:', userData.first_name);
      return userData.first_name;
    }
    
    // 3. Fallback na username lub email jeśli nie ma imienia
    if (userData?.username) {
      console.log('⚠️ Brak imienia, używam username:', userData.username);
      return userData.username;
    }
    
    if (userData?.email) {
      console.log('⚠️ Brak imienia i username, używam email:', userData.email);
      // Spróbuj wyciągnąć coś przyzwoitego z emaila
      const beforeAt = userData.email.split('@')[0];
      // Jeśli jest kropka, zwróć pierwszą część
      if (beforeAt.includes('.')) {
        const result = beforeAt.split('.')[0];
        console.log('📧 Wyciągam imię z email (część przed kropką):', result);
        return result;
      }
      // W ostateczności zwróć całą część przed @
      console.log('📧 Wyciągam imię z email (część przed @):', beforeAt);
      return beforeAt;
    }
    
    // W ostateczności
    console.log('❌ Brak danych, używam "Użytkowniku"');
    return 'Użytkowniku';
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      router.replace('/');
    } catch (error) {
      console.error('Błąd wylogowania:', error);
      Alert.alert('Błąd', 'Wystąpił problem podczas wylogowywania.');
    }
  };

  // Dane dla elementów dashboardu
  const dashboardItems = [
    {
      id: 'progress',
      title: 'Progres Raport',
      icon: 'bar-chart-outline',
      color: theme.colors.primary,
      onPress: () => router.push('/progress-report'),
    },
    {
      id: 'requirements',
      title: 'Zapotrzebowania',
      icon: 'clipboard-outline',
      color: theme.colors.info,
      onPress: () => console.log('Zapotrzebowania'),
    },
    {
      id: 'team',
      title: 'Brygada',
      icon: 'people-outline',
      color: theme.colors.success,
      onPress: () => router.push('/brigade'),
    },
    {
      id: 'tools',
      title: 'Narzędzia',
      icon: 'construct-outline',
      color: theme.colors.warning,
      onPress: () => console.log('Narzędzia'),
    },
    {
      id: 'fleet',
      title: 'Flota',
      icon: 'car-outline',
      color: theme.colors.secondary,
      onPress: () => console.log('Flota'),
    },
    {
      id: 'warehouse',
      title: 'Magazyn',
      icon: 'cube-outline',
      color: theme.colors.info,
      onPress: () => console.log('Magazyn'),
    },
    {
      id: 'issues',
      title: 'Zgłoszenia',
      icon: 'alert-circle-outline',
      color: theme.colors.error,
      onPress: () => console.log('Zgłoszenia'),
    },
  ];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Dashboard
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {`Witaj, ${getFirstName(userData)}`}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleThemeMode}
          >
            <Ionicons
              name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: 'rgba(255, 155, 80, 0.1)' },
            ]}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Ionicons
              name="sunny"
              size={32}
              color={theme.colors.primary}
            />
            <View style={styles.welcomeTextContainer}>
              <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
                Solar For You
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
                System zarządzania pracą
              </Text>
            </View>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Wybierz sekcję
        </Text>

        <View style={styles.gridContainer}>
          {dashboardItems.map((item) => (
            <DashboardItem
              key={item.id}
              title={item.title}
              icon={item.icon}
              color={item.color}
              onPress={item.onPress}
            />
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          © 2025 Solar For You. Wszelkie prawa zastrzeżone.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    marginBottom: 16,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeTextContainer: {
    marginLeft: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});