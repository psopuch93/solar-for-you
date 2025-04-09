// services/project.ts - wersja dla Django
import { api } from './api';

export interface Project {
  id: number;
  name: string;
  status: string;
  status_display?: string;
  client_name?: string;
}

export interface UserSettings {
  project: string;
  brigade: string[];
}

export const projectService = {
  // Pobieranie listy wszystkich projektów
  getProjects: async (): Promise<Project[]> => {
    try {
      console.log('📋 Pobieranie listy projektów...');
      const projects = await api.get<Project[]>('/api/projects/');
      console.log(`✅ Pobrano ${projects.length} projektów`);
      return projects;
    } catch (error) {
      console.error('❌ Błąd podczas pobierania projektów:', error);
      return [];
    }
  },

  // Pobieranie ustawień użytkownika (projekt i brygada)
  getUserSettings: async (): Promise<UserSettings> => {
    try {
      console.log('⚙️ Pobieranie ustawień użytkownika...');
      // Django ma inny endpoint dla ustawień użytkownika
      const settings = await api.get<any>('/api/user-settings/me/');
      console.log('✅ Pobrane ustawienia:', settings);
      
      // Przygotowanie odpowiedzi w wymaganym formacie
      const projectName = settings.project_details ? settings.project_details.name : '';
      
      // W Django brygada jest przechowywana inaczej, pobierzmy ją z odpowiedniego endpointu
      let brigadeMembers: string[] = [];
      try {
        const brigadeData = await api.get<any[]>('/api/brigade-members/');
        brigadeMembers = brigadeData.map(member => {
          if (member.employee_data) {
            return `${member.employee_data.first_name} ${member.employee_data.last_name}`;
          }
          return member.employee_name || '';
        }).filter(name => name);
      } catch (error) {
        console.warn('⚠️ Nie udało się pobrać członków brygady:', error);
      }
      
      return { 
        project: projectName,
        brigade: brigadeMembers
      };
    } catch (error) {
      console.error('❌ Błąd podczas pobierania ustawień:', error);
      return { project: '', brigade: [] };
    }
  },

  getProjectConfig: async (projectName: string): Promise<any> => {
    try {
      console.log(`📋 Pobieranie konfiguracji dla projektu ${projectName}...`);
      // W Django ten endpoint może mieć inną ścieżkę
      const config = await api.get(`/api/project/modules_config?project=${encodeURIComponent(projectName)}`);
      console.log(`✅ Pobrano konfigurację projektu ${projectName}:`, config);
      return config;
    } catch (error) {
      console.error('❌ Błąd podczas pobierania konfiguracji projektu:', error);
      return null;
    }
  },

  // Zapisywanie ustawień użytkownika
  saveUserSettings: async (settings: UserSettings): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('💾 Zapisywanie ustawień użytkownika:', settings);
      
      // Najpierw znajdźmy ID projektu na podstawie nazwy
      let projectId = null;
      if (settings.project) {
        try {
          const projects = await projectService.getProjects();
          const project = projects.find(p => p.name === settings.project);
          if (project) {
            projectId = project.id;
          }
        } catch (error) {
          console.warn('⚠️ Nie udało się znaleźć ID projektu:', error);
        }
      }
      
      // W Django endpoint zapisywania ustawień oczekuje ID projektu
      const requestData = {
        project: projectId,
        // Brigade settings będą zapisywane osobno
      };
      
      // Zapisz ustawienia projektu
      const response = await api.post<any>('/api/user-settings/', requestData);
      console.log('✅ Odpowiedź zapisywania projektu:', response);
      
      // Teraz zaktualizuj brygadę
      // To wymaga kilku operacji: pobrania aktualnych członków, usunięcia starych, dodania nowych
      if (settings.brigade && settings.brigade.length > 0) {
        // Implementacja zależy od dokładnej struktury API Django
        // Tutaj można wykonać dodatkowe zapytania do API
      }
      
      return {
        success: true,
        message: 'Ustawienia zostały zapisane pomyślnie'
      };
    } catch (error) {
      console.error('❌ Błąd podczas zapisywania ustawień:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Błąd podczas zapisywania ustawień' 
      };
    }
  }
};