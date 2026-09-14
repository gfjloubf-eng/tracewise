/**
 * مزود الترجمة + RTL الحقيقي.
 * العربية: RTL كامل (اتجاه، محاذاة، أيقونات). الإنجليزية: LTR.
 */
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { I18nManager, Platform } from 'react-native';
import { Lang } from '../../domain/types';
import { dictionaries } from './translations';

interface I18nValue {
  lang: Lang;
  rtl: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  pick: <T>(value: { ar: T; en: T }) => T;
}

const Ctx = createContext<I18nValue | null>(null);

export function useI18n(): I18nValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n خارج المزود');
  return v;
}

/** تطبيق اتجاه الواجهة على المنصة */
export function applyDirection(lang: Lang): void {
  const rtl = lang === 'ar';
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  } else {
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
    }
  }
}

export function I18nProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  const rtl = lang === 'ar';

  useEffect(() => {
    applyDirection(lang);
  }, [lang]);

  const value = useMemo<I18nValue>(() => {
    const dict = dictionaries[lang] ?? dictionaries.ar;
    const fallback = dictionaries.ar;
    const t = (key: string, vars?: Record<string, string | number>) => {
      let s = dict[key] ?? fallback[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return s;
    };
    const pick = <T,>(value: { ar: T; en: T }): T => (lang === 'ar' ? value.ar : value.en);
    return { lang, rtl, t, pick };
  }, [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
