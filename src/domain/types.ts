/**
 * TRACEWISE — Domain Models
 * أنواع البيانات الأساسية لنظام تشخيص المشاكل.
 * هذه الطبقة نقية (Pure) ولا تعتمد على أي إطار عمل.
 */

export type Lang = 'ar' | 'en';

/** أنواع الأدلة المدعومة */
export type EvidenceType =
  | 'error'
  | 'log'
  | 'screenshot'
  | 'code'
  | 'stacktrace'
  | 'commit'
  | 'issue'
  | 'pull_request'
  | 'environment'
  | 'recent_change';

export interface Evidence {
  id: string;
  caseId: string;
  type: EvidenceType;
  title: string;
  /** النص بعد الحجب (Redaction) — لا يُخزَّن أي سر هنا */
  content: string;
  /** مصدر الدليل: مسار ملف، رابط، SHA ... */
  source?: string;
  /** صورة (لقطة شاشة) بصيغة Data URI */
  imageDataUri?: string;
  createdAt: string;
  /** عدد الأسرار التي تم حجبها عند الإضافة */
  redactionCount: number;
}

/** حالات المشكلة (دورة الحياة) */
export type CaseState =
  | 'open'
  | 'analyzing'
  | 'fix_plan'
  | 'likely_resolved'
  | 'verified'
  | 'closed';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

/** فرضية سبب محتمل */
export interface Hypothesis {
  ruleId: string;
  titleAr: string;
  titleEn: string;
  /** نسبة الثقة 0..1 */
  confidence: number;
  /** الأدلة التي دعمت هذه الفرضية */
  supportingEvidenceIds: string[];
  /** فحوصات مقترحة للتأكيد */
  suggestedChecksAr: string[];
  suggestedChecksEn: string[];
  source: 'local' | 'ai';
}

/** بصمة المشكلة — تُستخدم للذاكرة والحالات المشابهة */
export interface ProblemFingerprint {
  hash: string;
  /** نوع الخطأ العام: http:401, exception:TypeError, json_parse ... */
  errorKind: string;
  /** إشارة رئيسية معيارية */
  signal: string;
  /** أول إطار في Stack Trace (ملف/دالة) بعد المعيارية */
  topFrame?: string;
  /** كلمات مفتاحية معيارية للتشابه */
  tokens: string[];
}

export interface DiagnosisResult {
  hypotheses: Hypothesis[];
  rootCauseAr?: string;
  rootCauseEn?: string;
  confidence: number;
  severity: Severity;
  analyzedAt: string;
  /** المحرك الذي أنتج النتيجة النهائية */
  engine: 'local' | 'ai';
  fingerprint: ProblemFingerprint;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface FixPlan {
  problemAr: string;
  problemEn: string;
  causeAr: string;
  causeEn: string;
  changeAr: string;
  changeEn: string;
  whyAr: string;
  whyEn: string;
  risk: RiskLevel;
  impactsAr: string[];
  impactsEn: string[];
  stepsAr: string[];
  stepsEn: string[];
  /** خطة التحقق: ما الدليل الذي يثبت الحل؟ */
  verificationHintAr: string;
  verificationHintEn: string;
  createdAt: string;
  status: 'proposed' | 'applied';
}

export type VerificationResult = 'verified' | 'likely' | 'unresolved';

export interface VerificationRecord {
  id: string;
  /** الإشارة قبل الإصلاح، مثل: HTTP 401 */
  before: string;
  /** الإشارة بعد الإصلاح، مثل: HTTP 200 */
  after: string;
  /** أدلة جديدة تدعم "بعد" — بدونها لا يمكن اعتبار الحل موثّقًا */
  evidenceIds: string[];
  result: VerificationResult;
  note?: string;
  createdAt: string;
}

export interface DebugCase {
  id: string;
  title: string;
  description: string;
  language?: string;
  framework?: string;
  platform?: string;
  errorMessage?: string;
  stackTrace?: string;
  codeSnippet?: string;
  environment?: string;
  recentChange?: string;
  triedFixes?: string;
  state: CaseState;
  severity: Severity;
  /** بيانات تجريبية للتعريف بالتطبيق */
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  evidence: Evidence[];
  diagnosis?: DiagnosisResult;
  fixPlan?: FixPlan;
  verifications: VerificationRecord[];
  fingerprint?: ProblemFingerprint;
  tags: string[];
}

export interface CaseInput {
  title: string;
  description: string;
  language?: string;
  framework?: string;
  platform?: string;
  errorMessage?: string;
  stackTrace?: string;
  codeSnippet?: string;
  environment?: string;
  recentChange?: string;
  triedFixes?: string;
}

export interface AppSettings {
  lang: Lang;
  darkMode: boolean;
  /** Redaction مفعل دائمًا — الإعداد للعرض والتأكيد فقط */
  redactionEnabled: boolean;
  notificationsEnabled: boolean;
  ai: {
    enabled: boolean;
    provider: 'openai-compatible';
    baseUrl: string;
    model: string;
    /** هل تم حفظ مفتاح API (في SecureStore)؟ */
    hasApiKey: boolean;
    /** إرسال بيانات (بعد الحجب) للذكاء الاصطناعي يتطلب موافقة صريحة */
    sendRedactedData: boolean;
  };
  github: {
    connected: boolean;
    username?: string;
    /** READ ONLY فقط — أي كتابة تتطلب موافقة */
    scope: 'read-only';
  };
  onboarded: boolean;
}

export interface SecurityLogEntry {
  id: string;
  at: string;
  kind: 'redaction' | 'outbound' | 'scan' | 'github';
  messageAr: string;
  messageEn: string;
  /** عدد الأسرار التي حُجبت (بدون محتوى الأسرار!) */
  count?: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  lang: 'ar',
  darkMode: true,
  redactionEnabled: true,
  notificationsEnabled: false,
  ai: {
    enabled: false,
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hasApiKey: false,
    sendRedactedData: false,
  },
  github: { connected: false, scope: 'read-only' },
  onboarded: false,
};
