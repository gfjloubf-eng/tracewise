/**
 * محرك التحقق — يفرّق بوضوح بين:
 *  • "مرجح أن المشكلة حُلت" (بدون دليل جديد)
 *  • "تم التحقق من الحل" (مع دليل جديد يناقض إشارة الفشل)
 * الذكاء الاصطناعي لا يقرر التحقق أبدًا — القرار للدليل.
 */
import { VerificationResult } from '../domain/types';
import { detectSignal } from '../domain/fingerprint';

export interface VerificationInput {
  /** الإشارة قبل الإصلاح (من تشخيص الحالة) */
  before: string;
  /** الإشارة بعد الإصلاح كما يصفها المستخدم */
  after: string;
  /** عدد الأدلة الجديدة المرفقة لدعم "بعد" */
  newEvidenceCount: number;
}

/** استخراج إشارة قابلة للمقارنة من نص */
export function signalOf(text: string): string {
  const { errorKind, signal } = detectSignal(text);
  if (errorKind !== 'unknown') return errorKind;
  const normalized = text.trim().toLowerCase();
  return normalized.slice(0, 60);
}

/** هل تشير النصوص إلى نفس إشارة الفشل؟ */
export function sameFailureSignal(before: string, after: string): boolean {
  const a = signalOf(before);
  const b = signalOf(after);
  if (a === b) return true;
  // تطابق جزئي: http:401 مقابل "HTTP 401"
  return a.includes(b) || b.includes(a);
}

/** هل "بعد" تعاكس "قبل"؟ مثل 401 → 200 */
export function contradicts(before: string, after: string): boolean {
  const beforeHttp = before.match(/\b([1-5]\d{2})\b/)?.[1];
  const afterHttp = after.match(/\b([1-5]\d{2})\b/)?.[1];
  if (beforeHttp && afterHttp) {
    return Number(beforeHttp) >= 400 && Number(afterHttp) < 400;
  }
  // نجاح صريح بعد فشل
  if (/(fail|error|exception|refused|timeout|denied|4\d\d|5\d\d)/i.test(before) &&
      /(success|ok|200|resolved|fixed|passed|works|2\d\d)/i.test(after)) {
    return true;
  }
  if (/(فشل|خطأ|رفض|انتهت المهلة)/i.test(before) && /(نجح|يعمل|تم الحل|200)/i.test(after)) {
    return true;
  }
  return false;
}

export interface VerificationOutcome {
  result: VerificationResult;
  /** لماذا هذه النتيجة؟ (شفافية للمستخدم) */
  reasonAr: string;
  reasonEn: string;
}

export function evaluateVerification(input: VerificationInput): VerificationOutcome {
  const { before, after, newEvidenceCount } = input;

  // 1) نفس إشارة الفشل ما زالت قائمة → لم تُحل
  if (sameFailureSignal(before, after)) {
    return {
      result: 'unresolved',
      reasonAr: 'إشارة الفشل ما زالت كما هي بعد الإصلاح.',
      reasonEn: 'The same failure signal persists after the fix.',
    };
  }

  // 2) إشارة جديدة متعارضة + دليل جديد → تم التحقق
  if (newEvidenceCount > 0 && contradicts(before, after)) {
    return {
      result: 'verified',
      reasonAr: 'دليل جديد يظهر تعاكس إشارة الفشل (مثل 401 → 200). تم التحقق.',
      reasonEn: 'New evidence contradicts the failure signal (e.g. 401 → 200). Verified.',
    };
  }

  // 3) دليل جديد لكن بلا تعاكس واضح → مرجح
  if (newEvidenceCount > 0) {
    return {
      result: 'likely',
      reasonAr: 'يوجد دليل جديد لكنه لا يناقض إشارة الفشل بشكل قاطع — مرجح الحل.',
      reasonEn: 'New evidence exists but does not decisively contradict the failure — likely resolved.',
    };
  }

  // 4) بدون أي دليل جديد → مرجح فقط (لا يمكن التوثيق)
  return {
    result: 'likely',
    reasonAr: 'لا يوجد دليل جديد مرفق — لا يمكن اعتبار الحل موثقًا، فقط مرجح.',
    reasonEn: 'No new evidence attached — the fix cannot be considered verified, only likely.',
  };
}
