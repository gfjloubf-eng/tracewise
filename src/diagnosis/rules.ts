/**
 * قاعدة القواعد المحلية (Local Rules Engine)
 * تعمل دون إنترنت، وهي الخط الأول قبل أي ذكاء اصطناعي.
 */
import { RiskLevel } from '../domain/types';

export interface RuleFixTemplate {
  /** معاينة كود قبل/بعد — عرض فقط، لا تُنفذ تلقائيًا أبدًا */
  previewBefore?: string;
  previewAfter?: string;
  changeAr: string;
  changeEn: string;
  whyAr: string;
  whyEn: string;
  risk: RiskLevel;
  impactsAr: string[];
  impactsEn: string[];
  stepsAr: string[];
  stepsEn: string[];
  verificationHintAr: string;
  verificationHintEn: string;
}

export interface DiagnosisRule {
  id: string;
  /** نمط المطابقة على النص الكامل */
  pattern: RegExp;
  /** وزن إضافي عند وجود إشارات مساندة */
  supportPatterns?: RegExp[];
  baseConfidence: number;
  titleAr: string;
  titleEn: string;
  checksAr: string[];
  checksEn: string[];
  fix: RuleFixTemplate;
}

export const RULES: DiagnosisRule[] = [
  {
    id: 'http_401_auth',
    pattern: /\b401\b|unauthorized|invalid (token|credentials)|token (expired|invalid)/i,
    supportPatterns: [/jwt|bearer|authorization/i, /login|session|refresh token/i],
    baseConfidence: 0.6,
    titleAr: 'مشكلة مصادقة (Authentication) محتملة',
    titleEn: 'Possible authentication problem',
    checksAr: [
      'تحقق من صلاحية التوكن وانتهاء صلاحيته',
      'تأكد من إرسال ترويسة Authorization بالتنسيق الصحيح',
      'راجع إعدادات refresh token ومنطق التجديد',
    ],
    checksEn: [
      'Check token validity and expiry',
      'Verify Authorization header format',
      'Review refresh token logic',
    ],
    fix: {
      previewBefore: `// التوكن لا يُرسل أو منتهٍ
const res = await api.post('/login', body);`,
      previewAfter: `// إرسال توكن صالح + تجديد تلقائي عند 401
api.interceptors.response.use(r => r, async (err) => {
  if (err.response?.status === 401) {
    await refreshToken();
    return api.request(err.config); // إعادة محاولة واحدة
  }
  throw err;
});`,
      changeAr: 'إصلاح إرسال/تجديد التوكن: إرسال Authorization: Bearer <token> صالح، وتجديده قبل الانتهاء.',
      changeEn: 'Fix token send/renewal: send a valid Authorization: Bearer <token> and refresh before expiry.',
      whyAr: 'رمز 401 يعني أن الخادم رفض الهوية المرسلة أو أنها منتهية.',
      whyEn: 'HTTP 401 means the server rejected the identity sent or it expired.',
      risk: 'medium',
      impactsAr: ['تدفق تسجيل الدخول', 'الجلسات الحالية', 'أي نداء API محمي'],
      impactsEn: ['Login flow', 'Existing sessions', 'Any protected API call'],
      stepsAr: [
        'اطبع (للتشخيص فقط) طول التوكن ووقت انتهائه دون محتواه',
        'تأكد من تخزين التوكن بشكل آمن وإرساله مع كل طلب',
        'أضف منطق تجديد تلقائي عند 401 ثم أعد المحاولة مرة واحدة',
      ],
      stepsEn: [
        'Log (for diagnosis only) token length and expiry, never content',
        'Ensure the token is stored securely and sent with each request',
        'Add auto-refresh on 401 then retry once',
      ],
      verificationHintAr: 'أضف دليلًا جديدًا يظهر HTTP 200 لنفس الطلب بعد الإصلاح.',
      verificationHintEn: 'Add new evidence showing HTTP 200 for the same request after the fix.',
    },
  },
  {
    id: 'http_404_route',
    pattern: /\b404\b|not found|no such (route|endpoint)|cannot (get|post|find) \//i,
    supportPatterns: [/route|endpoint|url|path/i],
    baseConfidence: 0.58,
    titleAr: 'Endpoint أو Route غير صحيح',
    titleEn: 'Incorrect endpoint or route',
    checksAr: [
      'قارن المسار المطلوب مع تعريفات الـ Routes',
      'تحقق من الـ base URL وبيئات التطوير/الإنتاج',
      'تأكد من نسخة الـ API (v1/v2)',
    ],
    checksEn: ['Compare request path with route definitions', 'Check base URL per environment', 'Verify API version'],
    fix: {
      previewBefore: `// مسار غير مسجَّل
app.get('/api/order', handler);   // المطلوب: /api/orders
fetch('/api/orders');             // → 404`,
      previewAfter: `// تصحيح المسار أو تسجيل Route الناقص
app.get('/api/orders', handler);
fetch('/api/orders');             // → 200`,
      changeAr: 'تصحيح مسار الطلب أو تسجيل الـ Route الناقص في الخادم.',
      changeEn: 'Correct the request path or register the missing route on the server.',
      whyAr: 'رمز 404 يعني أن المسار المطلوب غير موجود كما هو مكتوب.',
      whyEn: 'HTTP 404 means the requested path does not exist as written.',
      risk: 'low',
      impactsAr: ['العميل الذي ينادي المسار', 'اختبارات التكامل'],
      impactsEn: ['Clients calling the path', 'Integration tests'],
      stepsAr: ['اجلب قائمة المسارات من الخادم وقارنها', 'صحح المسار أو أضف handler ناقصًا'],
      stepsEn: ['Fetch server route list and compare', 'Fix path or add missing handler'],
      verificationHintAr: 'أضف دليلًا يظهر استجابة 200/2xx لنفس المسار.',
      verificationHintEn: 'Add evidence showing 2xx for the same path.',
    },
  },
  {
    id: 'http_5xx_server',
    pattern: /\b(500|502|503|504)\b|internal server error|bad gateway|service unavailable|gateway timeout/i,
    supportPatterns: [/stack ?trace|exception|traceback/i],
    baseConfidence: 0.6,
    titleAr: 'خطأ في الخادم (Server-side Error)',
    titleEn: 'Server-side error',
    checksAr: [
      'راجع سجلات الخادم وقت حدوث الخطأ',
      'ابحث عن Exception في Stack Trace المقابل',
      'تحقق من اعتماديات الخدمة (قاعدة بيانات، خدمات خارجية)',
    ],
    checksEn: ['Review server logs at failure time', 'Find the exception in the stack trace', 'Check service dependencies'],
    fix: {
      changeAr: 'معالجة الاستثناء في الخادم: إصلاح السبب المباشر ثم إضافة معالجة أخطاء ومراقبة.',
      changeEn: 'Handle the server exception: fix root cause, add error handling and observability.',
      whyAr: 'أخطاء 5xx تعني فشلًا داخل الخادم وليس في العميل.',
      whyEn: '5xx errors indicate failure inside the server, not the client.',
      risk: 'high',
      impactsAr: ['كل الطلبات على نفس المسار', 'زمن الاستجابة', 'المراقبة والتنبيهات'],
      impactsEn: ['All requests on that path', 'Latency', 'Monitoring and alerts'],
      stepsAr: ['حدد الاستثناء من السجلات', 'أصلح السبب في الكود', 'أضف اختبارات تغطي الحالة'],
      stepsEn: ['Identify exception from logs', 'Fix root cause in code', 'Add tests covering the case'],
      verificationHintAr: 'أضف دليلًا (Log أو استجابة) يظهر اختفاء 5xx وعودة 2xx.',
      verificationHintEn: 'Add evidence (log/response) showing 5xx gone and 2xx returned.',
    },
  },
  {
    id: 'json_parse',
    pattern: /json.*(parse|syntax|decode)|unexpected token|invalid json/i,
    supportPatterns: [/response|body|payload/i],
    baseConfidence: 0.62,
    titleAr: 'خطأ في تحليل JSON — تحقق من صيغة البيانات',
    titleEn: 'JSON parse error — validate the payload',
    checksAr: [
      'تحقق أن الاستجابة JSON فعلًا وليست HTML (صفحة خطأ)',
      'افحص الترميز (charset) و Content-Type',
      'استخدم parser متسامحًا مع تحقق مسبق',
    ],
    checksEn: ['Verify the response is really JSON, not HTML', 'Check charset and Content-Type', 'Validate before parsing'],
    fix: {
      previewBefore: `const data = JSON.parse(res.data); // قد تكون HTML`,
      previewAfter: `if (String(res.headers['content-type'] ?? '').includes('json')) {
  const data = JSON.parse(res.data);
} else {
  throw new ApiError('استجابة غير JSON: ' + res.data.slice(0, 80));
}`,
      changeAr: 'التحقق من نوع المحتوى قبل التحليل، ومعالجة الاستجابات غير JSON برسالة واضحة.',
      changeEn: 'Check content type before parsing and handle non-JSON responses with a clear message.',
      whyAr: 'الخطأ يحدث عند محاولة قراءة نص ليس JSON صالحًا.',
      whyEn: 'The error occurs when reading text that is not valid JSON.',
      risk: 'low',
      impactsAr: ['كل نقاط تحليل الاستجابات'],
      impactsEn: ['All response-parsing points'],
      stepsAr: ['اطبع أول 100 حرف من الاستجابة عند الفشل', 'أضف تحقق Content-Type', 'عالج الحالة برسالة مفهومة'],
      stepsEn: ['Print first 100 chars on failure', 'Add Content-Type check', 'Handle with a clear message'],
      verificationHintAr: 'أضف دليلًا يظهر نجاح التحليل لبيانات حقيقية.',
      verificationHintEn: 'Add evidence showing successful parsing of real data.',
    },
  },
  {
    id: 'dependency_conflict',
    pattern: /eresolve|peer dep|version conflict|could not find a version|incompatible versions|dependency (resolution|conflict)/i,
    supportPatterns: [/package\.json|pubspec|requirements|gradle|cargo/i],
    baseConfidence: 0.65,
    titleAr: 'تعارض إصدارات بين الاعتماديات',
    titleEn: 'Dependency version conflict',
    checksAr: [
      'حدد الحزم المتعارضة وإصداراتها المطلوبة',
      'راجع changelog للحزمة المحدثة',
      'ثبّت إصدارات متوافقة معًا في قفل واحد (lockfile)',
    ],
    checksEn: ['Identify conflicting packages', 'Review changelogs', 'Pin compatible versions in lockfile'],
    fix: {
      changeAr: 'تثبيت إصدارات متوافقة وتحديث ملف القفل، مع تجنب --force.',
      changeEn: 'Pin compatible versions and update the lockfile; avoid --force.',
      whyAr: 'مدير الحزم لا يجد مجموعة إصدارات تحقق كل القيود.',
      whyEn: 'The package manager cannot find a version set satisfying all constraints.',
      risk: 'medium',
      impactsAr: ['البناء', 'سلوك الحزم المحدثة', 'CI'],
      impactsEn: ['Build', 'Updated package behavior', 'CI'],
      stepsAr: ['اقرأ رسالة التعارض كاملة', 'ثبّت الإصدار المتوافق', 'أعد التثبيت النظيف'],
      stepsEn: ['Read the full conflict message', 'Pin compatible version', 'Clean reinstall'],
      verificationHintAr: 'أضف دليل Log يثبت نجاح التثبيت/البناء.',
      verificationHintEn: 'Add log evidence of successful install/build.',
    },
  },
  {
    id: 'layout_overflow',
    pattern: /renderflex overflowed|overflowed by \d+ pixels|layout.*(overflow|constraint)/i,
    supportPatterns: [/widget|flutter|css|flex/i],
    baseConfidence: 0.66,
    titleAr: 'تجاوز حدود التخطيط (Layout Overflow)',
    titleEn: 'Layout overflow',
    checksAr: [
      'افحص قيود العرض/الارتفاع للأب',
      'استخدم Flexible/Expanded أو overflow مناسب للنص',
      'اختبر على أصغر شاشة مدعومة',
    ],
    checksEn: ['Check parent width/height constraints', 'Use Flexible/Expanded or text overflow', 'Test on smallest screen'],
    fix: {
      changeAr: 'تعديل قيود التخطيط: تغليف العناصر المرنة أو السماح بالتمرير/التقصير.',
      changeEn: 'Adjust layout constraints: wrap flexible children or allow scroll/ellipsis.',
      whyAr: 'المحتوى أكبر من المساحة المتاحة داخل الحاوية.',
      whyEn: 'Content exceeds the space available inside its container.',
      risk: 'low',
      impactsAr: ['الشاشة المتأثرة فقط', 'الشاشات الصغيرة'],
      impactsEn: ['Only affected screen', 'Small screens'],
      stepsAr: ['حدد العنصر المتجاوز من رسالة الخطأ', 'أضف مرونة أو تمريرًا', 'اختبر أحجام شاشات مختلفة'],
      stepsEn: ['Find overflowing widget from error', 'Add flexibility or scrolling', 'Test multiple screen sizes'],
      verificationHintAr: 'أضف لقطة شاشة بعد الإصلاح تظهر اختفاء التحذير.',
      verificationHintEn: 'Add a post-fix screenshot showing the warning gone.',
    },
  },
  {
    id: 'network_timeout',
    pattern: /etimedout|timed?\s*out|socket hang up|network.*timeout|request timeout/i,
    supportPatterns: [/fetch|axios|http|api/i],
    baseConfidence: 0.55,
    titleAr: 'انتهاء مهلة الشبكة — تحقق من الاتصال ووقت الاستجابة',
    titleEn: 'Network timeout — check connectivity and latency',
    checksAr: [
      'تحقق من اتصال الشبكة وDNS',
      'قِس زمن استجابة الخادم فعليًا',
      'راجع قيم timeout وإعادة المحاولة',
    ],
    checksEn: ['Check network/DNS', 'Measure actual server latency', 'Review timeout and retry values'],
    fix: {
      changeAr: 'ضبط مهلة مناسبة + إعادة محاولة تدريجية (exponential backoff) مع حالة تحميل واضحة.',
      changeEn: 'Set sensible timeout + exponential backoff retry with clear loading state.',
      whyAr: 'الطلب لا يكتمل خلال المهلة المحددة.',
      whyEn: 'The request does not complete within the configured timeout.',
      risk: 'medium',
      impactsAr: ['تجربة المستخدم عند الشبكة الضعيفة', 'حِمل الخادم عند إعادة المحاولة'],
      impactsEn: ['UX on weak networks', 'Server load on retries'],
      stepsAr: ['زد المهلة مؤقتًا للتشخيص', 'أضف backoff', 'أضف رسالة خطأ واضحة للمستخدم'],
      stepsEn: ['Raise timeout temporarily', 'Add backoff', 'Show a clear user-facing error'],
      verificationHintAr: 'أضف دليلًا يظهر اكتمال الطلب بنجاح ضمن المهلة.',
      verificationHintEn: 'Add evidence showing the request completing within timeout.',
    },
  },
  {
    id: 'null_reference',
    pattern: /cannot read propert|null pointer|nullpointerexception|undefined is not an object|null is not an object|null check operator/i,
    supportPatterns: [/stack ?trace|at .+:\d+:\d+/i],
    baseConfidence: 0.58,
    titleAr: 'وصول إلى قيمة فارغة (Null/Undefined)',
    titleEn: 'Null/undefined reference',
    checksAr: [
      'حدد السطر من Stack Trace وافحص مصدر القيمة',
      'تحقق من الاستجابة/البيانات التي قد تخلو من الحقل',
      'أضف تحققًا اختياريًا (?. / ??) أو نوعًا صارمًا',
    ],
    checksEn: ['Locate line from stack trace', 'Check data that may lack the field', 'Add optional chaining or strict types'],
    fix: {
      previewBefore: `final url = user.avatar!.url; // يتحطم عند null`,
      previewAfter: `final url = user.avatar?.url ?? kDefaultAvatar;`,
      changeAr: 'حماية مسار البيانات: قيم افتراضية آمنة أو تحقق مسبق قبل الاستخدام.',
      changeEn: 'Guard the data path: safe defaults or pre-validation before use.',
      whyAr: 'الكود يفترض وجود قيمة بينما هي فارغة في حالة تشغيلية معينة.',
      whyEn: 'Code assumes a value exists while it is null in a runtime case.',
      risk: 'low',
      impactsAr: ['المسار المتأثر فقط'],
      impactsEn: ['Only the affected path'],
      stepsAr: ['افحص الإطار الأول في الـ Stack', 'أضف تحققًا أو قيمة افتراضية', 'أضف اختبار وحدة للحالة الفارغة'],
      stepsEn: ['Inspect top stack frame', 'Add guard or default', 'Add unit test for the null case'],
      verificationHintAr: 'أضف دليلًا (اختبار ناجح أو Log) يثبت عدم تكرار الخطأ.',
      verificationHintEn: 'Add evidence (passing test or log) proving no recurrence.',
    },
  },
  {
    id: 'port_in_use',
    pattern: /eaddrinuse|address already in use/i,
    baseConfidence: 0.7,
    titleAr: 'المنفذ مستخدم بالفعل (Port In Use)',
    titleEn: 'Port already in use',
    checksAr: ['ابحث عن العملية التي تشغل المنفذ', 'أوقف العملية أو غيّر المنفذ'],
    checksEn: ['Find the process holding the port', 'Kill it or change the port'],
    fix: {
      changeAr: 'تحرير المنفذ أو تشغيل التطبيق على منفذ مختلف.',
      changeEn: 'Free the port or run on a different one.',
      whyAr: 'لا يمكن ربط منفذ مرتين في نفس الوقت.',
      whyEn: 'A port cannot be bound twice.',
      risk: 'low',
      impactsAr: ['إعدادات التشغيل المحلية فقط'],
      impactsEn: ['Local run configuration only'],
      stepsAr: ['lsof -i :PORT لتحديد العملية', 'أوقفها أو اضبط منفذًا جديدًا'],
      stepsEn: ['lsof -i :PORT to find it', 'Kill it or pick a new port'],
      verificationHintAr: 'أضف Log يظهر إقلاع الخادم بنجاح.',
      verificationHintEn: 'Add log evidence of successful startup.',
    },
  },
  {
    id: 'permission_denied',
    pattern: /eacces|permission denied|operation not permitted/i,
    baseConfidence: 0.62,
    titleAr: 'صلاحيات غير كافية (Permission Denied)',
    titleEn: 'Insufficient permissions',
    checksAr: ['تحقق من صلاحيات الملف/المجلد', 'راجع مستخدم التشغيل', 'على الموبايل: تحقق من أذونات التطبيق'],
    checksEn: ['Check file/dir permissions', 'Check running user', 'On mobile: check app permissions'],
    fix: {
      changeAr: 'منح الصلاحية المطلوبة للحد الأدنى فقط (least privilege).',
      changeEn: 'Grant the minimum required permission (least privilege).',
      whyAr: 'النظام يمنع العملية لعدم كفاية الصلاحيات.',
      whyEn: 'The OS blocks the operation due to missing permissions.',
      risk: 'medium',
      impactsAr: ['أمان النظام', 'مسار التشغيل'],
      impactsEn: ['System security', 'Runtime path'],
      stepsAr: ['حدد المورد المرفوض', 'امنح صلاحية محددة', 'أعد التشغيل'],
      stepsEn: ['Identify denied resource', 'Grant specific permission', 'Retry'],
      verificationHintAr: 'أضف دليلًا يثبت نجاح العملية بعد منح الصلاحية.',
      verificationHintEn: 'Add evidence the operation succeeds after granting access.',
    },
  },
  {
    id: 'cors_blocked',
    pattern: /cors|cross-origin|access-control-allow-origin/i,
    baseConfidence: 0.64,
    titleAr: 'الطلب محجوب بسبب CORS',
    titleEn: 'Request blocked by CORS',
    checksAr: ['تحقق من ترويسات الخادم Access-Control-Allow-*', 'راجع طلب الـ preflight (OPTIONS)', 'تأكد من تطابق الأصل (Origin)'],
    checksEn: ['Check server Access-Control-Allow-* headers', 'Review OPTIONS preflight', 'Verify Origin match'],
    fix: {
      changeAr: 'ضبط ترويسات CORS في الخادم للأصول المسموحة فقط.',
      changeEn: 'Configure server CORS headers for allowed origins only.',
      whyAr: 'المتصفح يحجب الاستجابة لعدم سماح الخادم بهذا الأصل.',
      whyEn: 'The browser blocks the response because the server does not allow this origin.',
      risk: 'medium',
      impactsAr: ['أمان الواجهة', 'كل نداءات المتصفح للـ API'],
      impactsEn: ['Frontend security', 'All browser API calls'],
      stepsAr: ['حدد الأصل المرفوض من رسالة الخطأ', 'أضفه للسماح في الخادم', 'اختبر preflight'],
      stepsEn: ['Identify rejected origin', 'Allow it server-side', 'Test preflight'],
      verificationHintAr: 'أضف دليلًا يظهر نجاح الطلب من نفس الأصل.',
      verificationHintEn: 'Add evidence of a successful request from the same origin.',
    },
  },
  {
    id: 'dns_failure',
    pattern: /enotfound|getaddrinfo|dns.*(fail|error)/i,
    baseConfidence: 0.6,
    titleAr: 'فشل في تحليل اسم النطاق (DNS)',
    titleEn: 'DNS resolution failure',
    checksAr: ['تحقق من كتابة اسم النطاق', 'اختبر DNS بديل', 'راجع إعدادات الشبكة/VPN'],
    checksEn: ['Check hostname spelling', 'Try alternate DNS', 'Review network/VPN settings'],
    fix: {
      changeAr: 'تصحيح اسم النطاق أو إصلاح إعدادات DNS/الشبكة.',
      changeEn: 'Fix hostname or DNS/network settings.',
      whyAr: 'لا يمكن تحويل الاسم إلى عنوان IP.',
      whyEn: 'The name cannot be resolved to an IP.',
      risk: 'low',
      impactsAr: ['الاتصال بالخدمة'],
      impactsEn: ['Service connectivity'],
      stepsAr: ['nslookup للتحقق', 'صحح الاسم أو الشبكة'],
      stepsEn: ['nslookup to verify', 'Fix name or network'],
      verificationHintAr: 'أضف دليل اتصال ناجح بعد الإصلاح.',
      verificationHintEn: 'Add evidence of successful connection.',
    },
  },
  {
    id: 'connection_refused',
    pattern: /econnrefused|connection refused/i,
    baseConfidence: 0.58,
    titleAr: 'الاتصال مرفوض — الخدمة غير مستمعة',
    titleEn: 'Connection refused — nothing listening',
    checksAr: ['تأكد أن الخدمة تعمل على المنفذ الصحيح', 'راجع الـ host/port في الإعدادات', 'تحقق من الجدار الناري'],
    checksEn: ['Ensure service is up on the right port', 'Check host/port config', 'Check firewall'],
    fix: {
      changeAr: 'تشغيل الخدمة المطلوبة أو تصحيح عنوان الاتصال.',
      changeEn: 'Start the required service or correct the connection address.',
      whyAr: 'لا توجد عملية تستمع على العنوان/المنفذ المطلوب.',
      whyEn: 'No process listens on the requested address/port.',
      risk: 'low',
      impactsAr: ['الاتصال بين الخدمات'],
      impactsEn: ['Service-to-service connectivity'],
      stepsAr: ['تحقق من حالة الخدمة', 'صحح العنوان', 'أعد المحاولة'],
      stepsEn: ['Check service status', 'Fix address', 'Retry'],
      verificationHintAr: 'أضف Log يظهر اتصالًا ناجحًا.',
      verificationHintEn: 'Add log of successful connection.',
    },
  },
  {
    id: 'ssl_cert',
    pattern: /self.signed|certificate (has )?expired|unable to verify|ssl[_ ]error|cert.*(invalid|error)/i,
    baseConfidence: 0.62,
    titleAr: 'مشكلة شهادة SSL/TLS',
    titleEn: 'SSL/TLS certificate problem',
    checksAr: ['تحقق من صلاحية الشهادة وسلسلة الثقة', 'راجع تاريخ الجهاز/الخادم', 'لا تتجاهل أخطاء الشهادات في الإنتاج'],
    checksEn: ['Check certificate validity and chain', 'Check device/server clock', 'Never ignore cert errors in prod'],
    fix: {
      changeAr: 'تثبيت شهادة صالحة أو إصلاح سلسلة الشهادات/التوقيت.',
      changeEn: 'Install a valid certificate or fix the chain/clock.',
      whyAr: 'الاتصال الآمن يفشل عند عدم الثقة بالشهادة.',
      whyEn: 'Secure connection fails when the certificate is untrusted.',
      risk: 'high',
      impactsAr: ['أمان الاتصالات', 'كل العملاء'],
      impactsEn: ['Connection security', 'All clients'],
      stepsAr: ['افحص الشهادة (openssl s_client)', 'جددها أو أصلح السلسلة'],
      stepsEn: ['Inspect cert (openssl s_client)', 'Renew or fix chain'],
      verificationHintAr: 'أضف دليلًا يظهر handshake ناجحًا.',
      verificationHintEn: 'Add evidence of a successful handshake.',
    },
  },
  {
    id: 'rate_limit',
    pattern: /\b429\b|rate limit|too many requests/i,
    baseConfidence: 0.6,
    titleAr: 'تجاوز حد الطلبات (Rate Limit)',
    titleEn: 'Rate limited',
    checksAr: ['راجع عدد الطلبات المرسلة', 'احترم ترويسة Retry-After', 'أضف تخزينًا مؤقتًا'],
    checksEn: ['Review request volume', 'Honor Retry-After', 'Add caching'],
    fix: {
      changeAr: 'تقليل الطلبات: كاش + طابور + احترام Retry-After.',
      changeEn: 'Reduce requests: cache + queue + honor Retry-After.',
      whyAr: 'الخادم يرفض الطلبات الزائدة عن الحد المسموح.',
      whyEn: 'The server rejects requests beyond its allowed quota.',
      risk: 'medium',
      impactsAr: ['معدل التحديث', 'تجربة المستخدم'],
      impactsEn: ['Refresh rate', 'UX'],
      stepsAr: ['أضف كاش للطلبات المتكررة', 'أضف backoff', 'راقب الحدود'],
      stepsEn: ['Cache repeated calls', 'Add backoff', 'Monitor limits'],
      verificationHintAr: 'أضف دليلًا يثبت اختفاء 429.',
      verificationHintEn: 'Add evidence that 429 is gone.',
    },
  },
];
