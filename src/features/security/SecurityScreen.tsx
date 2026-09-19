/** مركز الأمان — ما يخرج من الجهاز، الأسرار المحجوبة، الصلاحيات، الفحص */
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Btn, Card } from '../../ui/components';
import { SectionHeader, TracewiseBackdrop, TracewiseEmptyState } from '../../ui/tracewise';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { GITHUB_READ_PERMISSIONS_AR } from '../../integrations/github';

export function SecurityScreen({ dark }: { dark: boolean }) {
  const t = getTheme(dark);
  const { t: tr, lang } = useI18n();
  const { securityLog, runSecurityScan, settings, cases } = useStore();
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{ scanned: number; redacted: number } | null>(null);

  const totalRedacted = useMemo(() => {
    const fromEvidence = cases.reduce((sum, c) => sum + c.evidence.reduce((s, e) => s + e.redactionCount, 0), 0);
    return fromEvidence;
  }, [cases]);

  const lastScan = securityLog.find((l) => l.kind === 'scan');

  const outbound: string[] = [];
  if (settings.ai.enabled && settings.ai.sendRedactedData) outbound.push(tr('security.outbound.ai'));
  if (settings.github.connected) outbound.push(tr('security.outbound.github'));

  const doScan = async () => {
    setScanning(true);
    const r = await runSecurityScan();
    setScanning(false);
    setLastResult(r);
  };

  return (
    <TracewiseBackdrop dark={dark}>
    <View style={{ flex: 1, gap: t.spacing(3), padding: t.spacing(4) }}>
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800', marginTop: t.spacing(2) }}>
        {tr('security.title')}
      </Text>

      <SectionHeader dark={dark} title={tr('security.outbound')} icon="cloud-upload-outline" />
      <Card dark={dark}>
        {outbound.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="lock-closed" size={15} color={t.colors.success} />
            <Text style={{ flex: 1, color: t.colors.success, fontSize: t.font.small, fontWeight: '600' }}>
              {tr('security.outbound.none')}
            </Text>
          </View>
        ) : (
          outbound.map((o, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Ionicons name="arrow-up-circle-outline" size={15} color={t.colors.warning} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 18 }}>{o}</Text>
            </View>
          ))
        )}
      </Card>

      <SectionHeader dark={dark} title={tr('security.redacted')} icon="eye-off-outline" />
      <Card dark={dark}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="shield-checkmark" size={18} color={t.colors.accent} />
          <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.body, fontWeight: '700' }}>
            {tr('security.redactedCount', { n: totalRedacted })}
          </Text>
        </View>
        <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny, lineHeight: 16 }}>
          Authorization: Bearer eyJhbGciOi... → Authorization: Bearer [REDACTED]
        </Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, marginTop: 4 }}>
          {tr('settings.redactionNote')}
        </Text>
      </Card>

      <SectionHeader dark={dark} title={tr('security.connections')} icon="wifi-outline" />
      <Card dark={dark}>
        {settings.github.connected ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="logo-github" size={16} color={t.colors.text} />
            <Text style={{ flex: 1, color: t.colors.textMuted, fontSize: t.font.small }}>api.github.com — {tr('security.githubReadOnly')}</Text>
          </View>
        ) : null}
        {settings.ai.enabled ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="sparkles-outline" size={16} color={t.colors.text} />
            <Text style={{ flex: 1, color: t.colors.textMuted, fontSize: t.font.small }}>{settings.ai.baseUrl} — {tr('settings.aiNote')}</Text>
          </View>
        ) : null}
        {!settings.github.connected && !settings.ai.enabled && (
          <Text style={{ color: t.colors.success, fontSize: t.font.small }}>{tr('security.outbound.none')}</Text>
        )}
      </Card>

      <SectionHeader dark={dark} title={tr('security.githubPerms')} icon="logo-github" />
      <Card dark={dark}>
        {GITHUB_READ_PERMISSIONS_AR.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="eye-outline" size={13} color={t.colors.textFaint} />
            <Text style={{ flex: 1, color: t.colors.textMuted, fontSize: t.font.small }}>
              {lang === 'ar' ? p : p}
            </Text>
          </View>
        ))}
        <Text style={{ color: t.colors.accent, fontSize: t.font.tiny, marginTop: 4 }}>{tr('security.githubReadOnly')}</Text>
      </Card>

      <SectionHeader dark={dark} title={tr('security.lastScan')} icon="search-outline" />
      <Card dark={dark}>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>
          {lastScan ? new Date(lastScan.at).toLocaleString(lang === 'ar' ? 'ar' : 'en') : tr('security.never')}
        </Text>
        <Btn dark={dark} icon="shield-outline" label={tr('security.runScan')} onPress={doScan} loading={scanning} />
        {lastResult && (
          <Text style={{ color: t.colors.success, fontSize: t.font.small }}>
            {tr('security.scanResult', { scanned: lastResult.scanned, redacted: lastResult.redacted })}
          </Text>
        )}
      </Card>

      <SectionHeader dark={dark} title={tr('security.log')} icon="list-outline" />
      {securityLog.length === 0 ? (
        <Text style={{ color: t.colors.textFaint, fontSize: t.font.small }}>{tr('security.logEmpty')}</Text>
      ) : (
        securityLog.slice(0, 15).map((l) => (
          <Card key={l.id} dark={dark} style={{ paddingVertical: t.spacing(3) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name={l.kind === 'redaction' ? 'eye-off-outline' : l.kind === 'scan' ? 'search-outline' : l.kind === 'outbound' ? 'cloud-upload-outline' : 'logo-github'}
                size={14}
                color={t.colors.accent}
              />
              <Text style={{ flex: 1, color: t.colors.textMuted, fontSize: t.font.small }}>
                {lang === 'ar' ? l.messageAr : l.messageEn}
              </Text>
              <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
                {new Date(l.at).toLocaleTimeString(lang === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </Card>
        ))
      )}
    </View>
    </TracewiseBackdrop>
  );
}
