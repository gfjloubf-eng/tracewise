/** حول التطبيق */
import React from 'react';
import { Text, View } from 'react-native';
import { getTheme } from '../../core/theme';
import { Card, Logo } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';

export function AboutScreen({ dark }: { dark: boolean }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  return (
    <View style={{ gap: t.spacing(4), padding: t.spacing(4), alignItems: 'center' }}>
      <View style={{ height: t.spacing(6) }} />
      <Logo size={84} dark={dark} />
      <Text style={{ color: t.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: 3 }}>TRACEWISE</Text>
      <Text style={{ color: t.colors.accent, fontSize: t.font.body, fontWeight: '600' }}>
        {tr('app.nameAr')} — {tr('app.subtitle')}
      </Text>
      <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>«{tr('app.tagline')}»</Text>
      <Card dark={dark} style={{ alignSelf: 'stretch' }}>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 21 }}>{tr('about.body')}</Text>
      </Card>
      <Card dark={dark} style={{ alignSelf: 'stretch', backgroundColor: t.colors.accentDim, borderColor: t.colors.accentDim }}>
        <Text style={{ color: t.colors.accent, fontSize: t.font.small, fontWeight: '700', lineHeight: 20 }}>
          {tr('about.philosophy')}
        </Text>
      </Card>
      <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>v0.1.0</Text>
    </View>
  );
}
