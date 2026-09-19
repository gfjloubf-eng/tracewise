/**
 * اختبارات مساحة العمل: Projects، What Changed، Fix Approval،
 * قيود AI الصارمة، بوابة GitHub (اقتراح ← موافقة ← تنفيذ)، سجل الأمان.
 * (hook واحد مشترك لكل الملف — يتجنب مشاكل تعدد الـ hooks في RTL v14)
 */
import React from 'react';
import { renderHook, act, waitFor, type RenderHookResult } from '@testing-library/react-native/pure';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoreProvider, useStore, type StoreValue } from '../../state/AppStore';
import { secureSet } from '../../storage/secureStorage';
import { githubClient } from '../../integrations/github';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StoreProvider>{children}</StoreProvider>
);

let hook: RenderHookResult<StoreValue, never>;
const store = (): StoreValue => hook.result.current;

beforeAll(async () => {
  await AsyncStorage.clear();
  hook = await renderHook(() => useStore(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
});

afterAll(() => {
  hook?.unmount();
  jest.restoreAllMocks();
});

describe('Projects — مساحة العمل', () => {
  it('إنشاء مشروع وربط حالة به ثم فك الارتباط عند الحذف', async () => {
    let projectId = '';
    await act(async () => {
      const p = await store().createProject({ name: 'Flutter Mobile App', language: 'Dart', framework: 'Flutter' });
      projectId = p.id;
    });
    expect(store().projects.some((p) => p.id === projectId)).toBe(true);

    let caseId = '';
    await act(async () => {
      const c = await store().createCase({ title: 'حالة المشروع', description: 'x', projectId });
      caseId = c.id;
    });
    expect(store().cases.find((c) => c.id === caseId)!.projectId).toBe(projectId);

    await act(async () => {
      await store().deleteProject(projectId);
    });
    expect(store().projects.some((p) => p.id === projectId)).toBe(false);
    // الحالة تبقى مع فك الارتباط
    expect(store().cases.find((c) => c.id === caseId)).toBeTruthy();
    expect(store().cases.find((c) => c.id === caseId)!.projectId).toBeUndefined();
  });
});

describe('What Changed? — تسجيل التغييرات', () => {
  it('التغيير يُسجل ويُنشئ دليلًا مرتبطًا ويُحجب ما فيه من أسرار', async () => {
    let caseId = '';
    await act(async () => {
      const c = await store().createCase({ title: 'حالة التغييرات', description: 'x' });
      caseId = c.id;
    });

    await act(async () => {
      await store().addChange(caseId, 'auth', 'نقلنا التوكن لتخزين جديد password=OldPass123');
    });

    const c = store().cases.find((x) => x.id === caseId)!;
    expect(c.changes).toHaveLength(1);
    expect(c.changes![0].kind).toBe('auth');
    // الحجب قبل التخزين
    expect(c.changes![0].description).not.toContain('OldPass123');
    expect(c.changes![0].description).toContain('[REDACTED]');
    // دليل مرتبط من نوع recent_change
    const linked = c.evidence.find((e) => e.id === c.changes![0].linkedEvidenceId);
    expect(linked).toBeTruthy();
    expect(linked!.type).toBe('recent_change');
  });
});

describe('Fix Plan — دورة الموافقة الصريحة', () => {
  it('مقترحة ← معتمدة ← مطبقة (بتواريخ)', async () => {
    let caseId = '';
    await act(async () => {
      const c = await store().createCase({ title: 'حالة الموافقة', description: 'x', errorMessage: 'HTTP 401' });
      caseId = c.id;
      await store().runAnalysis(c.id);
    });
    expect(store().cases.find((c) => c.id === caseId)!.fixPlan!.status).toBe('proposed');

    await act(async () => {
      await store().approveFixPlan(caseId);
    });
    expect(store().cases.find((c) => c.id === caseId)!.fixPlan!.status).toBe('approved');

    await act(async () => {
      await store().markFixApplied(caseId);
    });
    const plan = store().cases.find((c) => c.id === caseId)!.fixPlan!;
    expect(plan.status).toBe('applied');
    expect(plan.appliedAt).toBeTruthy();
  });
});

describe('AI — قيود صارمة', () => {
  it('يدمج فرضيات AI بعد المحلية، بلا أدلة مخترعة، وبثقة مسقوفة، ولا يغيّر التحقق', async () => {
    await secureSet('tw_ai_key', 'test-key');
    await act(async () => {
      await store().updateSettings({
        ai: {
          enabled: true,
          provider: 'openai-compatible',
          baseUrl: 'https://ai.test/v1',
          model: 'test-model',
          hasApiKey: true,
          sendRedactedData: true,
        },
      });
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                hypotheses: [
                  { title: 'Race condition in token refresh', confidence: 1.0, checks: ['inspect locks'] },
                ],
                rootCause: 'race',
              }),
            },
          },
        ],
      }),
    } as unknown as Response);

    let caseId = '';
    await act(async () => {
      const c = await store().createCase({ title: 'حالة AI', description: 'x', errorMessage: 'HTTP 401 Unauthorized' });
      caseId = c.id;
      await store().runAnalysis(c.id);
    });

    const c = store().cases.find((x) => x.id === caseId)!;
    const aiHyp = c.diagnosis!.hypotheses.find((h) => h.source === 'ai');
    expect(aiHyp).toBeTruthy();
    // لا يخترع أدلة
    expect(aiHyp!.supportingEvidenceIds).toEqual([]);
    // ثقة مسقوفة
    expect(aiHyp!.confidence).toBeLessThanOrEqual(0.75);
    // المحلية ما زالت موجودة
    expect(c.diagnosis!.hypotheses.some((h) => h.source === 'local')).toBe(true);
    // AI لا يغيّر حالة التحقق إطلاقًا
    expect(c.verifications).toHaveLength(0);
    expect(c.state).not.toBe('verified');
    expect(c.state).toBe('fix_plan');

    jest.restoreAllMocks();
    await act(async () => {
      await store().updateSettings({
        ai: { enabled: false, provider: 'openai-compatible', baseUrl: '', model: '', hasApiKey: false, sendRedactedData: false },
      });
    });
  });
});

