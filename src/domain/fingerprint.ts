/**
 * بصمة المشكلة (Problem Fingerprint)
 * استخراج إشارات معيارية من نص الخطأ + أول إطار في Stack Trace
 * وتوليد بصمة ثابتة لنفس المشكلة عبر التكرارات.
 */
import { ProblemFingerprint } from './types';

/** استخراج نوع الخطأ والإشارة الرئيسية */
export function detectSignal(text: string): { errorKind: string; signal: string } {
  const t = text || '';

  // رموز HTTP
  const http = t.match(/\b(http\s*)?(status\s*)?([45]\d{2})\b/i);
  const httpCode = http?.[3];
  if (httpCode && /\b(http|status|response|request|api|endpoint|fetch|axios|401|403|404|500|502|503)\b/i.test(t)) {
    return { errorKind: `http:${httpCode}`, signal: `HTTP ${httpCode}` };
  }

  if (/json.*(parse|syntax|decode)|unexpected token/i.test(t)) {
    return { errorKind: 'json_parse', signal: 'JSON Parse Error' };
  }
  if (/eresolve|peer dep|version conflict|could not find a version|dependency.*(conflict|resolution)/i.test(t)) {
    return { errorKind: 'dependency_conflict', signal: 'Dependency Conflict' };
  }
  if (/renderflex overflowed|overflowed by \d+ pixels/i.test(t)) {
    return { errorKind: 'layout_overflow', signal: 'Layout Overflow' };
  }
  if (/etimedout|timed?\s*out|socket hang up|network.*timeout/i.test(t)) {
    return { errorKind: 'network_timeout', signal: 'Network Timeout' };
  }
  if (/cannot read propert|null pointer|nullpointerexception|undefined is not an object|null is not an object/i.test(t)) {
    return { errorKind: 'null_reference', signal: 'Null Reference' };
  }
  if (/eaddrinuse|address already in use/i.test(t)) {
    return { errorKind: 'port_in_use', signal: 'Port In Use' };
  }
  if (/eacces|permission denied/i.test(t)) {
    return { errorKind: 'permission_denied', signal: 'Permission Denied' };
  }
  if (/cors|cross-origin|access-control-allow-origin/i.test(t)) {
    return { errorKind: 'cors', signal: 'CORS Blocked' };
  }
  if (/enotfound|getaddrinfo|dns/i.test(t)) {
    return { errorKind: 'dns_failure', signal: 'DNS Failure' };
  }
  if (/out of memory|heap out of memory|\boom\b/i.test(t)) {
    return { errorKind: 'out_of_memory', signal: 'Out Of Memory' };
  }
  if (/econnrefused|connection refused/i.test(t)) {
    return { errorKind: 'connection_refused', signal: 'Connection Refused' };
  }
  if (/self.signed|certificate|ssl_error|unable to verify/i.test(t)) {
    return { errorKind: 'ssl_cert', signal: 'SSL/Certificate Error' };
  }
  if (/\b429\b|rate limit|too many requests/i.test(t)) {
    return { errorKind: 'rate_limit', signal: 'Rate Limited' };
  }

  // اسم استثناء صريح
  const ex = t.match(/\b([A-Z][A-Za-z0-9]*(?:Exception|Error))\b/);
  if (ex) return { errorKind: `exception:${ex[1]}`, signal: ex[1] };

  return { errorKind: 'unknown', signal: 'Unknown' };
}

/** أول إطار مفيد من Stack Trace بعد المعيارية */
export function extractTopFrame(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  const lines = stack.split('\n').map((l) => l.trim());
  for (const line of lines) {
    // JS/TS: at fn (file:line:col)  أو  Dart: #0 fn (package:...)
    const js = line.match(/^at\s+(?:(.+?)\s+\()?(?:file:\/\/)?([^()]+?):(\d+)(?::\d+)?\)?$/);
    if (js) {
      const fn = js[1] || '<anonymous>';
      const file = normalizePath(js[2]);
      return `${file}::${fn}`;
    }
    const dart = line.match(/^#\d+\s+(?:async\s+)?(\S+)\s+\(([^)]+)\)/);
    if (dart) return `${normalizePath(dart[2])}::${dart[1]}`;
    const py = line.match(/^File\s+"([^"]+)",\s+line\s+\d+,\s+in\s+(\S+)/);
    if (py) return `${normalizePath(py[1])}::${py[2]}`;
  }
  return undefined;
}

/** معيارية المسار: إزالة الأدلة المطلقة وأرقام الأسطر */
export function normalizePath(p: string): string {
  return p
    .replace(/^.*[\\/]/, '') // اسم الملف فقط
    .replace(/:\d+(:\d+)?$/, '');
}

const STOP_WORDS = new Set([
  'the','a','an','and','or','of','in','to','is','are','was','on','at','for','with','error','failed','failure',
  'at','by','from','this','that','it','be','has','have','not',
]);

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/0x[a-f#]+/g, '#')
    .replace(/[^a-z\u0600-\u06ff#]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 24);
}

/** djb2 hash — بسيط وثابت */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export interface FingerprintInput {
  errorMessage?: string;
  stackTrace?: string;
  title?: string;
  description?: string;
}

export function buildFingerprint(input: FingerprintInput): ProblemFingerprint {
  const primary = input.errorMessage || input.stackTrace || `${input.title || ''} ${input.description || ''}`;
  const { errorKind, signal } = detectSignal(primary);
  const topFrame = extractTopFrame(input.stackTrace);
  const tokens = tokenize(`${input.errorMessage || ''} ${input.title || ''} ${input.description || ''}`);
  const hash = djb2(`${errorKind}|${signal}|${topFrame || ''}`);
  return { hash, errorKind, signal, topFrame, tokens };
}

/** تشابه Jaccard + مكافأة نفس نوع الخطأ (0..1) */
export function similarity(a: ProblemFingerprint, b: ProblemFingerprint): number {
  if (a.hash === b.hash) return 1;
  const sa = new Set(a.tokens);
  const sb = new Set(b.tokens);
  let inter = 0;
  sa.forEach((t) => { if (sb.has(t)) inter++; });
  const union = sa.size + sb.size - inter;
  const jaccard = union === 0 ? 0 : inter / union;
  const kindBonus = a.errorKind === b.errorKind && a.errorKind !== 'unknown' ? 0.25 : 0;
  return Math.min(1, jaccard + kindBonus);
}
