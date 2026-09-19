/** شاشة البداية — الشعار + تحميل أنيق */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { getTheme } from '../../core/theme';
import { BrandLockup, TracewiseBackdrop, TracewiseLoadingState } from '../../ui/tracewise';
import { useI18n } from '../../core/i18n/I18nProvider';

export function SplashScreen({ dark, onDone }: { dark: boolean; onDone: () => void }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();

  useEffect(() => {
    const id = setTimeout(onDone, 1600);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <TracewiseBackdrop dark={dark}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing(4) }}>
        {/* الهوية الموحدة: الشعار + الاسم + الشعار اللفظي — منطق الإقلاع أعلاه لم يتغير */}
        <BrandLockup dark={dark} />
        <TracewiseLoadingState dark={dark} label={tr('splash.loading')} />
      </View>
    </TracewiseBackdrop>
  );
}
