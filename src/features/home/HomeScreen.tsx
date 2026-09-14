/** الرئيسية — ترحيب + إحصاءات + آخر الحالات + إجراءات سريعة */
import React from 'react';
import { Text, View } from 'react-native';
import { getTheme } from '../../core/theme';
import { Btn, Card, EmptyState, Logo, SectionTitle, StatCard } from '../../ui/components';
import { CaseCard } from '../../ui/components/CaseCard';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { CASE_STATES_ORDER } from '../../domain/caseStates';

export function HomeScreen({
  dark,
  onOpenCase,
  onNewCase,
  onScan,
  onSecurity,
  onMemory,
}: {
  dark: boolean;
  onOpenCase: (id: string) => void;
  onNewCase: () => void;
  onScan: () => void;
  onSecurity: () => void;
  onMemory: () => void;
}) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const { cases, analyzingCaseId } = useStore();

  const openCount = cases.filter((c) => !['closed'].includes(c.state)).length;
  const verifiedCount = cases.filter((c) => c.state === 'verified' || c.state === 'closed').length;
  const recent = [...cases]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const hasDemo = cases.some((c) => c.isDemo);

  return (
    <View style={{ gap: t.spacing(3), padding: t.spacing(4) }}>
      {/* الترحيب */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(3), marginTop: t.spacing(2) }}>
        <Logo size={48} dark={dark} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.colors.text, fontSize: t.font.title, fontWeight: '800' }}>{tr('home.welcome')}</Text>
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>{tr('home.welcomeSub')}</Text>
        </View>
      </View>

      {hasDemo && (
        <Card dark={dark} style={{ borderColor: t.colors.warningDim, backgroundColor: t.colors.warningDim }}>
          <Text style={{ color: t.colors.warning, fontSize: t.font.small, fontWeight: '600' }}>
            {tr('common.demoNote')}
          </Text>
        </Card>
      )}

      {/* الإحصاءات */}
      <View style={{ flexDirection: 'row', gap: t.spacing(3) }}>
        <StatCard dark={dark} icon="bug-outline" value={openCount} label={tr('home.openCases')} color={t.colors.info} />
        <StatCard dark={dark} icon="checkmark-done-outline" value={verifiedCount} label={tr('home.verified')} color={t.colors.success} />
        <StatCard dark={dark} icon="albums-outline" value={cases.length} label={tr('tab.history')} color={t.colors.accent} />
      </View>

      {/* زر المشكلة الجديدة */}
      <Btn dark={dark} label={tr('home.newCase')} icon="add-circle-outline" onPress={onNewCase} />

      {/* إجراءات سريعة */}
      <SectionTitle dark={dark} text={tr('home.quickActions')} icon="flash-outline" />
      <View style={{ flexDirection: 'row', gap: t.spacing(3) }}>
        <View style={{ flex: 1 }}>
          <Btn dark={dark} variant="secondary" icon="scan-outline" label={tr('home.scan')} onPress={onScan} />
        </View>
        <View style={{ flex: 1 }}>
          <Btn dark={dark} variant="secondary" icon="shield-checkmark-outline" label={tr('home.security')} onPress={onSecurity} />
        </View>
        <View style={{ flex: 1 }}>
          <Btn dark={dark} variant="secondary" icon="bulb-outline" label={tr('home.memory')} onPress={onMemory} />
        </View>
      </View>

      {/* آخر الحالات */}
      <SectionTitle dark={dark} text={tr('home.recent')} icon="time-outline" />
      {recent.length === 0 ? (
        <EmptyState dark={dark} icon="file-tray-outline" title={tr('home.empty')} />
      ) : (
        recent.map((c) => (
          <View key={c.id}>
            {analyzingCaseId === c.id && (
              <Text style={{ color: t.colors.warning, fontSize: t.font.tiny, marginBottom: 4 }}>
                {tr('common.analyzing')}
              </Text>
            )}
            <CaseCard c={c} dark={dark} onPress={() => onOpenCase(c.id)} />
          </View>
        ))
      )}

      {/* شريط تقدم المنظومة — تذكير بالمراحل */}
      <Card dark={dark}>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny, lineHeight: 18 }}>
          {CASE_STATES_ORDER.map((s) => tr(`state.${s}`)).join(' ← ')}
        </Text>
      </Card>
    </View>
  );
}
