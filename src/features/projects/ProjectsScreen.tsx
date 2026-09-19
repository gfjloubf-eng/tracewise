/** المشاريع — مساحات عمل تنظم الحالات (اسم/لغة/إطار/منصة/مستودع/بيئة) */
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { BottomModal, Btn, Card, Chip, EmptyState, Field } from '../../ui/components';
import { CaseCard } from '../../ui/components/CaseCard';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { Project } from '../../domain/types';

const LANGS = ['TypeScript', 'JavaScript', 'Dart', 'Python', 'Java', 'Kotlin', 'Go', 'C#', 'PHP', 'Ruby', 'Rust', 'Swift'];
const FRAMEWORKS = ['React Native', 'Flutter', 'React', 'Vue', 'Angular', 'Node.js', 'Django', 'FastAPI', 'Spring', 'Laravel', 'Express', 'Next.js'];
const PLATFORMS = ['Android', 'iOS', 'Android / iOS', 'Web', 'Server', 'Desktop'];

export function ProjectsScreen({ dark, onOpenCase }: { dark: boolean; onOpenCase: (id: string) => void }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const { projects, cases, createProject, deleteProject } = useStore();

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Project, 'id' | 'createdAt'>>({ name: '' });
  const [openedId, setOpenedId] = useState<string | null>(null);

  const opened = projects.find((p) => p.id === openedId) ?? null;
  const projectCases = opened
    ? cases.filter((c) => c.projectId === opened.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    : [];

  const submit = async () => {
    if (!form.name.trim()) return;
    await createProject({ ...form, name: form.name.trim() });
    setCreating(false);
    setForm({ name: '' });
  };

  if (opened) {
    return (
      <View style={{ gap: t.spacing(3), padding: t.spacing(4) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: t.spacing(2) }}>
          <Ionicons name="chevron-back" size={22} color={t.colors.text} onPress={() => setOpenedId(null)} />
          <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.title, fontWeight: '800' }} numberOfLines={1}>
            {opened.name}
          </Text>
        </View>
        <Card dark={dark}>
          <View style={{ flexDirection: 'row', gap: t.spacing(4), flexWrap: 'wrap' }}>
            {opened.language && <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny }}>{opened.language}</Text>}
            {opened.framework && <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny }}>{opened.framework}</Text>}
            {opened.platform && <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny }}>{opened.platform}</Text>}
            {opened.repository && <Text style={{ color: t.colors.accent, fontSize: t.font.tiny }}>{opened.repository}</Text>}
            {opened.environment && <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{opened.environment}</Text>}
          </View>
          <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
            {tr('projects.cases', { n: projectCases.length })}
          </Text>
        </Card>
        {projectCases.length === 0 ? (
          <EmptyState dark={dark} icon="bug-outline" title={tr('home.empty')} />
        ) : (
          projectCases.map((c) => <CaseCard key={c.id} c={c} dark={dark} onPress={() => onOpenCase(c.id)} />)
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: t.spacing(3), padding: t.spacing(4) }}>
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800', marginTop: t.spacing(2) }}>
        {tr('projects.title')}
      </Text>
      <Btn dark={dark} icon="add-circle-outline" label={tr('projects.create')} onPress={() => setCreating(true)} />

      {projects.length === 0 ? (
        <EmptyState dark={dark} icon="folder-open-outline" title={tr('projects.empty')} />
      ) : (
        projects.map((p) => {
          const count = cases.filter((c) => c.projectId === p.id).length;
          return (
            <Card key={p.id} dark={dark} onPress={() => setOpenedId(p.id)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cube-outline" size={18} color={t.colors.accent} />
                <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.body, fontWeight: '700' }} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{tr('projects.cases', { n: count })}</Text>
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={t.colors.danger}
                  onPress={() =>
                    Alert.alert(tr('projects.deleteConfirm'), '', [
                      { text: tr('common.cancel'), style: 'cancel' },
                      { text: tr('common.delete'), style: 'destructive', onPress: () => void deleteProject(p.id) },
                    ])
                  }
                />
              </View>
              <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
                {[p.language, p.framework, p.platform].filter(Boolean).join(' · ')}
              </Text>
            </Card>
          );
        })
      )}

      <BottomModal visible={creating} onClose={() => setCreating(false)} dark={dark} title={tr('projects.create')}>
        <Field dark={dark} label={tr('projects.name')} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, fontWeight: '600' }}>{tr('new.language')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LANGS.map((l) => (
            <Chip key={l} dark={dark} label={l} active={form.language === l} onPress={() => setForm({ ...form, language: l })} />
          ))}
        </View>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, fontWeight: '600' }}>{tr('new.framework')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FRAMEWORKS.map((f) => (
            <Chip key={f} dark={dark} label={f} active={form.framework === f} onPress={() => setForm({ ...form, framework: f })} />
          ))}
        </View>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, fontWeight: '600' }}>{tr('new.platform')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PLATFORMS.map((p) => (
            <Chip key={p} dark={dark} label={p} active={form.platform === p} onPress={() => setForm({ ...form, platform: p })} />
          ))}
        </View>
        <Field dark={dark} label={tr('projects.repository')} value={form.repository ?? ''} onChangeText={(v) => setForm({ ...form, repository: v })} mono />
        <Field dark={dark} label={tr('projects.environment')} value={form.environment ?? ''} onChangeText={(v) => setForm({ ...form, environment: v })} />
        <Btn dark={dark} label={tr('common.save')} icon="checkmark" onPress={submit} disabled={!form.name.trim()} />
      </BottomModal>
    </View>
  );
}
