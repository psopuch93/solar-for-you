// styles/theme.ts
import { colors } from './colors';
  
export interface Spacing {
  xs: number;
  s: number;
  m: number;
  l: number;
  xl: number;
  xxl: number;
}

export interface BorderRadius {
  s: number;
  m: number;
  l: number;
  xl: number;
  round: number;
}

export interface FontFamily {
  regular: string;
  medium: string;
  bold: string;
}

export interface FontSize {
  xs: number;
  s: number;
  m: number;
  l: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

export interface Typography {
  fontFamily: FontFamily;
  fontSize: FontSize;
}

export interface ElevationStyle {
  shadowColor: string;
  shadowOffset: {
    width: number;
    height: number;
  };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface Elevation {
  small: ElevationStyle;
  medium: ElevationStyle;
  large: ElevationStyle;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: Spacing;
  borderRadius: BorderRadius;
  typography: Typography;
  elevation: Elevation;
}

export const getTheme = (isDarkMode = false): Theme => {
  const mode = isDarkMode ? 'dark' : 'light';
  
  return {
    colors: {
      primary: colors.primary[mode],
      secondary: colors.secondary[mode],
      background: colors.background[mode],
      surface: colors.surface[mode],
      text: colors.text[mode],
      textSecondary: colors.textSecondary[mode],
      border: colors.border[mode],
      error: colors.error[mode],
      success: colors.success[mode],
      warning: colors.warning[mode],
      info: colors.info[mode],
    },
    spacing: {
      xs: 4,
      s: 8,
      m: 16,
      l: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      s: 4,
      m: 8,
      l: 16,
      xl: 24,
      round: 9999,
    },
    typography: {
      fontFamily: {
        regular: 'System',
        medium: 'System',
        bold: 'System-Bold',
      },
      fontSize: {
        xs: 12,
        s: 14,
        m: 16,
        l: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
      },
    },
    elevation: {
      small: {
        shadowColor: isDarkMode ? '#000' : '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDarkMode ? 0.8 : 0.2,
        shadowRadius: 2,
        elevation: 2,
      },
      medium: {
        shadowColor: isDarkMode ? '#000' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.8 : 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      large: {
        shadowColor: isDarkMode ? '#000' : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDarkMode ? 0.8 : 0.3,
        shadowRadius: 4.65,
        elevation: 8,
      },
    },
  };
};