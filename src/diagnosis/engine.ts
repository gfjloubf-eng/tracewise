/**
 * محرك التشخيص — يشغّل القواعد المحلية أولًا، ثم (اختياريًا) الذكاء الاصطناعي.
 * القواعد المحلية لا تحتاج إنترنت وتعمل دائمًا.
 */
import {
  DebugCase,
  DiagnosisResult,
  Evidence,
  FixPlan,
  Hypothesis,
  Severity,
} from '../domain/types';
import { assessSeverity } from '../domain/severity';
import { buildFingerprint } from '../domain/fingerprint';
import { RULES, DiagnosisRule } from './rules';
import { analyzeWithAi, AiError } from '../ai/gateway';

export interface DiagnosisContext {
  debugCase: DebugCase;
  /** كل النصوص المتاحة: وصف المشكلة + رسائل الخطأ + الأدلة */
  fullText: string;
  evidenceBySource: Map<string, string[]>; // ruleText -> evidenceIds
}

export function buildContext(debugCase: DebugCase): DiagnosisContext {
  const parts: string[] = [
    debugCase.title,
    debugCase.description,
    debugCase.errorMessage || '',
    debugCase.stackTrace || '',
    debugCase.environment || '',
    debugCase.recentChange || '',
    debugCase.triedFixes || '',
    debugCase.language || '',
    debugCase.framework || '',
  ];
  const evidenceBySource = new Map<string, string[]>();
  for (const ev of debugCase.evidence) {
    parts.push(ev.title, ev.content);
    evidenceBySource.set(ev.id, [ev.id]);
  }
  return { debugCase, fullText: parts.filter(Boolean).join('\n'), evidenceBySource };
}

function caseTextFields(c: DebugCase): string[] {
  return [c.errorMessage, c.stackTrace, c.description, c.codeSnippet].filter(Boolean) as string[];
}

/** الأدلة التي ساندت قاعدة معينة */
function supportingEvidence(rule: DiagnosisRule, debugCase: DebugCase): string[] {
  const ids: string[] = [];
  for (const ev of debugCase.evidence) {
    const text = `${ev.title}\n${ev.content}`;
    if (rule.pattern.test(text)) ids.push(ev.id);
  }
  return ids;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** تنفيذ القواعد المحلية وإرجاع فرضيات مرتبة */
export function runLocalRules(ctx: DiagnosisContext): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];
  for (const rule of RULES) {
    if (!rule.pattern.test(ctx.fullText)) continue;

    let confidence = rule.baseConfidence;
    // إشارات مساندة ترفع الثقة
    for (const sp of rule.supportPatterns ?? []) {
      if (sp.test(ctx.fullText)) confidence += 0.08;
    }
    // حقول الحالة المباشرة (errorMessage/stackTrace) أقوى من الحقول العامة
    if (caseTextFields(ctx.debugCase).some((t) => rule.pattern.test(t))) {
      confidence += 0.1;
    }
    const supporting = supportingEvidence(rule, ctx.debugCase);
    confidence += Math.min(0.12, supporting.length * 0.04);

    hypotheses.push({
      ruleId: rule.id,
      titleAr: rule.titleAr,
      titleEn: rule.titleEn,
      confidence: clamp(confidence, 0.2, 0.95),
      supportingEvidenceIds: supporting,
      suggestedChecksAr: rule.checksAr,
      suggestedChecksEn: rule.checksEn,
      source: 'local',
    });
  }
  return hypotheses.sort((a, b) => b.confidence - a.confidence);
}

