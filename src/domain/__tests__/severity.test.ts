import { assessSeverity, scoreToSeverity, severityScore } from '../severity';

describe('Severity', () => {
  it('تحطم في الإنتاج = حرجة', () => {
    expect(assessSeverity(['App crashed in production, all users affected'])).toBe('critical');
  });

  it('فقدان بيانات = حرجة أو عالية', () => {
    const s = assessSeverity(['data loss detected after migration']);
    expect(['high', 'critical']).toContain(s);
  });

  it('HTTP 500 في الإنتاج = عالية على الأقل', () => {
    const s = assessSeverity(['production server returns 500 internal server error']);
    expect(['high', 'critical']).toContain(s);
  });

  it('401 فقط = متوسطة تقريبًا', () => {
    expect(assessSeverity(['HTTP 401 unauthorized'])).toBe('medium');
  });

  it('Overflow في الواجهة = منخفضة', () => {
    expect(assessSeverity(['RenderFlex overflowed by 20 pixels'])).toBe('low');
  });

  it('نص عربي: تعطل + إنتاج', () => {
    const s = assessSeverity(['التطبيق يتعطل في بيئة الإنتاج لكل المستخدمين']);
    expect(['high', 'critical']).toContain(s);
  });

  it('scoreToSeverity حدود صحيحة', () => {
    expect(scoreToSeverity(0)).toBe('low');
    expect(scoreToSeverity(1)).toBe('low');
    expect(scoreToSeverity(2)).toBe('medium');
    expect(scoreToSeverity(5)).toBe('high');
    expect(scoreToSeverity(7)).toBe('critical');
  });

  it('نص فارغ = منخفضة', () => {
    expect(severityScore('')).toBe(0);
    expect(assessSeverity([undefined, ''])).toBe('low');
  });
});
