import { analyzeCase, buildContext, runLocalRules, buildFixPlan } from '../engine';
import { DebugCase } from '../../domain/types';

function makeCase(over: Partial<DebugCase> = {}): DebugCase {
  return {
    id: 'c1',
    title: 'مشكلة',
    description: 'وصف',
    state: 'open',
    severity: 'low',
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidence: [],
    verifications: [],
    tags: [],
    ...over,
  };
}

describe('Diagnosis Engine — القواعد المحلية', () => {
  it('HTTP 401 → مشكلة Authentication في الصدارة', async () => {
    const c = makeCase({ errorMessage: 'Request failed with status code 401 Unauthorized' });
    const { diagnosis, fixPlan } = await analyzeCase(c);
    expect(diagnosis.hypotheses[0].ruleId).toBe('http_401_auth');
    expect(diagnosis.confidence).toBeGreaterThanOrEqual(0.6);
    expect(fixPlan.changeAr.length).toBeGreaterThan(0);
    expect(diagnosis.fingerprint.errorKind).toBe('http:401');
  });

  it('HTTP 404 → Endpoint أو Route غير صحيح', async () => {
    const c = makeCase({ errorMessage: 'GET /api/orders returned 404 Not Found' });
    const { diagnosis } = await analyzeCase(c);
    expect(diagnosis.hypotheses[0].ruleId).toBe('http_404_route');
  });

  it('HTTP 500 → خطأ في الخادم', async () => {
    const c = makeCase({ errorMessage: 'Internal Server Error 500', stackTrace: 'Traceback: exception in handler' });
    const { diagnosis } = await analyzeCase(c);
    expect(diagnosis.hypotheses[0].ruleId).toBe('http_5xx_server');
  });

  it('JSON Parse Error → تحقق من صيغة JSON', async () => {
    const c = makeCase({ errorMessage: 'JSON.parse: unexpected token < in JSON at position 0' });
    const { diagnosis } = await analyzeCase(c);
    expect(diagnosis.hypotheses[0].ruleId).toBe('json_parse');
  });

  it('Dependency Error → تعارض إصدارات', async () => {
    const c = makeCase({ errorMessage: 'npm ERR! ERESOLVE could not resolve peer dependency conflict' });
    const { diagnosis } = await analyzeCase(c);
    expect(diagnosis.hypotheses[0].ruleId).toBe('dependency_conflict');
  });

  it('Layout Overflow → قيود الواجهة', async () => {
    const c = makeCase({ errorMessage: 'RenderFlex overflowed by 42 pixels on the bottom.' });
    const { diagnosis } = await analyzeCase(c);
    expect(diagnosis.hypotheses[0].ruleId).toBe('layout_overflow');
  });

  it('Network Timeout → الاتصال ووقت الاستجابة', async () => {
    const c = makeCase({ errorMessage: 'AxiosError: timeout of 5000ms exceeded (ETIMEDOUT)' });
    const { diagnosis } = await analyzeCase(c);
    expect(diagnosis.hypotheses[0].ruleId).toBe('network_timeout');
  });

  it('الأدلة ترفع الثقة وتُسجل كأدلة داعمة', () => {
    const c = makeCase({
      errorMessage: 'HTTP 401',
      evidence: [
        { id: 'e1', caseId: 'c1', type: 'error', title: 'خطأ 401', content: 'server returned 401 unauthorized', createdAt: '', redactionCount: 0 },
        { id: 'e2', caseId: 'c1', type: 'log', title: 'لا علاقة', content: 'all good 200 OK', createdAt: '', redactionCount: 0 },
      ],
    });
    const ctx = buildContext(c);
    const hyps = runLocalRules(ctx);
    const top = hyps.find((h) => h.ruleId === 'http_401_auth')!;
    expect(top.supportingEvidenceIds).toContain('e1');
    expect(top.supportingEvidenceIds).not.toContain('e2');
  });

  it('خطة الإصلاح تحتوي المشكلة والسبب والتغيير ولماذا والمخاطرة والتأثيرات', async () => {
    const c = makeCase({ errorMessage: 'HTTP 401 Unauthorized' });
    const { fixPlan } = await analyzeCase(c);
    expect(fixPlan.problemAr).toBeTruthy();
    expect(fixPlan.causeAr).toBeTruthy();
    expect(fixPlan.changeAr).toBeTruthy();
    expect(fixPlan.whyAr).toBeTruthy();
    expect(['low', 'medium', 'high']).toContain(fixPlan.risk);
    expect(fixPlan.impactsAr.length).toBeGreaterThan(0);
    expect(fixPlan.stepsAr.length).toBeGreaterThan(0);
    expect(fixPlan.status).toBe('proposed');
  });

  it('بدون AI لا تُستدعى أي شبكة — النتيجة محلية دائمًا', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const c = makeCase({ errorMessage: 'HTTP 401' });
    const { diagnosis } = await analyzeCase(c); // بلا إعدادات AI
    expect(diagnosis.engine).toBe('local');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('buildFixPlan يعمل مع فرضية غير معروفة', () => {
    const plan = buildFixPlan(
      {
        ruleId: 'mystery',
        titleAr: 'سبب غامض',
        titleEn: 'mystery',
        confidence: 0.3,
        supportingEvidenceIds: [],
        suggestedChecksAr: [],
        suggestedChecksEn: [],
        source: 'local',
      },
      makeCase()
    );
    expect(plan.causeAr).toBe('سبب غامض');
    expect(plan.status).toBe('proposed');
  });
});
