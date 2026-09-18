/**
 * مركز التحديثات — فوق آلية Expo الرسمية (expo-updates) فقط.
 *
 * قواعد صارمة:
 *  1) لا ادعاء كاذب: لا حالة «تحديث تم» بدون نجاح fetch فعلي، ولا «محدّث» قبل إعادة تشغيل حقيقية.
 *  2) التصنيف: نفس runtimeVersion → OTA (JS/assets). مختلف أو غير معروف → APK (لا نقترح OTA أبدًا بلا دليل).
 *  3) أي تغيير Native (اعتمادية أصلية/أذونات/Gradle/وحدات Expo الأصلية/إعدادات Android) = إصدار APK جديد حتمًا.
 *  4) البيانات محفوظة: expo-updates لا يلمس AsyncStorage — حالات التنقيح تبقى بعد أي تحديث.
 *  5) السلامة والفشل: فحص سلامة التحديث والتراجع عند فشل التشغيل من مسؤولية expo-updates الرسمية
 *     (embedded fallback) — لا نعيد اختراعها هنا.
 */
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

/** واجهة قابلة للحقن — الإنتاج يستخدم expo-updates الحقيقي، الاختبارات تستخدم بديلًا حتميًا */
export interface UpdatesApi {
  isEnabled: boolean;
  runtimeVersion: string | null;
  channel: string | null;
  checkForUpdateAsync(): Promise<{ isAvailable: boolean; manifest?: unknown }>;
  fetchUpdateAsync(): Promise<{ isNew: boolean; manifest?: unknown }>;
  reloadAsync(): Promise<void>;
}

export function defaultUpdatesApi(): UpdatesApi {
  return {
    isEnabled: Updates.isEnabled,
    runtimeVersion: typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : null,
    channel: typeof Updates.channel === 'string' ? Updates.channel : null,
    checkForUpdateAsync: () => Updates.checkForUpdateAsync(),
    fetchUpdateAsync: () => Updates.fetchUpdateAsync(),
    reloadAsync: () => Updates.reloadAsync(),
  };
}

export type UpdateKind = 'ota' | 'apk' | 'none';

export type UpdatePhase =
  | 'idle'
  | 'not-configured'
  | 'checking'
  | 'none'
  | 'available' // تحديث متاح — لم يُنزّل بعد
  | 'downloading'
  | 'ready-to-restart' // نزل بنجاح — التطبيق ينتظر إعادة تشغيل صريحة
  | 'error';

export interface UpdateCenterState {
  phase: UpdatePhase;
  /** ota = JS/assets، apk = يحتاج بناء Native جديد */
  kind: UpdateKind;
  availableVersion: string | null;
  availableRuntime: string | null;
  sizeBytes: number | null;
  lastCheckAt: string | null;
}

export const INITIAL_STATE: UpdateCenterState = {
  phase: 'idle',
  kind: 'none',
  availableVersion: null,
  availableRuntime: null,
  sizeBytes: null,
  lastCheckAt: null,
};

export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '';
}

// ——— استخراج معلومات الـmanifest (EAS) بأمان وبأفضل جهد ———

type ManifestLike = { extra?: { expoClient?: { version?: unknown; runtimeVersion?: unknown } } };

export function manifestAppVersion(manifest: unknown): string | null {
  const v = (manifest as ManifestLike | undefined)?.extra?.expoClient?.version;
  return typeof v === 'string' && v ? v : null;
}

export function manifestRuntimeVersion(manifest: unknown): string | null {
  const v = (manifest as ManifestLike | undefined)?.extra?.expoClient?.runtimeVersion;
  return typeof v === 'string' && v ? v : null;
}

/** حجم التحديث إن كان معلومًا (مجموع أطوال الأصول) — وإلا null بلا تخمين */
export function manifestSizeBytes(manifest: unknown): number | null {
  const m = manifest as { assets?: Array<{ fileLength?: unknown }>; launchAsset?: { fileLength?: unknown } } | undefined;
  if (!m || !Array.isArray(m.assets)) return null;
  let total = typeof m.launchAsset?.fileLength === 'number' ? m.launchAsset.fileLength : 0;
  let known = typeof m.launchAsset?.fileLength === 'number';
  for (const a of m.assets) {
    if (typeof a.fileLength === 'number') {
      total += a.fileLength;
      known = true;
    }
  }
  return known ? total : null;
}

