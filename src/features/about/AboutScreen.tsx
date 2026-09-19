/** حول التطبيق — الهوية + فريق الدعم (واتساب/نسخ الرقم) */
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { Btn, Card, Logo } from '../../ui/components';
import { SectionHeader, TracewiseBackdrop, TracewiseEmptyState } from '../../ui/tracewise';
import { useI18n } from '../../core/i18n/I18nProvider';

const SUPPORT_WHATSAPP_URL = 'https://wa.me/967712275038';
const SUPPORT_PHONE = '712275038';

export function AboutScreen({ dark }: { dark: boolean }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appVersion = Constants.expoConfig?.version ?? '—';

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  const copyNumber = async () => {
    await Clipboard.setStringAsync(SUPPORT_PHONE);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
  };
  return (
    <TracewiseBackdrop dark={dark}>
    <View style={{ flex: 1, gap: t.spacing(4), padding: t.spacing(4), alignItems: 'center' }}>
      <View style={{ height: t.spacing(6) }} />
      <Logo size={84} dark={dark} />
      <Text style={{ color: t.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: 3 }}>TRACEWISE</Text>
      <Text style={{ color: t.colors.accent, fontSize: t.font.body, fontWeight: '600' }}>
        {tr('app.nameAr')} — {tr('app.subtitle')}
      </Text>
      <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>«{tr('app.tagline')}»</Text>
      <Text style={{ color: t.colors.accent, fontSize: t.font.tiny, fontWeight: '700', letterSpacing: 2.5, writingDirection: 'ltr' }}>
        DEBUG • SOLVE • LEARN • BUILD
      </Text>
      <Card dark={dark} style={{ alignSelf: 'stretch' }}>
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, lineHeight: 21 }}>{tr('about.body')}</Text>
      </Card>
      <Card dark={dark} style={{ alignSelf: 'stretch', backgroundColor: t.colors.accentDim, borderColor: t.colors.accentDim }}>
        <Text style={{ color: t.colors.accent, fontSize: t.font.small, fontWeight: '700', lineHeight: 20 }}>
          {tr('about.philosophy')}
        </Text>
      </Card>
      {/* فريق الدعم */}
      <View style={{ alignSelf: 'stretch' }}>
        <SectionHeader dark={dark} title={tr('support.title')} icon="headset-outline" />
        <Card dark={dark} style={{ gap: t.spacing(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: t.colors.primaryDim,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person-outline" size={20} color={t.colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.colors.text, fontSize: t.font.body, fontWeight: '700' }}>{tr('support.name')}</Text>
              <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, writingDirection: 'ltr', textAlign: 'left' }}>
                WhatsApp: {SUPPORT_PHONE}
              </Text>
            </View>
          </View>
          <Btn
            dark={dark}
            variant="success"
            icon="logo-whatsapp"
            label={tr('support.whatsapp')}
            onPress={() => void Linking.openURL(SUPPORT_WHATSAPP_URL)}
          />
          <Btn
            dark={dark}
            variant="secondary"
            icon={copied ? 'checkmark-outline' : 'copy-outline'}
            label={copied ? tr('support.copied') : tr('support.copy')}
            onPress={() => void copyNumber()}
          />
        </Card>
      </View>

      <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
        {tr('about.version')} {appVersion}
      </Text>
    </View>
    </TracewiseBackdrop>
  );
}