/** توليد خطة الإصلاح من الفرضية الأعلى */
export function buildFixPlan(top: Hypothesis, debugCase: DebugCase): FixPlan {
  const rule = RULES.find((r) => r.id === top.ruleId);
  const now = new Date().toISOString();
  if (!rule) {
    return {
      problemAr: debugCase.title,
      problemEn: debugCase.title,
      causeAr: top.titleAr,
      causeEn: top.titleEn,
      changeAr: 'جمع أدلة إضافية وتحليل أعمق لتحديد التغيير المطلوب.',
      changeEn: 'Collect more evidence and analyze deeper to determine the change.',
      whyAr: 'لا توجد قاعدة محلية مطابقة بثقة كافية.',
      whyEn: 'No local rule matched with enough confidence.',
      risk: 'medium',
      impactsAr: ['غير محدد بعد'],
      impactsEn: ['Undetermined'],
      stepsAr: ['أضف أدلة (Log، Stack Trace، لقطة)', 'أعد التحليل'],
      stepsEn: ['Add evidence (logs, stack, screenshot)', 'Re-run analysis'],
      verificationHintAr: 'أضف دليلًا جديدًا يثبت زوال إشارة الخطأ.',
      verificationHintEn: 'Add new evidence proving the failure signal is gone.',
      createdAt: now,
      status: 'proposed',
    };
  }
  return {
    problemAr: debugCase.title,
    problemEn: debugCase.title,
    causeAr: top.titleAr,
    causeEn: top.titleEn,
    previewBefore: rule.fix.previewBefore,
    previewAfter: rule.fix.previewAfter,
    changeAr: rule.fix.changeAr,
    changeEn: rule.fix.changeEn,
    whyAr: rule.fix.whyAr,
    whyEn: rule.fix.whyEn,
    risk: rule.fix.risk,
    impactsAr: rule.fix.impactsAr,
    impactsEn: rule.fix.impactsEn,
    stepsAr: rule.fix.stepsAr,
    stepsEn: rule.fix.stepsEn,
    verificationHintAr: rule.fix.verificationHintAr,
    verificationHintEn: rule.fix.verificationHintEn,
    createdAt: now,
    status: 'proposed',
  };
}

export interface AnalyzeOptions {
  /** هل الذكاء الاصطناعي مفعّل ومتاح؟ (يُستدعى بعد القواعد المحلية فقط) */
  ai?: {
    enabled: boolean;
    baseUrl: string;
    model: string;
    apiKey?: string;
    sendRedactedData: boolean;
  };
}

/**
 * التحليل الكامل:
 * 1) قواعد محلية دائمًا
 * 2) AI اختياريًا (بعد الحجب) لرفع الجودة — لا يقرر التحقق أبدًا
 */
export async function analyzeCase(
  debugCase: DebugCase,
  options: AnalyzeOptions = {}
): Promise<{ diagnosis: DiagnosisResult; fixPlan: FixPlan }> {
  const ctx = buildContext(debugCase);
  const local = runLocalRules(ctx);

  const fingerprint = buildFingerprint({
    errorMessage: debugCase.errorMessage,
    stackTrace: debugCase.stackTrace,
    title: debugCase.title,
    description: debugCase.description,
  });

  const severity: Severity = assessSeverity([
    debugCase.errorMessage,
    debugCase.description,
    debugCase.stackTrace,
    debugCase.title,
  ]);

  let hypotheses = local;
  let engine: 'local' | 'ai' = 'local';
  let rootCauseAr = local[0]?.titleAr;
  let rootCauseEn = local[0]?.titleEn;
  let aiNoticeAr: string | undefined;

  const ai = options.ai;
  if (ai?.enabled && ai.apiKey && ai.sendRedactedData) {
    try {
      const aiHyps = await analyzeWithAi(ctx.fullText, {
        baseUrl: ai.baseUrl,
        model: ai.model,
        apiKey: ai.apiKey as string,
      });
      if (aiHyps.length > 0) {
        // فرضيات AI تُضاف بعد المحلية بثقة محدودة — القرار المحلي أولًا
        hypotheses = [...local, ...aiHyps].sort((a, b) => b.confidence - a.confidence);
        engine = 'ai';
        rootCauseAr = hypotheses[0]?.titleAr;
        rootCauseEn = hypotheses[0]?.titleEn;
      }
    } catch (e) {
      // فشل AI لا يكسر التحليل — نبقى على النتائج المحلية مع إشعار واضح
      engine = 'local';
      aiNoticeAr =
        e instanceof AiError
          ? e.message
          : 'تعذر الاتصال بالذكاء الاصطناعي — النتائج المعروضة من القواعد المحلية.';
    }
  }

  const confidence = hypotheses[0]?.confidence ?? 0;

  const diagnosis: DiagnosisResult = {
    hypotheses,
    rootCauseAr,
    rootCauseEn,
    confidence,
    severity,
    analyzedAt: new Date().toISOString(),
    engine,
    fingerprint,
    aiNoticeAr,
  };

  const top: Hypothesis =
    hypotheses[0] ?? {
      ruleId: 'unknown',
      titleAr: 'غير محدد — يحتاج أدلة إضافية',
      titleEn: 'Undetermined — more evidence needed',
      confidence: 0,
      supportingEvidenceIds: [],
      suggestedChecksAr: ['أضف رسالة الخطأ كاملة', 'أضف Stack Trace', 'أضف لقطة شاشة للشاشة المتأثرة'],
      suggestedChecksEn: ['Add the full error message', 'Add stack trace', 'Add a screenshot'],
      source: 'local',
    };

  return { diagnosis, fixPlan: buildFixPlan(top, debugCase) };
}
