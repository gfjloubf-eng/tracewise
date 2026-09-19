/** بطاقة حالة — تُستخدم في الرئيسية والسجل والذاكرة */
import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { DebugCase } from '../../domain/types';
import { Card, SeverityBadge, StateBadge } from './index';
import { useI18n } from '../../core/i18n/I18nProvider';

export function CaseCard({
  c,
  dark,
  onPress,
}: {
  c: DebugCase;
  dark: boolean;
  onPress: () => void;
}) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const date = new Date(c.updatedAt);
  const when = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

  return (
    <Card dark={dark} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(2) }}>
        <Text numberOfLines={1} style={{ flex: 1, color: t.colors.text, fontSize: t.font.body, fontWeight: '700' }}>
          {c.title}
        </Text>
        {c.isDemo && (
          <View style={{ backgroundColor: t.colors.warningDim, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: t.colors.warning, fontSize: t.font.tiny, fontWeight: '700' }}>{tr('common.demo')}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={{ color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 19 }}>
        {c.description}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(2), flexWrap: 'wrap' }}>
        <StateBadge state={c.state} dark={dark} />
        <SeverityBadge severity={c.severity} dark={dark} />
        {c.language ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="code-slash-outline" size={12} color={t.colors.textFaint} />
            <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{c.language}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="time-outline" size={12} color={t.colors.textFaint} />
          <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{when}</Text>
        </View>
        {c.diagnosis?.fingerprint ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="finger-print-outline" size={12} color={t.colors.accent} />
            <Text style={{ color: t.colors.accent, fontSize: t.font.tiny }}>{c.diagnosis.fingerprint.errorKind}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
