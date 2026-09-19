/**
 * اختبارات مركز التحديثات — منطق حقيقي فوق واجهة expo-updates المحقونة.
 * لا شبكة، لا بيانات وهمية: كل نتيجة تتبع سلوك الـAPI المحقون فقط.
 */
import {
  INITIAL_STATE,
  UpdateCenterState,
  UpdatesApi,
  canDownload,
  classifyUpdate,
  formatBytes,
  manifestAppVersion,
  manifestRuntimeVersion,
  manifestSizeBytes,
  runCheck,
  runDownload,
  runRestart,
} from '../updatesService';

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

const easManifest = (version: string, runtime: string, sizes?: number[]) => ({
  extra: { expoClient: { version, runtimeVersion: runtime } },
  launchAsset: { fileLength: 1_000_000 },
  assets: (sizes ?? []).map((fileLength) => ({ fileLength })),
});

describe('classifyUpdate — تمييز OTA من APK', () => {
  it('نفس runtimeVersion ⇒ OTA', () => {
    expect(classifyUpdate('1.0.0', '1.0.0', true)).toBe('ota');
  });
  it('runtimeVersion مختلف ⇒ APK (تغيير Native لا يعوّضه OTA)', () => {
    expect(classifyUpdate('1.0.0', '1.1.0', true)).toBe('apk');
  });
  it('runtimeVersion غير معروف ⇒ APK احتياطًا (لا ادعاء OTA بلا دليل)', () => {
    expect(classifyUpdate('1.0.0', null, true)).toBe('apk');
    expect(classifyUpdate(null, '1.0.0', true)).toBe('apk');
  });
  it('لا تحديث متاح ⇒ none', () => {
    expect(classifyUpdate('1.0.0', '1.0.0', false)).toBe('none');
  });
});

describe('manifest extractors', () => {
  it('يستخرج الإصدار وruntime والحجم من manifest EAS', () => {
    const m = easManifest('1.0.1', '1.0.0', [50_000, 20_000]);
    expect(manifestAppVersion(m)).toBe('1.0.1');
    expect(manifestRuntimeVersion(m)).toBe('1.0.0');
    expect(manifestSizeBytes(m)).toBe(1_070_000);
  });
  it('manifest ناقص ⇒ null بلا تخمين', () => {
    expect(manifestAppVersion({})).toBeNull();
    expect(manifestRuntimeVersion(undefined)).toBeNull();
    expect(manifestSizeBytes({ extra: {} })).toBeNull();
  });
  it('formatBytes: حجم مقروء أو null', () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('runCheck — حالات الفحص', () => {
  it('خدمة غير مهيأة ⇒ not-configured بلا أي نداء للشبكة', async () => {
    const api = fakeApi({
      isEnabled: false,
      checkForUpdateAsync: async () => {
        throw new Error('must not be called');
      },
    });
    const s = await runCheck(api, '1.0.0');
    expect(s.phase).toBe('not-configured');
    expect(s.kind).toBe('none');
    expect(s.availableVersion).toBeNull();
  });

  it('لا يوجد تحديث ⇒ none (بلا ادعاء كاذب)', async () => {
    const s = await runCheck(fakeApi(), '1.0.0');
    expect(s.phase).toBe('none');
    expect(s.availableVersion).toBeNull();
    expect(s.lastCheckAt).toBeTruthy();
  });

  it('تحديث OTA متاح ⇒ available/ota مع الإصدار والحجم', async () => {
    const api = fakeApi({
      checkForUpdateAsync: async () => ({ isAvailable: true, manifest: easManifest('1.0.1', '1.0.0', [10_000]) }),
    });
    const s = await runCheck(api, '1.0.0');
    expect(s.phase).toBe('available');
    expect(s.kind).toBe('ota');
    expect(s.availableVersion).toBe('1.0.1');
    expect(s.sizeBytes).toBe(1_010_000);
    expect(canDownload(s)).toBe(true);
  });

  it('تحديث Native متاح ⇒ available/apk — ولا يُسمح بالتنزيل الداخلي', async () => {
    const api = fakeApi({
      checkForUpdateAsync: async () => ({ isAvailable: true, manifest: easManifest('1.1.0', '1.1.0') }),
    });
    const s = await runCheck(api, '1.0.0');
    expect(s.phase).toBe('available');
    expect(s.kind).toBe('apk');
    expect(canDownload(s)).toBe(false);
  });

  it('فشل الفحص (خدمة) ⇒ error بلا ادعاء تحديث', async () => {
    const api = fakeApi({
      checkForUpdateAsync: async () => {
        throw new Error('service down');
      },
    });
    const s = await runCheck(api, '1.0.0');
    expect(s.phase).toBe('error');
    expect(s.availableVersion).toBeNull();
  });

  it('انقطاع الشبكة أثناء الفحص ⇒ error', async () => {
    const api = fakeApi({
      checkForUpdateAsync: async () => {
        throw new TypeError('Network request failed');
      },
    });
    const s = await runCheck(api, '1.0.0');
    expect(s.phase).toBe('error');
  });
});

describe('runDownload / runRestart — التنزيل والتطبيق', () => {
  const availableOta: UpdateCenterState = {
    ...INITIAL_STATE,
    phase: 'available',
    kind: 'ota',
    availableVersion: '1.0.1',
  };

  it('تنزيل OTA ناجح ⇒ ready-to-restart (وليس «تم التحديث»)', async () => {
    const s = await runDownload(fakeApi(), availableOta);
    expect(s.phase).toBe('ready-to-restart');
  });

  it('فشل التنزيل ⇒ error — لا حالة نجاح وهمية', async () => {
    const api = fakeApi({
      fetchUpdateAsync: async () => {
        throw new TypeError('Network request failed');
      },
    });
    const s = await runDownload(api, availableOta);
    expect(s.phase).toBe('error');
  });

  it('تحديث APK ⇒ runDownload لا يفعل شيئًا (لا تنزيل داخلي لـNative)', async () => {
    const apkState: UpdateCenterState = { ...availableOta, kind: 'apk' };
    const api = fakeApi({
      fetchUpdateAsync: async () => {
        throw new Error('must not be called');
      },
    });
    const s = await runDownload(api, apkState);
    expect(s).toBe(apkState);
  });

  it('التطبيق = إعادة تشغيل صريحة واحدة عبر expo-updates', async () => {
    const reload = jest.fn(async () => undefined);
    await runRestart(fakeApi({ reloadAsync: reload }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
