/**
 * Scanner — استخراج إشارات من نص لقطة الشاشة (OCR أو إدخال يدوي).
 * كل الاستخراج قابل للتعديل يدويًا قبل الإضافة كدليل.
 */

export interface ScanResult {
  errorMessage?: string;
  fileName?: string;
  lineNumber?: number;
  stackFrames: string[];
  packageName?: string;
  /** النص الكامل (مصدر الاستخراج) */
  rawText: string;
}

const CODE_EXT =
  '(dart|ts|tsx|js|jsx|py|java|kt|swift|go|rb|php|cs|rs|c|cpp|h|json|yaml|yml|xml|gradle|toml|env|sh)';

/** استخراج رسالة خطأ: أول سطر يحوي كلمة خطأ واضحة */
export function extractErrorMessage(text: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const strong = lines.find((l) =>
    /\b(error|exception|fatal|failed|panic|crash)\b\s*[:\-]?/i.test(l) ||
    /\b[A-Z][A-Za-z0-9]*(Exception|Error)\b/.test(l) ||
    /خطأ|استثناء|فشل/i.test(l)
  );
  return strong ? strong.slice(0, 300) : undefined;
}

/** استخراج اسم ملف كود */
export function extractFileName(text: string): string | undefined {
  const m = text.match(new RegExp(`[\\w.\\-/]+\\.${CODE_EXT}\\b`, 'i'));
  return m?.[0];
}

/** استخراج رقم سطر من الأنماط الشائعة */
export function extractLineNumber(text: string): number | undefined {
  const patterns = [
    /line\s+(\d+)/i,
    /:\s*(\d+)\s*:\s*\d+/,
    /\.(\w+)\s*:\s*(\d+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const n = Number(m[2] ?? m[1]);
      if (Number.isFinite(n) && n > 0 && n < 100000) return n;
    }
  }
  return undefined;
}

/** استخراج إطارات Stack Trace */
export function extractStackFrames(text: string, max = 10): string[] {
  const frames: string[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (/^at\s+\S+/.test(t) || /^#\d+\s+\S+/.test(t) || /^File\s+".+",\s+line\s+\d+/.test(t)) {
      frames.push(t);
      if (frames.length >= max) break;
    }
  }
  return frames;
}

/** استخراج اسم حزمة/موديول */
export function extractPackageName(text: string): string | undefined {
  const patterns = [
    /package:([\w/]+)/,
    /in module ['"]([\w.-]+)['"]/,
    /\bat\s+([\w@][\w@/.-]*)\s*\(/, // node: at module.fn (
    /ModuleNotFoundError: No module named ['"]([\w.]+)['"]/,
    /Could not resolve ['"]([\w@/.-]+)['"]/,
    /import\s+.*from\s+['"]([\w@/.-]+)['"]/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1];
  }
  return undefined;
}

/** الاستخراج الكامل من نص */
export function scanText(text: string): ScanResult {
  return {
    errorMessage: extractErrorMessage(text),
    fileName: extractFileName(text),
    lineNumber: extractLineNumber(text),
    stackFrames: extractStackFrames(text),
    packageName: extractPackageName(text),
    rawText: text,
  };
}

/**
 * واجهة OCR قابلة للاستبدال.
 * على الويب يمكن ربطها لاحقًا بـ tesseract.js، وعلى الجهاز بمحرك أصلي.
 * التطبيق لا يتوقف إذا لم يتوفر OCR — الإدخال اليدوي متاح دائمًا.
 */
export interface OcrEngine {
  readonly name: string;
  recognize(imageDataUri: string): Promise<string>;
}

export const NO_OCR: OcrEngine = {
  name: 'none',
  async recognize() {
    throw new Error('OCR_NOT_AVAILABLE');
  },
};
