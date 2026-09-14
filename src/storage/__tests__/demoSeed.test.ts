import { buildDemoCases } from '../demoSeed';
import { containsSecrets } from '../../security/redaction';

describe('Demo Data — أمان', () => {
  it('البيانات التجريبية لا تحتوي أي أسرار', () => {
    for (const c of buildDemoCases()) {
      expect(containsSecrets(JSON.stringify(c))).toBe(false);
    }
  });

  it('كل حالة تجريبية معلّمة isDemo', () => {
    for (const c of buildDemoCases()) {
      expect(c.isDemo).toBe(true);
    }
  });
});
