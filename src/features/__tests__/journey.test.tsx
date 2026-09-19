/**
 * اختبار الرحلة الكاملة للمستخدم (Integration) — على مستوى المخزن الحقيقي:
 * إنشاء مشكلة → إدخال Error → Stack Trace → Code → Evidence → تحليل →
 * Hypotheses → Root Cause → Fix Plan → تطبيق الإصلاح → Verification (بدليل) →
 * Verified → حفظ الحالة → استرجاعها بعد "إعادة فتح التطبيق".
 * + تحقق أمني: الحجب قبل التخزين + صفر اتصال شبكة (Offline كامل).
 */
import React from 'react';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoreProvider, useStore } from '../../state/AppStore';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StoreProvider>{children}</StoreProvider>
);

beforeEach(async () => {
  cleanup();
  await AsyncStorage.clear();
});

describe('الرحلة الكاملة — من المشكلة إلى التحقق والاسترجاع', () => {
  it('تنجح بالكامل دون أي اتصال شبكة', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const { result } = await renderHook(() => useStore(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    // 1) إنشاء مشكلة (مع سر في الوصف — يجب حجبه قبل التخزين)
    let caseId = '';
    await act(async () => {
      const c = await result.current.createCase({
        title: 'فشل تسجيل الدخول — HTTP 401',
        description: 'كل المحاولات ترجع 401. api_key=sk_live_LEAKED1234567890ab في الإعدادات',
        language: 'TypeScript',
        framework: 'React Native',
        platform: 'Android',
        errorMessage: 'Request failed with status code 401 Unauthorized',
      });
      caseId = c.id;
    });
    expect(caseId).toBeTruthy();

    // أمني: السر حُجب قبل التخزين
    const saved = result.current.cases.find((c) => c.id === caseId)!;
    expect(saved.description).not.toContain('sk_live_LEAKED1234567890ab');
    expect(saved.description).toContain('[REDACTED]');
    expect(result.current.securityLog.some((l) => l.kind === 'redaction')).toBe(true);

    // 2) إضافة أدلة: Stack Trace + Code + Log
    await act(async () => {
      await result.current.addEvidence(caseId, {
        type: 'stacktrace',
        title: 'Stack Trace',
        content: 'AxiosError 401\n    at settle (axios/lib/core/settle.js:17:12)\n    at AuthApi.login (src/api/auth.ts:42:18)',
      });
      await result.current.addEvidence(caseId, {
        type: 'code',
        title: 'كود الدالة',
        content: 'async login() { return api.post("/auth/login", body); }',
      });
    });

    // 3) التحليل — محلي بالكامل
    await act(async () => {
      await result.current.runAnalysis(caseId);
    });

    const analyzed = result.current.cases.find((c) => c.id === caseId)!;
    expect(analyzed.state).toBe('fix_plan');
    expect(analyzed.diagnosis).toBeTruthy();
    expect(analyzed.diagnosis!.engine).toBe('local');
    expect(analyzed.diagnosis!.hypotheses.length).toBeGreaterThan(0);
    expect(analyzed.diagnosis!.hypotheses[0].ruleId).toBe('http_401_auth');
    expect(analyzed.diagnosis!.rootCauseAr).toContain('مصادقة');
    expect(analyzed.fixPlan).toBeTruthy();
    expect(analyzed.fixPlan!.stepsAr.length).toBeGreaterThan(0);

    // 4) تطبيق الإصلاح
    await act(async () => {
      await result.current.markFixApplied(caseId);
    });
    expect(result.current.cases.find((c) => c.id === caseId)!.fixPlan!.status).toBe('applied');

    // 5) دليل جديد بعد الإصلاح (HTTP 200)
    let logEvidenceId = '';
    await act(async () => {
      await result.current.addEvidence(caseId, {
        type: 'log',
        title: 'سجل بعد الإصلاح',
        content: 'POST /api/auth/login → HTTP 200 OK',
      });
    });
    logEvidenceId = result.current.cases.find((c) => c.id === caseId)!.evidence.slice(-1)[0].id;

    // 6) تسجيل التحقق بدليل → Verified
    await act(async () => {
      const rec = await result.current.recordVerification(caseId, {
        before: 'HTTP 401',
        after: 'HTTP 200',
        evidenceIds: [logEvidenceId],
      });
      expect(rec!.result).toBe('verified');
    });
    expect(result.current.cases.find((c) => c.id === caseId)!.state).toBe('verified');

    // 7) بدون دليل → مرجح فقط (ننشئ حالة ثانية للتأكد)
    let case2 = '';
    await act(async () => {
      const c = await result.current.createCase({ title: 'مشكلة أخرى 500', description: 'x', errorMessage: 'HTTP 500' });
      case2 = c.id;
      await result.current.runAnalysis(c.id);
      const rec = await result.current.recordVerification(c.id, {
        before: 'HTTP 500',
        after: 'HTTP 200',
        evidenceIds: [],
      });
      expect(rec!.result).toBe('likely');
    });
    expect(result.current.cases.find((c) => c.id === case2)!.state).toBe('likely_resolved');

    // 8) إغلاق الحالة الموثقة ثم إعادة فتحها (آلة الحالات)
    await act(async () => {
      expect(await result.current.changeState(caseId, 'closed')).toBe(true);
      expect(await result.current.changeState(caseId, 'verified')).toBe(false); // قفزة ممنوعة من مغلقة
      expect(await result.current.changeState(caseId, 'open')).toBe(true); // إعادة فتح
    });
    expect(result.current.cases.find((c) => c.id === caseId)!.state).toBe('open');
    // وأعدناها موثقة للفحوصات السابقة؟ لا — بقيت open كما طلبنا
    // 9) Offline: صفر استدعاءات شبكة خلال الرحلة كلها
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('الحالة تُحفظ وتُسترجع بعد إعادة فتح التطبيق', async () => {
    // الجولة الأولى: إنشاء + تحليل + تحقق
    const first = await renderHook(() => useStore(), { wrapper });
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    let caseId = '';
    await act(async () => {
      const c = await first.result.current.createCase({
        title: 'حالة الاسترجاع',
        description: 'وصف',
        errorMessage: 'HTTP 404 Not Found',
      });
      caseId = c.id;
      await first.result.current.runAnalysis(c.id);
      await first.result.current.addEvidence(c.id, { type: 'log', title: 'بعد', content: 'GET /x → HTTP 200 OK' });
    });
    const evId = first.result.current.cases.find((c) => c.id === caseId)!.evidence[0].id;
    await act(async () => {
      await first.result.current.recordVerification(caseId, {
        before: 'HTTP 404',
        after: 'HTTP 200',
        evidenceIds: [evId],
      });
    });
    first.unmount();

    // الجولة الثانية: "إعادة فتح التطبيق" — تُحمَّل من AsyncStorage
    const second = await renderHook(() => useStore(), { wrapper });
    await waitFor(() => expect(second.result.current.ready).toBe(true));
    await waitFor(() => expect(second.result.current.cases.length).toBeGreaterThan(0));

    const restored = second.result.current.cases.find((c) => c.id === caseId);
    expect(restored).toBeTruthy();
    expect(restored!.state).toBe('verified');
    expect(restored!.diagnosis!.hypotheses[0].ruleId).toBe('http_404_route');
    expect(restored!.verifications).toHaveLength(1);
    expect(restored!.evidence).toHaveLength(1);
    second.unmount();
  });

});
