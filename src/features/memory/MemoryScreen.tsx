/** ذاكرة المبرمج — أسباب متكررة، حلول ناجحة، حالات مشابهة، بصمات */
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Card, EmptyState, KeyValue, SectionTitle } from '../../ui/components';
import { CaseCard } from '../../ui/components/CaseCard';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { similarity } from '../../domain/fingerprint';
import { DebugCase } from '../../domain/types';

export function MemoryScreen({ dark, onOpenCase }: { dark: boolean; onOpenCase: (id: string) => void }) {
  const t = getTheme(dark);
  const { t: tr, lang } = useI18n();
  const { cases } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // الأسباب المتكررة: تجميع حسب errorKind
  const frequentCauses = useMemo(() => {
    const groups = new Map<string, { label: string; count: number; caseId?: string }>();
    for (const c of cases) {
      const kind = c.fingerprint?.errorKind ?? c.diagnosis?.fingerprint.errorKind;
      if (!kind || kind === 'unknown') continue;
      const label = c.diagnosis?.rootCauseAr
        ? lang === 'ar'
          ? c.diagnosis.rootCauseAr
          : c.diagnosis.rootCauseEn ?? c.diagnosis.rootCauseAr
        : c.fingerprint?.signal ?? kind;
      const g = groups.get(kind) ?? { label, count: 0 };
      g.count += 1;
      groups.set(kind, g);
    }
    return Array.from(groups.entries())
      .map(([kind, g]) => ({ kind, ...g }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [cases, lang]);

  // الحلول الناجحة: حالات موثّقة
  const successful = useMemo(
    () => cases.filter((c) => c.state === 'verified' || c.state === 'closed').slice(0, 5),
    [cases]
  );

  const selected = cases.find((c) => c.id === selectedId) ?? null;

  const similar: Array<{ c: DebugCase; score: number }> = useMemo(() => {
    if (!selected?.fingerprint) return [];
    return cases
      .filter((c) => c.id !== selected.id && (c.fingerprint || c.diagnosis?.fingerprint))
      .map((c) => ({ c, score: similarity(selected.fingerprint!, (c.fingerprint ?? c.diagnosis!.fingerprint)!) }))
      .filter((x) => x.score >= 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [selected, cases]);

  const hasMemory = frequentCauses.length > 0 || successful.length > 0;

  return (
    <View style={{ gap: t.spacing(3), padding: t.spacing(4) }}>
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800', marginTop: t.spacing(2) }}>
        {tr('memory.title')}
      </Text>

      {!hasMemory && <EmptyState dark={dark} icon="bulb-outline" title={tr('memory.empty')} />}

      {frequentCauses.length > 0 && (
        <>
          <SectionTitle dark={dark} text={tr('memory.frequentCauses')} icon="stats-chart-outline" />
          <Card dark={dark}>
            {frequentCauses.map((g, i) => (
              <View key={g.kind}>
                {i > 0 && <View style={{ height: 1, backgroundColor: t.colors.cardBorder, marginVertical: 8 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="pulse-outline" size={15} color={t.colors.accent} />
                  <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '600' }}>
                    {g.label}
                  </Text>
                  <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
                    {tr('memory.times', { n: g.count })}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {successful.length > 0 && (
        <>
          <SectionTitle dark={dark} text={tr('memory.successfulFixes')} icon="checkmark-done-outline" />
          {successful.map((c) => (
            <CaseCard key={c.id} c={c} dark={dark} onPress={() => onOpenCase(c.id)} />
          ))}
        </>
      )}

      <SectionTitle dark={dark} text={tr('memory.similar')} icon="copy-outline" />
      <Card dark={dark} style={{ gap: 8 }}>
        <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny, marginBottom: 4 }}>
          {tr('scanner.pickCase')}
        </Text>
        {cases.slice(0, 8).map((c) => (
          <View
            key={c.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: t.colors.cardBorder,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '600' }}>
                {c.title}
              </Text>
              {c.fingerprint && (
                <Text style={{ color: t.colors.accent, fontSize: t.font.tiny }}>
                  {tr('memory.fingerprint')}: {c.fingerprint.errorKind} · {c.fingerprint.hash}
                </Text>
              )}
            </View>
            <Ionicons
              name={selectedId === c.id ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selectedId === c.id ? t.colors.primary : t.colors.textFaint}
              onPress={() => setSelectedId(selectedId === c.id ? null : c.id)}
            />
          </View>
        ))}
      </Card>

      {selected && (
        <>
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>
            {tr('memory.similarFor', { title: selected.title })}
          </Text>
          {similar.length === 0 ? (
            <Text style={{ color: t.colors.textFaint, fontSize: t.font.small }}>{tr('memory.noSimilar')}</Text>
          ) : (
            similar.map(({ c, score }) => (
              <Card key={c.id} dark={dark} onPress={() => onOpenCase(c.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '700' }} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text style={{ color: t.colors.accent, fontSize: t.font.small, fontWeight: '700' }}>
                    {Math.round(score * 100)}%
                  </Text>
                </View>
              </Card>
            ))
          )}
          {selected.fingerprint && (
            <Card dark={dark}>
              <KeyValue dark={dark} k={tr('memory.fingerprint')} v={selected.fingerprint.hash} mono />
              <KeyValue dark={dark} k="Error Kind" v={selected.fingerprint.errorKind} mono />
              {selected.fingerprint.topFrame && (
                <KeyValue dark={dark} k="Top Frame" v={selected.fingerprint.topFrame} mono />
              )}
            </Card>
          )}
        </>
      )}
    </View>
  );
}
