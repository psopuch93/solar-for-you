 // styles/fonts.ts
 export interface FontStyle {
    fontFamily: string;
    fontWeight: string;
  }
  
  export interface Fonts {
    regular: FontStyle;
    medium: FontStyle;
    bold: FontStyle;
  }
  
  export const fonts: Fonts = {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: 'bold',
    },
  };