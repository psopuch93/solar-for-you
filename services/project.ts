// services/project.ts
import { api } from './api';

export interface Project {
  id: number;
  name: string;
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
      const projects = await api.get<Project[]>('/project/mobile');
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
      const settings = await api.get<UserSettings>('/user/settings');
      console.log('✅ Pobrane ustawienia:', settings);
      return settings;
    } catch (error) {
      console.error('❌ Błąd podczas pobierania ustawień:', error);
      return { project: '', brigade: [] };
    }
  },

  // Zapisywanie ustawień użytkownika
  saveUserSettings: async (settings: UserSettings): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('💾 Zapisywanie ustawień użytkownika:', settings);
      const response = await api.post<{ success: boolean; message: string }>('/user/settings', settings);
      console.log('✅ Odpowiedź:', response);
      return response;
    } catch (error) {
      console.error('❌ Błąd podczas zapisywania ustawień:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Błąd podczas zapisywania ustawień' 
      };
    }
  }
};