/** السجل — كل الحالات + بحث + تصفية (حالة/خطورة/لغة) */
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { getTheme } from '../../core/theme';
import { Chip } from '../../ui/components';
import { SectionHeader, TracewiseBackdrop, TracewiseEmptyState } from '../../ui/tracewise';
import { CaseCard } from '../../ui/components/CaseCard';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { CASE_STATES_ORDER } from '../../domain/caseStates';
import { CaseState, Severity } from '../../domain/types';

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];

export function HistoryScreen({ dark, onOpenCase }: { dark: boolean; onOpenCase: (id: string) => void }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const { cases, projects } = useStore();

  const [query, setQuery] = useState('');
  const [state, setState] = useState<CaseState | 'all'>('all');
  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [language, setLanguage] = useState<string>('all');
  const [projectId, setProjectId] = useState<string>('all');

  const languages = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => c.language && set.add(c.language));
    return Array.from(set);
  }, [cases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases
      .filter((c) => (state === 'all' ? true : c.state === state))
      .filter((c) => (severity === 'all' ? true : c.severity === severity))
      .filter((c) => (language === 'all' ? true : c.language === language))
      .filter((c) => (projectId === 'all' ? true : c.projectId === projectId))
      .filter((c) =>
        q
          ? `${c.title} ${c.description} ${c.errorMessage ?? ''} ${c.tags.join(' ')}`.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [cases, query, state, severity, language, projectId]);

  return (
    <TracewiseBackdrop dark={dark}>
    <View style={{ flex: 1, gap: t.spacing(3), padding: t.spacing(4) }}>
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800', marginTop: t.spacing(2) }}>
        {tr('history.title')}
      </Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={tr('history.search')}
        placeholderTextColor={t.colors.textFaint}
        style={{
          backgroundColor: t.colors.inputBg,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.cardBorder,
          color: t.colors.text,
          fontSize: t.font.body,
          paddingHorizontal: t.spacing(4),
          minHeight: 48,
        }}
      />

      {projects.length > 0 && (
        <>
          <SectionHeader dark={dark} title={tr('projects.title')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip dark={dark} label={tr('projects.mine')} active={projectId === 'all'} onPress={() => setProjectId('all')} />
            {projects.map((p) => (
              <Chip key={p.id} dark={dark} label={p.name} active={projectId === p.id} onPress={() => setProjectId(p.id)} />
            ))}
          </ScrollView>
        </>
      )}

      <SectionHeader dark={dark} title={tr('history.filterState')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip dark={dark} label={tr('common.all')} active={state === 'all'} onPress={() => setState('all')} />
        {CASE_STATES_ORDER.map((s) => (
          <Chip key={s} dark={dark} label={tr(`state.${s}`)} active={state === s} onPress={() => setState(s)} />
        ))}
      </ScrollView>

      <SectionHeader dark={dark} title={tr('history.filterSeverity')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip dark={dark} label={tr('common.all')} active={severity === 'all'} onPress={() => setSeverity('all')} />
        {SEVERITIES.map((s) => (
          <Chip key={s} dark={dark} label={tr(`severity.${s}`)} active={severity === s} onPress={() => setSeverity(s)} />
        ))}
      </ScrollView>

      {languages.length > 0 && (
        <>
          <SectionHeader dark={dark} title={tr('history.filterLanguage')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip dark={dark} label={tr('common.all')} active={language === 'all'} onPress={() => setLanguage('all')} />
            {languages.map((l) => (
              <Chip key={l} dark={dark} label={l} active={language === l} onPress={() => setLanguage(l)} />
            ))}
          </ScrollView>
        </>
      )}

      <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
        {tr('history.count', { n: filtered.length })}
      </Text>

      {filtered.length === 0 ? (
        <TracewiseEmptyState dark={dark} icon="search-outline" title={tr('history.empty')} />
      ) : (
        filtered.map((c) => <CaseCard key={c.id} c={c} dark={dark} onPress={() => onOpenCase(c.id)} />)
      )}
    </View>
    </TracewiseBackdrop>
  );
}
