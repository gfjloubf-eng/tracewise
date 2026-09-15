/** تبويب الرحلة — رحلة التشخيص + ما الذي تغير؟ + مشاكل مشابهة + الخط الزمني */
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { BottomModal, Btn, Card, Chip, Field, KeyValue, SectionTitle, SeverityBadge, StateBadge } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { buildTimeline, CHANGE_KIND_LABELS } from '../../domain/timeline';
import { findSimilarCases } from '../../domain/memory';
import { ChangeKind, DebugCase, TimelineEventType } from '../../domain/types';

const CHANGE_KINDS: ChangeKind[] = ['code', 'dependency', 'config', 'api', 'database', 'auth', 'platform', 'environment'];

const TIMELINE_ICONS: Record<TimelineEventType, keyof typeof Ionicons.glyphMap> = {
  created: 'bug-outline',
  evidence: 'document-text-outline',
  change: 'swap-horizontal-outline',
  diagnosis: 'analytics-outline',
  hypothesis: 'git-branch-outline',
  fix_proposed: 'construct-outline',
  fix_applied: 'hammer-outline',
  verification_evidence: 'flask-outline',
  verified: 'checkmark-done-outline',
  likely_resolved: 'help-circle-outline',
  reopened: 'refresh-outline',
  closed: 'lock-closed-outline',
};

