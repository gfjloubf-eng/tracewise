/** مشكلة جديدة — إدخال تدريجي (Wizard) مناسب للهاتف: 4 خطوات + نظام مسودات كامل */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Btn, Card, Chip, Field, KeyValue, SectionTitle, SeverityBadge } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { assessSeverity } from '../../domain/severity';
import { buildFingerprint } from '../../domain/fingerprint';
import { CaseInput } from '../../domain/types';
import { deleteNewCaseDraft, draftHasContent, loadNewCaseDraft, saveNewCaseDraft } from '../../state/draftStore';

const LANGUAGES = ['TypeScript', 'JavaScript', 'Dart', 'Python', 'Java', 'Kotlin', 'Go', 'C#', 'PHP', 'Ruby', 'Rust', 'Swift', 'C/C++', 'SQL'];
const FRAMEWORKS = ['React Native', 'Flutter', 'React', 'Vue', 'Angular', 'Node.js', 'Django', 'FastAPI', 'Spring', 'Laravel', 'Rails', 'ASP.NET', 'Express', 'Next.js'];
const PLATFORMS = ['Android', 'iOS', 'Web', 'Windows', 'macOS', 'Linux', 'Server'];

export function NewCaseScreen({
  dark,
  onCreated,
  onCancel,
  onScan,
}: {
  dark: boolean;
  onCreated: (id: string) => void;
  onCancel: () => void;
  onScan: () => void;
}) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const { createCase, projects } = useStore();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CaseInput>({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ——— نظام المسودات ———
  const hydratedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);
  const mountedRef = useRef(true);
  /** لقطة آخر محتوى محفوظ — تمنع إعادة الجدولة/الحفظ عند غياب التغير */
  const lastSavedSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  // استعادة المسودة عند الفتح — مرة واحدة
  useEffect(() => {
    let mounted = true;
    loadNewCaseDraft().then((d) => {
      if (!mounted) return;
      if (d) {
        const { projectId: pid, step: st, updatedAt, ...rest } = d;
        setForm(rest as CaseInput);
        setProjectId(pid);
        setStep(st);
        setLastSavedAt(updatedAt);
        setRestored(true);
        lastSavedSnapshotRef.current = JSON.stringify({ ...rest, projectId: pid, step: st });
      }
      hydratedRef.current = true;
    });
    return () => {
      mounted = false;
    };
  }, []);

  // حفظ تلقائي ذكي — debounce بعد التوقف عن الكتابة، وبمحتوى فعلي فقط
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!draftHasContent(form)) return;
    const snapshot = JSON.stringify({ ...form, projectId, step });
    if (snapshot === lastSavedSnapshotRef.current) return; // لا تغير منذ آخر حفظ
    setSaveState('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // لا عمل بعد التفكيك، ولا إحياء للمسودة بعد الإنشاء
      if (!mountedRef.current || submittedRef.current) return;
      void saveNewCaseDraft({ ...form, projectId, step }).then((saved) => {
        if (!mountedRef.current) return;
        lastSavedSnapshotRef.current = snapshot;
        setSaveState('saved');
        setLastSavedAt(saved.updatedAt);
      });
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, projectId, step]);

  const saveDraftNow = async () => {
    const snapshot = JSON.stringify({ ...form, projectId, step });
    setSaveState('saving');
    const saved = await saveNewCaseDraft({ ...form, projectId, step });
    if (!mountedRef.current) return;
    lastSavedSnapshotRef.current = snapshot;
    setSaveState('saved');
    setLastSavedAt(saved.updatedAt);
  };

  const relTime = (iso: string): string => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return tr('draft.justNow');
    if (mins < 60) return tr('draft.minAgo', { n: mins });
    return tr('draft.hourAgo', { n: Math.floor(mins / 60) });
  };

  const draftStatus =
    saveState === 'saving'
      ? tr('draft.saving')
      : saveState === 'saved'
        ? tr('draft.saved')
        : lastSavedAt
          ? tr('draft.lastSaved', { time: relTime(lastSavedAt) })
          : '';

  const confirmStartNew = () => {
    Alert.alert(tr('draft.discardConfirm'), '', [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('draft.startNew'),
        style: 'destructive',
        onPress: () => {
          submittedRef.current = false;
          void deleteNewCaseDraft();
          lastSavedSnapshotRef.current = null;
          setForm({ title: '', description: '' });
          setProjectId(undefined);
          setStep(0);
          setRestored(false);
          setSaveState('idle');
          setLastSavedAt(null);
        },
      },
    ]);
  };

  const set = (patch: Partial<CaseInput>) => setForm((f) => ({ ...f, ...patch }));
  const steps = [tr('new.s1'), tr('new.s2'), tr('new.s3'), tr('new.s4')];

  const severityEstimate = assessSeverity([form.errorMessage, form.description, form.stackTrace, form.title]);
  const fpEstimate = buildFingerprint({
    errorMessage: form.errorMessage,
    stackTrace: form.stackTrace,
    title: form.title,
    description: form.description,
  });

  const next = () => {
    if (step === 0 && !form.title.trim()) {
      setError(tr('new.titleRequired'));
      return;
    }
    setError('');
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = async () => {
    if (!form.title.trim()) {
      setError(tr('new.titleRequired'));
      setStep(0);
      return;
    }
    setSaving(true);
    // أوقف أي حفظ مؤجل قبل الحذف — حتى لا تُبعث المسودة بعد الإنشاء
    if (debounceRef.current) clearTimeout(debounceRef.current);
    submittedRef.current = true;
    try {
      const c = await createCase({ ...form, projectId });
      // المسودة انتهت مهمتها — تُحذف بعد نجاح الإنشاء فقط
      await deleteNewCaseDraft();
      onCreated(c.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, gap: t.spacing(3), padding: t.spacing(4) }}>
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800', marginTop: t.spacing(2) }}>
        {tr('new.title')}
      </Text>
      {/* مؤشر الخطوات */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(2), marginTop: t.spacing(2) }}>
        {steps.map((s, i) => (
          <View key={s} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: i <= step ? t.colors.primary : t.colors.chipBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {i < step ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text style={{ color: i <= step ? '#fff' : t.colors.textFaint, fontWeight: '700', fontSize: t.font.small }}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{ color: i === step ? t.colors.text : t.colors.textFaint, fontSize: t.font.tiny, fontWeight: i === step ? '700' : '400' }}
            >
              {s}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny, flex: 1 }}>
          {tr('new.step', { n: step + 1, total: 4 })}
        </Text>
        {draftStatus ? (
          <Text
            style={{
              color: saveState === 'saved' ? t.colors.success : t.colors.textFaint,
              fontSize: t.font.tiny,
            }}
          >
            {draftStatus}
          </Text>
        ) : null}
        <Pressable
          onPress={() => void saveDraftNow()}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: t.colors.cardBorder,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: t.colors.primary, fontSize: t.font.small, fontWeight: '700' }}>
            {tr('draft.save')}
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: t.spacing(3), paddingBottom: 20 }}>
        {restored && (
          <Card dark={dark} style={{ backgroundColor: t.colors.infoDim, borderColor: t.colors.infoDim, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Ionicons name="time-outline" size={14} color={t.colors.info} />
              <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.tiny }}>{tr('draft.restored')}</Text>
            </View>
            <Pressable onPress={confirmStartNew} accessibilityRole="button">
              <Text style={{ color: t.colors.primary, fontSize: t.font.small, fontWeight: '700' }}>
                {tr('draft.startNew')}
              </Text>
            </Pressable>
          </Card>
        )}
        {step === 0 && (
          <>
            <Field
              dark={dark}
              label={`${tr('new.problemTitle')} *`}
              value={form.title ?? ''}
              onChangeText={(v) => set({ title: v })}
              placeholder={tr('new.problemTitleHint')}
            />
            <Field
              dark={dark}
              label={tr('new.description')}
              value={form.description ?? ''}
              onChangeText={(v) => set({ description: v })}
              multiline
              placeholder={tr('new.descriptionHint')}
            />
            {projects.length > 0 && (
              <>
                <SectionTitle dark={dark} text={tr('projects.pick')} icon="cube-outline" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {projects.map((p) => (
                    <Chip
                      key={p.id}
                      dark={dark}
                      label={p.name}
                      active={projectId === p.id}
                      onPress={() => setProjectId(projectId === p.id ? undefined : p.id)}
                    />
                  ))}
                </View>
              </>
            )}
            <SectionTitle dark={dark} text={tr('new.language')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LANGUAGES.map((l) => (
                <Chip key={l} dark={dark} label={l} active={form.language === l} onPress={() => set({ language: l })} />
              ))}
            </View>
            <SectionTitle dark={dark} text={tr('new.framework')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FRAMEWORKS.map((f) => (
                <Chip key={f} dark={dark} label={f} active={form.framework === f} onPress={() => set({ framework: f })} />
              ))}
            </View>
            <SectionTitle dark={dark} text={tr('new.platform')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS.map((p) => (
                <Chip key={p} dark={dark} label={p} active={form.platform === p} onPress={() => set({ platform: p })} />
              ))}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Card dark={dark} style={{ backgroundColor: t.colors.accentDim, borderColor: t.colors.accentDim }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={16} color={t.colors.accent} />
                <Text style={{ flex: 1, color: t.colors.accent, fontSize: t.font.tiny }}>{tr('new.secretsNote')}</Text>
              </View>
            </Card>
            <Field
              dark={dark}
              label={tr('new.errorMessage')}
              value={form.errorMessage ?? ''}
              onChangeText={(v) => set({ errorMessage: v })}
              multiline
              mono
            />
            <Field
              dark={dark}
              label={tr('new.stackTrace')}
              value={form.stackTrace ?? ''}
              onChangeText={(v) => set({ stackTrace: v })}
              multiline
              mono
            />
            <Btn dark={dark} variant="secondary" icon="scan-outline" label={tr('new.addFromScan')} onPress={onScan} />
          </>
        )}

        {step === 2 && (
          <>
            <Field dark={dark} label={tr('new.code')} value={form.codeSnippet ?? ''} onChangeText={(v) => set({ codeSnippet: v })} multiline mono />
            <Field dark={dark} label={tr('new.environment')} value={form.environment ?? ''} onChangeText={(v) => set({ environment: v })} multiline placeholder={tr('new.environmentHint')} />
            <Field dark={dark} label={tr('new.recentChange')} value={form.recentChange ?? ''} onChangeText={(v) => set({ recentChange: v })} multiline />
            <Field dark={dark} label={tr('new.triedFixes')} value={form.triedFixes ?? ''} onChangeText={(v) => set({ triedFixes: v })} multiline />
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle dark={dark} text={tr('new.estimate')} icon="analytics-outline" />
            <Card dark={dark} style={{ gap: t.spacing(3) }}>
              <KeyValue dark={dark} k={tr('new.problemTitle')} v={form.title || '—'} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, fontWeight: '600' }}>
                  {tr('analysis.severity')}:
                </Text>
                <SeverityBadge severity={severityEstimate} dark={dark} />
              </View>
              <KeyValue dark={dark} k={tr('new.fingerprint')} v={`${fpEstimate.errorKind} · ${fpEstimate.hash}`} mono />
              {form.errorMessage ? <KeyValue dark={dark} k={tr('new.errorMessage')} v={form.errorMessage} mono /> : null}
            </Card>
          </>
        )}

        {error ? <Text style={{ color: t.colors.danger, fontSize: t.font.small }}>{error}</Text> : null}
      </ScrollView>

      {/* أزرار التنقل */}
      <View style={{ flexDirection: 'row', gap: t.spacing(3) }}>
        {step > 0 && (
          <View style={{ flex: 1 }}>
            <Btn dark={dark} variant="secondary" label={tr('common.back')} onPress={() => setStep((s) => s - 1)} />
          </View>
        )}
        <View style={{ flex: 2 }}>
          {step < 3 ? (
            <Btn dark={dark} label={tr('common.next')} icon="arrow-forward" onPress={next} />
          ) : (
            <Btn dark={dark} label={tr('new.create')} icon="add-circle-outline" onPress={submit} loading={saving} />
          )}
        </View>
      </View>
      {step === 0 && (
        <Btn dark={dark} variant="ghost" label={tr('common.cancel')} onPress={onCancel} />
      )}
    </View>
  );
}
