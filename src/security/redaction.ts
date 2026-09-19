/**
 * Secret Redaction — اكتشاف وحجب الأسرار قبل التخزين أو الإرسال.
 * لا يُخزَّن أي سر في السجلات: فقط نوعه وعدده.
 */

export interface RedactionHit {
  kind: string;
  /** نص معتم للعرض مثل: Bearer [REDACTED] */
  masked: string;
}

export interface RedactionResult {
  text: string;
  hits: RedactionHit[];
}

const REDACTED = '[REDACTED]';

interface Pattern {
  kind: string;
  regex: RegExp;
  replace: string | ((m: RegExpExecArray) => string);
}

/**
 * الترتيب مهم: الأنماط الأكثر تحديدًا أولًا.
 */
const PATTERNS: Pattern[] = [
  {
    kind: 'private_key',
    regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
    replace: `-----BEGIN PRIVATE KEY----- ${REDACTED} -----END PRIVATE KEY-----`,
  },
  {
    kind: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/g,
    replace: '[REDACTED_JWT]',
  },
  {
    // توحيد: Bearer [REDACTED_JWT] ← Bearer [REDACTED]
    kind: 'bearer_token',
    regex: /\bBearer\s+\[REDACTED_JWT\]/g,
    replace: `Bearer ${REDACTED}`,
  },
  {
    kind: 'authorization_header',
    // (?!\[REDACTED) ⇒ Idempotent: لا يعيد حجب قيمة محجوبة بالفعل
    regex: /(\bauthorization\s*[:=]\s*(?:bearer|basic|token)\s+)(?!\[REDACTED)\S+/gi,
    replace: `$1${REDACTED}`,
  },
  {
    kind: 'authorization_header',
    regex: /(\bauthorization\s*[:=]\s*)(?!\s*bearer|\s*basic|\s*token|\[REDACTED)\S[\S]*/gi,
    replace: `$1${REDACTED}`,
  },
  {
    kind: 'bearer_token',
    regex: /\bBearer\s+[A-Za-z0-9._~+/\\-]{8,}={0,2}/g,
    replace: `Bearer ${REDACTED}`,
  },
  {
    kind: 'aws_key',
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    replace: '[REDACTED_AWS_KEY]',
  },
  {
    kind: 'github_token',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g,
    replace: '[REDACTED_GITHUB_TOKEN]',
  },
  {
    kind: 'github_pat',
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
    replace: '[REDACTED_GITHUB_PAT]',
  },
  {
    kind: 'slack_token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
    replace: '[REDACTED_SLACK_TOKEN]',
  },
  {
    kind: 'openai_key',
    regex: /\bsk-[A-Za-z0-9_-]{16,}\b/g,
    replace: '[REDACTED_API_KEY]',
  },
  {
    // بيانات اعتماد في رابط — greedy حتى آخر @ قبل المضيف (تغطي كلمات مرور فيها @)
    kind: 'db_credentials',
    regex: /\b([a-z][a-z0-9+.-]*):\/\/(?!\[REDACTED_CREDENTIALS\]@)[^\s'"`]*@/gi,
    replace: (m: RegExpExecArray) => `${m[1]}://[REDACTED_CREDENTIALS]@`,
  },
  {
    kind: 'credential_assignment',
    regex:
      /(\b(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|refresh[_-]?token|secret[_-]?key|client[_-]?secret|app[_-]?secret|private[_-]?key|session[_-]?key|encryption[_-]?key|password|passwd|pwd|db[_-]?password|database[_-]?password)\b\s*[:=]\s*)(['"]?)(?!\[REDACTED\])([^\s'",;}{)\]]+)\2/gi,
    replace: (m: RegExpExecArray) => `${m[1]}${m[2]}${REDACTED}${m[2]}`,
  },
];

/** حجب الأسرار في نص. يعيد النص المحجوب + ملخص (بدون محتوى الأسرار). */
export function redactText(input: string): RedactionResult {
  if (!input) return { text: input, hits: [] };
  let text = input;
  const hits: RedactionHit[] = [];

  for (const p of PATTERNS) {
    text = text.replace(p.regex, (...args: unknown[]) => {
      // args = [match, ...groups, offset, string]
      const match = args[0] as string;
      const groups = args.slice(1, args.length - 2) as string[];
      const m = [match, ...groups] as unknown as RegExpExecArray;
      let replacement =
        typeof p.replace === 'function' ? p.replace(m) : (p.replace as string);
      // توسيع مراجع المجموعات $1..$n (لأن function replacer لا يوسعها تلقائيًا)
      replacement = replacement.replace(/\$(\d)/g, (_s, n: string) => m[Number(n)] ?? '');
      hits.push({ kind: p.kind, masked: summarize(match, p.kind) });
      return replacement;
    });
  }

  return { text, hits };
}

/** ملخص آمن للعرض في مركز الأمان — لا يحتوي على السر */
function summarize(_original: string, kind: string): string {
  const labels: Record<string, string> = {
    private_key: 'مفتاح خاص (Private Key)',
    jwt: 'رمز JWT',
    authorization_header: 'ترويسة Authorization',
    bearer_token: 'رمز Bearer',
    aws_key: 'مفتاح AWS',
    github_token: 'رمز GitHub',
    github_pat: 'رمز GitHub PAT',
    slack_token: 'رمز Slack',
    openai_key: 'مفتاح API',
    db_credentials: 'بيانات اتصال قاعدة بيانات',
    basic_auth_url: 'بيانات اعتماد في رابط',
    credential_assignment: 'قيمة سرية في إعدادات',
  };
  return labels[kind] ?? kind;
}

/** هل يحتوي النص على أسرار؟ */
export function containsSecrets(input: string): boolean {
  return redactText(input).hits.length > 0;
}

/** ملخص إحصائي لأنواع الأسرار المحجوبة (للأمن — بدون محتوى) */
export function summarizeHits(hits: RedactionHit[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of hits) out[h.kind] = (out[h.kind] ?? 0) + 1;
  return out;
}
