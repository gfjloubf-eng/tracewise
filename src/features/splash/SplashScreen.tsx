/** شاشة البداية — الشعار + تحميل أنيق */
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { getTheme } from '../../core/theme';
import { Logo } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';

export function SplashScreen({ dark, onDone }: { dark: boolean; onDone: () => void }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();

  useEffect(() => {
    const id = setTimeout(onDone, 1600);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg, alignItems: 'center', justifyContent: 'center', gap: t.spacing(4) }}>
      <Logo size={88} dark={dark} />
      <Text style={{ color: t.colors.text, fontSize: 32, fontWeight: '800', letterSpacing: 4 }}>TRACEWISE</Text>
      <Text style={{ color: t.colors.accent, fontSize: t.font.body, fontWeight: '600' }}>{tr('app.nameAr')} — {tr('app.subtitle')}</Text>
      <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>«{tr('app.tagline')}»</Text>
      <View style={{ height: t.spacing(4) }} />
      <ActivityIndicator color={t.colors.primary} />
      <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{tr('splash.loading')}</Text>
    </View>
  );
}
