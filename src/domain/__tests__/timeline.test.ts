import { buildTimeline, CHANGE_KIND_LABELS } from '../timeline';
import { DebugCase } from '../types';

function makeCase(over: Partial<DebugCase> = {}): DebugCase {
  return {
    id: 'c1',
    title: 'مشكلة',
    description: '',
    state: 'verified',
    severity: 'high',
    isDemo: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-09T00:00:00Z',
    evidence: [],
    verifications: [],
    tags: [],
    changes: [],
    events: [],
    ...over,
  };
}

describe('Evidence Timeline', () => {
  it('يغطي كل أنواع الأحداث مرتبة زمنيًا', () => {
    const c = makeCase({
      evidence: [
        { id: 'e1', caseId: 'c1', type: 'error', title: 'خطأ 401', content: '401', createdAt: '2026-01-02T00:00:00Z', redactionCount: 2 },
      ],
      changes: [
        { id: 'ch1', kind: 'dependency', description: 'تحديث axios', at: '2026-01-03T00:00:00Z', linkedEvidenceId: 'e2' },
      ],
      diagnosis: {
        hypotheses: [
          { ruleId: 'http_401_auth', titleAr: 'مصادقة', titleEn: 'auth', confidence: 0.87, supportingEvidenceIds: ['e1'], suggestedChecksAr: [], suggestedChecksEn: [], source: 'local' },
        ],
        rootCauseAr: 'مصادقة',
        confidence: 0.87,
        severity: 'high',
        analyzedAt: '2026-01-04T00:00:00Z',
        engine: 'local',
        fingerprint: { hash: 'h', errorKind: 'http:401', signal: 'HTTP 401', tokens: [] },
      },
      fixPlan: {
        problemAr: '', problemEn: '', causeAr: '', causeEn: '',
        changeAr: 'ترحيل التوكن', changeEn: '',
        whyAr: '', whyEn: '', risk: 'low', impactsAr: [], impactsEn: [], stepsAr: [], stepsEn: [],
        verificationHintAr: '', verificationHintEn: '',
        createdAt: '2026-01-05T00:00:00Z', status: 'applied', appliedAt: '2026-01-06T00:00:00Z',
      },
      verifications: [
        { id: 'v1', before: 'HTTP 401', after: 'HTTP 200', evidenceIds: ['e3'], result: 'verified', createdAt: '2026-01-07T00:00:00Z' },
      ],
      events: [
        { id: 'x1', type: 'reopened', at: '2026-01-08T00:00:00Z', titleAr: 'أُعيد فتح المشكلة', titleEn: 'Reopened' },
      ],
    });

    const tl = buildTimeline(c);
    const types = tl.map((e) => e.type);

    expect(types).toEqual([
      'created',
      'evidence',
      'change',
      'diagnosis',
      'hypothesis',
      'fix_proposed',
      'fix_applied',
      'verified',
      'reopened',
    ]);

    // مرتب زمنيًا فعليًا
    const times = tl.map((e) => e.at);
    expect(times).toEqual([...times].sort());

    // تفاصيل مهمة ظاهرة
    expect(tl.find((e) => e.type === 'evidence')!.detailAr).toContain('2');
    expect(tl.find((e) => e.type === 'hypothesis')!.detailAr).toContain('87%');
    expect(tl.find((e) => e.type === 'verified')!.detailAr).toContain('401');
  });

  it('حالة فارغة → حدث الإنشاء فقط', () => {
    const tl = buildTimeline(makeCase());
    expect(tl).toHaveLength(1);
    expect(tl[0].type).toBe('created');
  });

  it('تسميات أنواع التغيير كاملة بالعربية والإنجليزية', () => {
    for (const k of Object.keys(CHANGE_KIND_LABELS) as Array<keyof typeof CHANGE_KIND_LABELS>) {
      expect(CHANGE_KIND_LABELS[k].ar.length).toBeGreaterThan(0);
      expect(CHANGE_KIND_LABELS[k].en.length).toBeGreaterThan(0);
    }
  });
});
