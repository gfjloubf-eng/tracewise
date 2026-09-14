/**
 * تقييم خطورة المشكلة من إشارات نصية.
 * دالة نقية قابلة للاختبار.
 */
import { Severity } from './types';

interface Signal {
  pattern: RegExp;
  weight: number;
}

const SIGNALS: Signal[] = [
  // أعطال كاملة
  { pattern: /\b(crash|crashed|fatal|panic|segmentation fault|app (has )?stopped)\b/i, weight: 3 },
  { pattern: /تعطل|انهيار/i, weight: 3 },
  // فقدان بيانات
  { pattern: /\b(data loss|corrupt(ed|ion)?|lost data|wiped)\b/i, weight: 5 },
  { pattern: /فقدان البيانات|تلف البيانات/i, weight: 5 },
  // بيئة الإنتاج
  { pattern: /\b(production|prod server|live)\b/i, weight: 2 },
  { pattern: /الإنتاج|البيئة الإنتاجية/i, weight: 2 },
  // أخطاء خادم
  { pattern: /\b(500|502|503|504)\b/, weight: 2 },
  { pattern: /\b(internal server error|bad gateway|service unavailable)\b/i, weight: 2 },
  // نفاد ذاكرة
  { pattern: /\b(out of memory|oom|heap (out|limit))\b/i, weight: 2 },
  // كل المستخدمين
  { pattern: /\b(all users|every user|all requests)\b/i, weight: 2 },
  { pattern: /كل المستخدمين|جميع الطلبات/i, weight: 2 },
  // مصادقة/صلاحيات
  { pattern: /\b(401|403|unauthorized|forbidden)\b/i, weight: 2 },
  // انقطاع شبكة / مهلات
  { pattern: /\b(timeout|timed out|etimedout|econnreset|socket hang up)\b/i, weight: 1 },
  // قواعد بيانات
  { pattern: /\b(econnrefused|connection refused|deadlock|too many connections)\b/i, weight: 1 },
  // واجهة
  { pattern: /\b(overflow|renderflex)\b/i, weight: 0 },
  { pattern: /\b(404|not found)\b/i, weight: 0 },
];

export function severityScore(text: string): number {
  let score = 0;
  for (const s of SIGNALS) {
    if (s.pattern.test(text)) score += s.weight;
  }
  return score;
}

export function scoreToSeverity(score: number): Severity {
  if (score >= 7) return 'critical';
  if (score >= 5) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

/** تقييم الخطورة من كل نصوص المشكلة مجتمعين */
export function assessSeverity(parts: (string | undefined)[]): Severity {
  const text = parts.filter(Boolean).join('\n');
  return scoreToSeverity(severityScore(text));
}
