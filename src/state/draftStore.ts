/**
 * مسودة «مشكلة جديدة» — حفظ/استعادة/حذف عبر AsyncStorage (بدون إنترنت).
 * الأمان: كل الحقول النصية تمر عبر redactText قبل التخزين — نفس مبدأ AppStore.
 */
import { KEYS, loadJson, removeKey, saveJson } from '../storage/kv';
import { redactText } from '../security/redaction';
import { CaseInput } from '../domain/types';

export interface NewCaseDraft extends CaseInput {
  projectId?: string;
  /** خطوة الـWizard الحالية (0..3) */
  step: number;
  updatedAt: string;
}

/** الحقول النصية التي تُحجب قبل التخزين */
const TEXT_FIELDS: Array<keyof CaseInput> = [
  'title',
  'description',
  'errorMessage',
  'stackTrace',
  'codeSnippet',
  'environment',
  'recentChange',
  'triedFixes',
];

export async function loadNewCaseDraft(): Promise<NewCaseDraft | null> {
  const d = await loadJson<NewCaseDraft>(KEYS.NEW_CASE_DRAFT);
  if (!d || typeof d.title !== 'string' || typeof d.step !== 'number') return null;
  return d;
}

/** يحفظ المسودة بعد حجب أي أسرار — ويعيد النسخة المحفوظة (بالتوقيت) */
export async function saveNewCaseDraft(
  draft: Omit<NewCaseDraft, 'updatedAt'>
): Promise<NewCaseDraft> {
  const safe = { ...draft } as Record<string, unknown>;
  for (const f of TEXT_FIELDS) {
    const v = safe[f];
    if (typeof v === 'string') safe[f] = redactText(v).text;
  }
  const full: NewCaseDraft = { ...(safe as unknown as NewCaseDraft), updatedAt: new Date().toISOString() };
  await saveJson(KEYS.NEW_CASE_DRAFT, full);
  return full;
}

export async function deleteNewCaseDraft(): Promise<void> {
  await removeKey(KEYS.NEW_CASE_DRAFT);
}

/** هل توجد مسودة فيها محتوى فعلي؟ */
export function draftHasContent(d: Omit<NewCaseDraft, 'updatedAt' | 'step'>): boolean {
  return TEXT_FIELDS.some((f) => ((d[f] as string | undefined) ?? '').trim() !== '');
}
