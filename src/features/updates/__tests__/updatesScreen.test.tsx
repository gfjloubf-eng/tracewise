/** اختبارات واجهة مركز التحديثات — عبر حقن UpdatesApi (بلا شبكة ولا موديولات native) */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { I18nProvider } from '../../../core/i18n/I18nProvider';
import { UpdatesScreen } from '../UpdatesScreen';
import { UpdatesApi } from '../updatesService';

function fakeApi(over: Partial<UpdatesApi> = {}): UpdatesApi {
  return {
    isEnabled: true,
    runtimeVersion: '1.0.0',
    channel: 'production',
    checkForUpdateAsync: async () => ({ isAvailable: false }),
    fetchUpdateAsync: async () => ({ isNew: true }),
    reloadAsync: async () => undefined,
    ...over,
  };
}

const easManifest = (version: string, runtime: string) => ({
  extra: { expoClient: { version, runtimeVersion: runtime } },
});

async function wrap(api: UpdatesApi) {
  return await render(
    <I18nProvider lang="ar">
      <UpdatesScreen dark api={api} />
    </I18nProvider>
  );
}

describe('UpdatesScreen — واجهة صادقة', () => {
  it('خدمة غير مهيأة ⇒ تعرض «غير مهيأة» صراحة ولا تدّعي تحديثًا', async () => {
    const r = await wrap(fakeApi({ isEnabled: false }));
    await fireEvent.press(r.getByText('تحقق الآن'));
    expect(
      await r.findByText('خدمة OTA غير مهيأة لهذا البناء؛ لن ندّعي وجود تحديث.')
    ).toBeTruthy();
  });

  it('تحديث OTA: فحص ← تنزيل ← إعادة تشغيل (بلا تطبيق تلقائي)', async () => {
    const reload = jest.fn(async () => undefined);
    const r = await wrap(
      fakeApi({
        checkForUpdateAsync: async () => ({ isAvailable: true, manifest: easManifest('1.0.1', '1.0.0') }),
        reloadAsync: reload,
      })
    );
    expect(r.getByText('1.0.0')).toBeTruthy(); // الإصدار الحالي

    await fireEvent.press(r.getByText('تحقق الآن'));
    // قد تتكرر العبارة (شارة + رسالة) — findAllByText تتحمل التعدد
    const otaMatches = await r.findAllByText(/تحديث OTA/);
    expect(otaMatches.length).toBeGreaterThanOrEqual(1);
    expect(r.getByText('الإصدار المتاح: 1.0.1')).toBeTruthy();

    // لا إعادة تشغيل تلقائية
    expect(reload).not.toHaveBeenCalled();

    await fireEvent.press(r.getByText('تنزيل التحديث'));
    expect(await r.findByText(/تم تنزيل التحديث والتحقق من سلامته/)).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();

    await fireEvent.press(r.getByText('إعادة التشغيل الآن'));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('تحديث Native ⇒ شارة APK + رسالة «يتطلب APK» + لا زر تنزيل', async () => {
    const r = await wrap(
      fakeApi({
        checkForUpdateAsync: async () => ({ isAvailable: true, manifest: easManifest('1.1.0', '1.1.0') }),
      })
    );
    await fireEvent.press(r.getByText('تحقق الآن'));
    expect(await r.findByText(/يتطلب إصدار APK جديدًا/)).toBeTruthy();
    expect(r.queryByText('تنزيل التحديث')).toBeNull();
  });

  it('فحص فاشل ⇒ رسالة خطأ بلا ادعاء تحديث', async () => {
    const r = await wrap(
      fakeApi({
        checkForUpdateAsync: async () => {
          throw new TypeError('Network request failed');
        },
      })
    );
    await fireEvent.press(r.getByText('تحقق الآن'));
    expect(await r.findByText('تعذر التحقق من خدمة التحديث.')).toBeTruthy();
    expect(r.queryByText(/الإصدار المتاح/)).toBeNull();
  });
});