/**
 * تصنيف التحديث:
 * - نفس runtimeVersion ⇒ OTA (JavaScript/assets فقط)
 * - مختلف ⇒ APK (تغيير Native — لا يمكن لـOTA استبداله)
 * - غير معروف ⇒ APK احتياطًا (لا ندّعي OTA بلا دليل)
 */
export function classifyUpdate(
  currentRuntime: string | null,
  availableRuntime: string | null,
  isAvailable: boolean
): UpdateKind {
  if (!isAvailable) return 'none';
  if (!currentRuntime || !availableRuntime) return 'apk';
  return currentRuntime === availableRuntime ? 'ota' : 'apk';
}

// ——— انتقالات الحالة (تُستدعى من الواجهة؛ نقية تجاه التخزين — لا تلمس بيانات الحالات) ———

export async function runCheck(api: UpdatesApi, currentRuntime: string | null): Promise<UpdateCenterState> {
  if (!api.isEnabled) {
    return { ...INITIAL_STATE, phase: 'not-configured', lastCheckAt: new Date().toISOString() };
  }
  const checking: UpdateCenterState = { ...INITIAL_STATE, phase: 'checking' };
  void checking;
  try {
    const result = await api.checkForUpdateAsync();
    const kind = classifyUpdate(currentRuntime, manifestRuntimeVersion(result.manifest), result.isAvailable);
    return {
      phase: result.isAvailable ? 'available' : 'none',
      kind,
      availableVersion: manifestAppVersion(result.manifest),
      availableRuntime: manifestRuntimeVersion(result.manifest),
      sizeBytes: manifestSizeBytes(result.manifest),
      lastCheckAt: new Date().toISOString(),
    };
  } catch {
    // فشل الفحص (شبكة/خدمة) — بلا أي ادعاء بتوفر تحديث
    return { ...INITIAL_STATE, phase: 'error', lastCheckAt: new Date().toISOString() };
  }
}

/** التنزيل متاح فقط لتحديث OTA — تحديث APK يحتاج بناءً جديدًا من CI وليس تنزيلًا من داخل التطبيق */
export function canDownload(state: UpdateCenterState): boolean {
  return state.phase === 'available' && state.kind === 'ota';
}

export async function runDownload(api: UpdatesApi, state: UpdateCenterState): Promise<UpdateCenterState> {
  if (!canDownload(state)) return state; // لا تنزيل لغير OTA الجاهز
  try {
    const result = await api.fetchUpdateAsync();
    // expo-updates يفحص السلامة داخليًا ويرمي عند أي خلل — لا نصل لـready إلا بنجاح فعلي
    return { ...state, phase: 'ready-to-restart' };
  } catch {
    return { ...state, phase: 'error' };
  }
}

/** التطبيق الفعلي = إعادة تشغيل صريحة بقرار المستخدم (لا إعادة تشغيل تلقائية أبدًا) */
export async function runRestart(api: UpdatesApi): Promise<void> {
  await api.reloadAsync();
}

export function formatBytes(bytes: number | null): string | null {
  if (bytes === null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** سجل إصدارات صادق — يُحرر يدويًا مع كل إصدار (لا changelog وهمي) */
export interface ReleaseNote {
  version: string;
  kind: 'apk' | 'ota';
  notesAr: string;
  notesEn: string;
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '1.0.0',
    kind: 'apk',
    notesAr: 'أول إصدار APK: رحلة التنقيح كاملة، مسودات، ذاكرة، ماسح ضوئي، بوابة AI اختيارية، ومركز تحديثات.',
    notesEn: 'First APK release: full debugging journey, drafts, memory, scanner, optional AI gateway, updates center.',
  },
];
