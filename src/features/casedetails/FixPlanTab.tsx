/** تبويب خطة الإصلاح — المشكلة/السبب/التغيير/لماذا/المخاطرة/التأثيرات */
import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Btn, Card, EmptyState, KeyValue, SectionTitle } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { DebugCase, RiskLevel } from '../../domain/types';
import { useStore } from '../../state/AppStore';

export function FixPlanTab({
  c,
  dark,
  onAnalyze,
  analyzing,
}: {
  c: DebugCase;
  dark: boolean;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  const t = getTheme(dark);
  const { t: tr, pick } = useI18n();
  const { markFixApplied } = useStore();
  const p = c.fixPlan;

  if (!p) {
    return (
      <View style={{ gap: t.spacing(3) }}>
        <EmptyState dark={dark} icon="construct-outline" title={tr('fix.empty')} />
        <Btn dark={dark} icon="analytics-outline" label={tr('analysis.run')} onPress={onAnalyze} loading={analyzing} />
      </View>
    );
  }

  const riskColor: Record<RiskLevel, string> = {
    low: t.colors.success,
    medium: t.colors.warning,
    high: t.colors.danger,
  };

  return (
    <View style={{ gap: t.spacing(3) }}>
      <Card dark={dark}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.body, fontWeight: '800' }}>{tr('fix.title')}</Text>
          <View
            style={{
              backgroundColor: p.status === 'applied' ? t.colors.successDim : t.colors.chipBg,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                color: p.status === 'applied' ? t.colors.success : t.colors.textMuted,
                fontSize: t.font.tiny,
                fontWeight: '700',
              }}
            >
              {p.status === 'applied' ? tr('fix.applied').split('—')[0].trim() : tr('fix.proposed')}
            </Text>
          </View>
        </View>
        <KeyValue dark={dark} k={tr('fix.problem')} v={pick({ ar: p.problemAr, en: p.problemEn })} />
        <KeyValue dark={dark} k={tr('fix.cause')} v={pick({ ar: p.causeAr, en: p.causeEn })} />
        <KeyValue dark={dark} k={tr('fix.change')} v={pick({ ar: p.changeAr, en: p.changeEn })} />
        <KeyValue dark={dark} k={tr('fix.why')} v={pick({ ar: p.whyAr, en: p.whyEn })} />
      </Card>

      <Card dark={dark}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="warning-outline" size={16} color={riskColor[p.risk]} />
          <Text style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '700' }}>{tr('fix.risk')}: </Text>
          <Text style={{ color: riskColor[p.risk], fontSize: t.font.small, fontWeight: '800' }}>
            {tr(`fix.risk.${p.risk}`)}
          </Text>
        </View>
      </Card>

      <SectionTitle dark={dark} text={tr('fix.impacts')} icon="git-network-outline" />
      <Card dark={dark}>
        {pick({ ar: p.impactsAr, en: p.impactsEn }).map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={t.colors.warning} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 19 }}>{s}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle dark={dark} text={tr('fix.steps')} icon="list-outline" />
      <Card dark={dark}>
        {pick({ ar: p.stepsAr, en: p.stepsEn }).map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: t.colors.primaryDim,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              <Text style={{ color: t.colors.text, fontSize: t.font.tiny, fontWeight: '800' }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, lineHeight: 19 }}>{s}</Text>
          </View>
        ))}
      </Card>

      <Card dark={dark} style={{ backgroundColor: t.colors.accentDim, borderColor: t.colors.accentDim }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Ionicons name="checkmark-done-outline" size={16} color={t.colors.accent} />
          <Text style={{ flex: 1, color: t.colors.accent, fontSize: t.font.small, lineHeight: 19 }}>
            {tr('verify.hint')}: {pick({ ar: p.verificationHintAr, en: p.verificationHintEn })}
          </Text>
        </View>
      </Card>

      {p.status === 'proposed' && (
        <Btn dark={dark} icon="checkmark-circle-outline" label={tr('fix.apply')} onPress={() => void markFixApplied(c.id)} />
      )}
    </View>
  );
}
