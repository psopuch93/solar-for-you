// services/report.ts - wersja dla Django
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from './auth';
import { projectService } from './project';

// Klucz do przechowywania roboczych raportów
const DRAFT_REPORTS_KEY = '@solar_for_you_draft_reports';

// Interfejs dla elementu raportu pracownika
export interface ReportMember {
  name: string;
  hours: number;
  employee_id?: number;  // Dodano pole employee_id dla Django
}

// Interfejs dla zdjęcia raportu
export interface ReportImage {
  uri: string;
  name: string;
  type: string;
}

// Interfejs dla pojedynczej aktywności
export interface Activity {
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

// Interfejs reprezentujący raport
export interface ProgressReport {
  id?: string;         // ID raportu (generowane przy zapisie)
  date: string;        // Data raportu w formacie YYYY-MM-DD
  members: ReportMember[]; // Lista pracowników w raporcie
  images: ReportImage[]; // Lista zdjęć
  comment?: string;    // Komentarz do raportu
  isDraft: boolean;    // Czy raport jest wersją roboczą
  projectName?: string; // Nazwa projektu, którego dotyczy raport
  projectId?: number;   // ID projektu dla Django
  createdAt?: string;  // Data utworzenia raportu
  activities?: Activity[]; // Lista aktywności
}

// Format danych do wysyłki na serwer Django
export interface ReportSubmitData {
  date: string;
  project: number;  // W Django potrzebujemy ID projektu
  members: { employee: number; hours_worked: number }[];  // Format dla Django
  comment?: string;
  activities?: any[];  // Aktywności w formacie dla Django
}

export const reportService = {
  // Pobieranie listy członków brygady dla zalogowanego użytkownika
  getBrigadeMembers: async (): Promise<string[]> => {
    try {
      console.log('📋 Pobieranie członków brygady...');
      
      // W Django pobieramy członków brygady z odpowiedniego endpointu
      const members = await api.get<any[]>('/api/brigade-members/');
      console.log(`✅ Pobrano ${members.length} członków brygady`);
      
      // Przekształć na listę imion i nazwisk
      const memberNames = members.map(member => member.employee_name);
      return memberNames;
    } catch (error) {
      console.error('❌ Błąd podczas pobierania członków brygady:', error);
      
      // Fallback - pobierz dane z ustawień użytkownika
      try {
        const settings = await projectService.getUserSettings();
        return settings.brigade;
      } catch (innerError) {
        console.error('❌ Błąd podczas pobierania ustawień użytkownika:', innerError);
        return [];
      }
    }
  },

  // Zapisywanie raportu roboczego
  saveDraftReport: async (report: ProgressReport): Promise<boolean> => {
    try {
      console.log('📝 Zapisywanie roboczego raportu...');
      // Generuj ID dla raportu jeśli nie istnieje
      if (!report.id) {
        report.id = `draft_${Date.now()}`;
      }
      
      // Ustaw flagę, że to wersja robocza
      report.isDraft = true;
      
      // Pobierz istniejące raporty robocze
      const draftsJSON = await AsyncStorage.getItem(DRAFT_REPORTS_KEY);
      const drafts: ProgressReport[] = draftsJSON ? JSON.parse(draftsJSON) : [];
      
      // Sprawdź czy raport z takim ID już istnieje
      const existingIndex = drafts.findIndex(d => d.id === report.id);
      if (existingIndex >= 0) {
        // Aktualizuj istniejący raport
        drafts[existingIndex] = report;
      } else {
        // Dodaj nowy raport
        drafts.push(report);
      }
      
      // Zapisz zaktualizowaną listę
      await AsyncStorage.setItem(DRAFT_REPORTS_KEY, JSON.stringify(drafts));
      console.log('✅ Raport roboczy zapisany pomyślnie');
      return true;
    } catch (error) {
      console.error('❌ Błąd podczas zapisywania raportu roboczego:', error);
      return false;
    }
  },

  // Pobieranie roboczych raportów
  getDraftReports: async (): Promise<ProgressReport[]> => {
    try {
      console.log('🔍 Pobieranie roboczych raportów...');
      const draftsJSON = await AsyncStorage.getItem(DRAFT_REPORTS_KEY);
      const drafts: ProgressReport[] = draftsJSON ? JSON.parse(draftsJSON) : [];
      console.log(`✅ Pobrano ${drafts.length} roboczych raportów`);
      return drafts;
    } catch (error) {
      console.error('❌ Błąd podczas pobierania roboczych raportów:', error);
      return [];
    }
  },

  // Pobieranie konkretnego roboczego raportu
  getDraftReportById: async (id: string): Promise<ProgressReport | null> => {
    try {
      console.log(`🔍 Pobieranie roboczego raportu o ID ${id}...`);
      const drafts = await reportService.getDraftReports();
      const report = drafts.find(d => d.id === id);
      return report || null;
    } catch (error) {
      console.error('❌ Błąd podczas pobierania roboczego raportu:', error);
      return null;
    }
  },

  // Usuwanie roboczego raportu
  deleteDraftReport: async (id: string): Promise<boolean> => {
    try {
      console.log(`🗑️ Usuwanie roboczego raportu o ID ${id}...`);
      const drafts = await reportService.getDraftReports();
      const updatedDrafts = drafts.filter(d => d.id !== id);
      await AsyncStorage.setItem(DRAFT_REPORTS_KEY, JSON.stringify(updatedDrafts));
      console.log('✅ Raport roboczy usunięty pomyślnie');
      return true;
    } catch (error) {
      console.error('❌ Błąd podczas usuwania roboczego raportu:', error);
      return false;
    }
  },

  // Wysyłanie raportu na serwer Django
  submitReport: async (report: ProgressReport): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('📤 Wysyłanie raportu na serwer Django...');
      
      // Znajdź ID projektu na podstawie nazwy
      let projectId = report.projectId;
      if (!projectId && report.projectName) {
        try {
          const projects = await projectService.getProjects();
          const project = projects.find(p => p.name === report.projectName);
          if (project) {
            projectId = project.id;
          }
        } catch (error) {
          console.error('❌ Błąd podczas pobierania projektów:', error);
          throw new Error('Nie udało się znaleźć ID projektu');
        }
      }
      
      if (!projectId) {
        throw new Error('Brak ID projektu');
      }
      
      // Przekształć członków raportu do formatu Django
      const members = await reportService.prepareReportMembers(report.members);
      
      // Przygotuj dane do wysyłki w formacie Django
      const submitData: ReportSubmitData = {
        date: report.date,
        project: projectId,
        members: members,
        comment: report.comment,
        activities: report.activities // To może wymagać dalszych przekształceń
      };
      
      // Wyślij podstawowe dane raportu
      const createdReport = await api.post<any>('/api/create-progress-report/', submitData);
      console.log('✅ Podstawowe dane raportu wysłane:', createdReport);
      
      if (createdReport && createdReport.id) {
        // Jeśli raport został utworzony, wyślij zdjęcia (każde w osobnym żądaniu)
        if (report.images && report.images.length > 0) {
          for (const image of report.images) {
            // Implementacja wysyłania zdjęć do Django
            await reportService.uploadReportImage(createdReport.id, image);
          }
        }
        
        // Jeśli raport był zapisany jako roboczy, usuń go
        if (report.id && report.isDraft) {
          await reportService.deleteDraftReport(report.id);
        }
        
        return {
          success: true,
          message: 'Raport został wysłany pomyślnie!'
        };
      } else {
        throw new Error('Nie udało się utworzyć raportu na serwerze');
      }
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania raportu:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Wystąpił błąd podczas wysyłania raportu'
      };
    }
  },
  
  // Pomocnicza metoda do przekształcania członków raportu
  prepareReportMembers: async (members: ReportMember[]): Promise<{ employee: number; hours_worked: number }[]> => {
    try {
      // Jeśli członkowie mają już ID, użyj ich
      const preparedMembers: { employee: number; hours_worked: number }[] = [];
      
      for (const member of members) {
        if (member.employee_id) {
          preparedMembers.push({
            employee: member.employee_id,
            hours_worked: member.hours
          });
        } else {
          // Jeśli nie ma ID, spróbuj znaleźć pracownika po imieniu i nazwisku
          try {
            // Pobierz listę pracowników
            const employeesResponse = await api.get<any[]>('/api/employees/');
            const employees = employeesResponse || [];
            
            // Szukaj pracownika po imieniu i nazwisku
            const [firstName, ...lastNameParts] = member.name.split(' ');
            const lastName = lastNameParts.join(' ');
            
            const employee = employees.find(emp => 
              emp.first_name.toLowerCase() === firstName.toLowerCase() && 
              emp.last_name.toLowerCase() === lastName.toLowerCase()
            );
            
            if (employee) {
              preparedMembers.push({
                employee: employee.id,
                hours_worked: member.hours
              });
            } else {
              console.warn(`⚠️ Nie znaleziono pracownika o nazwie ${member.name}`);
            }
          } catch (error) {
            console.error('❌ Błąd podczas pobierania pracowników:', error);
          }
        }
      }
      
      return preparedMembers;
    } catch (error) {
      console.error('❌ Błąd podczas przygotowywania członków raportu:', error);
      return [];
    }
  },
  
  // Metoda do wysyłania zdjęcia raportu
  uploadReportImage: async (reportId: number, image: ReportImage): Promise<boolean> => {
    try {
      // Utworzenie obiektu FormData do wysłania pliku
      const formData = new FormData();
      formData.append('report', reportId.toString());
      formData.append('name', image.name);
      
      // Dodaj plik obrazu
      const fileUri = image.uri;
      const fileName = image.name || fileUri.split('/').pop() || 'image.jpg';
      const fileType = image.type || 'image/jpeg';
      
      // @ts-ignore - FormData append ma problemy z typami w React Native
      formData.append('image', {
        uri: fileUri,
        name: fileName,
        type: fileType
      });
      
      // Wyślij żądanie do API Django
      await api.post('/api/progress-report-images/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania zdjęcia raportu:', error);
      return false;
    }
  }
};