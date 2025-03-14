// styles/colors.ts
export interface ColorPalette {
    light: string;
    dark: string;
  }
  
  export interface ColorScheme {
    primary: ColorPalette;
    secondary: ColorPalette;
    background: ColorPalette;
    surface: ColorPalette;
    text: ColorPalette;
    textSecondary: ColorPalette;
    border: ColorPalette;
    error: ColorPalette;
    success: ColorPalette;
    warning: ColorPalette;
    info: ColorPalette;
  }
  
  export const colors: ColorScheme = {
    primary: {
      light: '#FF9B50', // Główny pomarańczowy
      dark: '#FF8C38',
    },
    secondary: {
      light: '#FFBB5C', // Jaśniejszy pomarańczowy
      dark: '#FFA94D',
    },
    background: {
      light: '#FFFFFF',
      dark: '#121212',
    },
    surface: {
      light: '#F5F5F5',
      dark: '#1E1E1E',
    },
    text: {
      light: '#212121',
      dark: '#E1E1E1',
    },
    textSecondary: {
      light: '#757575', 
      dark: '#ABABAB',
    },
    border: {
      light: '#E0E0E0',
      dark: '#2C2C2C',
    },
    error: {
      light: '#B00020',
      dark: '#CF6679',
    },
    success: {
      light: '#4CAF50',
      dark: '#66BB6A',
    },
    warning: {
      light: '#FFC107',
      dark: '#FFCA28',
    },
    info: {
      light: '#2196F3',
      dark: '#42A5F5',
    },
  };
  
  
  
 