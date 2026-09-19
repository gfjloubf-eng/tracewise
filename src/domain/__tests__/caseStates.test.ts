import { allowedTransitions, canTransition, stateIndex, CASE_STATES_ORDER } from '../caseStates';

describe('Case State Machine', () => {
  it('المسار القانوني: مفتوحة → تحليل → خطة → مرجح → موثّق → مغلقة', () => {
    expect(canTransition('open', 'analyzing')).toBe(true);
    expect(canTransition('analyzing', 'fix_plan')).toBe(true);
    expect(canTransition('fix_plan', 'likely_resolved')).toBe(true);
    expect(canTransition('likely_resolved', 'verified')).toBe(true);
    expect(canTransition('verified', 'closed')).toBe(true);
  });

  it('لا قفزات غير قانونية', () => {
    expect(canTransition('open', 'verified')).toBe(false);
    expect(canTransition('open', 'likely_resolved')).toBe(false);
    expect(canTransition('analyzing', 'verified')).toBe(false);
  });

  it('الانتكاسة مسموحة: مرجح الحل → خطة إصلاح', () => {
    expect(canTransition('likely_resolved', 'fix_plan')).toBe(true);
  });

  it('إعادة الفتح من مغلقة', () => {
    expect(canTransition('closed', 'open')).toBe(true);
    expect(canTransition('closed', 'verified')).toBe(false);
  });

  it('لا انتقال لنفس الحالة', () => {
    for (const s of CASE_STATES_ORDER) {
      expect(canTransition(s, s)).toBe(false);
    }
  });

  it('allowedTransitions تُرجع خيارات صالحة فقط', () => {
    const t = allowedTransitions('open');
    expect(t).toContain('analyzing');
    expect(t).not.toContain('verified');
  });

  it('ترتيب الحالات صحيح', () => {
    expect(stateIndex('open')).toBe(0);
    expect(stateIndex('closed')).toBe(CASE_STATES_ORDER.length - 1);
    expect(stateIndex('verified')).toBeGreaterThan(stateIndex('likely_resolved'));
  });
});
