/** الإعدادات — لغة، مظهر، خصوصية، AI، بيانات (تصدير/استيراد) */
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { getTheme } from '../../core/theme';
import { Btn, Card, Chip, Field, SectionTitle, ToggleRow } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { testConnection } from '../../ai/gateway';
import { secureGet } from '../../storage/secureStorage';
import { BottomModal, } from '../../ui/components';

export function SettingsScreen({ dark }: { dark: boolean }) {
  const t = getTheme(dark);
  const { t: tr, lang } = useI18n();
  const { settings, updateSettings, setAiApiKey, exportData, importData, deleteDemoCases, cases } = useStore();

  const [aiKey, setAiKey] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [consentVisible, setConsentVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const doExport = async () => {
    const data = exportData();
    await Clipboard.setStringAsync(data);
    Alert.alert(tr('settings.export'), tr('settings.exported'));
  };

  const doImport = async () => {
    const ok = await importData(importText);
    Alert.alert(tr('settings.import'), ok ? tr('settings.importOk') : tr('settings.importFail'));
    if (ok) {
      setImportText('');
      setShowImport(false);
    }
  };

  const doDeleteDemo = () =>
    Alert.alert(tr('settings.deleteDemo'), '', [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteDemoCases();
          Alert.alert(tr('settings.deleteDemo'), tr('settings.demoDeleted'));
        },
      },
    ]);

  const hasDemo = cases.some((c) => c.isDemo);

  return (
    <View style={{ gap: t.spacing(3), padding: t.spacing(4) }}>
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800', marginTop: t.spacing(2) }}>
        {tr('settings.title')}
      </Text>

      {/* اللغة */}
      <SectionTitle dark={dark} text={tr('settings.language')} icon="language-outline" />
      <Card dark={dark}>
        <View style={{ flexDirection: 'row', gap: t.spacing(2) }}>
          <Chip dark={dark} label={tr('settings.arabic')} active={lang === 'ar'} onPress={() => void updateSettings({ lang: 'ar' })} />
          <Chip dark={dark} label={tr('settings.english')} active={lang === 'en'} onPress={() => void updateSettings({ lang: 'en' })} />
        </View>
      </Card>

      {/* المظهر */}
      <SectionTitle dark={dark} text={tr('settings.appearance')} icon="color-palette-outline" />
      <Card dark={dark}>
        <ToggleRow
          dark={dark}
          label={tr('settings.darkMode')}
          value={settings.darkMode}
          onValueChange={(v) => void updateSettings({ darkMode: v })}
        />
      </Card>

      {/* الخصوصية */}
      <SectionTitle dark={dark} text={tr('settings.privacy')} icon="shield-checkmark-outline" />
      <Card dark={dark}>
        <ToggleRow
          dark={dark}
          label={tr('settings.redaction')}
          note={tr('settings.redactionNote')}
          value
          onValueChange={() => undefined}
          disabled
          lockIcon
        />
        <ToggleRow
          dark={dark}
          label={tr('settings.notifications')}
          value={settings.notificationsEnabled}
          onValueChange={(v) => void updateSettings({ notificationsEnabled: v })}
        />
      </Card>

      {/* AI */}
      <SectionTitle dark={dark} text={tr('settings.ai')} icon="sparkles-outline" />
      <Card dark={dark} style={{ gap: t.spacing(3) }}>
        <ToggleRow
          dark={dark}
          label={tr('settings.aiEnable')}
          note={tr('settings.aiNote')}
          value={settings.ai.enabled}
          onValueChange={(v) => void updateSettings({ ai: { ...settings.ai, enabled: v } })}
        />
        {settings.ai.enabled && (
          <>
            <ToggleRow
              dark={dark}
              label={tr('settings.aiSend')}
              value={settings.ai.sendRedactedData}
              onValueChange={(v) => {
                if (v) setConsentVisible(true);
                else void updateSettings({ ai: { ...settings.ai, sendRedactedData: false } });
              }}
            />
            {/* اختبار الاتصال */}
            <Btn
              dark={dark}
              variant="secondary"
              icon="pulse-outline"
              label="اختبار الاتصال بالمزود"
              loading={testing}
              onPress={async () => {
                setTesting(true);
                setTestResult('');
                const key = await secureGet('tw_ai_key');
                if (!key) {
                  setTestResult('أدخل مفتاح API أولًا.');
                } else {
                  const r = await testConnection({
                    baseUrl: settings.ai.baseUrl,
                    model: settings.ai.model,
                    apiKey: key,
                  });
                  setTestResult(r.ok ? `الاتصال ناجح ✓ (${r.model})` : r.messageAr);
                }
                setTesting(false);
              }}
            />
            {testResult ? (
              <Text
                style={{
                  color: testResult.includes('✓') ? t.colors.success : t.colors.danger,
                  fontSize: t.font.small,
                }}
              >
                {testResult}
              </Text>
            ) : null}
            <Field
              dark={dark}
              label={tr('settings.aiBaseUrl')}
              value={settings.ai.baseUrl}
              onChangeText={(v) => void updateSettings({ ai: { ...settings.ai, baseUrl: v } })}
              mono
            />
            <Field
              dark={dark}
              label={tr('settings.aiModel')}
              value={settings.ai.model}
              onChangeText={(v) => void updateSettings({ ai: { ...settings.ai, model: v } })}
              mono
            />
            <Field
              dark={dark}
              label={`${tr('settings.aiKey')} ${settings.ai.hasApiKey ? '✓' : ''}`}
              value={aiKey}
              onChangeText={setAiKey}
              mono
            />
            {aiKey.trim() ? (
              <Btn
                dark={dark}
                variant="secondary"
                label={tr('common.save')}
                onPress={async () => {
                  await setAiApiKey(aiKey.trim());
                  setAiKey('');
                }}
              />
            ) : null}
          </>
        )}
      </Card>

      {/* البيانات */}
      <SectionTitle dark={dark} text={tr('settings.data')} icon="save-outline" />
      <Card dark={dark} style={{ gap: t.spacing(3) }}>
        <Btn dark={dark} variant="secondary" icon="download-outline" label={tr('settings.export')} onPress={doExport} />
        <Btn dark={dark} variant="secondary" icon="cloud-upload-outline" label={tr('settings.import')} onPress={() => setShowImport(!showImport)} />
        {showImport && (
          <>
            <Field dark={dark} label={tr('settings.importPaste')} value={importText} onChangeText={setImportText} multiline mono />
            <Btn dark={dark} label={tr('settings.import')} onPress={doImport} disabled={!importText.trim()} />
          </>
        )}
        {hasDemo && (
          <Btn dark={dark} variant="danger" icon="trash-outline" label={tr('settings.deleteDemo')} onPress={doDeleteDemo} />
        )}
      </Card>

      <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny, textAlign: 'center' }}>
        TRACEWISE v0.1.0 — {tr('app.tagline')}
      </Text>

      {/* موافقة صريحة قبل إرسال أي بيانات */}
      <BottomModal visible={consentVisible} onClose={() => setConsentVisible(false)} dark={dark} title="موافقة صريحة مطلوبة">
        <Text style={{ color: t.colors.text, fontSize: t.font.small, lineHeight: 20 }}>
          عند التفعيل: ستُرسل نصوص حالتك إلى مزود الذكاء الاصطناعي بعد حجب الأسرار تلقائيًا (Tokens، كلمات مرور، مفاتيح).
          إذا بقي أي سر بعد الحجب يُرفض الطلب بالكامل. لا تُرسل صور، ولا يُتخذ أي قرار تحقق بناءً على AI.
        </Text>
        <Btn
          dark={dark}
          label="أوافق — فعّل الإرسال"
          icon="checkmark-circle-outline"
          onPress={async () => {
            await updateSettings({ ai: { ...settings.ai, sendRedactedData: true } });
            setConsentVisible(false);
          }}
        />
        <Btn dark={dark} variant="secondary" label={tr('common.cancel')} onPress={() => setConsentVisible(false)} />
      </BottomModal>
    </View>
  );
}
