import { api } from './api';

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  pesel?: string;
  employee_tag?: number | {
    id: number;
    serial: string;
  };
  current_project?: number;
  tag_serial?: string; // Dodane pole dla zgodności z API Django
}

export const employeeService = {
  // Pobranie wszystkich pracowników
  getAllEmployees: async (): Promise<Employee[]> => {
    try {
      const employees = await api.get<Employee[]>('/api/employees/');
      return employees;
    } catch (error) {
      console.error('Błąd podczas pobierania pracowników:', error);
      return [];
    }
  },

  // Znalezienie pracownika po ID tagu NFC
  findEmployeeByNfcTag: async (tagId: string): Promise<Employee | null> => {
    try {
      console.log('Szukanie pracownika dla tagu NFC:', tagId);
      
      // Opcja 1: Najpierw spróbuj użyć dedykowanego endpointu, jeśli istnieje
      try {
        const response = await api.get<Employee>(`/api/employees/by-tag/${tagId}/`);
        if (response && response.id) {
          console.log('Znaleziono pracownika przez dedykowany endpoint:', response);
          return response;
        }
      } catch (error) {
        console.log('Brak dedykowanego endpointu lub inny błąd:', error);
        // Kontynuuj do następnego podejścia
      }
      
      // Opcja 2: Pobierz wszystkich pracowników i wyszukaj lokalnie
      const allEmployees = await employeeService.getAllEmployees();
      
      // W API Django struktura danych może być różna
      const employee = allEmployees.find(emp => {
        // Sprawdź różne możliwe struktury dla employee_tag
        if (typeof emp.employee_tag === 'object' && emp.employee_tag && emp.employee_tag.serial === tagId) {
          return true;
        }
        
        // Sprawdź pole tag_serial, które może być używane w Django API
        if (emp.tag_serial === tagId) {
          return true;
        }
        
        return false;
      });
      
      console.log('Wynik wyszukiwania po tagu NFC:', employee || 'Nie znaleziono');
      return employee || null;
    } catch (error) {
      console.error('Błąd podczas wyszukiwania pracownika po tagu NFC:', error);
      return null;
    }
  }
};