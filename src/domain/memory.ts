/**
 * ذاكرة المبرمج — منطق نقي قابل للاختبار.
 * قاعدة صارمة: لا يُعتبر حل سابق "ناجحًا" إلا إذا كان Verified.
 */
import { DebugCase } from './types';
import { similarity } from './fingerprint';

export interface FrequentCause {
  errorKind: string;
  labelAr: string;
  labelEn: string;
  count: number;
  lastCaseId?: string;
}

/** الأسباب المتكررة: تجميع الحالات حسب نوع الخطأ في البصمة */
export function frequentCauses(cases: DebugCase[]): FrequentCause[] {
  const groups = new Map<string, FrequentCause>();
  for (const c of cases) {
    const fp = c.fingerprint ?? c.diagnosis?.fingerprint;
    if (!fp || fp.errorKind === 'unknown') continue;
    const labelAr = c.diagnosis?.rootCauseAr ?? fp.signal;
    const labelEn = c.diagnosis?.rootCauseEn ?? c.diagnosis?.rootCauseAr ?? fp.signal;
    const g = groups.get(fp.errorKind) ?? {
      errorKind: fp.errorKind,
      labelAr,
      labelEn,
      count: 0,
    };
    g.count += 1;
    g.lastCaseId = c.id;
    groups.set(fp.errorKind, g);
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

/** الحلول الناجحة: الحالات الموثّقة (verified) فقط — أو مغلقة بعد تحقق موثق */
export function successfulFixes(cases: DebugCase[]): DebugCase[] {
  return cases
    .filter((c) =>
      c.verifications.some(
        (v) => v.result === 'verified' && (c.state === 'verified' || c.state === 'closed')
      )
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface SimilarCase {
  debugCase: DebugCase;
  score: number;
  /** سبب الحالة السابقة */
  causeAr?: string;
  causeEn?: string;
  /** الحل الذي طُبق */
  fixAr?: string;
  fixEn?: string;
  /** هل الحل موثق؟ (verified) */
  verified: boolean;
  date: string;
}

/** حالات مشابهة مع كل التفاصيل — مرتبة بنسبة التشابه */
export function findSimilarCases(target: DebugCase, cases: DebugCase[], threshold = 0.3): SimilarCase[] {
  const fp = target.fingerprint ?? target.diagnosis?.fingerprint;
  if (!fp) return [];
  return cases
    .filter((c) => c.id !== target.id && (c.fingerprint || c.diagnosis?.fingerprint))
    .map((c) => {
      const cfp = c.fingerprint ?? c.diagnosis!.fingerprint;
      const score = similarity(fp, cfp);
      const lastVerified = c.verifications.find((v) => v.result === 'verified');
      return {
        debugCase: c,
        score,
        causeAr: c.diagnosis?.rootCauseAr,
        causeEn: c.diagnosis?.rootCauseEn,
        fixAr: c.fixPlan ? (c.fixPlan.status === 'applied' ? c.fixPlan.changeAr : undefined) : undefined,
        fixEn: c.fixPlan ? (c.fixPlan.status === 'applied' ? c.fixPlan.changeEn : undefined) : undefined,
        verified: !!lastVerified && (c.state === 'verified' || c.state === 'closed'),
        date: c.updatedAt,
      } satisfies SimilarCase;
    })
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
