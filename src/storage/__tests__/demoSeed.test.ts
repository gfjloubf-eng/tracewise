import { buildDemoCases } from '../demoSeed';
import { containsSecrets } from '../../security/redaction';

describe('Demo Data — أمان', () => {
  it('البيانات التجريبية لا تحتوي أي أسرار', () => {
    const { demoCases, demoProjects } = buildDemoCases();
    for (const c of demoCases) {
      expect(containsSecrets(JSON.stringify(c))).toBe(false);
    }
    for (const p of demoProjects) {
      expect(containsSecrets(JSON.stringify(p))).toBe(false);
    }
  });

  it('كل حالة تجريبية معلّمة isDemo ومرتبطة بمشروع موجود', () => {
    const { demoCases, demoProjects } = buildDemoCases();
    const ids = new Set(demoProjects.map((p) => p.id));
    for (const c of demoCases) {
      expect(c.isDemo).toBe(true);
      expect(c.projectId && ids.has(c.projectId)).toBe(true);
    }
  });
});
