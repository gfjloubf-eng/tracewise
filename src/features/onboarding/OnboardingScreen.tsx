/** التعريف بالتطبيق — 3 صفحات: ماذا يفعل / كيف يساعد / كيف يحمي */
import React, { useRef, useState } from 'react';
import { FlatList, Text, useWindowDimensions, View } from 'react-native';
import { getTheme } from '../../core/theme';
import { Btn, Chip, Logo } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { Ionicons } from '@expo/vector-icons';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  bodyKey: string;
}

const SLIDES: Slide[] = [
  { icon: 'git-network-outline', titleKey: 'onboarding.s1.title', bodyKey: 'onboarding.s1.body' },
  { icon: 'search-outline', titleKey: 'onboarding.s2.title', bodyKey: 'onboarding.s2.body' },
  { icon: 'shield-checkmark-outline', titleKey: 'onboarding.s3.title', bodyKey: 'onboarding.s3.body' },
];

export function OnboardingScreen({ dark, onFinish }: { dark: boolean; onFinish: () => void }) {
  const t = getTheme(dark);
  const { t: tr, rtl } = useI18n();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const go = (i: number) => {
    setIndex(i);
    listRef.current?.scrollToOffset({ offset: i * width, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: t.spacing(7), justifyContent: 'center', alignItems: 'center', gap: t.spacing(4) }}>
            <Logo size={64} dark={dark} />
            <Text style={{ color: t.colors.accent, fontSize: t.font.tiny, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              DEBUG • SOLVE • LEARN • BUILD
            </Text>
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 28,
                backgroundColor: t.colors.primaryDim,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: t.colors.cardBorder,
                marginTop: t.spacing(1),
              }}
            >
              <Ionicons name={item.icon} size={44} color={t.colors.accent} />
            </View>
            <Text style={{ color: t.colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
              {tr(item.titleKey)}
            </Text>
            <Text style={{ color: t.colors.textMuted, fontSize: t.font.body, textAlign: 'center', lineHeight: 26 }}>
              {tr(item.bodyKey)}
            </Text>
          </View>
        )}
      />
      <View style={{ padding: t.spacing(6), gap: t.spacing(4), alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 22 : 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: i === index ? t.colors.primary : t.colors.chipBg,
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: t.spacing(3), alignSelf: 'stretch' }}>
          <View style={{ flex: 1 }}>
            <Btn
              dark={dark}
              variant="secondary"
              label={index === SLIDES.length - 1 ? tr('onboarding.start') : tr('onboarding.next')}
              icon={rtl ? 'arrow-back' : 'arrow-forward'}
              onPress={() => (index === SLIDES.length - 1 ? onFinish() : go(index + 1))}
            />
          </View>
        </View>
        <Chip dark={dark} label={tr('onboarding.skip')} onPress={onFinish} />
      </View>
    </View>
  );
}
