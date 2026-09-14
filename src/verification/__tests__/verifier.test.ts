import { evaluateVerification, contradicts, sameFailureSignal, signalOf } from '../verifier';

describe('Verification Engine', () => {
  it('401 → 200 مع دليل جديد = تم التحقق', () => {
    const r = evaluateVerification({ before: 'HTTP 401', after: 'HTTP 200', newEvidenceCount: 1 });
    expect(r.result).toBe('verified');
  });

  it('401 → 200 بدون دليل = مرجح فقط (لا توثيق بدون دليل)', () => {
    const r = evaluateVerification({ before: 'HTTP 401', after: 'HTTP 200', newEvidenceCount: 0 });
    expect(r.result).toBe('likely');
  });

  it('نفس إشارة الفشل = لم تُحل', () => {
    const r = evaluateVerification({ before: 'HTTP 401', after: 'HTTP 401 again', newEvidenceCount: 3 });
    expect(r.result).toBe('unresolved');
  });

  it('فشل → نجاح صريح بالعربية مع دليل = تم التحقق', () => {
    const r = evaluateVerification({ before: 'الطلب فشل مع خطأ', after: 'الطلب نجح الآن', newEvidenceCount: 1 });
    expect(r.result).toBe('verified');
  });

  it('دليل جديد بلا تعاكس واضح = مرجح', () => {
    const r = evaluateVerification({ before: 'some weird signal', after: 'another state', newEvidenceCount: 2 });
    expect(r.result).toBe('likely');
  });

  it('بدون أي شيء = مرجح مع سبب واضح', () => {
    const r = evaluateVerification({ before: 'HTTP 500', after: 'HTTP 200', newEvidenceCount: 0 });
    expect(r.result).toBe('likely');
    expect(r.reasonAr).toContain('مرجح');
  });

  it('contradicts: 500 → 200 صحيح، 404 → 401 غير كافٍ', () => {
    expect(contradicts('HTTP 500', 'HTTP 200')).toBe(true);
    expect(contradicts('HTTP 404', 'HTTP 401')).toBe(false);
  });

  it('sameFailureSignal تتعرف على نفس النوع', () => {
    expect(sameFailureSignal('HTTP 401 Unauthorized', 'got 401 again')).toBe(true);
    expect(sameFailureSignal('HTTP 401', 'HTTP 200')).toBe(false);
  });

  it('signalOf تستخرج إشارة معيارية', () => {
    expect(signalOf('status code 401')).toBe('http:401');
    expect(signalOf('RenderFlex overflowed by 12 pixels')).toBe('layout_overflow');
  });

  it('لا يوجد نص "تم التحقق" بدون دليل — التمييز صارم', () => {
    const outcomes = [
      evaluateVerification({ before: 'HTTP 401', after: 'HTTP 200', newEvidenceCount: 0 }),
      evaluateVerification({ before: 'crash', after: 'works', newEvidenceCount: 0 }),
    ];
    expect(outcomes.every((o) => o.result !== 'verified')).toBe(true);
  });
});
