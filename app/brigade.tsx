// app/brigade.tsx - z usprawnionym zarządzaniem brygadą
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
  Modal
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
  full_name?: string;
  current_project?: number;
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
  const [allEmployees, setAllEmployees] = useState<EmployeeData[]>([]);
  
  // Nowe stany dla modalu wyboru pracownika
  const [showEmployeePicker, setShowEmployeePicker] = useState<boolean>(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState<string>('');

  // Pobieranie danych przy pierwszym renderowaniu
  useEffect(() => {
    // Aktywnie pobieramy token CSRF najpierw
    const fetchCsrfToken = async () => {
      try {
        // Próbujemy pobrać token CSRF bezpośrednio (bez cache)
        const csrfEndpoint = '/api/csrf/';
        console.log('🔐 Aktywnie pobieramy token CSRF z:', csrfEndpoint);
        
        const response = await api.get(csrfEndpoint, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          }
        });
        
        console.log('🔐 Odpowiedź CSRF:', response);
        
        if (response && response.csrfToken) {
          console.log('✅ Otrzymano token CSRF:', response.csrfToken.substring(0, 10) + '...');
        } else {
          console.log('⚠️ Nie otrzymano tokenu CSRF w odpowiedzi API');
        }
      } catch (error) {
        console.error('❌ Błąd podczas pobierania tokenu CSRF:', error);
      }
      
      // Zawsze próbujemy załadować dane
      loadData();
    };
    
    fetchCsrfToken();
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
      
      // Zainicjalizuj zmienne na potrzeby filtrowania pracowników
      let membersData: BrigadeMember[] = [];
      let allEmployeesData: EmployeeData[] = [];
      
      // Pobierz członków brygady z Django
      try {
        const membersResponse = await api.get<BrigadeMember[]>('/api/brigade-members/');
        setBrigadeMembers(membersResponse);
        membersData = membersResponse;
      } catch (error) {
        console.error('Błąd podczas pobierania członków brygady:', error);
      }
      
      // Pobierz WSZYSTKICH pracowników z Django (nie tylko dostępnych)
      try {
        const allEmployeesResponse = await api.get<EmployeeData[]>('/api/employees/');
        setAllEmployees(allEmployeesResponse);
        allEmployeesData = allEmployeesResponse;
        
        // Odfiltruj pracowników już przypisanych do brygady, aby uzyskać listę dostępnych
        loadAvailableEmployees(allEmployeesData, membersData);
      } catch (error) {
        console.error('Błąd podczas pobierania wszystkich pracowników:', error);
      }
    } catch (error) {
      console.error('Błąd podczas ładowania danych:', error);
      Alert.alert('Błąd', 'Nie udało się załadować danych.');
    } finally {
      setLoading(false);
    }
  };
  
  // Funkcja pomocnicza do filtrowania dostępnych pracowników
  const loadAvailableEmployees = (allEmps: EmployeeData[], brigadeMembs: BrigadeMember[]) => {
    // Wyciągnij ID pracowników już w brygadzie
    const brigadeEmployeeIds = brigadeMembs.map(member => member.employee);
    
    // Odfiltruj pracowników, którzy nie są jeszcze w brygadzie
    const available = allEmps.filter(emp => !brigadeEmployeeIds.includes(emp.id));
    setAvailableEmployees(available);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleProjectSelect = (projectName: string, projectId: number) => {
    setSelectedProject(projectName);
    setSelectedProjectId(projectId);
    setShowProjectPicker(false);
  };

  // Zmodyfikowana funkcja dodająca członka ręcznie (tekstowo)
  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      Alert.alert('Błąd', 'Wprowadź imię i nazwisko członka brygady.');
      return;
    }

    // W Django potrzebujemy dodać pracownika przez API
    try {
      // Rozdziel imię i nazwisko
      const [firstName, ...lastNameParts] = newMemberName.trim().split(' ');
      const lastName = lastNameParts.join(' ');
      
      if (!lastName) {
        Alert.alert('Błąd', 'Wprowadź zarówno imię jak i nazwisko pracownika.');
        return;
      }
      
      // Sprawdź czy pracownik istnieje i nie jest już przypisany
      const existingEmployee = allEmployees.find(emp => 
        emp.first_name.toLowerCase() === firstName.toLowerCase() && 
        emp.last_name.toLowerCase() === lastName.toLowerCase()
      );
      
      if (existingEmployee) {
        // Sprawdź czy pracownik jest już przypisany do brygady
        const alreadyInBrigade = brigadeMembers.some(member => member.employee === existingEmployee.id);
        
        if (alreadyInBrigade) {
          Alert.alert('Informacja', 'Ten pracownik jest już w twojej brygadzie.');
          setNewMemberName('');
          return;
        }
        
        // Dodanie istniejącego pracownika do brygady
        await addEmployeeToBrigade(existingEmployee.id);
      } else {
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
                    await addEmployeeToBrigade(newEmployee.id);
                  }
                } catch (error) {
                  console.error('Błąd podczas tworzenia pracownika:', error);
                  Alert.alert('Błąd', 'Nie udało się utworzyć pracownika.');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Błąd podczas dodawania członka brygady:', error);
      Alert.alert('Błąd', 'Nie udało się dodać członka brygady.');
    }
  };

  // Nowa funkcja do dodawania pracownika do brygady
  const addEmployeeToBrigade = async (employeeId: number) => {
    try {
      console.log('Próba dodania pracownika o ID:', employeeId);
      
      // Najpierw upewnij się, że mamy aktualny token CSRF
      try {
        await api.get('/api/csrf/');
      } catch (csrfError) {
        console.warn('Błąd pobierania CSRF tokenu, ale kontynuuję:', csrfError);
      }
      
      // Dodaj pracownika do brygady poprzez API
      const requestData = { employee: employeeId };
      console.log('Dane żądania dodania pracownika:', requestData);
      
      const response = await api.post('/api/brigade-members/', requestData);
      console.log('Odpowiedź dodania pracownika:', response);
      
      // Odśwież dane
      await loadData();
      setNewMemberName('');
      
      return true;
    } catch (error) {
      console.error('Błąd podczas dodawania do brygady:', error);
      
      // Specjalna obsługa błędów CSRF
      if (error instanceof Error && error.message.includes('CSRF')) {
        Alert.alert(
          'Błąd weryfikacji CSRF',
          'Wystąpił błąd weryfikacji CSRF. Spróbuj odświeżyć aplikację lub zalogować się ponownie.',
          [
            { 
              text: 'OK',
              onPress: () => console.log('Błąd CSRF zaakceptowany')
            },
            {
              text: 'Odśwież',
              onPress: () => loadData()
            }
          ]
        );
      } else {
        Alert.alert('Błąd', 'Nie udało się dodać pracownika do brygady.');
      }
      return false;
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
              console.log(`Próba usunięcia członka o ID: ${memberId}`);
              
              // Najpierw upewnij się, że mamy aktualny token CSRF
              try {
                await api.get('/api/csrf/');
              } catch (csrfError) {
                console.warn('Błąd pobierania CSRF tokenu, ale kontynuuję:', csrfError);
              }
              
              // W Django usuwamy członka brygady przez API
              await api.delete(`/api/brigade-members/${memberId}/`);
              console.log('Członek usunięty pomyślnie');
              
              // Odśwież dane
              await loadData();
            } catch (error) {
              console.error('Błąd podczas usuwania członka brygady:', error);
              
              // Specjalna obsługa błędów CSRF
              if (error instanceof Error && error.message.includes('CSRF')) {
                Alert.alert(
                  'Błąd weryfikacji CSRF',
                  'Wystąpił błąd weryfikacji CSRF. Spróbuj odświeżyć aplikację lub zalogować się ponownie.',
                  [
                    { 
                      text: 'OK',
                      onPress: () => console.log('Błąd CSRF zaakceptowany')
                    },
                    {
                      text: 'Odśwież',
                      onPress: () => loadData()
                    }
                  ]
                );
              } else {
                Alert.alert('Błąd', 'Nie udało się usunąć członka brygady.');
              }
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
      console.log('Zapisywanie ustawień projektu i brygady');
      
      // Upewnij się, że mamy aktualny token CSRF
      try {
        await api.get('/api/csrf/');
      } catch (csrfError) {
        console.warn('Błąd pobierania CSRF tokenu, ale kontynuuję:', csrfError);
      }
      
      // W Django zapisujemy ustawienia użytkownika
      const settings: UserSettings = {
        project: selectedProject,
        brigade: brigade
      };

      console.log('Zapisywane ustawienia:', settings);
      const response = await projectService.saveUserSettings(settings);
      console.log('Odpowiedź zapisywania ustawień:', response);
      
      if (response.success) {
        // Jeśli projekt został zaktualizowany, aktualizujemy projekt dla wszystkich członków brygady
        if (selectedProjectId) {
          console.log('Aktualizacja projektu dla członków brygady na:', selectedProjectId);
          
          // Aktualizacja projektu dla wszystkich członków brygady
          for (const member of brigadeMembers) {
            try {
              console.log(`Aktualizacja projektu dla pracownika: ${member.employee_name} (ID: ${member.employee})`);
              
              const updateResponse = await api.post('/api/update-employee-project/', {
                employee_id: member.employee,
                project_id: selectedProjectId
              });
              
              console.log('Odpowiedź aktualizacji projektu:', updateResponse);
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
      
      // Specjalna obsługa błędów CSRF
      if (error instanceof Error && error.message.includes('CSRF')) {
        Alert.alert(
          'Błąd weryfikacji CSRF',
          'Wystąpił błąd weryfikacji CSRF. Spróbuj odświeżyć aplikację lub zalogować się ponownie.',
          [
            { text: 'OK' },
            {
              text: 'Odśwież',
              onPress: () => loadData()
            }
          ]
        );
      } else {
        Alert.alert('Błąd', 'Wystąpił problem podczas zapisywania ustawień.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Nowa funkcja do otwierania modalu wyboru pracownika
  const openEmployeePicker = () => {
    setEmployeeSearchTerm('');
    setShowEmployeePicker(true);
  };
  
  // Nowa funkcja do filtrowania pracowników na podstawie wyszukiwania
  const getFilteredEmployees = () => {
    if (!employeeSearchTerm.trim()) {
      return availableEmployees;
    }
    
    const searchTerm = employeeSearchTerm.toLowerCase();
    return availableEmployees.filter(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      return fullName.includes(searchTerm);
    });
  };
  
  // Nowa funkcja do wyboru pracownika z listy
  const handleSelectEmployee = async (employee: EmployeeData) => {
    setShowEmployeePicker(false);
    
    // Dodaj pracownika do brygady
    const success = await addEmployeeToBrigade(employee.id);
    
    if (success) {
      // Komunikat o sukcesie
      Alert.alert('Sukces', `Pracownik ${employee.first_name} ${employee.last_name} został dodany do brygady.`);
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
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Członkowie brygady
            </Text>
            <Button
              title="Dodaj pracownika"
              onPress={openEmployeePicker}
              size="small"
              variant="outlined"
              icon={<Ionicons name="person-add" size={16} color={theme.colors.primary} style={{marginRight: 6}} />}
            />
          </View>

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
              Brak członków brygady. Dodaj kogoś z istniejących pracowników lub utwórz nowego.
            </Text>
          )}
          
          {/* Tworzenie nowego pracownika */}
          <View style={styles.addMemberSection}>
            <Text style={[styles.addMemberLabel, { color: theme.colors.text }]}>
              Utwórz nowego pracownika:
            </Text>
            <View style={styles.addMemberForm}>
              <Input
                value={newMemberName}
                onChangeText={setNewMemberName}
                placeholder="Imię i nazwisko"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Utwórz"
                onPress={handleAddMember}
                size="small"
              />
            </View>
          </View>
        </Card>

        {/* Przycisk zapisywania */}
        <Button
          title="Zapisz ustawienia"
          onPress={handleSaveSettings}
          style={styles.saveButton}
        />
      </ScrollView>
      
      {/* Modal do wyboru pracownika */}
      <Modal
        visible={showEmployeePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmployeePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Wybierz pracownika
              </Text>
              <TouchableOpacity 
                onPress={() => setShowEmployeePicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <Input
              value={employeeSearchTerm}
              onChangeText={setEmployeeSearchTerm}
              placeholder="Szukaj pracownika..."
              style={styles.searchInput}
              icon={<Ionicons name="search" size={20} color={theme.colors.textSecondary} />}
            />
            
            <ScrollView style={styles.employeeList} nestedScrollEnabled={true}>
              {getFilteredEmployees().length > 0 ? (
                getFilteredEmployees().map((employee) => (
                  <TouchableOpacity
                    key={employee.id}
                    style={[
                      styles.employeeItem,
                      { borderBottomColor: theme.colors.border }
                    ]}
                    onPress={() => handleSelectEmployee(employee)}
                  >
                    <Text style={[styles.employeeName, { color: theme.colors.text }]}>
                      {employee.first_name} {employee.last_name}
                    </Text>
                    <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  Nie znaleziono pracowników
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  addMemberSection: {
    marginTop: 16,
  },
  addMemberLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  addMemberForm: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchInput: {
    marginBottom: 12,
  },
  employeeList: {
    maxHeight: 400,
  },
  employeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  employeeName: {
    fontSize: 16,
  },
});