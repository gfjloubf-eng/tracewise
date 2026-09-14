/** التكاملات — GitHub (قراءة فقط) مع سياسة كتابة: اقتراح ← موافقة ← تنفيذ */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Btn, Card, Field, SectionTitle } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { githubClient, GITHUB_READ_PERMISSIONS_AR } from '../../integrations/github';

export function IntegrationsScreen({ dark, onBrowse }: { dark: boolean; onBrowse?: () => void }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const { settings, updateSettings } = useStore();

  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showToken, setShowToken] = useState(false);

  const connect = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setError('');
    try {
      const me = await githubClient.connect(token.trim());
      await updateSettings({ github: { connected: true, username: me.login, scope: 'read-only' } });
      setToken('');
      setShowToken(false);
    } catch {
      setError(tr('integrations.failed'));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    await githubClient.disconnect();
    await updateSettings({ github: { connected: false, scope: 'read-only' } });
  };

  return (
    <View style={{ gap: t.spacing(3), padding: t.spacing(4) }}>
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800', marginTop: t.spacing(2) }}>
        {tr('integrations.title')}
      </Text>

      <Card dark={dark} style={{ gap: t.spacing(3) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: t.colors.chipBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="logo-github" size={24} color={t.colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.colors.text, fontSize: t.font.body, fontWeight: '800' }}>{tr('integrations.github')}</Text>
            <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny, lineHeight: 15 }}>
              {settings.github.connected
                ? tr('integrations.connected', { user: settings.github.username ?? '—' })
                : tr('integrations.githubDesc')}
            </Text>
          </View>
          {settings.github.connected && (
            <View style={{ backgroundColor: t.colors.successDim, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: t.colors.success, fontSize: t.font.tiny, fontWeight: '700' }}>READ ONLY</Text>
            </View>
          )}
        </View>

        {!settings.github.connected ? (
          <>
            {showToken ? (
              <>
                <Field
                  dark={dark}
                  label={tr('integrations.tokenLabel')}
                  value={token}
                  onChangeText={setToken}
                  hint={tr('integrations.tokenHint')}
                  mono
                />
                <Btn dark={dark} label={tr('integrations.connect')} onPress={connect} loading={busy} disabled={!token.trim()} />
                {error ? <Text style={{ color: t.colors.danger, fontSize: t.font.small }}>{error}</Text> : null}
              </>
            ) : (
              <Btn dark={dark} icon="link-outline" label={tr('integrations.connect')} onPress={() => setShowToken(true)} />
            )}
          </>
        ) : (
          <View style={{ gap: t.spacing(2) }}>
            <Btn dark={dark} icon="folder-open-outline" label="تصفح المستودعات" onPress={() => onBrowse?.()} />
            <Btn dark={dark} variant="danger" icon="close-circle-outline" label={tr('integrations.disconnect')} onPress={disconnect} />
          </View>
        )}
      </Card>

      <SectionTitle dark={dark} text={tr('integrations.readCaps')} icon="eye-outline" />
      <Card dark={dark}>
        {GITHUB_READ_PERMISSIONS_AR.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-circle-outline" size={14} color={t.colors.accent} />
            <Text style={{ flex: 1, color: t.colors.textMuted, fontSize: t.font.small }}>{p}</Text>
          </View>
        ))}
      </Card>

      <Card dark={dark} style={{ backgroundColor: t.colors.warningDim, borderColor: t.colors.warningDim }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Ionicons name="alert-circle-outline" size={16} color={t.colors.warning} />
          <Text style={{ flex: 1, color: t.colors.warning, fontSize: t.font.small, lineHeight: 19 }}>
            {tr('integrations.writePolicy')}
          </Text>
        </View>
      </Card>

      <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny, textAlign: 'center' }}>
        {tr('integrations.comingSoon')}
      </Text>
    </View>
  );
}
