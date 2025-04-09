import { api } from './api';

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  pesel?: string;
  employee_tag?: {
    id: number;
    serial: string;
  };
  current_project?: number;
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
      // Opcja 1: Wykorzystaj dedykowany endpoint, jeśli istnieje
      const employee = await api.get<Employee>(`/api/employees/by-tag/${tagId}/`);
      return employee;
    } catch (error) {
      try {
        // Opcja 2: Sprawdź wśród wszystkich pracowników
        const allEmployees = await employeeService.getAllEmployees();
        const employee = allEmployees.find(
          emp => emp.employee_tag && emp.employee_tag.serial === tagId
        );
        return employee || null;
      } catch (innerError) {
        console.error('Błąd podczas wyszukiwania pracownika po tagu NFC:', innerError);
        return null;
      }
    }
  }
};