/**
 * بوابة الذكاء الاصطناعي — اختيارية تمامًا.
 * • لا تُستدعى إلا بموافقة صريحة (إرسال بيانات محجوبة).
 * • لا ترسل أي سر: النصوص تمر عبر Redaction أولًا.
 * • لا تقرر التحقق — التحليل المحلي يبقى الأساس.
 */
import { Hypothesis } from '../domain/types';
import { redactText } from '../security/redaction';

export interface AiConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

const SYSTEM_PROMPT = `You are TRACEWISE, a debugging assistant.
Given a developer problem with evidence, return STRICT JSON only:
{"hypotheses":[{"title":"...","confidence":0.0-1.0,"checks":["..."]}],
 "rootCause":"..."}
Rules: never invent verification, never ask for secrets, base everything on given text.`;

/**
 * تحليل نص (بعد الحجب) عبر مزود متوافق مع OpenAI chat completions.
 * يعيد فرضيات إضافية — تُدمج بعد الفرضيات المحلية.
 */
export async function analyzeWithAi(
  fullText: string,
  config: AiConfig,
  timeoutMs = 15000
): Promise<Hypothesis[]> {
  // خط دفاع إضافي: حتى لو مرّ نص غير محجوب، نحجبه هنا قبل الإرسال
  const { text } = redactText(fullText);

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
          { role: 'user', content: text.slice(0, 6000) },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    return parseAiHypotheses(content);
  } finally {
    clearTimeout(timer);
  }
}

/** تحليل استجابة AI إلى فرضيات (متسامح مع أخطاء التنسيق) */
export function parseAiHypotheses(content: string): Hypothesis[] {
  if (!content) return [];
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const raw = Array.isArray(parsed?.hypotheses) ? parsed.hypotheses : [];
    return raw
      .filter((h: unknown) => typeof h === 'object' && h !== null && typeof (h as Record<string, unknown>).title === 'string')
      .slice(0, 5)
      .map((h: Record<string, unknown>) => ({
        ruleId: `ai:${String(h.title).slice(0, 24)}`,
        titleAr: `تحليل AI: ${String(h.title)}`,
        titleEn: `AI analysis: ${String(h.title)}`,
        // ثقة AI محدودة بسقف — القرار الأول للقواعد المحلية والأدلة
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
