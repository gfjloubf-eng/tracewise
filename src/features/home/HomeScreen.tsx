/** الرئيسية — ترحيب + إحصاءات + آخر الحالات + إجراءات سريعة */
import React from 'react';
import { Text, View } from 'react-native';
import { getTheme } from '../../core/theme';
import { Btn, Card, StatCard } from '../../ui/components';
import { BrandLockup, SectionHeader, TracewiseBackdrop, TracewiseEmptyState } from '../../ui/tracewise';
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
  onProjects,
  onHistory,
}: {
  dark: boolean;
  onOpenCase: (id: string) => void;
  onNewCase: () => void;
  onScan: () => void;
  onSecurity: () => void;
  onMemory: () => void;
  onProjects?: () => void;
  onHistory?: () => void;
}) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const { cases, analyzingCaseId } = useStore();

  // إحصاءات حقيقية من الحالات الموجودة — لا أرقام وهمية
  const openCount = cases.filter((c) => c.state === 'open' || c.state === 'fix_plan').length;
  const analyzingCount = cases.filter((c) => c.state === 'analyzing').length;
  const likelyCount = cases.filter((c) => c.state === 'likely_resolved').length;
  const verifiedCount = cases.filter((c) => c.state === 'verified').length;
  const recent = [...cases]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const hasDemo = cases.some((c) => c.isDemo);

  return (
    <TracewiseBackdrop dark={dark}>
    <View style={{ flex: 1, gap: t.spacing(3), padding: t.spacing(4) }}>
      {/* Hero — الهوية الموحدة + سؤال المطور */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(3), marginTop: t.spacing(2) }}>
        <BrandLockup dark={dark} compact />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.colors.accent, fontSize: t.font.small, fontWeight: '600' }}>
            {tr('home.heroQuestion')}
          </Text>
        </View>
      </View>

      {hasDemo && (
        <Card dark={dark} style={{ borderColor: t.colors.warningDim, backgroundColor: t.colors.warningDim }}>
          <Text style={{ color: t.colors.warning, fontSize: t.font.small, fontWeight: '600' }}>
            {tr('common.demoNote')}
          </Text>
        </Card>
      )}

      {/* الإحصاءات — أعداد حقيقية حسب الحالة */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing(3) }}>
        <View style={{ flexGrow: 1, flexBasis: '44%' }}>
          <StatCard dark={dark} icon="bug-outline" value={openCount} label={tr('home.openCases')} color={t.colors.info} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '44%' }}>
          <StatCard dark={dark} icon="analytics-outline" value={analyzingCount} label={tr('home.statAnalyzing')} color={t.colors.warning} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '44%' }}>
          <StatCard dark={dark} icon="help-circle-outline" value={likelyCount} label={tr('home.statLikely')} color={t.colors.accent} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '44%' }}>
          <StatCard dark={dark} icon="checkmark-done-outline" value={verifiedCount} label={tr('home.verified')} color={t.colors.success} />
        </View>
      </View>

      {/* الزر الرئيسي — حالة تصحيح جديدة */}
      <Btn dark={dark} label={`+ ${tr('home.newCase')}`} icon="add-circle-outline" onPress={onNewCase} />

      {/* إجراءات سريعة */}
      <SectionHeader dark={dark} title={tr('home.quickActions')} icon="flash-outline" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing(2) }}>
        <View style={{ flexGrow: 1, flexBasis: '30%' }}>
          <Btn dark={dark} variant="secondary" icon="add-circle-outline" label={tr('home.newCase')} onPress={onNewCase} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '30%' }}>
          <Btn dark={dark} variant="secondary" icon="scan-outline" label={tr('home.scan')} onPress={onScan} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '30%' }}>
          <Btn dark={dark} variant="secondary" icon="albums-outline" label={tr('tab.history')} onPress={onHistory ?? (() => undefined)} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '30%' }}>
          <Btn dark={dark} variant="secondary" icon="bulb-outline" label={tr('home.memory')} onPress={onMemory} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '30%' }}>
          <Btn dark={dark} variant="secondary" icon="shield-checkmark-outline" label={tr('home.security')} onPress={onSecurity} />
        </View>
      </View>

      {/* آخر الحالات */}
      <SectionHeader dark={dark} title={tr('home.recent')} icon="time-outline" />
      {recent.length === 0 ? (
        <TracewiseEmptyState dark={dark} icon="file-tray-outline" title={tr('home.empty')} />
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

      {onProjects && (
        <Btn dark={dark} variant="secondary" icon="cube-outline" label={tr('projects.title')} onPress={onProjects} />
      )}

      {/* شريط تقدم المنظومة — تذكير بالمراحل */}
      <Card dark={dark}>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny, lineHeight: 18 }}>
          {CASE_STATES_ORDER.map((s) => tr(`state.${s}`)).join(' ← ')}
        </Text>
      </Card>
    </View>
    </TracewiseBackdrop>
  );
}
