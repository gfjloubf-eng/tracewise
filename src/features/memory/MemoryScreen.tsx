/** ذاكرة المبرمج — أسباب متكررة، حلول ناجحة (موثّقة فقط)، حالات مشابهة بتفاصيل كاملة */
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Card, EmptyState, KeyValue, SectionTitle, StateBadge } from '../../ui/components';
import { CaseCard } from '../../ui/components/CaseCard';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { frequentCauses, findSimilarCases, successfulFixes } from '../../domain/memory';

export function MemoryScreen({ dark, onOpenCase }: { dark: boolean; onOpenCase: (id: string) => void }) {
  const t = getTheme(dark);
  const { t: tr, pick } = useI18n();
  const { cases } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const causes = useMemo(() => frequentCauses(cases), [cases]);
  const successful = useMemo(() => successfulFixes(cases), [cases]);
  const selected = cases.find((c) => c.id === selectedId) ?? null;
  const similar = useMemo(
    () => (selected ? findSimilarCases(selected, cases) : []),
    [selected, cases]
  );

  const hasMemory = causes.length > 0 || successful.length > 0;

  return (
    <View style={{ gap: t.spacing(3), padding: t.spacing(4) }}>
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800', marginTop: t.spacing(2) }}>
        {tr('memory.title')}
      </Text>

      {!hasMemory && <EmptyState dark={dark} icon="bulb-outline" title={tr('memory.empty')} />}

      {causes.length > 0 && (
        <>
          <SectionTitle dark={dark} text={tr('memory.frequentCauses')} icon="stats-chart-outline" />
          <Card dark={dark}>
            {causes.slice(0, 6).map((g, i) => (
              <View key={g.errorKind}>
                {i > 0 && <View style={{ height: 1, backgroundColor: t.colors.cardBorder, marginVertical: 8 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="pulse-outline" size={15} color={t.colors.accent} />
                  <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '600' }}>
                    {pick({ ar: g.labelAr, en: g.labelEn })}
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
          <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
            الحلول الموثّقة بدليل فقط (Verified) — لا يُعتبر أي حل ناجحًا بدون تحقق.
          </Text>
          {successful.slice(0, 5).map((c) => (
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
            similar.map((s) => (
              <Card key={s.debugCase.id} dark={dark} onPress={() => onOpenCase(s.debugCase.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '700' }} numberOfLines={1}>
                    {s.debugCase.title}
                  </Text>
                  <Text style={{ color: t.colors.accent, fontSize: t.font.small, fontWeight: '800' }}>
                    {Math.round(s.score * 100)}%
                  </Text>
                </View>
                {s.causeAr && (
                  <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny }}>
                    {tr('journey.rootCause')}: {pick({ ar: s.causeAr, en: s.causeEn ?? s.causeAr })}
                  </Text>
                )}
                {s.fixAr && (
                  <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny }} numberOfLines={2}>
                    {tr('fix.change')}: {pick({ ar: s.fixAr, en: s.fixEn ?? s.fixAr })}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <StateBadge state={s.debugCase.state} dark={dark} />
                  {s.verified && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="shield-checkmark" size={12} color={t.colors.success} />
                      <Text style={{ color: t.colors.success, fontSize: t.font.tiny, fontWeight: '700' }}>
                        {tr('verify.result.verified')}
                      </Text>
                    </View>
                  )}
                  <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
                    {new Date(s.date).toLocaleDateString('ar')}
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
