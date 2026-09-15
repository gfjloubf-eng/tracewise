import { frequentCauses, successfulFixes, findSimilarCases } from '../memory';
import { DebugCase } from '../types';

function makeCase(over: Partial<DebugCase> = {}): DebugCase {
  return {
    id: 'c1',
    title: 'مشكلة',
    description: '',
    state: 'open',
    severity: 'low',
    isDemo: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    evidence: [],
    verifications: [],
    tags: [],
    ...over,
  };
}

const fp401 = { hash: 'h401', errorKind: 'http:401', signal: 'HTTP 401', tokens: ['login', 'unauthorized'] };
const fpNull = { hash: 'hnull', errorKind: 'null_reference', signal: 'Null Reference', tokens: ['null', 'profile'] };

describe('Developer Memory', () => {
  it('frequentCauses تجمّع حسب نوع الخطأ', () => {
    const cases = [
      makeCase({ id: 'a', fingerprint: fp401, diagnosis: { hypotheses: [], rootCauseAr: 'مشكلة مصادقة', confidence: 0.8, severity: 'high', analyzedAt: '', engine: 'local', fingerprint: fp401 } }),
      makeCase({ id: 'b', fingerprint: fp401 }),
      makeCase({ id: 'c', fingerprint: fpNull }),
    ];
    const causes = frequentCauses(cases);
    expect(causes[0].errorKind).toBe('http:401');
    expect(causes[0].count).toBe(2);
    expect(causes[1].count).toBe(1);
  });

  it('successfulFixes: الموثّقة فقط — likely_resolved لا تكفي', () => {
    const cases = [
      makeCase({
        id: 'verified-case',
        state: 'verified',
        verifications: [{ id: 'v1', before: '401', after: '200', evidenceIds: ['e1'], result: 'verified', createdAt: '' }],
      }),
      makeCase({
        id: 'likely-case',
        state: 'likely_resolved',
        verifications: [{ id: 'v2', before: '401', after: '200', evidenceIds: [], result: 'likely', createdAt: '' }],
      }),
      makeCase({
        id: 'fake-verified', // سجل verified لكن الحالة عادت لـ fix_plan (انتكاسة)
        state: 'fix_plan',
        verifications: [{ id: 'v3', before: '401', after: '200', evidenceIds: ['e'], result: 'verified', createdAt: '' }],
      }),
    ];
    const s = successfulFixes(cases);
    expect(s.map((c) => c.id)).toEqual(['verified-case']);
  });

  it('findSimilarCases تعيد النسبة والسبب والحل وحالة التحقق والتاريخ', () => {
    const target = makeCase({ id: 'new', fingerprint: fp401 });
    const previous = makeCase({
      id: 'old',
      fingerprint: fp401,
      state: 'verified',
      updatedAt: '2026-02-01T00:00:00Z',
      diagnosis: { hypotheses: [], rootCauseAr: 'توكن منتهي', rootCauseEn: 'expired token', confidence: 0.9, severity: 'high', analyzedAt: '', engine: 'local', fingerprint: fp401 },
      fixPlan: {
        problemAr: '', problemEn: '', causeAr: '', causeEn: '',
        changeAr: 'تجديد التوكن تلقائيًا', changeEn: 'auto refresh',
        whyAr: '', whyEn: '', risk: 'low', impactsAr: [], impactsEn: [], stepsAr: [], stepsEn: [],
        verificationHintAr: '', verificationHintEn: '', createdAt: '', status: 'applied',
      },
      verifications: [{ id: 'v', before: '401', after: '200', evidenceIds: ['e'], result: 'verified', createdAt: '' }],
    });
    const unrelated = makeCase({ id: 'other', fingerprint: fpNull });

    const similar = findSimilarCases(target, [previous, unrelated]);
    expect(similar.length).toBe(1);
    expect(similar[0].debugCase.id).toBe('old');
    expect(similar[0].score).toBe(1);
    expect(similar[0].causeAr).toBe('توكن منتهي');
    expect(similar[0].fixAr).toBe('تجديد التوكن تلقائيًا');
    expect(similar[0].verified).toBe(true);
    expect(similar[0].date).toBe('2026-02-01T00:00:00Z');
  });

  it('findSimilarCases: الحل غير المطبَّق لا يظهر كحل', () => {
    const target = makeCase({ id: 'new', fingerprint: fp401 });
    const proposed = makeCase({
      id: 'old',
      fingerprint: fp401,
      fixPlan: {
        problemAr: '', problemEn: '', causeAr: '', causeEn: '',
        changeAr: 'اقتراح لم يُطبق', changeEn: '',
        whyAr: '', whyEn: '', risk: 'low', impactsAr: [], impactsEn: [], stepsAr: [], stepsEn: [],
        verificationHintAr: '', verificationHintEn: '', createdAt: '', status: 'proposed',
      },
    });
    const similar = findSimilarCases(target, [proposed]);
    expect(similar[0].fixAr).toBeUndefined();
    expect(similar[0].verified).toBe(false);
  });
});
