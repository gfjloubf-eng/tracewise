import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Card, Screen, SectionTitle } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { getTheme } from '../../core/theme';
import {
  UpdateCenterState,
  UpdatesApi,
  INITIAL_STATE,
  RELEASE_NOTES,
  canDownload,
  currentAppVersion,
  defaultUpdatesApi,
  formatBytes,
  runCheck,
  runDownload,
  runRestart,
} from './updatesService';

/**
 * مركز التحديثات: يستخدم expo-updates الرسمي فقط (عبر updatesService).
 * - لا تحديث وهمي: بلا خدمة مهيأة تظهر الحالة «غير مهيأة» بصراحة.
 * - OTA = JS/assets بنفس runtimeVersion. أي تغيير Native ⇒ «يحتاج APK» بدون زر تنزيل.
 * - لا تنزيل/تطبيق تلقائي — كل خطوة بقرار المستخدم.
 */
export function UpdatesScreen({ dark, api }: { dark: boolean; api?: UpdatesApi }) {
  const t = getTheme(dark);
  const { t: tr, pick } = useI18n();
  const updatesApi = useMemo(() => api ?? defaultUpdatesApi(), [api]);

  const [state, setState] = useState<UpdateCenterState>(INITIAL_STATE);
  const [busy, setBusy] = useState<'check' | 'download' | 'restart' | null>(null);

  const appVersion = currentAppVersion();
  const runtimeVersion = updatesApi.runtimeVersion ?? tr('updates.notConfiguredShort');

  const check = async () => {
    setBusy('check');
    setState((s) => ({ ...s, phase: 'checking' }));
    const next = await runCheck(updatesApi, updatesApi.runtimeVersion);
    setState(next);
    setBusy(null);
  };

  const download = async () => {
    if (!canDownload(state)) return; // الحارس: OTA متاح فقط
    setBusy('download');
    setState((s) => ({ ...s, phase: 'downloading' }));
    // نمرر الحالة الأصلية (available) — runDownload يفحص canDownload بنفسه
    const next = await runDownload(updatesApi, state);
    setState(next);
    setBusy(null);
  };

  const restart = async () => {
    setBusy('restart');
    try {
      await runRestart(updatesApi);
    } finally {
      setBusy(null);
    }
  };

  const phaseMessage = (): string => {
    switch (state.phase) {
      case 'checking':
        return tr('updates.checking');
      case 'none':
        return tr('updates.none');
      case 'not-configured':
        return tr('updates.notConfigured');
      case 'downloading':
        return tr('updates.downloading');
      case 'ready-to-restart':
        return tr('updates.readyToRestart');
      case 'error':
        return tr('updates.error');
      case 'available':
        return state.kind === 'ota' ? tr('updates.available') : tr('updates.apkNeeded');
      default:
        return '';
    }
  };

  const msg = phaseMessage();
  const sizeText = formatBytes(state.sizeBytes);
  const lastCheck = state.lastCheckAt
    ? new Date(state.lastCheckAt).toLocaleString(pick({ ar: 'ar', en: 'en' }), {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Screen dark={dark}>
      <Card dark={dark}>
        <Text style={{ color: t.colors.text, fontSize: t.font.title, fontWeight: '700' }}>{tr('updates.title')}</Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 20 }}>{tr('updates.subtitle')}</Text>
      </Card>

      <SectionTitle dark={dark} icon="information-circle-outline" text={tr('updates.current')} />
      <Card dark={dark}>
        <Text style={{ color: t.colors.text, fontSize: t.font.body }}>
          {tr('updates.version')}: {appVersion || '—'}
        </Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>
          {tr('updates.runtime')}: {runtimeVersion}
        </Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>
          {tr('updates.channel')}: {updatesApi.isEnabled ? updatesApi.channel ?? tr('updates.configured') : tr('updates.notConfiguredShort')}
        </Text>
        {lastCheck ? (
          <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
            {tr('updates.lastCheck')}: {lastCheck}
          </Text>
        ) : null}
      </Card>

      <SectionTitle dark={dark} icon="cloud-download-outline" text={tr('updates.check')} />
      <Card dark={dark} style={{ gap: t.spacing(2) }}>
        <Btn
          dark={dark}
          icon="refresh-outline"
          label={tr('updates.checkButton')}
          loading={busy === 'check'}
          onPress={() => void check()}
        />

        {state.phase === 'available' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons
              name={state.kind === 'ota' ? 'flash-outline' : 'phone-portrait-outline'}
              size={16}
              color={state.kind === 'ota' ? t.colors.success : t.colors.warning}
            />
            <Text
              style={{
                color: state.kind === 'ota' ? t.colors.success : t.colors.warning,
                fontSize: t.font.small,
                fontWeight: '800',
              }}
            >
              {state.kind === 'ota' ? tr('updates.kindOta') : tr('updates.kindApk')}
            </Text>
          </View>
        )}

        {state.availableVersion ? (
          <Text style={{ color: t.colors.text, fontSize: t.font.small }}>
            {tr('updates.availableVersion')}: {state.availableVersion}
          </Text>
        ) : null}
        {sizeText ? (
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>
            {tr('updates.size')}: {sizeText}
          </Text>
        ) : null}

        {msg ? (
          <Text
            style={{
              color:
                state.phase === 'error'
                  ? t.colors.danger
                  : state.phase === 'available' || state.phase === 'ready-to-restart'
                    ? t.colors.success
                    : t.colors.textMuted,
              fontSize: t.font.small,
              lineHeight: 20,
            }}
          >
            {msg}
          </Text>
        ) : null}

        {canDownload(state) && (
          <Btn
            dark={dark}
            variant="secondary"
            icon="download-outline"
            label={tr('updates.download')}
            loading={busy === 'download'}
            onPress={() => void download()}
          />
        )}
        {state.phase === 'downloading' && (
          <Btn dark={dark} variant="secondary" icon="download-outline" label={tr('updates.downloading')} loading disabled onPress={() => undefined} />
        )}
        {state.phase === 'ready-to-restart' && (
          <Btn
            dark={dark}
            variant="success"
            icon="refresh-circle-outline"
            label={tr('updates.restartNow')}
            loading={busy === 'restart'}
            onPress={() => void restart()}
          />
        )}
      </Card>

      <SectionTitle dark={dark} icon="list-outline" text={tr('updates.changelog')} />
      {RELEASE_NOTES.map((r) => (
        <Card key={r.version} dark={dark}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: t.colors.text, fontSize: t.font.body, fontWeight: '700' }}>{r.version}</Text>
            <View
              style={{
                backgroundColor: r.kind === 'ota' ? t.colors.successDim : t.colors.warningDim,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: r.kind === 'ota' ? t.colors.success : t.colors.warning,
                  fontSize: t.font.tiny,
                  fontWeight: '800',
                }}
              >
                {r.kind === 'ota' ? tr('updates.kindOta') : tr('updates.kindApk')}
              </Text>
            </View>
          </View>
          <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 20 }}>
            {pick({ ar: r.notesAr, en: r.notesEn })}
          </Text>
        </Card>
      ))}
      <Card dark={dark} style={{ backgroundColor: t.colors.infoDim, borderColor: t.colors.infoDim }}>
        <Text style={{ color: t.colors.text, fontSize: t.font.tiny, lineHeight: 17 }}>{tr('updates.nativeNote')}</Text>
      </Card>
    </Screen>
  );
}

export default UpdatesScreen;
