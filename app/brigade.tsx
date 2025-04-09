// app/brigade.tsx - wersja dla Django
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
import { projectService, UserSettings } from '../services/project';
import { api } from '../services/api';

// Komponenty
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';

// Nowe interfejsy dla danych Django
interface EmployeeData {
  id: number;
  first_name: string;
  last_name: string;
  pesel?: string;
}

interface BrigadeMember {
  id: number;
  employee: number;
  employee_name: string;
  employee_data?: EmployeeData;
}

interface ProjectData {
  id: number;
  name: string;
  status: string;
  status_display?: string;
}

export default function BrigadeScreen() {
  const { theme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [brigade, setBrigade] = useState<string[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  
  // Nowe stany dla Django
  const [brigadeMembers, setBrigadeMembers] = useState<BrigadeMember[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeData[]>([]);

  // Pobieranie danych przy pierwszym renderowaniu
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Pobierz listę projektów z Django
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);

      // Pobierz aktualne ustawienia użytkownika
      const settings = await projectService.getUserSettings();
      setSelectedProject(settings.project);
      
      // Znajdź id projektu na podstawie nazwy
      if (settings.project) {
        const project = projectsData.find(p => p.name === settings.project);
        if (project) {
          setSelectedProjectId(project.id);
        }
      }
      
      // Ustawienie listy członków brygady z Django
      setBrigade(settings.brigade);
      
      // Pobierz członków brygady z Django
      try {
        const membersResponse = await api.get<BrigadeMember[]>('/api/brigade-members/');
        setBrigadeMembers(membersResponse);
      } catch (error) {
        console.error('Błąd podczas pobierania członków brygady:', error);
      }
      
      // Pobierz dostępnych pracowników z Django
      try {
        const employeesResponse = await api.get<EmployeeData[]>('/api/available-employees/');
        setAvailableEmployees(employeesResponse);
      } catch (error) {
        console.error('Błąd podczas pobierania dostępnych pracowników:', error);
      }

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

  const handleProjectSelect = (projectName: string, projectId: number) => {
    setSelectedProject(projectName);
    setSelectedProjectId(projectId);
    setShowProjectPicker(false);
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      Alert.alert('Błąd', 'Wprowadź imię i nazwisko członka brygady.');
      return;
    }

    // W Django potrzebujemy dodać pracownika przez API
    try {
      // Najpierw sprawdzamy czy mamy możliwość dodania pracownika przez API
      // Poniższy kod zakłada, że pracownik już istnieje w systemie
      
      // Rozdziel imię i nazwisko
      const [firstName, ...lastNameParts] = newMemberName.trim().split(' ');
      const lastName = lastNameParts.join(' ');
      
      if (!lastName) {
        Alert.alert('Błąd', 'Wprowadź zarówno imię jak i nazwisko pracownika.');
        return;
      }
      
      // Sprawdź czy pracownik istnieje i nie jest już przypisany
      const existingEmployee = availableEmployees.find(emp => 
        emp.first_name.toLowerCase() === firstName.toLowerCase() && 
        emp.last_name.toLowerCase() === lastName.toLowerCase()
      );
      
      if (!existingEmployee) {
        // Jeśli nie znaleziono, możemy spróbować utworzyć nowego pracownika
        Alert.alert(
          'Pracownik nie znaleziony',
          'Czy chcesz utworzyć nowego pracownika o tych danych?',
          [
            { text: 'Anuluj', style: 'cancel' },
            { 
              text: 'Utwórz', 
              onPress: async () => {
                try {
                  // Utworzenie nowego pracownika przez API
                  const newEmployee = await api.post<EmployeeData>('/api/employees/', {
                    first_name: firstName,
                    last_name: lastName,
                    current_project: selectedProjectId
                  });
                  
                  if (newEmployee && newEmployee.id) {
                    // Dodanie do brygady
                    await api.post('/api/brigade-members/', {
                      employee: newEmployee.id
                    });
                    
                    // Odśwież dane
                    await loadData();
                    setNewMemberName('');
                  }
                } catch (error) {
                  console.error('Błąd podczas tworzenia pracownika:', error);
                  Alert.alert('Błąd', 'Nie udało się utworzyć pracownika.');
                }
              }
            }
          ]
        );
        return;
      }
      
      // Dodanie istniejącego pracownika do brygady
      await api.post('/api/brigade-members/', {
        employee: existingEmployee.id
      });
      
      // Odśwież dane
      await loadData();
      setNewMemberName('');
      
    } catch (error) {
      console.error('Błąd podczas dodawania członka brygady:', error);
      Alert.alert('Błąd', 'Nie udało się dodać członka brygady.');
    }
  };

  const handleRemoveMember = (memberId: number, memberName: string) => {
    Alert.alert(
      'Usuń członka',
      `Czy na pewno chcesz usunąć ${memberName} z brygady?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        { 
          text: 'Usuń', 
          style: 'destructive',
          onPress: async () => {
            try {
              // W Django usuwamy członka brygady przez API
              await api.delete(`/api/brigade-members/${memberId}/`);
              
              // Odśwież dane
              await loadData();
            } catch (error) {
              console.error('Błąd podczas usuwania członka brygady:', error);
              Alert.alert('Błąd', 'Nie udało się usunąć członka brygady.');
            }
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
      // W Django zapisujemy ustawienia użytkownika inaczej
      // Najpierw aktualizujemy wybrany projekt
      
      const settings: UserSettings = {
        project: selectedProject,
        brigade: brigade
      };

      const response = await projectService.saveUserSettings(settings);
      
      if (response.success) {
        // Jeśli projekt został zaktualizowany, aktualizujemy projekt dla wszystkich członków brygady
        if (selectedProjectId) {
          // Aktualizacja projektu dla wszystkich członków brygady
          for (const member of brigadeMembers) {
            try {
              await api.post('/api/update-employee-project/', {
                employee_id: member.employee,
                project_id: selectedProjectId
              });
            } catch (error) {
              console.error(`Błąd aktualizacji projektu dla pracownika ${member.employee_name}:`, error);
            }
          }
        }
        
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
                    onPress={() => handleProjectSelect(item.name, item.id)}
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
          {brigadeMembers.length > 0 ? (
            <View style={styles.brigadeList}>
              {brigadeMembers.map((member) => (
                <View 
                  key={member.id}
                  style={[
                    styles.brigadeItem,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border 
                    }
                  ]}
                >
                  <Text style={[styles.brigadeItemText, { color: theme.colors.text }]}>
                    {member.employee_name}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(member.id, member.employee_name)}
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