export function JourneyTab({
  c,
  dark,
  onAnalyze,
  analyzing,
  onOpenCase,
}: {
  c: DebugCase;
  dark: boolean;
  onAnalyze: () => void;
  analyzing: boolean;
  onOpenCase?: (id: string) => void;
}) {
  const t = getTheme(dark);
  const { t: tr, pick } = useI18n();
  const { cases, addChange } = useStore();

  const [changeModal, setChangeModal] = useState(false);
  const [changeKind, setChangeKind] = useState<ChangeKind>('code');
  const [changeDesc, setChangeDesc] = useState('');

  const timeline = useMemo(() => buildTimeline(c), [c]);
  const similar = useMemo(() => findSimilarCases(c, cases).slice(0, 3), [c, cases]);

  const hasDiag = !!c.diagnosis;
  const hasRoot = !!c.diagnosis?.rootCauseAr;
  const hasFix = !!c.fixPlan;
  const hasVerify = c.verifications.some((v) => v.result === 'verified' || v.result === 'likely');

  const steps = [
    { key: 'journey.problem', icon: 'bug-outline' as const, done: true, current: false },
    { key: 'journey.evidence', icon: 'documents-outline' as const, done: c.evidence.length > 0, current: c.evidence.length === 0 },
    { key: 'journey.hypotheses', icon: 'git-branch-outline' as const, done: !!c.diagnosis && c.diagnosis.hypotheses.length > 0, current: !hasDiag },
    { key: 'journey.rootCause', icon: 'locate-outline' as const, done: hasRoot, current: hasDiag && !hasRoot },
    { key: 'journey.fix', icon: 'construct-outline' as const, done: hasFix, current: hasRoot && !hasFix },
    { key: 'journey.verify', icon: 'checkmark-done-outline' as const, done: hasVerify, current: hasFix && !hasVerify },
  ];

  const submitChange = async () => {
    if (!changeDesc.trim()) return;
    await addChange(c.id, changeKind, changeDesc.trim());
    setChangeDesc('');
    setChangeModal(false);
  };

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

      {/* مشاكل مشابهة من الذاكرة */}
      {similar.length > 0 && (
        <>
          <SectionTitle dark={dark} text={tr('memory.similarFound')} icon="bulb-outline" />
          {similar.map((s) => (
            <Card key={s.debugCase.id} dark={dark} onPress={() => onOpenCase?.(s.debugCase.id)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '700' }} numberOfLines={1}>
                  {s.debugCase.title}
                </Text>
                <Text style={{ color: t.colors.accent, fontSize: t.font.small, fontWeight: '800' }}>
                  {Math.round(s.score * 100)}%
                </Text>
              </View>
              {s.causeAr && (
                <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny }} numberOfLines={1}>
                  {pick({ ar: s.causeAr, en: s.causeEn ?? s.causeAr })}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={s.verified ? 'shield-checkmark' : 'alert-circle-outline'}
                  size={12}
                  color={s.verified ? t.colors.success : t.colors.warning}
                />
                <Text style={{ color: s.verified ? t.colors.success : t.colors.warning, fontSize: t.font.tiny, fontWeight: '700' }}>
                  {s.verified ? tr('memory.trustedFix') : tr('memory.untrustedFix')}
                </Text>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* رحلة التشخيص */}
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

      {/* ما الذي تغير؟ */}
      <SectionTitle dark={dark} text={tr('changes.title')} icon="swap-horizontal-outline" />
      <Card dark={dark} style={{ gap: t.spacing(2) }}>
        {(c.changes ?? []).length === 0 ? (
          <Text style={{ color: t.colors.textFaint, fontSize: t.font.small }}>{tr('changes.empty')}</Text>
        ) : (
          (c.changes ?? []).map((ch) => (
            <View key={ch.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Ionicons name="git-commit-outline" size={14} color={t.colors.warning} style={{ marginTop: 3 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '700' }}>
                  {pick(CHANGE_KIND_LABELS[ch.kind])}
                </Text>
                <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, writingDirection: 'auto' }}>{ch.description}</Text>
                {ch.linkedEvidenceId && (
                  <Text style={{ color: t.colors.accent, fontSize: t.font.tiny }}>{tr('changes.linked')}</Text>
                )}
              </View>
            </View>
          ))
        )}
        <Btn dark={dark} variant="secondary" icon="add" label={tr('changes.add')} onPress={() => setChangeModal(true)} />
      </Card>

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

      {/* الخط الزمني */}
      <SectionTitle dark={dark} text={tr('timeline.title')} icon="time-outline" />
      <Card dark={dark}>
        {timeline.map((e, i) => (
          <View key={e.id}>
            <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons
                  name={TIMELINE_ICONS[e.type]}
                  size={16}
                  color={e.type === 'verified' ? t.colors.success : e.type === 'created' ? t.colors.primary : t.colors.textMuted}
                />
                {i < timeline.length - 1 && (
                  <View style={{ width: 1.5, flex: 1, minHeight: 18, backgroundColor: t.colors.cardBorder, marginTop: 4 }} />
                )}
              </View>
              <View style={{ flex: 1, paddingBottom: 4 }}>
                <Text style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '600' }}>
                  {pick({ ar: e.titleAr, en: e.titleEn })}
                </Text>
                {(e.detailAr || e.detailEn) && (
                  <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny, writingDirection: 'auto' }} numberOfLines={2}>
                    {pick({ ar: e.detailAr ?? '', en: e.detailEn ?? '' })}
                  </Text>
                )}
                <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
                  {new Date(e.at).toLocaleString(pick({ ar: 'ar', en: 'en' }), {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </Card>

      {/* نافذة تسجيل تغيير */}
      <BottomModal visible={changeModal} onClose={() => setChangeModal(false)} dark={dark} title={tr('changes.add')}>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, fontWeight: '600' }}>{tr('changes.kind')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CHANGE_KINDS.map((k) => (
            <Chip
              key={k}
              dark={dark}
              label={pick(CHANGE_KIND_LABELS[k])}
              active={changeKind === k}
              onPress={() => setChangeKind(k)}
            />
          ))}
        </View>
        <Field dark={dark} label={tr('changes.description')} value={changeDesc} onChangeText={setChangeDesc} multiline />
        <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
          سيُضاف التغيير كدليل «تغيير أخير» ويؤثر في التحليل تلقائيًا.
        </Text>
        <Btn dark={dark} label={tr('common.save')} icon="checkmark" onPress={submitChange} disabled={!changeDesc.trim()} />
      </BottomModal>
    </View>
  );
}
