// services/api.ts - wersja dla Django z poprawkami typów
// Podstawowa konfiguracja do komunikacji z API Django

const API_URL = 'https://www.solarforyou.cloud'; // URL do backendu Django

// Poprawione typy dla opcji zapytań
interface FetchOptions extends Omit<RequestInit, 'headers'> {
  timeout?: number;
  headers?: Record<string, string>;
}

// Typ dla odpowiedzi przekierowania
interface RedirectResponse {
  success: boolean;
  redirect?: string;
}

// Funkcja do pobierania z timeoutem
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
      credentials: 'include', // Włącza obsługę ciasteczek sesji dla Django
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

// Bezpieczna funkcja do pobierania tokenu CSRF
async function getCsrfToken(): Promise<string | null> {
  try {
    // Pobierz token CSRF z odpowiedniego endpointu Django
    const response = await fetchWithTimeout(`${API_URL}/api/csrf/`, {
      method: 'GET',
      credentials: 'include',
    });
    
    // Bezpieczna obsługa cookies na różnych platformach
    let csrfToken: string | null = null;
    
    if (typeof document !== 'undefined' && document.cookie) {
      // Pobierz ciasteczko CSRF
      const cookies = document.cookie.split(';');
      const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrftoken='));
      
      if (csrfCookie) {
        csrfToken = csrfCookie.split('=')[1];
      }
    }
    
    return csrfToken;
  } catch (error) {
    console.error('❌ Błąd podczas pobierania tokenu CSRF:', error);
    return null;
  }
}

export const api = {
  get: async <T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
    try {
      console.log(`🔍 GET żądanie do: ${endpoint}`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers,
        ...options,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Błąd HTTP (${response.status}):`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || errorData.detail || `HTTP error! Status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }
      }
      
      const responseData = await response.json();
      console.log('📄 Otrzymane dane:', responseData);
      return responseData as T;
    } catch (error) {
      console.error('❌ API GET Error:', error);
      throw error;
    }
  },
  
  post: async <T = any>(endpoint: string, requestData: any = {}, options: FetchOptions = {}): Promise<T> => {
    try {
      console.log(`📤 POST żądanie do: ${endpoint}`);
      console.log('📦 Dane żądania:', requestData);
      
      // Dla Django potrzebujemy tokenu CSRF dla nie-GET żądań
      const csrfToken = await getCsrfToken();
      
      // Bezpieczne tworzenie nagłówków
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      
      // Dodaj token CSRF do nagłówków jeśli jest dostępny
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
        ...options,
      });
      
      // Dla zapytań logowania i wylogowania Django może zwracać kod 302 (przekierowanie)
      if (response.status === 302) {
        const redirectUrl = response.headers.get('Location');
        return { success: true, redirect: redirectUrl } as unknown as T;
      }
      
      // Bezpieczne parsowanie odpowiedzi
      let responseData: any;
      try {
        const responseText = await response.text();
        console.log(`📥 Odpowiedź (surowa): ${responseText}`);
        
        // Próba sparsowania JSON
        if (responseText) {
          responseData = JSON.parse(responseText);
        } else {
          responseData = { success: true };
        }
        console.log('📄 Odpowiedź (JSON):', responseData);
      } catch (e) {
        // Jeśli to nie JSON, utwórz standardową odpowiedź
        console.warn('⚠️ Odpowiedź nie jest poprawnym JSON');
        responseData = { 
          success: response.ok, 
          message: response.ok ? 'Operacja wykonana pomyślnie' : 'Wystąpił błąd'
        };
      }
      
      if (!response.ok) {
        console.error(`❌ Błąd HTTP (${response.status}):`, responseData);
        throw new Error(responseData.message || responseData.detail || `HTTP error! Status: ${response.status}`);
      }
      
      return responseData as T;
    } catch (error) {
      console.error('❌ API POST Error:', error);
      throw error;
    }
  },
  
  put: async <T = any>(endpoint: string, requestData: any = {}, options: FetchOptions = {}): Promise<T> => {
    try {
      console.log(`📝 PUT żądanie do: ${endpoint}`);
      console.log('📦 Dane żądania:', requestData);
      
      // Dla Django potrzebujemy tokenu CSRF dla nie-GET żądań
      const csrfToken = await getCsrfToken();
      
      // Bezpieczne tworzenie nagłówków
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      
      // Dodaj token CSRF do nagłówków jeśli jest dostępny
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(requestData),
        ...options,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Błąd HTTP (${response.status}):`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || errorData.detail || `HTTP error! Status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }
      }
      
      const responseData = await response.json();
      console.log('📄 Otrzymane dane:', responseData);
      return responseData as T;
    } catch (error) {
      console.error('❌ API PUT Error:', error);
      throw error;
    }
  },
  
  delete: async <T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
    try {
      console.log(`🗑️ DELETE żądanie do: ${endpoint}`);
      
      // Dla Django potrzebujemy tokenu CSRF dla nie-GET żądań
      const csrfToken = await getCsrfToken();
      
      // Bezpieczne tworzenie nagłówków
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      
      // Dodaj token CSRF do nagłówków jeśli jest dostępny
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers,
        ...options,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Błąd HTTP (${response.status}):`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || errorData.detail || `HTTP error! Status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }
      }
      
      // Bezpieczna obsługa odpowiedzi, która może być pusta dla DELETE
      let responseData: any = { success: true };
      try {
        const responseText = await response.text();
        if (responseText) {
          responseData = JSON.parse(responseText);
        }
      } catch (e) {
        // Ignorujemy błędy parsowania, zachowujemy domyślną odpowiedź "success: true"
      }
      
      console.log('📄 Otrzymane dane:', responseData);
      return responseData as T;
    } catch (error) {
      console.error('❌ API DELETE Error:', error);
      throw error;
    }
  },
  
  // Metoda do wysyłania formularzy z plikami (multipart/form-data)
  upload: async <T = any>(endpoint: string, formData: FormData, options: FetchOptions = {}): Promise<T> => {
    try {
      console.log(`📤 UPLOAD żądanie do: ${endpoint}`);
      
      // Dla Django potrzebujemy tokenu CSRF dla nie-GET żądań
      const csrfToken = await getCsrfToken();
      
      // Nagłówki dla multipart/form-data - nie ustawiamy Content-Type
      // Będzie automatycznie ustawiony przez fetch z boundary
      const headers: Record<string, string> = {
        ...(options.headers || {})
      };
      
      // Dodaj token CSRF do nagłówków jeśli jest dostępny
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
        ...options,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Błąd HTTP (${response.status}):`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || errorData.detail || `HTTP error! Status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }
      }
      
      // Obsługa różnych typów odpowiedzi
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const responseData = await response.json();
        console.log('📄 Otrzymane dane JSON:', responseData);
        return responseData as T;
      } else {
        const responseText = await response.text();
        console.log('📄 Otrzymane dane tekstowe:', responseText);
        return { success: true, message: responseText } as unknown as T;
      }
    } catch (error) {
      console.error('❌ API UPLOAD Error:', error);
      throw error;
    }
  }
};