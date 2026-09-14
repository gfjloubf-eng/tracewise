/** تبويب الرحلة — رحلة التشخيص خطوة بخطوة */
import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Btn, Card, KeyValue, SeverityBadge, StateBadge } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { DebugCase } from '../../domain/types';

interface Step {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  done: boolean;
  current: boolean;
}

export function JourneyTab({
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

  const hasDiag = !!c.diagnosis;
  const hasRoot = !!c.diagnosis?.rootCauseAr;
  const hasFix = !!c.fixPlan;
  const hasVerify = c.verifications.some((v) => v.result === 'verified' || v.result === 'likely');

  const steps: Step[] = [
    { key: 'journey.problem', icon: 'bug-outline', done: true, current: false },
    { key: 'journey.evidence', icon: 'documents-outline', done: c.evidence.length > 0, current: c.evidence.length === 0 },
    { key: 'journey.hypotheses', icon: 'git-branch-outline', done: !!c.diagnosis && c.diagnosis.hypotheses.length > 0, current: !hasDiag },
    { key: 'journey.rootCause', icon: 'locate-outline', done: hasRoot, current: hasDiag && !hasRoot },
    { key: 'journey.fix', icon: 'construct-outline', done: hasFix, current: hasRoot && !hasFix },
    { key: 'journey.verify', icon: 'checkmark-done-outline', done: hasVerify, current: hasFix && !hasVerify },
  ];

  return (
    <View style={{ gap: t.spacing(3) }}>
      <Card dark={dark}>
        <View style={{ flexDirection: 'row', gap: t.spacing(2), flexWrap: 'wrap' }}>
          <StateBadge state={c.state} dark={dark} />
          <SeverityBadge severity={c.severity} dark={dark} />
          {c.isDemo && (
            <View style={{ backgroundColor: t.colors.warningDim, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: t.colors.warning, fontSize: t.font.tiny, fontWeight: '700' }}>{tr('case.demoBadge')}</Text>
            </View>
          )}
        </View>
        <Text style={{ color: t.colors.text, fontSize: t.font.body, lineHeight: 23, writingDirection: 'auto' }}>{c.description}</Text>
        <View style={{ flexDirection: 'row', gap: t.spacing(4), flexWrap: 'wrap' }}>
          {c.language && <KeyValue dark={dark} k={tr('new.language')} v={c.language} />}
          {c.framework && <KeyValue dark={dark} k={tr('new.framework')} v={c.framework} />}
          {c.platform && <KeyValue dark={dark} k={tr('new.platform')} v={c.platform} />}
        </View>
      </Card>

      <Card dark={dark}>
        <Text style={{ color: t.colors.text, fontSize: t.font.body, fontWeight: '700' }}>{tr('journey.title')}</Text>
        {steps.map((s, i) => {
          const color = s.done ? t.colors.success : s.current ? t.colors.warning : t.colors.textFaint;
          const icon = s.done ? 'checkmark-circle' : s.current ? 'radio-button-on' : 'ellipse-outline';
          return (
            <View key={s.key}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(3), paddingVertical: 8 }}>
                <Ionicons name={icon} size={22} color={color} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: s.done || s.current ? t.colors.text : t.colors.textFaint, fontSize: t.font.body, fontWeight: '600' }}>
                    {tr(s.key)}
                  </Text>
                  <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
                    {s.done ? tr('journey.done') : s.current ? tr('journey.current') : tr('journey.pending')}
                  </Text>
                </View>
                <Ionicons name={s.icon} size={18} color={color} />
              </View>
              {i < steps.length - 1 && (
                <View style={{ width: 2, height: 10, backgroundColor: t.colors.cardBorder, marginStart: 10 }} />
              )}
            </View>
          );
        })}
      </Card>

      {!hasDiag && (
        <Btn
          dark={dark}
          icon="analytics-outline"
          label={analyzing ? tr('common.analyzing') : tr('journey.analyzeNow')}
          onPress={onAnalyze}
          loading={analyzing}
        />
      )}

      {c.errorMessage && (
        <Card dark={dark}>
          <KeyValue dark={dark} k={tr('new.errorMessage')} v={c.errorMessage} mono />
        </Card>
      )}
      {c.stackTrace && (
        <Card dark={dark}>
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, fontWeight: '600', marginBottom: 4 }}>
            {tr('new.stackTrace')}
          </Text>
          <Text selectable style={{ color: t.colors.text, fontFamily: 'monospace', fontSize: t.font.small, writingDirection: 'ltr', textAlign: 'left' }}>
            {c.stackTrace}
          </Text>
        </Card>
      )}
      {(c.recentChange || c.triedFixes || c.environment) && (
        <Card dark={dark}>
          {c.environment && <KeyValue dark={dark} k={tr('new.environment')} v={c.environment} />}
          {c.recentChange && <KeyValue dark={dark} k={tr('new.recentChange')} v={c.recentChange} />}
          {c.triedFixes && <KeyValue dark={dark} k={tr('new.triedFixes')} v={c.triedFixes} />}
        </Card>
      )}
      {c.fingerprint && (
        <Card dark={dark}>
          <KeyValue dark={dark} k={tr('memory.fingerprint')} v={`${c.fingerprint.errorKind} · ${c.fingerprint.hash}`} mono />
          {c.fixPlan && <KeyValue dark={dark} k={tr('fix.title')} v={pick({ ar: c.fixPlan.changeAr, en: c.fixPlan.changeEn })} />}
        </Card>
      )}
    </View>
  );
}
