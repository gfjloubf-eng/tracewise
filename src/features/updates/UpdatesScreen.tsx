import React, { useState } from 'react';
import { Text } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Btn, Card, Screen, SectionTitle } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { getTheme } from '../../core/theme';

/**
 * مركز التحديثات: يستخدم expo-updates الرسمي فقط.
 * إذا لم يوجد update URL/manifest مهيأ في build، لا نعرض تحديثًا وهميًا.
 */
export function UpdatesScreen({ dark }: { dark: boolean }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'none' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const currentVersion = Constants.expoConfig?.version ?? 'غير معروف';
  const runtimeVersion = typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : 'غير مهيأ';
  const enabled = Updates.isEnabled;

  const check = async () => {
    if (!enabled) {
      setStatus('none');
      setAvailableVersion(null);
      setMessage(tr('updates.notConfigured'));
      return;
    }
    setStatus('checking');
    setMessage(tr('updates.checking'));
    try {
      const result = await Updates.checkForUpdateAsync();
      setStatus(result.isAvailable ? 'available' : 'none');
      const manifest = result.isAvailable ? (result as { manifest?: unknown }).manifest : undefined;
      const version = (manifest as { extra?: { expoClient?: { version?: unknown } } } | undefined)?.extra?.expoClient?.version;
      setAvailableVersion(typeof version === 'string' ? version : null);
      setMessage(result.isAvailable ? tr('updates.available') : tr('updates.none'));
    } catch {
      setStatus('error');
      setMessage(tr('updates.error'));
    }
  };

  return (
    <Screen dark={dark}>
      <Card dark={dark}>
        <Text style={{ color: t.colors.text, fontSize: t.font.title, fontWeight: '700' }}>{tr('updates.title')}</Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 20 }}>{tr('updates.subtitle')}</Text>
      </Card>

      <SectionTitle dark={dark} icon="information-circle-outline" text={tr('updates.current')} />
      <Card dark={dark}>
        <Text style={{ color: t.colors.text, fontSize: t.font.body }}>{tr('updates.version')}: {currentVersion}</Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>{tr('updates.runtime')}: {runtimeVersion}</Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>{tr('updates.channel')}: {enabled ? tr('updates.configured') : tr('updates.notConfiguredShort')}</Text>
      </Card>

      <SectionTitle dark={dark} icon="cloud-download-outline" text={tr('updates.check')} />
      <Card dark={dark}>
        <Btn dark={dark} icon="refresh-outline" label={tr('updates.checkButton')} loading={status === 'checking'} onPress={() => void check()} />
        {message ? <Text style={{ color: status === 'error' ? t.colors.danger : status === 'available' ? t.colors.success : t.colors.textMuted, fontSize: t.font.small, lineHeight: 20 }}>{message}</Text> : null}
        {availableVersion ? <Text style={{ color: t.colors.success, fontSize: t.font.small }}>{tr('updates.availableVersion')}: {availableVersion}</Text> : null}
      </Card>

      <SectionTitle dark={dark} icon="list-outline" text={tr('updates.changelog')} />
      <Card dark={dark}>
        <Text style={{ color: t.colors.text, fontSize: t.font.body, fontWeight: '600' }}>{tr('updates.releaseCurrent')}</Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 20 }}>{tr('updates.releaseCurrentBody')}</Text>
        <Text style={{ color: t.colors.warning, fontSize: t.font.small, lineHeight: 20 }}>{tr('updates.nativeNote')}</Text>
      </Card>
    </Screen>
  );
}

export default UpdatesScreen;
