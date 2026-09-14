/** تبويب التحليل — السبب المحتمل + الثقة + الأدلة الداعمة */
import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Btn, Card, ConfidenceBar, EmptyState, SectionTitle, SeverityBadge } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { DebugCase } from '../../domain/types';

export function AnalysisTab({
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
  const d = c.diagnosis;

  if (!d) {
    return (
      <View style={{ gap: t.spacing(3) }}>
        <Card dark={dark}>
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 20 }}>{tr('analysis.localFirst')}</Text>
        </Card>
        <EmptyState dark={dark} icon="analytics-outline" title={tr('analysis.empty')} />
        <Btn dark={dark} icon="play-outline" label={tr('analysis.run')} onPress={onAnalyze} loading={analyzing} />
      </View>
    );
  }

  const evidenceTitle = (id: string) => c.evidence.find((e) => e.id === id)?.title ?? id;

  return (
    <View style={{ gap: t.spacing(3) }}>
      <Card dark={dark} style={{ backgroundColor: t.colors.primaryDim, borderColor: t.colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="locate-outline" size={18} color={t.colors.text} />
          <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.body, fontWeight: '800' }}>
            {tr('analysis.rootCause')}
          </Text>
        </View>
        <Text style={{ color: t.colors.text, fontSize: t.font.body, lineHeight: 22 }}>
          {pick({ ar: d.rootCauseAr ?? '—', en: d.rootCauseEn ?? '—' })}
        </Text>
        <ConfidenceBar value={d.confidence} dark={dark} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SeverityBadge severity={d.severity} dark={dark} />
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny }}>
            {d.engine === 'ai' ? tr('analysis.engineAi') : tr('analysis.engineLocal')}
          </Text>
        </View>
      </Card>

      <SectionTitle dark={dark} text={tr('analysis.hypotheses')} icon="git-branch-outline" />
      {d.hypotheses.length === 0 && (
        <Card dark={dark}>
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>{tr('analysis.noMatch')}</Text>
        </Card>
      )}
      {d.hypotheses.map((h) => (
        <Card key={h.ruleId} dark={dark} style={{ gap: t.spacing(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons
              name={h.source === 'ai' ? 'sparkles-outline' : 'hardware-chip-outline'}
              size={15}
              color={h.source === 'ai' ? t.colors.warning : t.colors.accent}
            />
            <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '700' }}>
              {pick({ ar: h.titleAr, en: h.titleEn })}
            </Text>
          </View>
          <ConfidenceBar value={h.confidence} dark={dark} />
          {h.supportingEvidenceIds.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny, fontWeight: '700' }}>
                {tr('analysis.supportingEvidence')}:
              </Text>
              {h.supportingEvidenceIds.map((id) => (
                <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="document-text-outline" size={12} color={t.colors.textFaint} />
                  <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{evidenceTitle(id)}</Text>
                </View>
              ))}
            </View>
          )}
          {pick({ ar: h.suggestedChecksAr, en: h.suggestedChecksEn }).length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny, fontWeight: '700' }}>
                {tr('analysis.suggestedChecks')}:
              </Text>
              {pick({ ar: h.suggestedChecksAr, en: h.suggestedChecksEn }).map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Ionicons name="checkbox-outline" size={12} color={t.colors.accent} style={{ marginTop: 3 }} />
                  <Text style={{ flex: 1, color: t.colors.textMuted, fontSize: t.font.tiny, lineHeight: 16 }}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      ))}

      <Btn
        dark={dark}
        variant="secondary"
        icon="refresh-outline"
        label={tr('analysis.rerun')}
        onPress={onAnalyze}
        loading={analyzing}
      />
    </View>
  );
}
