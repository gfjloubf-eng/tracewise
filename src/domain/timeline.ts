/**
 * الخط الزمني للحالة — دالة نقية تدمج الأحداث المشتقة من بيانات الحالة
 * مع الأحداث الصريحة المخزنة (إعادة فتح، إغلاق…).
 */
import { ChangeKind, DebugCase, TimelineEvent } from './types';

export const CHANGE_KIND_LABELS: Record<ChangeKind, { ar: string; en: string }> = {
  code: { ar: 'تغيير كود', en: 'Code change' },
  dependency: { ar: 'تحديث اعتماديات', en: 'Dependency update' },
  config: { ar: 'إعدادات', en: 'Configuration' },
  api: { ar: 'واجهة API', en: 'API' },
  database: { ar: 'قاعدة بيانات', en: 'Database' },
  auth: { ar: 'مصادقة', en: 'Authentication' },
  platform: { ar: 'المنصة', en: 'Platform' },
  environment: { ar: 'بيئة التشغيل', en: 'Environment' },
};

let seq = 0;
function ev(
  type: TimelineEvent['type'],
  at: string,
  titleAr: string,
  titleEn: string,
  detailAr?: string,
  detailEn?: string
): TimelineEvent {
  seq += 1;
  return { id: `tl_${type}_${seq}`, type, at, titleAr, titleEn, detailAr, detailEn };
}

/** بناء الخط الزمني الكامل مرتبًا زمنيًا */
export function buildTimeline(c: DebugCase): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // أحداث مشتقة من بيانات الحالة
  events.push(ev('created', c.createdAt, 'أُنشئت المشكلة', 'Problem created', c.title, c.title));

  for (const e of c.evidence) {
    events.push(
      ev(
        'evidence',
        e.createdAt,
        `دليل جديد: ${e.title}`,
        `Evidence added: ${e.title}`,
        e.redactionCount > 0 ? `حُجبت ${e.redactionCount} قيمة سرية` : undefined,
        e.redactionCount > 0 ? `${e.redactionCount} secret(s) redacted` : undefined
      )
    );
  }

  for (const ch of c.changes ?? []) {
    const label = CHANGE_KIND_LABELS[ch.kind];
    events.push(ev('change', ch.at, `تغيير: ${label.ar}`, `Change: ${label.en}`, ch.description, ch.description));
  }

  if (c.diagnosis) {
    events.push(
      ev(
        'diagnosis',
        c.diagnosis.analyzedAt,
        'تم التحليل',
        'Diagnosis',
        c.diagnosis.rootCauseAr,
        c.diagnosis.rootCauseEn
      )
    );
    const top = c.diagnosis.hypotheses[0];
    if (top) {
      events.push(
        ev(
          'hypothesis',
          c.diagnosis.analyzedAt,
          `الفرضية الأقوى: ${top.titleAr}`,
          `Top hypothesis: ${top.titleEn}`,
          `ثقة ${Math.round(top.confidence * 100)}%`,
          `confidence ${Math.round(top.confidence * 100)}%`
        )
      );
    }
  }

  if (c.fixPlan) {
    events.push(
      ev('fix_proposed', c.fixPlan.createdAt, 'اقتُرحت خطة إصلاح', 'Fix proposed', c.fixPlan.changeAr, c.fixPlan.changeEn)
    );
    if (c.fixPlan.appliedAt) {
      events.push(ev('fix_applied', c.fixPlan.appliedAt, 'طُبّق الإصلاح', 'Fix applied'));
    }
  }

  for (const v of c.verifications) {
    const detailAr = `${v.before} ← ${v.after}`;
    if (v.result === 'verified') {
      events.push(
        ev(
          'verified',
          v.createdAt,
          'تم التحقق من الحل',
          'Verified',
          `${detailAr}${v.evidenceIds.length ? ` — ${v.evidenceIds.length} دليل` : ''}`,
          detailAr
        )
      );
    } else if (v.result === 'likely') {
      events.push(ev('likely_resolved', v.createdAt, 'مرجح الحل (بدون دليل كافٍ)', 'Likely resolved', detailAr, detailAr));
    } else {
      events.push(ev('verification_evidence', v.createdAt, 'لم تُحل — الإشارة مستمرة', 'Unresolved', detailAr, detailAr));
    }
  }

  // الأحداث الصريحة (إعادة فتح، إغلاق…)
  events.push(...(c.events ?? []));

  return events.sort((a, b) => a.at.localeCompare(b.at));
}
