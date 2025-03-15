// services/report.ts
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
}

// Interfejs dla zdjęcia raportu
export interface ReportImage {
  uri: string;
  name: string;
  type: string;
}

// Interfejs reprezentujący raport
export interface ProgressReport {
  id?: string;         // ID raportu (generowane przy zapisie)
  date: string;        // Data raportu w formacie YYYY-MM-DD
  members: ReportMember[]; // Lista pracowników w raporcie
  images: ReportImage[]; // Lista zdjęć
  isDraft: boolean;    // Czy raport jest wersją roboczą
  projectName?: string; // Nazwa projektu, którego dotyczy raport
  createdAt?: string;  // Data utworzenia raportu
}

// Interfejs reprezentujący raport
export interface ProgressReport {
    id?: string;         // ID raportu (generowane przy zapisie)
    date: string;        // Data raportu w formacie YYYY-MM-DD
    members: ReportMember[]; // Lista pracowników w raporcie
    images: ReportImage[]; // Lista zdjęć
    // DODAJ TUTAJ:
    comment?: string;    // Komentarz do raportu
    isDraft: boolean;    // Czy raport jest wersją roboczą
    projectName?: string; // Nazwa projektu, którego dotyczy raport
    createdAt?: string;  // Data utworzenia raportu
  }

// Format danych do wysyłki na serwer
export interface ReportSubmitData {
    date: string;
    members: { name: string; hours: number }[];
    projectName: string;
    images: ReportImage[];
    // DODAJ TUTAJ:
    comment?: string;    // Komentarz do raportu
  }

export const reportService = {
  // Pobieranie listy członków brygady dla zalogowanego użytkownika
  getBrigadeMembers: async (): Promise<string[]> => {
    try {
      console.log('📋 Pobieranie członków brygady...');
      const settings = await projectService.getUserSettings();
      console.log(`✅ Pobrano ${settings.brigade.length} członków brygady`);
      return settings.brigade;
    } catch (error) {
      console.error('❌ Błąd podczas pobierania członków brygady:', error);
      return [];
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

  // Wysyłanie raportu na serwer
  submitReport: async (report: ProgressReport): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('📤 Wysyłanie raportu na serwer...');
      
      // Przygotuj dane do wysyłki
      const submitData: ReportSubmitData = {
        date: report.date,
        members: report.members,
        projectName: report.projectName || '',
        images: report.images
      };
      
      // Przykładowe wysłanie raportu (tu trzeba dostosować do endpointu API)
      // W rzeczywistości implementacja będzie bardziej skomplikowana, np. z przesyłaniem plików
      // Tutaj symulujemy sukces
      
      // Dla demonstracji zwracamy sukces
      console.log('✅ Raport wysłany pomyślnie');
      
      // Jeśli raport był zapisany jako roboczy, usuń go
      if (report.id && report.isDraft) {
        await reportService.deleteDraftReport(report.id);
      }
      
      return {
        success: true,
        message: 'Raport został wysłany pomyślnie!'
      };
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania raportu:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Wystąpił błąd podczas wysyłania raportu'
      };
    }
  }
};