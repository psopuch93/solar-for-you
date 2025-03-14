// services/api.ts
// Podstawowa konfiguracja do komunikacji z API

const API_URL = 'https://foryougroup.eu.pythonanywhere.com'; // URL do backendu Flask

interface FetchOptions extends RequestInit {
  timeout?: number;
}

export const fetchWithTimeout = async (resource: string, options: FetchOptions = {}): Promise<Response> => {
  const { timeout = 8000, ...fetchOptions } = options;
  
  console.log(`📡 Wysyłanie żądania do: ${resource}`);
  console.log('📦 Opcje żądania:', JSON.stringify(fetchOptions, null, 2));
  
  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort();
    console.log('⏱️ Przekroczono limit czasu żądania!');
  }, timeout);
  
  try {
    console.log('⏳ Oczekiwanie na odpowiedź...');
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: 'include', // Włącza obsługę ciasteczek sesji
    });
    
    clearTimeout(id);
    
    console.log(`✅ Otrzymano odpowiedź ze statusem: ${response.status}`);
    return response;
  } catch (error) {
    clearTimeout(id);
    console.error('❌ Błąd fetch:', error);
    throw error;
  }
};

export const api = {
  get: async <T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
    try {
      console.log(`🔍 GET żądanie do: ${endpoint}`);
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Błąd HTTP (${response.status}):`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }
      }
      
      const responseData = await response.json();
      console.log('📄 Otrzymane dane:', responseData);
      return responseData;
    } catch (error) {
      console.error('❌ API GET Error:', error);
      throw error;
    }
  },
  
  post: async <T = any>(endpoint: string, requestData: any = {}, options: FetchOptions = {}): Promise<T> => {
    try {
      console.log(`📤 POST żądanie do: ${endpoint}`);
      console.log('📦 Dane żądania:', requestData);
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(requestData),
        ...options,
      });
      
      const responseText = await response.text();
      console.log(`📥 Odpowiedź (surowa): ${responseText}`);
      
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
        console.log('📄 Odpowiedź (JSON):', responseData);
      } catch (e) {
        console.warn('⚠️ Odpowiedź nie jest poprawnym JSON:', responseText);
        responseData = { success: false, message: responseText };
      }
      
      if (!response.ok) {
        console.error(`❌ Błąd HTTP (${response.status}):`, responseData);
        throw new Error(responseData.message || `HTTP error! Status: ${response.status}`);
      }
      
      return responseData;
    } catch (error) {
      console.error('❌ API POST Error:', error);
      throw error;
    }
  },
  
  put: async <T = any>(endpoint: string, requestData: any = {}, options: FetchOptions = {}): Promise<T> => {
    try {
      console.log(`📝 PUT żądanie do: ${endpoint}`);
      console.log('📦 Dane żądania:', requestData);
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(requestData),
        ...options,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Błąd HTTP (${response.status}):`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }
      }
      
      const responseData = await response.json();
      console.log('📄 Otrzymane dane:', responseData);
      return responseData;
    } catch (error) {
      console.error('❌ API PUT Error:', error);
      throw error;
    }
  },
  
  delete: async <T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
    try {
      console.log(`🗑️ DELETE żądanie do: ${endpoint}`);
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Błąd HTTP (${response.status}):`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }
      }
      
      const responseData = await response.json();
      console.log('📄 Otrzymane dane:', responseData);
      return responseData;
    } catch (error) {
      console.error('❌ API DELETE Error:', error);
      throw error;
    }
  },
};