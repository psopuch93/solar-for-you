// app/progress-report.tsx - z integracją skanowania NFC
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
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
const DateTimePicker = Platform.OS !== 'web' 
  ? require('@react-native-community/datetimepicker').default 
  : null;
import * as ImagePicker from 'expo-image-picker';
import { reportService, ProgressReport, ReportMember, ReportImage } from '../services/report';
import { projectService } from '../services/project';
import { employeeService } from '../services/employee';
import { Picker } from '@react-native-picker/picker';
import { checkNfcSupport } from '../utils/nfcUtils';
import NfcScanner from '../components/common/NfcScanner';


// Komponenty
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Checkbox from '../components/common/Checkbox';
import Input from '../components/common/Input';

// Interfejs dla pojedynczej aktywności
interface Activity {
  id: string;
  zone: string;
  activityType: string;
  details: {
    row?: string;
    table?: string;
    cableType?: string;
    substation?: string;
    inverter?: string;
    string?: string;
    trench?: string;
    quantity?: string;
    length?: string;
  };
}

export default function ProgressReportScreen() {
  const { theme, isDarkMode } = useTheme();
  const params = useLocalSearchParams();
  const draftId = params.draftId as string | undefined;
  
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Dane raportu
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectConfig, setProjectConfig] = useState<any>(null);
  
  // Członkowie brygady
  const [allMembers, setAllMembers] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<ReportMember[]>([]);
  const [allEmployeesData, setAllEmployeesData] = useState<any[]>([]);

  // Lista dodanych aktywności
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Aktualna edytowana aktywność
  const [currentActivity, setCurrentActivity] = useState<Activity>({
    id: Date.now().toString(),
    zone: '',
    activityType: '',
    details: {}
  });
  
  // Zdjęcia
  const [images, setImages] = useState<ReportImage[]>([]);

  // Komentarz
  const [comment, setComment] = useState<string>('');
  
  // NFC związane
  const [showNfcScanner, setShowNfcScanner] = useState<boolean>(false);
  const [isNfcSupported, setIsNfcSupported] = useState<boolean>(false);

  
  // Efekt inicjalizujący
  useEffect(() => {
    const checkNfc = async () => {
      try {
        if (Platform.OS === 'web') {
          setIsNfcSupported(false);
          return;
        }
        
        const supported = await checkNfcSupport();
        setIsNfcSupported(supported);
      } catch (error) {
        console.error('Błąd podczas sprawdzania NFC:', error);
        setIsNfcSupported(false);
      }
    };
    
    checkNfc();
  }, []);
  
  // Funkcja ładująca początkowe dane
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Pobranie członków brygady
      const members = await reportService.getBrigadeMembers();
      setAllMembers(members);
      
      // Pobranie wszystkich pracowników dla funkcji NFC
      const employees = await employeeService.getAllEmployees();
      setAllEmployeesData(employees);
      
      // Pobranie ustawień użytkownika (aktualny projekt)
      const settings = await projectService.getUserSettings();
      setProjectName(settings.project);

      // Pobranie ustawień projektu
      if (settings.project) {
        const config = await projectService.getProjectConfig(settings.project);
        setProjectConfig(config);
        
        // Znajdź ID projektu
        const projects = await projectService.getProjects();
        const project = projects.find(p => p.name === settings.project);
        if (project) {
          setProjectId(project.id);
        }
      }
      
      // Jeśli podano ID roboczego raportu, załaduj go
      if (draftId) {
        const draftReport = await reportService.getDraftReportById(draftId);
        if (draftReport) {
          setDate(new Date(draftReport.date));
          setSelectedMembers(draftReport.members);
          setImages(draftReport.images);
          setProjectName(draftReport.projectName || '');
          setProjectId(draftReport.projectId || null);
          setComment(draftReport.comment || '');
          // Jeśli istnieją zapisane aktywności, załaduj je
          if (draftReport.activities) {
            setActivities(draftReport.activities);
          }
        }
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
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };
  
  // Formatowanie daty do przechowywania w formacie ISO
  const formatDateForStorage = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  
  const toggleMemberSelection = (memberName: string) => {
    const isSelected = selectedMembers.some(m => m.name === memberName);
    
    if (isSelected) {
      // Usunięcie członka z listy wybranych
      setSelectedMembers(selectedMembers.filter(m => m.name !== memberName));
    } else {
      // Dodanie członka do listy wybranych z domyślną liczbą godzin 0
      // Sprawdź, czy możemy znaleźć ID pracownika
      const employee = allEmployeesData.find(emp => 
        `${emp.first_name} ${emp.last_name}` === memberName
      );
      
      setSelectedMembers([...selectedMembers, { 
        name: memberName, 
        hours: 0,
        employee_id: employee?.id
      }]);
    }
  };
  
  const selectAllMembers = () => {
    // Sprawdzenie czy wszyscy są już wybrani
    if (selectedMembers.length === allMembers.length) {
      // Jeśli tak, odznacz wszystkich
      setSelectedMembers([]);
    } else {
      // Jeśli nie, wybierz wszystkich z domyślną liczbą godzin 0
      const allSelected: ReportMember[] = [];
      
      for (const memberName of allMembers) {
        // Sprawdź, czy możemy znaleźć ID pracownika
        const employee = allEmployeesData.find(emp => 
          `${emp.first_name} ${emp.last_name}` === memberName
        );
        
        allSelected.push({ 
          name: memberName, 
          hours: 0,
          employee_id: employee?.id
        });
      }
      
      setSelectedMembers(allSelected);
    }
  };
  
  const updateMemberHours = (memberName: string, hours: number) => {
    setSelectedMembers(selectedMembers.map(member => 
      member.name === memberName ? { ...member, hours } : member
    ));
  };
  
  const removeMember = (memberName: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.name !== memberName));
  };

  // Zmiana strefy - resetuje dalsze wybory
  const handleZoneChange = (value: string) => {
    setCurrentActivity({
      ...currentActivity,
      zone: value,
      activityType: '',
      details: {} // Resetujemy szczegóły przy zmianie strefy
    });
  };

  // Zmiana aktywności - resetuje dalsze wybory
  const handleActivityTypeChange = (value: string) => {
    setCurrentActivity({
      ...currentActivity,
      activityType: value,
      details: {} // Resetujemy szczegóły przy zmianie typu aktywności
    });
  };

  // Zmiana typu kabla - resetuje dalsze wybory zależne od kabla
  const handleCableTypeChange = (value: string) => {
    const updatedDetails = { ...currentActivity.details, cableType: value };
    // Resetujemy pola, które są zależne od typu kabla
    delete updatedDetails.substation;
    delete updatedDetails.inverter;
    delete updatedDetails.string;
    delete updatedDetails.length;
    
    setCurrentActivity({
      ...currentActivity,
      details: updatedDetails
    });
  };

  // Zmiana trafostacji - resetuje dalsze wybory
  const handleSubstationChange = (value: string) => {
    const updatedDetails = { ...currentActivity.details, substation: value };
    // Resetujemy pola, które są zależne od trafostacji
    delete updatedDetails.inverter;
    delete updatedDetails.string;
    delete updatedDetails.length;
    
    setCurrentActivity({
      ...currentActivity,
      details: updatedDetails
    });
  };

  // Zmiana inwertera - resetuje dalsze wybory
  const handleInverterChange = (value: string) => {
    const updatedDetails = { ...currentActivity.details, inverter: value };
    // Resetujemy pola, które są zależne od inwertera
    delete updatedDetails.string;
    delete updatedDetails.length;
    
    setCurrentActivity({
      ...currentActivity,
      details: updatedDetails
    });
  };

  // Dodawanie aktywności do listy
  const addActivity = () => {
    // Walidacja czy wszystkie wymagane pola są wypełnione
    if (!currentActivity.zone || !currentActivity.activityType) {
      Alert.alert('Błąd', 'Wybierz strefę i aktywność.');
      return;
    }
    
    // Walidacja szczegółów w zależności od typu aktywności
    if (!validateActivityDetails()) {
      return;
    }
    
    // Dodanie aktywności do listy
    setActivities([...activities, { ...currentActivity, id: Date.now().toString() }]);
    
    // Resetowanie aktualnej aktywności
    setCurrentActivity({
      id: Date.now().toString(),
      zone: '',
      activityType: '',
      details: {}
    });
  };

  // Usuwanie aktywności z listy
  const removeActivity = (id: string) => {
    Alert.alert(
      'Usuń aktywność',
      'Czy na pewno chcesz usunąć tę aktywność?',
      [
        { text: 'Anuluj', style: 'cancel' },
        { 
          text: 'Usuń', 
          style: 'destructive',
          onPress: () => {
            setActivities(activities.filter(activity => activity.id !== id));
          }
        }
      ]
    );
  };

  // Walidacja szczegółów aktywności w zależności od typu
  const validateActivityDetails = (): boolean => {
    const { activityType, details } = currentActivity;
    
    switch (activityType) {
      case 'Moduły':
        if (!details.row || !details.table || !details.quantity) {
          Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola dla modułów.');
          return false;
        }
        break;
      case 'Konstrukcja':
        if (!details.row || !details.table) {
          Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola dla konstrukcji.');
          return false;
        }
        break;
      case 'Elektryka':
        if (!details.cableType) {
          Alert.alert('Błąd', 'Wybierz typ kabla.');
          return false;
        }
        if (!details.substation || !details.inverter) {
          Alert.alert('Błąd', 'Wybierz trafostację i inwerter.');
          return false;
        }
        if (details.cableType === 'Kabel DC' && (!details.string || !details.length)) {
          Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola dla kabla DC.');
          return false;
        }
        if (details.cableType === 'Kabel AC' && !details.length) {
          Alert.alert('Błąd', 'Podaj długość kabla AC.');
          return false;
        }
        break;
      case 'Wykopy':
        if (!details.trench || !details.quantity) {
          Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola dla wykopów.');
          return false;
        }
        break;
      default:
        return false;
    }
    
    return true;
  };

  // Renderowanie formularza w zależności od wybranej aktywności
  const renderActivityForm = () => {
    if (!projectConfig || !currentActivity.zone || !currentActivity.activityType) return null;

    // Bezpieczny dostęp do aktywności
    const { aktywnosci } = projectConfig.config.zones[currentActivity.zone] || {};
    if (!aktywnosci) return null;

    const activity = aktywnosci[currentActivity.activityType];
    if (!activity) return null;

    const details = currentActivity.details || {};

    switch (currentActivity.activityType) {
      case 'Moduły':
        return (
          <>
            <Picker
              selectedValue={details.row || ''}
              onValueChange={(value: string) => setCurrentActivity({
                ...currentActivity,
                details: { ...details, row: value, table: '' }
              })}
            >
              <Picker.Item label="Wybierz rząd" value="" />
              {activity.rzędy && Object.keys(activity.rzędy).map((row) => (
                <Picker.Item key={row} label={`Rząd ${row}`} value={row} />
              ))}
            </Picker>
            
            {details.row && activity.rzędy && activity.rzędy[details.row] && (
              <Picker
                selectedValue={details.table || ''}
                onValueChange={(value: string) => setCurrentActivity({
                  ...currentActivity,
                  details: { ...details, table: value }
                })}
              >
                <Picker.Item label="Wybierz numer stołu" value="" />
                {Object.keys(activity.rzędy[details.row].stoły || {}).map((table) => (
                  <Picker.Item key={table} label={`Stół ${table}`} value={table} />
                ))}
              </Picker>
            )}
            
            {details.row && details.table && activity.rzędy && 
             activity.rzędy[details.row] && 
             activity.rzędy[details.row].stoły && 
             activity.rzędy[details.row].stoły[details.table] && (
              <TextInput
                value={details.quantity || ''}
                onChangeText={(value) => setCurrentActivity({
                  ...currentActivity,
                  details: { ...details, quantity: value }
                })}
                placeholder={`Wpisz ilość modułów (max ${activity.rzędy[details.row].stoły[details.table].ilosc_modulow_max})`}
                keyboardType="numeric"
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }]}
              />
            )}
          </>
        );
        
      case 'Konstrukcja':
        return (
          <>
            <Picker
              selectedValue={details.row || ''}
              onValueChange={(value: string) => setCurrentActivity({
                ...currentActivity,
                details: { ...details, row: value, table: '' }
              })}
            >
              <Picker.Item label="Wybierz rząd" value="" />
              {activity.rzędy && Object.keys(activity.rzędy).map((row) => (
                <Picker.Item key={row} label={`Rząd ${row}`} value={row} />
              ))}
            </Picker>
            
            {details.row && activity.rzędy && activity.rzędy[details.row] && (
              <Picker
                selectedValue={details.table || ''}
                onValueChange={(value: string) => setCurrentActivity({
                  ...currentActivity,
                  details: { ...details, table: value }
                })}
              >
                <Picker.Item label="Wybierz numer stołu" value="" />
                {Object.keys(activity.rzędy[details.row].stoły || {}).map((table) => (
                  <Picker.Item key={table} label={`Stół ${table}`} value={table} />
                ))}
              </Picker>
            )}
          </>
        );
        
      case 'Elektryka':
        return (
          <>
            <Picker
              selectedValue={details.cableType || ''}
              onValueChange={(value: string) => handleCableTypeChange(value)}
            >
              <Picker.Item label="Wybierz podtyp" value="" />
              <Picker.Item label="Kabel AC" value="Kabel AC" />
              <Picker.Item label="Kabel DC" value="Kabel DC" />
            </Picker>
            
            {details.cableType && activity[details.cableType] && (
              <>
                <Picker
                  selectedValue={details.substation || ''}
                  onValueChange={(value: string) => handleSubstationChange(value)}
                >
                  <Picker.Item label="Wybierz trafostację" value="" />
                  {activity[details.cableType].trafostacje && 
                   Object.keys(activity[details.cableType].trafostacje).map((substation) => (
                    <Picker.Item key={substation} label={substation} value={substation} />
                  ))}
                </Picker>
                
                {details.substation && 
                 activity[details.cableType] && 
                 activity[details.cableType].trafostacje && 
                 activity[details.cableType].trafostacje[details.substation] && (
                  <Picker
                    selectedValue={details.inverter || ''}
                    onValueChange={(value: string) => handleInverterChange(value)}
                  >
                    <Picker.Item label="Wybierz inwerter" value="" />
                    {Object.keys(activity[details.cableType].trafostacje[details.substation].inwertery || {}).map((inverter) => (
                      <Picker.Item key={inverter} label={inverter} value={inverter} />
                    ))}
                  </Picker>
                )}
                
                {details.cableType === 'Kabel DC' && 
                 details.inverter && 
                 details.substation &&
                 activity[details.cableType] && 
                 activity[details.cableType].trafostacje && 
                 activity[details.cableType].trafostacje[details.substation] && 
                 activity[details.cableType].trafostacje[details.substation].inwertery && 
                 activity[details.cableType].trafostacje[details.substation].inwertery[details.inverter] && 
                 activity[details.cableType].trafostacje[details.substation].inwertery[details.inverter][details.cableType] && (
                  <>
                    <Picker
                      selectedValue={details.string || ''}
                      onValueChange={(value: string) => setCurrentActivity({
                        ...currentActivity,
                        details: { ...details, string: value }
                      })}
                    >
                      <Picker.Item label="Wybierz numer stringu" value="" />
                      {Object.keys(activity[details.cableType].trafostacje[details.substation].inwertery[details.inverter][details.cableType].stringi || {}).map((string) => (
                        <Picker.Item key={string} label={string} value={string} />
                      ))}
                    </Picker>
                    
                    {details.string && 
                     activity[details.cableType].trafostacje[details.substation].inwertery[details.inverter][details.cableType].stringi && 
                     activity[details.cableType].trafostacje[details.substation].inwertery[details.inverter][details.cableType].stringi[details.string] && (
                      <TextInput
                        value={details.length || ''}
                        onChangeText={(value) => setCurrentActivity({
                          ...currentActivity,
                          details: { ...details, length: value }
                        })}
                        placeholder={`Wpisz długość kabla (max ${activity[details.cableType].trafostacje[details.substation].inwertery[details.inverter][details.cableType].stringi[details.string].dlugosc_max})`}
                        keyboardType="numeric"
                        style={[styles.textInput, {
                          backgroundColor: theme.colors.surface,
                          color: theme.colors.text,
                          borderColor: theme.colors.border
                        }]}
                      />
                    )}
                  </>
                )}
                
                {details.cableType === 'Kabel AC' && 
                 details.inverter && 
                 details.substation &&
                 activity[details.cableType] && 
                 activity[details.cableType].trafostacje && 
                 activity[details.cableType].trafostacje[details.substation] && 
                 activity[details.cableType].trafostacje[details.substation].inwertery && 
                 activity[details.cableType].trafostacje[details.substation].inwertery[details.inverter] && (
                  <TextInput
                    value={details.length || ''}
                    onChangeText={(value) => setCurrentActivity({
                      ...currentActivity,
                      details: { ...details, length: value }
                    })}
                    placeholder={`Wpisz długość kabla (max ${activity[details.cableType].trafostacje[details.substation].inwertery[details.inverter].dlugosc_max})`}
                    keyboardType="numeric"
                    style={[styles.textInput, {
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text,
                      borderColor: theme.colors.border
                    }]}
                  />
                )}
              </>
            )}
          </>
        );
        
      case 'Wykopy':
        return (
          <>
            <Picker
              selectedValue={details.trench || ''}
              onValueChange={(value: string) => setCurrentActivity({
                ...currentActivity,
                details: { ...details, trench: value }
              })}
            >
              <Picker.Item label="Wybierz wykop" value="" />
              {activity.wykopy && Object.keys(activity.wykopy).map((trench) => (
                <Picker.Item key={trench} label={trench} value={trench} />
              ))}
            </Picker>
            
            {details.trench && activity.wykopy && activity.wykopy[details.trench] && (
              <TextInput
                value={details.quantity || ''}
                onChangeText={(value) => setCurrentActivity({
                  ...currentActivity,
                  details: { ...details, quantity: value }
                })}
                placeholder={`Wpisz zrobioną ilość (max ${activity.wykopy[details.trench].ilosc_max})`}
                keyboardType="numeric"
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }]}
              />
            )}
          </>
        );
        
      default:
        return null;
    }
  };

  // Generowanie czytelnego opisu aktywności
  const getActivityDescription = (item: Activity) => {
    let description = `Strefa: ${item.zone}, Aktywność: ${item.activityType}`;
    
    switch (item.activityType) {
      case 'Moduły':
        description += `, Rząd: ${item.details.row}, Stół: ${item.details.table}, Ilość: ${item.details.quantity}`;
        break;
      case 'Konstrukcja':
        description += `, Rząd: ${item.details.row}, Stół: ${item.details.table}`;
        break;
      case 'Elektryka':
        description += `, Typ: ${item.details.cableType}, Trafostacja: ${item.details.substation}, Inwerter: ${item.details.inverter}`;
        if (item.details.cableType === 'Kabel DC') {
          description += `, String: ${item.details.string}, Długość: ${item.details.length}m`;
        } else {
          description += `, Długość: ${item.details.length}m`;
        }
        break;
      case 'Wykopy':
        description += `, Wykop: ${item.details.trench}, Ilość: ${item.details.quantity}`;
        break;
    }
    
    return description;
  };

  // Renderowanie listy aktywności
  const renderActivityList = () => {
    if (activities.length === 0) {
      return (
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Brak dodanych aktywności. Dodaj co najmniej jedną aktywność.
        </Text>
      );
    }
    
    return (
      <ScrollView style={styles.activityList}>
        {activities.map((item) => (
          <View 
            key={item.id}
            style={[styles.activityItem, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border 
            }]}
          >
            <Text style={[styles.activityText, { color: theme.colors.text }]}>
              {getActivityDescription(item)}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeActivity(item.id)}
            >
              <Ionicons name="close-circle" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  };
  
  const pickImages = async () => {
    // Prośba o uprawnienia dostępu do galerii
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Błąd', 'Potrzebujemy uprawnień dostępu do galerii zdjęć.');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Konwersja wybranych zdjęć na nasz format
      const newImages: ReportImage[] = result.assets.map(image => ({
        uri: image.uri,
        name: image.uri.split('/').pop() || `image_${Date.now()}.jpg`,
        type: 'image/jpeg'
      }));
      
      // Dodanie nowych zdjęć do istniejących
      setImages([...images, ...newImages]);
    }
  };
  
  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };
  
  const saveDraft = async () => {
    if (selectedMembers.length === 0) {
      Alert.alert('Błąd', 'Wybierz co najmniej jednego członka brygady.');
      return;
    }
    
    if (activities.length === 0) {
      Alert.alert('Błąd', 'Dodaj co najmniej jedną aktywność.');
      return;
    }
    
    setSaving(true);
    try {
      
      const report: ProgressReport = {
        id: draftId, // Jeśli edytujemy istniejący roboczy, zachowaj jego ID
        date: formatDateForStorage(date),
        members: selectedMembers,
        images: images,
        comment: comment,
        isDraft: true,
        projectName: projectName,
        projectId: projectId ?? undefined,
        createdAt: new Date().toISOString(),
        activities: activities
      };
      
      const result = await reportService.saveDraftReport(report);
      
      if (result) {
        Alert.alert('Sukces', 'Raport został zapisany jako wersja robocza.');
        router.back();
      } else {
        Alert.alert('Błąd', 'Nie udało się zapisać raportu.');
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania raportu:', error);
      Alert.alert('Błąd', 'Wystąpił problem podczas zapisywania raportu.');
    } finally {
      setSaving(false);
    }
  };
  
  const submitReport = async () => {
    // Walidacja
    if (selectedMembers.length === 0) {
      Alert.alert('Błąd', 'Wybierz co najmniej jednego członka brygady.');
      return;
    }
    
    if (activities.length === 0) {
      Alert.alert('Błąd', 'Dodaj co najmniej jedną aktywność.');
      return;
    }
    
    // Sprawdzenie czy wszyscy członkowie mają przypisane godziny
    const membersWithoutHours = selectedMembers.filter(m => m.hours <= 0);
    if (membersWithoutHours.length > 0) {
      Alert.alert(
        'Niepełne dane', 
        `Niektórzy członkowie brygady (${membersWithoutHours.map(m => m.name).join(', ')}) nie mają przypisanych godzin. Kontynuować?`,
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Kontynuuj', onPress: () => sendReport() }
        ]
      );
    } else {
      sendReport();
    }
  };

  // Funkcja do obsługi zeskanowanego tagu NFC
  const handleNfcTagFound = async (tagId: string) => {
    try {
      console.log('Znaleziono tag NFC:', tagId);
      
      // Znajdź pracownika na podstawie ID tagu NFC
      const employee = await employeeService.findEmployeeByNfcTag(tagId);
      
      if (employee) {
        // Jeśli znaleziono pracownika, dodaj go do wybranych członków (lub zaznacz checkbox)
        const memberName = employee.full_name || `${employee.first_name} ${employee.last_name}`;
        const isSelected = selectedMembers.some(m => m.name === memberName);
        
        if (!isSelected) {
          // Dodaj pracownika do listy wybranych z domyślną liczbą godzin
          setSelectedMembers([...selectedMembers, { 
            name: memberName, 
            hours: 0,
            employee_id: employee.id // Dodaj ID pracownika
          }]);
          
          // Pokaż toast lub alert informujący o dodaniu pracownika
          Alert.alert(
            'Dodano pracownika',
            `Pracownik ${memberName} został dodany do raportu.`,
            [{ text: 'OK' }]
          );
        } else {
          // Pracownik już jest wybrany - możemy go usunąć lub pokazać alert
          Alert.alert(
            'Pracownik już dodany',
            `Pracownik ${memberName} jest już na liście.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Nie znaleziono pracownika przypisanego do tego tagu
        Alert.alert(
          'Nieznany tag',
          'Nie znaleziono pracownika przypisanego do tej karty NFC.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Błąd podczas przetwarzania tagu NFC:', error);
      Alert.alert(
        'Błąd',
        'Wystąpił problem podczas przetwarzania karty NFC.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Pomocnicza funkcja sprawdzająca, czy pracownik ma przypisany tag NFC
  const memberHasNfcTag = (memberName: string): boolean => {
    // Znajdujemy pracownika w naszych danych
    const employee = allEmployeesData.find(
      emp => `${emp.first_name} ${emp.last_name}` === memberName
    );
    
    // Sprawdzamy czy pracownik ma przypisany tag
    return !!employee?.employee_tag;
  };
  
  const sendReport = async () => {
    setSubmitting(true);
    try {
      const report: ProgressReport = {
        id: draftId, // Zachowaj ID, aby usunąć roboczy po wysłaniu
        date: formatDateForStorage(date),
        members: selectedMembers,
        images: images,
        comment: comment,
        isDraft: false,
        projectName: projectName,
        projectId: projectId ?? undefined,
        createdAt: new Date().toISOString(),
        activities: activities
      };
      
      const result = await reportService.submitReport(report);
      
      if (result.success) {
        Alert.alert('Sukces', result.message);
        router.back();
      } else {
        Alert.alert('Błąd', result.message);
      }
    } catch (error) {
      console.error('Błąd podczas wysyłania raportu:', error);
      Alert.alert('Błąd', 'Wystąpił problem podczas wysyłania raportu.');
    } finally {
      setSubmitting(false);
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Progres Raport</Text>
        <View style={styles.placeholder} />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Sekcja informacji o raporcie */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Informacje o raporcie
            </Text>
            
            {/* Wybór daty */}
            <View style={styles.dateContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Data raportu:</Text>
              <TouchableOpacity
                style={[
                  styles.datePicker,
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border
                  }
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: theme.colors.text }}>
                  {formatDate(date)}
                </Text>
                <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
            
            {/* Wyświetlanie projektu */}
            <View style={styles.projectContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Projekt:</Text>
              <Text style={[styles.projectName, { color: theme.colors.text }]}>
                {projectName || 'Brak wybranego projektu'}
              </Text>
            </View>
          </Card>
          
          {/* Sekcja wyboru aktywności */}
          {projectConfig && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Dodaj nową aktywność
              </Text>
              
              {/* Wybór strefy */}
              <Picker
                selectedValue={currentActivity.zone}
                onValueChange={handleZoneChange}
              >
                <Picker.Item label="Wybierz strefę" value="" />
                {projectConfig.config.zones && Object.keys(projectConfig.config.zones).map((zone) => (
                  <Picker.Item key={zone} label={`Strefa ${zone}`} value={zone} />
                ))}
              </Picker>
              
              {/* Wybór aktywności */}
              {currentActivity.zone && projectConfig.config.zones && projectConfig.config.zones[currentActivity.zone] && (
                <Picker
                  selectedValue={currentActivity.activityType}
                  onValueChange={handleActivityTypeChange}
                >
                  <Picker.Item label="Wybierz aktywność" value="" />
                  {Object.keys(projectConfig.config.zones[currentActivity.zone].aktywnosci || {}).map((activity) => (
                    <Picker.Item key={activity} label={activity} value={activity} />
                  ))}
                </Picker>
              )}
              
              {/* Dynamiczny formularz dla wybranej aktywności */}
              {renderActivityForm()}
              
              {/* Przycisk dodawania */}
              {currentActivity.zone && currentActivity.activityType && (
                <Button
                  title="Dodaj aktywność"
                  onPress={addActivity}
                  style={styles.addButton}
                  icon={<Ionicons name="add-circle" size={18} color="white" style={{marginRight: 8}} />}
                />
              )}
            </Card>
          )}
          
          {/* Lista dodanych aktywności */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Dodane aktywności
            </Text>
            {renderActivityList()}
          </Card>
          
          {/* Sekcja wyboru członków brygady - zmodyfikowana dla NFC */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Członkowie brygady
              </Text>
              <View style={styles.sectionActions}>
                <Button
                  title={selectedMembers.length === allMembers.length ? "Odznacz wszystkich" : "Wybierz wszystkich"}
                  onPress={selectAllMembers}
                  size="small"
                  variant="outlined"
                  style={styles.actionButton}
                />
                {isNfcSupported && (
                  <Button
                    title="Skanuj NFC"
                    onPress={() => setShowNfcScanner(true)}
                    size="small"
                    variant="outlined"
                    icon={<Ionicons name="radio-outline" size={18} color={theme.colors.primary} style={{marginRight: 5}} />}
                    style={styles.actionButton}
                  />
                )}
              </View>
            </View>
            
            {/* Lista wszystkich członków brygady */}
            <View style={styles.membersListContainer}>
              {allMembers.length > 0 ? (
                allMembers.map((member, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.memberCheckItem,
                      { borderBottomColor: theme.colors.border }
                    ]}
                    onPress={() => toggleMemberSelection(member)}
                  >
                    <View style={styles.memberCheckboxRow}>
                      <Checkbox
                        checked={selectedMembers.some(m => m.name === member)}
                        onToggle={() => toggleMemberSelection(member)}
                        label={member}
                      />
                      {/* Ikona NFC dla pracowników, którzy mają przypisane karty */}
                      {memberHasNfcTag(member) && (
                        <Ionicons 
                          name="radio-outline" 
                          size={18} 
                          color={theme.colors.primary} 
                          style={styles.nfcIcon} 
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  Brak dostępnych członków brygady. Skonfiguruj brygadę w sekcji "Brygada".
                </Text>
              )}
            </View>
          </Card>
          
          {/* Sekcja godzin pracy dla wybranych członków */}
          {selectedMembers.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Godziny pracy
              </Text>
              
              {selectedMembers.map((member, index) => (
                <View 
                  key={index}
                  style={[
                    styles.memberHoursItem,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border 
                    }
                  ]}
                >
                  <Text style={[styles.memberName, { color: theme.colors.text }]}>
                    {member.name}
                  </Text>
                  
                  <View style={styles.memberHoursControls}>
                    <TextInput
                      style={[
                        styles.hoursInput,
                        { 
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                          color: theme.colors.text
                        }
                      ]}
                      value={member.hours.toString()}
                      onChangeText={(text) => {
                        const hours = parseFloat(text) || 0;
                        updateMemberHours(member.name, hours ?? 0);
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                    
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeMember(member.name)}
                    >
                      <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </Card>
          )}
          
          {/* Sekcja zdjęć */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Zdjęcia
            </Text>
            
            <Button
              title="Dodaj zdjęcia z galerii"
              onPress={pickImages}
              icon={<Ionicons name="images" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />}
              variant="outlined"
              style={styles.addImagesButton}
            />
            
            {/* Siatka wybranych zdjęć */}
            {images.length > 0 ? (
              <View style={styles.imagesGrid}>
                {images.map((image, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.imageContainer,
                      { borderColor: theme.colors.border }
                    ]}
                  >
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Brak dodanych zdjęć. Możesz dodać zdjęcia z galerii urządzenia.
              </Text>
            )}
          </Card>
          
          {/* Sekcja komentarza */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Komentarz
            </Text>
            
            <Input
              value={comment}
              onChangeText={setComment}
              placeholder="Wpisz komentarz do raportu..."
              multiline={true}
              numberOfLines={4}
              style={styles.commentInput}
            />
          </Card>
          
          {/* Przyciski akcji */}
          <View style={styles.actionButtons}>
            <Button
              title="Zapisz roboczą"
              onPress={saveDraft}
              variant="outlined"
              loading={saving}
              style={styles.actionButton}
            />
            
            <Button
              title="Wyślij raport"
              onPress={submitReport}
              loading={submitting}
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Komponent skanera NFC */}
      <NfcScanner
        visible={showNfcScanner}
        onClose={() => setShowNfcScanner(false)}
        onTagFound={handleNfcTagFound}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
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
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginRight: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  projectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    fontSize: 16,
  },
  activityList: {
    marginTop: 8,
    maxHeight: 300,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    marginTop: 16,
  },
  membersListContainer: {
    marginBottom: 8,
  },
  memberCheckItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  memberCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  nfcIcon: {
    marginLeft: 10,
  },
  memberHoursItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
    flex: 1,
  },
  memberHoursControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  addImagesButton: {
    marginBottom: 16,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  imageContainer: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 4,
    position: 'relative',
  },
  image: {
    flex: 1,
    borderRadius: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 14,
  },
  commentInput: {
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});