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
  const { timeout = 20000, ...fetchOptions } = options;
  
  console.log(`📡 Wysyłanie żądania do: ${resource}`);
  if (fetchOptions.headers) {
    console.log('📦 Nagłówki żądania:', JSON.stringify(fetchOptions.headers, null, 2));
  }
  
  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort();
    console.log('⏱️ Przekroczono limit czasu żądania!');
  }, timeout);
  
  try {
    console.log('⏳ Oczekiwanie na odpowiedź...');
    
    // Zawsze dodaj credentials: 'include' dla obsługi ciasteczek
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: 'include', // Ważne dla ciasteczek CSRF
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

// Przechowujemy token CSRF w pamięci aplikacji jako fallback
let inMemoryCsrfToken: string | null = null;

async function getCsrfToken(): Promise<string | null> {
  try {
    // Pobierz token CSRF z odpowiedniego endpointu Django
    const response = await fetchWithTimeout(`${API_URL}/api/csrf/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Referer': API_URL, // Dodany nagłówek Referer
        'X-Requested-With': 'XMLHttpRequest', // Dodany nagłówek X-Requested-With
        'Accept': 'application/json' // Żądamy odpowiedzi JSON
      }
    });
    
    // Bezpieczna obsługa cookies na różnych platformach
    let csrfToken: string | null = null;
    
    // 1. Próba wyciągnięcia z odpowiedzi JSON
    try {
      const data = await response.json();
      if (data && data.csrfToken) {
        console.log('Znaleziono token CSRF w odpowiedzi JSON:', data.csrfToken.substring(0, 10) + '...');
        csrfToken = data.csrfToken;
        inMemoryCsrfToken = csrfToken; // Zapisz do pamięci
        return csrfToken;
      }
    } catch (e) {
      console.log('Odpowiedź nie jest poprawnym JSON, próbuję inne metody');
    }
    
    // 2. Próba wyciągnięcia tokenu z nagłówków odpowiedzi
    const headerToken = response.headers.get('X-CSRFToken');
    if (headerToken) {
      console.log('Znaleziono token CSRF w nagłówkach:', headerToken.substring(0, 10) + '...');
      csrfToken = headerToken;
      inMemoryCsrfToken = csrfToken; // Zapisz do pamięci
      return csrfToken;
    }
    
    // 3. Próba z ciasteczek na platformach, które je obsługują
    if (typeof document !== 'undefined' && document.cookie) {
      const cookies = document.cookie.split(';');
      const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrftoken='));
      
      if (csrfCookie) {
        csrfToken = csrfCookie.split('=')[1];
        console.log('Znaleziono token CSRF w ciasteczkach:', csrfToken.substring(0, 10) + '...');
        inMemoryCsrfToken = csrfToken; // Zapisz do pamięci
        return csrfToken;
      }
    }
    
    // 4. Użyj zapamiętanego tokenu jako fallback
    if (inMemoryCsrfToken) {
      console.log('Używam zapamiętanego tokenu CSRF:', inMemoryCsrfToken.substring(0, 10) + '...');
      return inMemoryCsrfToken;
    }
    
    console.warn('Nie udało się znaleźć tokenu CSRF.');
    return null;
  } catch (error) {
    console.error('❌ Błąd podczas pobierania tokenu CSRF:', error);
    // W przypadku błędu, spróbuj użyć zapamiętanego tokenu
    if (inMemoryCsrfToken) {
      console.log('Używam zapamiętanego tokenu CSRF po błędzie:', inMemoryCsrfToken.substring(0, 10) + '...');
      return inMemoryCsrfToken;
    }
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
      if (!csrfToken) {
        console.warn('⚠️ Brak tokenu CSRF przy żądaniu POST!');
      } else {
        console.log('🔐 Używam tokenu CSRF:', csrfToken.substring(0, 10) + '...');
      }
      
      // Bezpieczne tworzenie nagłówków
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Referer': API_URL, // Dodany nagłówek Referer
        'X-Requested-With': 'XMLHttpRequest', // Dodany nagłówek X-Requested-With
        ...(options.headers || {})
      };
      
      // Dodaj token CSRF do nagłówków jeśli jest dostępny
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      // Dodaj nagłówek własny dla identyfikacji klienta
      headers['X-Client-ID'] = 'react-native-app';
      
      console.log('🔐 Nagłówki:', headers);
      
      // Przygotuj ciało requestu - musi być string dla fetch
      let body: string;
      if (typeof requestData === 'object' && requestData !== null) {
        body = JSON.stringify(requestData);
      } else if (typeof requestData === 'string') {
        body = requestData;
      } else {
        body = JSON.stringify({});
      }
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body,
        credentials: 'include', // Ważne dla ciasteczek CSRF
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
        // Jeśli błąd dotyczy CSRF, pobierz nowy token i spróbuj ponownie
        if (responseData && responseData.detail && responseData.detail.includes('CSRF')) {
          console.log('🔄 Próba odświeżenia tokenu CSRF i ponownego wysłania żądania');
          // Wymuś pobieranie nowego tokenu ignorując cache
          inMemoryCsrfToken = null;
          const newCsrfToken = await getCsrfToken();
          
          if (newCsrfToken) {
            console.log('🔄 Otrzymano nowy token CSRF, ponawiam żądanie');
            headers['X-CSRFToken'] = newCsrfToken;
            
            // Ponów żądanie z nowym tokenem
            const retryResponse = await fetchWithTimeout(`${API_URL}${endpoint}`, {
              method: 'POST',
              headers,
              body,
              credentials: 'include',
              ...options,
            });
            
            if (retryResponse.ok) {
              // Parsuj odpowiedź z ponowionego żądania
              const retryText = await retryResponse.text();
              try {
                const retryData = retryText ? JSON.parse(retryText) : { success: true };
                console.log('✅ Ponowne żądanie powiodło się:', retryData);
                return retryData as T;
              } catch (e) {
                return { success: true } as unknown as T;
              }
            }
          }
        }
        
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
        'Referer': API_URL, // Dodany nagłówek Referer
        'X-Requested-With': 'XMLHttpRequest', // Dodany nagłówek X-Requested-With
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
        credentials: 'include', // Ważne dla ciasteczek CSRF
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
      if (!csrfToken) {
        console.warn('⚠️ Brak tokenu CSRF przy żądaniu DELETE!');
      } else {
        console.log('🔐 Używam tokenu CSRF:', csrfToken.substring(0, 10) + '...');
      }
      
      // Bezpieczne tworzenie nagłówków
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Referer': API_URL, // Dodany nagłówek Referer
        'X-Requested-With': 'XMLHttpRequest', // Dodany nagłówek X-Requested-With
        'X-Client-ID': 'react-native-app', // Identyfikacja klienta
        ...(options.headers || {})
      };
      
      // Dodaj token CSRF do nagłówków jeśli jest dostępny
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      console.log('🔐 Nagłówki DELETE:', headers);
      
      const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers,
        credentials: 'include', // Ważne dla ciasteczek CSRF
        ...options,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Błąd HTTP (${response.status}):`, errorText);
        
        // Próba przetworzenia błędu
        try {
          const errorData = JSON.parse(errorText);
          
          // Jeśli błąd dotyczy CSRF, pobierz nowy token i spróbuj ponownie
          if (errorData && errorData.detail && errorData.detail.includes('CSRF')) {
            console.log('🔄 Próba odświeżenia tokenu CSRF i ponownego wysłania żądania DELETE');
            // Wymuś pobieranie nowego tokenu ignorując cache
            inMemoryCsrfToken = null;
            const newCsrfToken = await getCsrfToken();
            
            if (newCsrfToken) {
              console.log('🔄 Otrzymano nowy token CSRF, ponawiam żądanie DELETE');
              headers['X-CSRFToken'] = newCsrfToken;
              
              // Ponów żądanie z nowym tokenem
              const retryResponse = await fetchWithTimeout(`${API_URL}${endpoint}`, {
                method: 'DELETE',
                headers,
                credentials: 'include',
                ...options,
              });
              
              if (retryResponse.ok) {
                // Obsługa odpowiedzi z ponowionego żądania
                try {
                  const retryText = await retryResponse.text();
                  const retryData = retryText ? JSON.parse(retryText) : { success: true };
                  console.log('✅ Ponowne żądanie DELETE powiodło się:', retryData);
                  return retryData as T;
                } catch (e) {
                  return { success: true } as unknown as T;
                }
              }
            }
          }
          
          throw new Error(errorData.message || errorData.detail || `HTTP error! Status: ${response.status}`);
        } catch (e) {
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
        'Referer': API_URL, // Dodany nagłówek Referer
        'X-Requested-With': 'XMLHttpRequest', // Dodany nagłówek X-Requested-With
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
        credentials: 'include', // Ważne dla ciasteczek CSRF
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