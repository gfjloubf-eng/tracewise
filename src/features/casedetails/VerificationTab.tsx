/**
 * تبويب التحقق — التفريق الصارم بين «مرجح الحل» و«تم التحقق».
 * التحقق يتطلب دليلًا جديدًا يناقض إشارة الفشل (مثل 401 → 200).
 */
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Btn, Card, EmptyState, Field, SectionTitle } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { DebugCase, VerificationResult } from '../../domain/types';
import { useStore } from '../../state/AppStore';
import { evaluateVerification } from '../../verification/verifier';

const RESULT_META: Record<VerificationResult, { icon: keyof typeof Ionicons.glyphMap; colorKey: 'success' | 'warning' | 'danger' }> = {
  verified: { icon: 'checkmark-done-circle', colorKey: 'success' },
  likely: { icon: 'help-circle', colorKey: 'warning' },
  unresolved: { icon: 'close-circle', colorKey: 'danger' },
};

export function VerificationTab({ c, dark }: { c: DebugCase; dark: boolean }) {
  const t = getTheme(dark);
  const { t: tr, pick } = useI18n();
  const { recordVerification } = useStore();

  const defaultBefore = c.diagnosis?.fingerprint.signal ?? c.errorMessage ?? '';
  const [before, setBefore] = useState(defaultBefore);
  const [after, setAfter] = useState('');
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{ result: VerificationResult; reason: string } | null>(null);

  // معاينة النتيجة قبل التسجيل — شفافية كاملة
  const preview = useMemo(
    () =>
      before.trim() && after.trim()
        ? evaluateVerification({ before, after, newEvidenceCount: picked.length })
        : null,
    [before, after, picked.length]
  );

  const submit = async () => {
    if (!before.trim() || !after.trim()) return;
    setBusy(true);
    const rec = await recordVerification(c.id, {
      before: before.trim(),
      after: after.trim(),
      evidenceIds: picked,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (rec) {
      setLastResult({
        result: rec.result,
        reason: rec.note ?? '',
      });
      setAfter('');
      setNote('');
      setPicked([]);
    }
  };

  const toggleEvidence = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <View style={{ gap: t.spacing(3) }}>
      <Card dark={dark} style={{ backgroundColor: t.colors.infoDim, borderColor: t.colors.infoDim }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Ionicons name="information-circle-outline" size={16} color={t.colors.info} />
          <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, lineHeight: 19 }}>
            {tr('verify.distinction')}
          </Text>
        </View>
      </Card>

      {c.fixPlan && (
        <Card dark={dark}>
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny, fontWeight: '700' }}>{tr('verify.hint')}</Text>
          <Text style={{ color: t.colors.accent, fontSize: t.font.small, lineHeight: 19 }}>
            {pick({ ar: c.fixPlan.verificationHintAr, en: c.fixPlan.verificationHintEn })}
          </Text>
        </Card>
      )}

      <SectionTitle dark={dark} text={tr('verify.title')} icon="checkmark-done-outline" />
      <Card dark={dark} style={{ gap: t.spacing(3) }}>
        <Field dark={dark} label={tr('verify.before')} value={before} onChangeText={setBefore} placeholder={tr('verify.beforeHint')} mono />
        <Field dark={dark} label={tr('verify.after')} value={after} onChangeText={setAfter} placeholder={tr('verify.afterHint')} mono />

        <View style={{ gap: 6 }}>
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, fontWeight: '600' }}>{tr('verify.evidence')}</Text>
          {c.evidence.length === 0 ? (
            <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{tr('verify.needEvidenceBody')}</Text>
          ) : (
            c.evidence.map((e) => {
              const active = picked.includes(e.id);
              return (
                <View key={e.id}>
                  <Btn
                    dark={dark}
                    variant={active ? 'success' : 'secondary'}
                    icon={active ? 'checkmark-circle' : 'ellipse-outline'}
                    label={e.title}
                    full
                    onPress={() => toggleEvidence(e.id)}
                  />
                </View>
              );
            })
          )}
          {picked.length === 0 && (
            <Text style={{ color: t.colors.warning, fontSize: t.font.tiny }}>{tr('verify.noEvidence')}</Text>
          )}
        </View>

        {preview && (
          <Card
            dark={dark}
            style={{
              backgroundColor:
                preview.result === 'verified'
                  ? t.colors.successDim
                  : preview.result === 'likely'
                    ? t.colors.warningDim
                    : t.colors.dangerDim,
              borderColor: 'transparent',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name={RESULT_META[preview.result].icon}
                size={18}
                color={t.colors[RESULT_META[preview.result].colorKey]}
              />
              <Text style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '800' }}>
                {tr(`verify.result.${preview.result}`)}
              </Text>
            </View>
            <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny, lineHeight: 16 }}>{preview.reasonAr}</Text>
          </Card>
        )}

        <Field dark={dark} label={`${tr('evidence.contentLabel')} (${tr('common.optional')})`} value={note} onChangeText={setNote} multiline />

        <Btn
          dark={dark}
          icon="checkmark-circle-outline"
          label={tr('verify.submit')}
          onPress={submit}
          loading={busy}
          disabled={!before.trim() || !after.trim()}
        />
      </Card>

      {lastResult && (
        <Card dark={dark}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons
              name={RESULT_META[lastResult.result].icon}
              size={18}
              color={t.colors[RESULT_META[lastResult.result].colorKey]}
            />
            <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '800' }}>
              {tr(`verify.result.${lastResult.result}`)}
            </Text>
          </View>
        </Card>
      )}

      <SectionTitle dark={dark} text={tr('verify.records')} icon="time-outline" />
      {c.verifications.length === 0 ? (
        <EmptyState dark={dark} icon="shield-checkmark-outline" title={tr('verify.empty')} />
      ) : (
        [...c.verifications].reverse().map((v) => (
          <Card key={v.id} dark={dark}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name={RESULT_META[v.result].icon}
                size={16}
                color={t.colors[RESULT_META[v.result].colorKey]}
              />
              <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '700' }}>
                {tr(`verify.result.${v.result}`)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={{ color: t.colors.danger, fontSize: t.font.small, fontFamily: 'monospace' }}>{v.before}</Text>
              <Ionicons name="arrow-forward" size={14} color={t.colors.textFaint} />
              <Text style={{ color: t.colors.success, fontSize: t.font.small, fontFamily: 'monospace' }}>{v.after}</Text>
            </View>
            {v.note && <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny }}>{v.note}</Text>}
            <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
              {tr('verify.evidence')}: {v.evidenceIds.length}
            </Text>
          </Card>
        ))
      )}
    </View>
  );
}
