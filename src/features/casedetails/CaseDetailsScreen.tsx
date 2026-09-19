/** تفاصيل المشكلة — تبويبات: الرحلة / الأدلة / التحليل / الخطة / التحقق */
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTheme } from '../../core/theme';
import { AppHeader, BottomModal, Btn } from '../../ui/components';
import { TracewiseErrorState } from '../../ui/tracewise';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { CaseState } from '../../domain/types';
import { allowedTransitions } from '../../domain/caseStates';
import { JourneyTab } from './JourneyTab';
import { EvidenceTab } from './EvidenceTab';
import { AnalysisTab } from './AnalysisTab';
import { FixPlanTab } from './FixPlanTab';
import { VerificationTab } from './VerificationTab';

type TabKey = 'journey' | 'evidence' | 'analysis' | 'fix' | 'verify';

const TABS: Array<{ key: TabKey; labelKey: string }> = [
  { key: 'journey', labelKey: 'case.journey' },
  { key: 'evidence', labelKey: 'case.evidence' },
  { key: 'analysis', labelKey: 'case.analysis' },
  { key: 'fix', labelKey: 'case.fixPlan' },
  { key: 'verify', labelKey: 'case.verification' },
];

export function CaseDetailsScreen({
  caseId,
  dark,
  onBack,
  onDeleted,
  onOpenCase,
}: {
  caseId: string;
  dark: boolean;
  onBack: () => void;
  onDeleted: () => void;
  onOpenCase?: (id: string) => void;
}) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const { cases, runAnalysis, analyzingCaseId, changeState, deleteCase } = useStore();
  const [tab, setTab] = useState<TabKey>('journey');
  const [stateModal, setStateModal] = useState(false);

  const c = cases.find((x) => x.id === caseId);
  if (!c) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <AppHeader title={tr('case.info')} dark={dark} onBack={onBack} />
        <TracewiseErrorState dark={dark} title={tr('common.error')} message={tr('case.info')} onRetry={onBack} />
      </SafeAreaView>
    );
  }

  const analyzing = analyzingCaseId === c.id;

  const confirmDelete = () =>
    Alert.alert(tr('case.deleteConfirm'), '', [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteCase(c.id);
          onDeleted();
        },
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top', 'left', 'right']}>
      <AppHeader
        title={c.title}
        dark={dark}
        onBack={onBack}
        right={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable
              onPress={() => setStateModal(true)}
              hitSlop={10}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: t.colors.accent, fontSize: 20 }}>⇄</Text>
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              hitSlop={10}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: t.colors.danger, fontSize: 18 }}>🗑</Text>
            </Pressable>
          </View>
        }
      />

      {/* شريط التبويبات */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: t.colors.cardBorder,
          backgroundColor: t.colors.bg,
        }}
      >
        {TABS.map((x) => {
          const active = tab === x.key;
          return (
            <Pressable
              key={x.key}
              onPress={() => setTab(x.key)}
              style={{
                flex: 1,
                minHeight: 46,
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderBottomColor: active ? t.colors.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  color: active ? t.colors.text : t.colors.textFaint,
                  fontSize: t.font.small,
                  fontWeight: active ? '800' : '500',
                }}
              >
                {tr(x.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: t.spacing(4), gap: t.spacing(3), paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {tab === 'journey' && (
          <JourneyTab
            c={c}
            dark={dark}
            onAnalyze={() => void runAnalysis(c.id)}
            analyzing={analyzing}
            onOpenCase={(id) => {
              onBack();
              onOpenCase?.(id);
            }}
          />
        )}
        {tab === 'evidence' && <EvidenceTab c={c} dark={dark} />}
        {tab === 'analysis' && (
          <AnalysisTab c={c} dark={dark} onAnalyze={() => void runAnalysis(c.id)} analyzing={analyzing} />
        )}
        {tab === 'fix' && (
          <FixPlanTab c={c} dark={dark} onAnalyze={() => void runAnalysis(c.id)} analyzing={analyzing} />
        )}
        {tab === 'verify' && <VerificationTab c={c} dark={dark} />}
      </ScrollView>

      {/* تغيير الحالة */}
      <BottomModal visible={stateModal} onClose={() => setStateModal(false)} dark={dark} title={tr('state.moveTo')}>
        {allowedTransitions(c.state).length === 0 ? (
          <Text style={{ color: t.colors.textMuted }}>{tr('common.no')}</Text>
        ) : (
          allowedTransitions(c.state).map((s: CaseState) => (
            <Btn
              key={s}
              dark={dark}
              variant="secondary"
              label={tr(`state.${s}`)}
              onPress={async () => {
                await changeState(c.id, s);
                setStateModal(false);
              }}
            />
          ))
        )}
      </BottomModal>
    </SafeAreaView>
  );
}