describe('GitHub — اقتراح ← موافقة ← تنفيذ', () => {
  it('يرفض التنفيذ بدون موافقة، وينفذ بعدها', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      // connect: GET /user
      .mockResolvedValueOnce({ ok: true, json: async () => ({ login: 'dev-user' }) } as unknown as Response)
      // execute: POST comment
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) } as unknown as Response);

    await githubClient.connect('tok_test_123');
    expect(githubClient.connected).toBe(true);

    const proposal = githubClient.proposeIssueComment('org/repo', 7, 'تحليل الحالة');
    expect(proposal.status).toBe('pending_approval');

    // بدون موافقة → رفض قاطع (ولا أي نداء لendpoint التعليق)
    await expect(githubClient.executeProposal(proposal)).rejects.toThrow('PROPOSAL_NOT_APPROVED');
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('/comments'))).toBe(true);

    // بعد الموافقة الصريحة → تنفيذ
    proposal.status = 'approved';
    await githubClient.executeProposal(proposal);
    expect(proposal.status).toBe('executed');
    const postCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/comments'))!;
    expect(String(postCall[0])).toContain('/repos/org/repo/issues/7/comments');
    expect((postCall[1] as RequestInit).method).toBe('POST');

    await githubClient.disconnect();
    jest.restoreAllMocks();
  });
});

describe('Security — السجلات لا تحتوي أسرارًا', () => {
  it('سجل الأمان يذكر العدد والنوع فقط — لا المحتوى', async () => {
    await act(async () => {
      await store().createCase({
        title: 'حالة الأسرار',
        description: 'token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ab في الملف',
      });
    });
    const logDump = JSON.stringify(store().securityLog);
    expect(logDump).not.toContain('ghp_' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ab');
    // لكن هناك قيد حجب
    expect(store().securityLog.some((l) => l.kind === 'redaction')).toBe(true);
  });
});
