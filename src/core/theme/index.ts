/**
 * نظام التصميم — هوية TRACEWISE التقنية.
 * كحلي داكن + أزرق تقني + تركواز هادئ + أبيض مائل للرمادي.
 */
export interface Theme {
  dark: boolean;
  colors: {
    bg: string;
    bgElevated: string;
    card: string;
    cardBorder: string;
    primary: string;
    primaryDim: string;
    accent: string;
    accentDim: string;
    text: string;
    textMuted: string;
    textFaint: string;
    success: string;
    successDim: string;
    warning: string;
    warningDim: string;
    danger: string;
    dangerDim: string;
    info: string;
    infoDim: string;
    overlay: string;
    inputBg: string;
    chipBg: string;
    chipBgActive: string;
  };
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number };
  font: {
    tiny: number;
    small: number;
    body: number;
    title: number;
    large: number;
  };
}

const spacing = (n: number) => n * 4;

const radius = { sm: 8, md: 12, lg: 16, xl: 24 };

const font = { tiny: 11, small: 13, body: 15, title: 18, large: 24 };

export const darkTheme: Theme = {
  dark: true,
  colors: {
    bg: '#0B1220', // كحلي داكن
    bgElevated: '#0F1A2E',
    card: '#131F35',
    cardBorder: '#1E2C4A',
    primary: '#3B82F6', // أزرق تقني
    primaryDim: '#1E3A6E',
    accent: '#2DD4BF', // تركواز هادئ
    accentDim: '#134E48',
    text: '#E6EAF2', // أبيض مائل للرمادي
    textMuted: '#93A0B8',
    textFaint: '#5C6B85',
    success: '#34D399',
    successDim: '#123F31',
    warning: '#FBBF24',
    warningDim: '#4A3512',
    danger: '#F87171',
    dangerDim: '#4A1F24',
    info: '#60A5FA',
    infoDim: '#1E3A6E',
    overlay: 'rgba(4, 8, 16, 0.72)',
    inputBg: '#0D1729',
    chipBg: '#182540',
    chipBgActive: '#1E3A6E',
  },
  spacing,
  radius,
  font,
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    bg: '#F2F5FA',
    bgElevated: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: '#DDE5F0',
    primary: '#2563EB',
    primaryDim: '#DBE7FE',
    accent: '#0D9488',
    accentDim: '#CCF2EE',
    text: '#101A2E',
    textMuted: '#51617C',
    textFaint: '#8A97AE',
    success: '#059669',
    successDim: '#D3F5E7',
    warning: '#B45309',
    warningDim: '#FDEBD0',
    danger: '#DC2626',
    dangerDim: '#FBDCDC',
    info: '#2563EB',
    infoDim: '#DBE7FE',
    overlay: 'rgba(16, 26, 46, 0.45)',
    inputBg: '#F4F7FC',
    chipBg: '#E8EEF8',
    chipBgActive: '#DBE7FE',
  },
  spacing,
  radius,
  font,
};

export function getTheme(dark: boolean): Theme {
  return dark ? darkTheme : lightTheme;
}
