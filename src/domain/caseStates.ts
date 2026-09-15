/**
 * آلة حالات المشكلة — انتقالات قانونية فقط.
 * مفتوحة → قيد التحليل → خطة إصلاح → مرجح الحل → تم التحقق → مغلقة
 */
import { CaseState } from './types';

export const CASE_STATES_ORDER: CaseState[] = [
  'open',
  'analyzing',
  'fix_plan',
  'likely_resolved',
  'verified',
  'closed',
];

const TRANSITIONS: Record<CaseState, CaseState[]> = {
  open: ['analyzing', 'closed'],
  analyzing: ['fix_plan', 'open', 'closed'],
  fix_plan: ['likely_resolved', 'verified', 'analyzing', 'closed'],
  likely_resolved: ['verified', 'fix_plan', 'closed'], // fix_plan = انتكاسة
  verified: ['closed', 'likely_resolved'],
  closed: ['open'], // إعادة فتح
};

export function canTransition(from: CaseState, to: CaseState): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedTransitions(from: CaseState): CaseState[] {
  return TRANSITIONS[from] ?? [];
}

export function stateIndex(state: CaseState): number {
  return CASE_STATES_ORDER.indexOf(state);
}

export const CASE_STATE_LABELS: Record<CaseState, { ar: string; en: string }> = {
  open: { ar: 'مفتوحة', en: 'Open' },
  analyzing: { ar: 'قيد التحليل', en: 'Analyzing' },
  fix_plan: { ar: 'خطة إصلاح', en: 'Fix Plan' },
  likely_resolved: { ar: 'مرجح الحل', en: 'Likely Resolved' },
  verified: { ar: 'تم التحقق', en: 'Verified' },
  closed: { ar: 'مغلقة', en: 'Closed' },
};

export const SEVERITY_LABELS: Record<string, { ar: string; en: string }> = {
  low: { ar: 'منخفضة', en: 'Low' },
  medium: { ar: 'متوسطة', en: 'Medium' },
  high: { ar: 'عالية', en: 'High' },
  critical: { ar: 'حرجة', en: 'Critical' },
};
