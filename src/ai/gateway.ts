/**
 * بوابة الذكاء الاصطناعي — اختيارية تمامًا، والقرار النهائي دائمًا محلي.
 *
 * قواعد صارمة:
 *  1) لا إرسال بدون موافقة صريحة (sendRedactedData).
 *  2) Redaction قبل الإرسال + حارس ثانٍ: إذا بقي أي سر بعد الحجب يُرفض الطلب.
 *  3) Timeout + معالجة أخطاء + معالجة Rate Limit (429 + Retry-After).
 *  4) AI يقترح فقط — لا يغير حالة التحقق أبدًا (التحقق للمستخدم والدليل).
 */
import { Hypothesis } from '../domain/types';
import { redactText, containsSecrets } from '../security/redaction';

export interface AiConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

/** أخطاء مصنفة — تعرض للعربية في الواجهة */
export type AiErrorKind =
  | 'secrets_detected' // رفض: بيانات تحتوي أسرارًا حتى بعد الحجب
  | 'rate_limited' // 429
  | 'timeout'
  | 'network'
  | 'auth' // 401/403
  | 'server' // 5xx
  | 'bad_response';

export class AiError extends Error {
  kind: AiErrorKind;
  retryAfterSec?: number;
  constructor(kind: AiErrorKind, message: string, retryAfterSec?: number) {
    super(message);
    this.kind = kind;
    this.retryAfterSec = retryAfterSec;
  }
}

export const AI_ERROR_MESSAGES_AR: Record<AiErrorKind, string> = {
  secrets_detected: 'رُفض الطلب: ما زالت البيانات تحتوي قيمًا سرية بعد الحجب. لم يُرسل أي شيء.',
  rate_limited: 'تجاوزت حد الطلبات المسموح لدى المزود — حاول لاحقًا.',
  timeout: 'انتهت مهلة الاتصال بالمزود.',
  network: 'تعذر الوصول إلى مزود الذكاء الاصطناعي (تحقق من الاتصال).',
  auth: 'مفتاح API مرفوض — تحقق من المفتاح في الإعدادات.',
  server: 'خطأ في خادم المزود — حاول لاحقًا.',
  bad_response: 'استجابة غير متوقعة من المزود.',
};

const SYSTEM_PROMPT = `You are TRACEWISE, a debugging assistant.
Given a developer problem with evidence, return STRICT JSON only:
{"hypotheses":[{"title":"...","confidence":0.0-1.0,"checks":["..."]}],
 "rootCause":"..."}
Rules: never invent verification, never ask for secrets, base everything on given text.
Never claim a fix is verified — verification requires evidence and is decided by the user.`;

/** تجهيز النص للإرسال: حجب + حارس الأسرار */
export function prepareOutbound(fullText: string): string {
  const { text } = redactText(fullText);
  // حارس ثانٍ: أي سر متبقٍ بعد الحجب ⇒ رفض كامل للطلب
  if (containsSecrets(text)) {
    throw new AiError('secrets_detected', AI_ERROR_MESSAGES_AR.secrets_detected);
  }
  return text;
}

async function chatCompletion(
  config: AiConfig,
  userText: string,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userText },
        ],
      }),
      signal: controller.signal,
    });

    if (res.status === 429) {
      const retry = Number(res.headers?.get?.('retry-after')) || undefined;
      throw new AiError('rate_limited', AI_ERROR_MESSAGES_AR.rate_limited, retry);
    }
    if (res.status === 401 || res.status === 403) {
      throw new AiError('auth', AI_ERROR_MESSAGES_AR.auth);
    }
    if (res.status >= 500) {
      throw new AiError('server', AI_ERROR_MESSAGES_AR.server);
    }
    if (!res.ok) {
      throw new AiError('bad_response', `AI HTTP ${res.status}`);
    }
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    if (!content) throw new AiError('bad_response', AI_ERROR_MESSAGES_AR.bad_response);
    return content;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if ((e as Error)?.name === 'AbortError') {
      throw new AiError('timeout', AI_ERROR_MESSAGES_AR.timeout);
    }
    throw new AiError('network', AI_ERROR_MESSAGES_AR.network);
  } finally {
    clearTimeout(timer);
  }
}

/** تحليل حالة (بعد الحجب) عبر مزود متوافق مع OpenAI — فرضيات تُدمج بعد المحلية */
export async function analyzeWithAi(
  fullText: string,
  config: AiConfig,
  timeoutMs = 15000
): Promise<Hypothesis[]> {
  const safeText = prepareOutbound(fullText);
  const content = await chatCompletion(config, safeText.slice(0, 6000), timeoutMs);
  return parseAiHypotheses(content);
}

/** اختبار الاتصال من الإعدادات — يرسل أقل بيانات ممكنة */
export async function testConnection(
  config: AiConfig,
  timeoutMs = 10000
): Promise<{ ok: true; model: string } | { ok: false; messageAr: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.ok) {
      return { ok: true, model: config.model };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, messageAr: AI_ERROR_MESSAGES_AR.auth };
    }
    if (res.status === 429) {
      return { ok: false, messageAr: AI_ERROR_MESSAGES_AR.rate_limited };
    }
    return { ok: false, messageAr: `HTTP ${res.status}` };
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') {
      return { ok: false, messageAr: AI_ERROR_MESSAGES_AR.timeout };
    }
    return { ok: false, messageAr: AI_ERROR_MESSAGES_AR.network };
  }
}

/** تحليل استجابة AI إلى فرضيات — ثقة AI مسقوفة دائمًا (القرار للمحلي) */
export function parseAiHypotheses(content: string): Hypothesis[] {
  if (!content) return [];
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const raw = Array.isArray(parsed?.hypotheses) ? parsed.hypotheses : [];
    return raw
      .filter(
        (h: unknown) =>
          typeof h === 'object' && h !== null && typeof (h as Record<string, unknown>).title === 'string'
      )
      .slice(0, 5)
      .map((h: Record<string, unknown>) => ({
        ruleId: `ai:${String(h.title).slice(0, 24)}`,
        titleAr: `تحليل AI: ${String(h.title)}`,
        titleEn: `AI analysis: ${String(h.title)}`,
        // سقف صارم: حتى لو ادعى AI ثقة 1.0 تُخفض إلى 0.75
        confidence: Math.min(0.75, Math.max(0.1, Number(h.confidence) || 0.4)),
        supportingEvidenceIds: [],
        suggestedChecksAr: Array.isArray(h.checks) ? h.checks.map(String) : [],
        suggestedChecksEn: Array.isArray(h.checks) ? h.checks.map(String) : [],
        source: 'ai' as const,
      }));
  } catch {
    return [];
  }
}
