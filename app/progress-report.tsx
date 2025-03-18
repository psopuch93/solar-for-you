// app/progress-report.tsx
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
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { reportService, ProgressReport, ReportMember, ReportImage } from '../services/report';
import { projectService } from '../services/project';
import { Picker } from '@react-native-picker/picker';

// Komponenty
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Checkbox from '../components/common/Checkbox';
import Input from '../components/common/Input';

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
  const [projectConfig, setProjectConfig] = useState<any>(null);
  
  // Członkowie brygady
  const [allMembers, setAllMembers] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<ReportMember[]>([]);

  // Zmienne dla wyboru aktywności i strefy
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedCableType, setSelectedCableType] = useState<string>('');
  const [selectedSubstation, setSelectedSubstation] = useState<string>('');
  const [selectedInverter, setSelectedInverter] = useState<string>('');
  const [selectedString, setSelectedString] = useState<string>('');
  const [selectedTrench, setSelectedTrench] = useState<string>('');
  
  // Wartości dla ilości i długości
  const [quantity, setQuantity] = useState<string>('');
  const [length, setLength] = useState<string>('');
  
  // Zdjęcia
  const [images, setImages] = useState<ReportImage[]>([]);

  // Komentarz
  const [comment, setComment] = useState<string>('');
  
  // Efekt inicjalizujący
  useEffect(() => {
    loadInitialData();
  }, []);
  
  // Funkcja ładująca początkowe dane
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Pobranie członków brygady
      const members = await reportService.getBrigadeMembers();
      setAllMembers(members);
      
      // Pobranie ustawień użytkownika (aktualny projekt)
      const settings = await projectService.getUserSettings();
      setProjectName(settings.project);

      // Pobranie ustawień projektu
      if (settings.project) {
        const config = await projectService.getProjectConfig(settings.project);
        setProjectConfig(config);
      }
      
      // Jeśli podano ID roboczego raportu, załaduj go
      if (draftId) {
        const draftReport = await reportService.getDraftReportById(draftId);
        if (draftReport) {
          setDate(new Date(draftReport.date));
          setSelectedMembers(draftReport.members);
          setImages(draftReport.images);
          setProjectName(draftReport.projectName || '');
          setComment(draftReport.comment || '');
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
      setSelectedMembers([...selectedMembers, { name: memberName, hours: 0 }]);
    }
  };
  
  const selectAllMembers = () => {
    // Sprawdzenie czy wszyscy są już wybrani
    if (selectedMembers.length === allMembers.length) {
      // Jeśli tak, odznacz wszystkich
      setSelectedMembers([]);
    } else {
      // Jeśli nie, wybierz wszystkich z domyślną liczbą godzin 0
      const allSelected = allMembers.map(name => ({ name, hours: 0 }));
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

  const renderFields = () => {
    if (!projectConfig || !selectedZone || !selectedActivity) return null;

    const { aktywnosci } = projectConfig.config.zones[selectedZone];
    const activity = aktywnosci[selectedActivity];

    switch (selectedActivity) {
      case 'Moduły':
        return (
          <>
            <Picker
              selectedValue={selectedRow}
              onValueChange={(value: string) => setSelectedRow(value)}
            >
              <Picker.Item label="Wybierz rząd" value="" />
              {Object.keys(activity.rzędy).map((row) => (
                <Picker.Item key={row} label={`Rząd ${row}`} value={row} />
              ))}
            </Picker>
            {selectedRow && (
              <Picker
                selectedValue={selectedTable}
                onValueChange={(value) => setSelectedTable(value)}
              >
                <Picker.Item label="Wybierz numer stołu" value="" />
                {Object.keys(activity.rzędy[selectedRow].stoły).map((table) => (
                  <Picker.Item key={table} label={`Stół ${table}`} value={table} />
                ))}
              </Picker>
            )}
            {selectedTable && (
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder={`Wpisz ilość modułów (max ${activity.rzędy[selectedRow].stoły[selectedTable].ilosc_modulow_max})`}
                keyboardType="numeric"
              />
            )}
          </>
        );
      case 'Konstrukcja':
        return (
          <>
            <Picker
              selectedValue={selectedRow}
              onValueChange={(value) => setSelectedRow(value)}
            >
              <Picker.Item label="Wybierz rząd" value="" />
              {Object.keys(activity.rzędy).map((row) => (
                <Picker.Item key={row} label={`Rząd ${row}`} value={row} />
              ))}
            </Picker>
            {selectedRow && (
              <Picker
                selectedValue={selectedTable}
                onValueChange={(value) => setSelectedTable(value)}
              >
                <Picker.Item label="Wybierz numer stołu" value="" />
                {Object.keys(activity.rzędy[selectedRow].stoły).map((table) => (
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
              selectedValue={selectedCableType}
              onValueChange={(value) => setSelectedCableType(value)}
            >
              <Picker.Item label="Wybierz podtyp" value="" />
              <Picker.Item label="Kabel AC" value="Kabel AC" />
              <Picker.Item label="Kabel DC" value="Kabel DC" />
            </Picker>
            {selectedCableType && (
              <>
                <Picker
                  selectedValue={selectedSubstation}
                  onValueChange={(value) => setSelectedSubstation(value)}
                >
                  <Picker.Item label="Wybierz trafostację" value="" />
                  {Object.keys(activity[selectedCableType].trafostacje).map((substation) => (
                    <Picker.Item key={substation} label={substation} value={substation} />
                  ))}
                </Picker>
                {selectedSubstation && (
                  <Picker
                    selectedValue={selectedInverter}
                    onValueChange={(value) => setSelectedInverter(value)}
                  >
                    <Picker.Item label="Wybierz inwerter" value="" />
                    {Object.keys(activity[selectedCableType].trafostacje[selectedSubstation].inwertery).map((inverter) => (
                      <Picker.Item key={inverter} label={inverter} value={inverter} />
                    ))}
                  </Picker>
                )}
                {selectedCableType === 'Kabel DC' && selectedInverter && (
                  <>
                    <Picker
                      selectedValue={selectedString}
                      onValueChange={(value) => setSelectedString(value)}
                    >
                      <Picker.Item label="Wybierz numer stringu" value="" />
                      {Object.keys(activity[selectedCableType].trafostacje[selectedSubstation].inwertery[selectedInverter][selectedCableType].stringi).map((string) => (
                        <Picker.Item key={string} label={string} value={string} />
                      ))}
                    </Picker>
                    <TextInput
                      value={length}
                      onChangeText={setLength}
                      placeholder={`Wpisz długość kabla (max ${activity[selectedCableType].trafostacje[selectedSubstation].inwertery[selectedInverter][selectedCableType].stringi[selectedString].dlugosc_max})`}
                      keyboardType="numeric"
                    />
                  </>
                )}
                {selectedCableType === 'Kabel AC' && selectedInverter && (
                  <TextInput
                    value={length}
                    onChangeText={setLength}
                    placeholder={`Wpisz długość kabla (max ${activity[selectedCableType].trafostacje[selectedSubstation].inwertery[selectedInverter].dlugosc_max})`}
                    keyboardType="numeric"
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
              selectedValue={selectedTrench}
              onValueChange={(value) => setSelectedTrench(value)}
            >
              <Picker.Item label="Wybierz wykop" value="" />
              {Object.keys(activity.wykopy).map((trench) => (
                <Picker.Item key={trench} label={trench} value={trench} />
              ))}
            </Picker>
            {selectedTrench && (
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder={`Wpisz zrobioną ilość (max ${activity.wykopy[selectedTrench].ilosc_max})`}
                keyboardType="numeric"
              />
            )}
          </>
        );
      default:
        return null;
    }
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
            createdAt: new Date().toISOString()
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
        createdAt: new Date().toISOString()
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
          
          {/* Renderowanie pól wyboru strefy i aktywności */}
          {projectConfig && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Wybierz strefę i aktywność
              </Text>
              <Picker
                selectedValue={selectedZone}
                onValueChange={(value) => setSelectedZone(value)}
              >
                <Picker.Item label="Wybierz strefę" value="" />
                {Object.keys(projectConfig.config.zones).map((zone) => (
                  <Picker.Item key={zone} label={`Strefa ${zone}`} value={zone} />
                ))}
              </Picker>
              {selectedZone && (
                <Picker
                  selectedValue={selectedActivity}
                  onValueChange={(value) => setSelectedActivity(value)}
                >
                  <Picker.Item label="Wybierz aktywność" value="" />
                  {Object.keys(projectConfig.config.zones[selectedZone].aktywnosci).map((activity) => (
                    <Picker.Item key={activity} label={activity} value={activity} />
                  ))}
                </Picker>
              )}
            </Card>
          )}

          {/* Renderowanie dynamicznych pól na podstawie wybranej strefy i aktywności */}
          {selectedZone && selectedActivity && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Wprowadź dane
              </Text>
              {renderFields()}
            </Card>
          )}
          
          {/* Sekcja wyboru członków brygady */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Członkowie brygady
              </Text>
              <Button
                title={selectedMembers.length === allMembers.length ? "Odznacz wszystkich" : "Wybierz wszystkich"}
                onPress={selectAllMembers}
                size="small"
                variant="outlined"
              />
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
                    <Checkbox
                      checked={selectedMembers.some(m => m.name === member)}
                      onToggle={() => toggleMemberSelection(member)}
                      label={member}
                    />
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
                        updateMemberHours(member.name, hours);
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
  membersListContainer: {
    marginBottom: 8,
  },
  memberCheckItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
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
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});