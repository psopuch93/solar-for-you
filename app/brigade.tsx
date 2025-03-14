// app/brigade.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { projectService, Project, UserSettings } from '../services/project';

// Komponenty
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';

export default function BrigadeScreen() {
  const { theme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [brigade, setBrigade] = useState<string[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');

  // Pobieranie danych przy pierwszym renderowaniu
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Pobierz listę projektów
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);

      // Pobierz aktualne ustawienia użytkownika
      const settings = await projectService.getUserSettings();
      setSelectedProject(settings.project);
      setBrigade(settings.brigade);

    } catch (error) {
      console.error('Błąd podczas ładowania danych:', error);
      Alert.alert('Błąd', 'Nie udało się załadować danych.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleProjectSelect = (projectName: string) => {
    setSelectedProject(projectName);
    setShowProjectPicker(false);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      Alert.alert('Błąd', 'Wprowadź imię i nazwisko członka brygady.');
      return;
    }

    // Dodaj nowego członka do listy
    setBrigade([...brigade, newMemberName.trim()]);
    setNewMemberName('');
  };

  const handleRemoveMember = (index: number) => {
    Alert.alert(
      'Usuń członka',
      `Czy na pewno chcesz usunąć ${brigade[index]} z brygady?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        { 
          text: 'Usuń', 
          style: 'destructive',
          onPress: () => {
            const newBrigade = [...brigade];
            newBrigade.splice(index, 1);
            setBrigade(newBrigade);
          }
        }
      ]
    );
  };

  const handleSaveSettings = async () => {
    if (!selectedProject) {
      Alert.alert('Błąd', 'Wybierz projekt.');
      return;
    }

    setLoading(true);
    try {
      const settings: UserSettings = {
        project: selectedProject,
        brigade: brigade
      };

      const response = await projectService.saveUserSettings(settings);
      if (response.success) {
        Alert.alert('Sukces', 'Ustawienia zostały zapisane.');
      } else {
        Alert.alert('Błąd', response.message || 'Nie udało się zapisać ustawień.');
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania ustawień:', error);
      Alert.alert('Błąd', 'Wystąpił problem podczas zapisywania ustawień.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Ładowanie danych...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Zarządzanie Brygadą</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        nestedScrollEnabled={true}
        >
        {/* Sekcja wyboru projektu */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Wybór projektu
          </Text>
          
          <TouchableOpacity
            style={[
              styles.projectSelector,
              { 
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }
            ]}
            onPress={() => setShowProjectPicker(!showProjectPicker)}
          >
            <Text style={[
              styles.projectSelectorText,
              { color: selectedProject ? theme.colors.text : theme.colors.textSecondary }
            ]}>
              {selectedProject || 'Wybierz projekt'}
            </Text>
            <Ionicons
              name={showProjectPicker ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Lista projektów */}
          {showProjectPicker && (
            <Card style={styles.projectsList}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                {projects.map((item) => (
                    <TouchableOpacity
                    key={item.id.toString()}
                    style={[
                        styles.projectItem,
                        { 
                        backgroundColor: selectedProject === item.name 
                            ? `${theme.colors.primary}20` 
                            : 'transparent' 
                        }
                    ]}
                    onPress={() => handleProjectSelect(item.name)}
                    >
                    <Text style={[styles.projectItemText, { color: theme.colors.text }]}>
                        {item.name}
                    </Text>
                    {selectedProject === item.name && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                    </TouchableOpacity>
                ))}
                </ScrollView>
            </Card>
            )}
        </Card>

        {/* Sekcja zarządzania brygadą */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Członkowie brygady
          </Text>

          {/* Lista członków brygady */}
          {brigade.length > 0 ? (
            <View style={styles.brigadeList}>
              {brigade.map((member, index) => (
                <View 
                  key={index}
                  style={[
                    styles.brigadeItem,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border 
                    }
                  ]}
                >
                  <Text style={[styles.brigadeItemText, { color: theme.colors.text }]}>
                    {member}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Brak członków brygady. Dodaj kogoś poniżej.
            </Text>
          )}

          {/* Formularz dodawania nowego członka */}
          <View style={styles.addMemberForm}>
            <Input
              value={newMemberName}
              onChangeText={setNewMemberName}
              placeholder="Imię i nazwisko członka"
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Dodaj"
              onPress={handleAddMember}
              size="small"
            />
          </View>
        </Card>

        {/* Przycisk zapisywania */}
        <Button
          title="Zapisz ustawienia"
          onPress={handleSaveSettings}
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  projectSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  projectSelectorText: {
    fontSize: 16,
  },
  projectsList: {
    marginTop: 8,
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  projectItemText: {
    fontSize: 16,
  },
  brigadeList: {
    marginBottom: 16,
  },
  brigadeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  brigadeItemText: {
    fontSize: 16,
  },
  removeButton: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 14,
  },
  addMemberForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButton: {
    marginTop: 24,
  },
});