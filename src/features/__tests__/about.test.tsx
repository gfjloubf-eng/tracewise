/** فريق الدعم + الشعار — سلوك حقيقي (واتساب/نسخ الرقم) بلا بيانات وهمية */
import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { I18nProvider } from '../../core/i18n/I18nProvider';
import { StoreProvider } from '../../state/AppStore';
import { AboutScreen } from '../about/AboutScreen';
import { Logo } from '../../ui/components';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

async function wrap(ui: React.ReactNode) {
  return await render(
    <StoreProvider>
      <I18nProvider lang="ar">{ui}</I18nProvider>
    </StoreProvider>
  );
}

describe('AboutScreen — فريق الدعم', () => {
  it('يعرض الاسم والرقم دون معلومات حساسة أخرى', async () => {
    const r = await wrap(<AboutScreen dark />);
    expect(r.getByText('عمار عادل المصوعي')).toBeTruthy();
    expect(r.getByText('WhatsApp: 712275038')).toBeTruthy();
    expect(r.getByText('DEBUG • SOLVE • LEARN • BUILD')).toBeTruthy();
  });

  it('زر WhatsApp يفتح wa.me/967712275038 فعليًا', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const r = await wrap(<AboutScreen dark />);
    await fireEvent.press(r.getByText('تواصل عبر WhatsApp'));
    expect(openSpy).toHaveBeenCalledWith('https://wa.me/967712275038');
    openSpy.mockRestore();
  });

  it('زر نسخ الرقم يستدعي الحافظة بالرقم الصحيح ويعطي تأكيدًا', async () => {
    const r = await wrap(<AboutScreen dark />);
    await fireEvent.press(r.getByText('نسخ الرقم'));
    await r.findByText('تم نسخ الرقم ✓');
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('712275038');
  });
});

describe('Logo — الهوية </> → 💡', () => {
  it('يعرض رمز الكود </> في الشعار المركزي', async () => {
    const r = await render(<Logo size={56} dark />);
    expect(r.getByText('</>')).toBeTruthy();
  });
});
