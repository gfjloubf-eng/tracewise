/**
 * مخزن التطبيق المركزي — Context + Reducer.
 * يدير الحالات، الإعدادات، سجل الأمان، وكل عمليات دورة حياة المشكلة.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppSettings,
  CaseInput,
  CaseState,
  ChangeKind,
  DebugCase,
  DEFAULT_SETTINGS,
  Evidence,
  EvidenceType,
  Project,
  SecurityLogEntry,
  TimelineEvent,
  VerificationRecord,
} from '../domain/types';
import { CHANGE_KIND_LABELS } from '../domain/timeline';
import { canTransition } from '../domain/caseStates';
import { assessSeverity } from '../domain/severity';
import { buildFingerprint } from '../domain/fingerprint';
import { redactText, summarizeHits } from '../security/redaction';
import { evaluateVerification } from '../verification/verifier';
import { analyzeCase } from '../diagnosis/engine';
import { KEYS, loadJson, saveJson } from '../storage/kv';
import { secureGet, secureSet } from '../storage/secureStorage';
import { buildDemoCases } from '../storage/demoSeed';

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export interface NewEvidenceInput {
  type: EvidenceType;
  title: string;
  content: string;
  source?: string;
  imageDataUri?: string;
}

export interface StoreValue {
  ready: boolean;
  cases: DebugCase[];
  projects: Project[];
  settings: AppSettings;
  securityLog: SecurityLogEntry[];
  analyzingCaseId: string | null;

  createProject: (p: Omit<Project, 'id' | 'createdAt'>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addChange: (caseId: string, kind: ChangeKind, description: string) => Promise<void>;
  approveFixPlan: (caseId: string) => Promise<void>;

  createCase: (input: CaseInput & { projectId?: string }) => Promise<DebugCase>;
  addEvidence: (caseId: string, input: NewEvidenceInput) => Promise<void>;
  deleteEvidence: (caseId: string, evidenceId: string) => Promise<void>;
  runAnalysis: (caseId: string) => Promise<void>;
  markFixApplied: (caseId: string) => Promise<void>;
  recordVerification: (
    caseId: string,
    input: { before: string; after: string; evidenceIds: string[]; note?: string }
  ) => Promise<VerificationRecord | null>;
  changeState: (caseId: string, to: CaseState) => Promise<boolean>;
  deleteCase: (caseId: string) => Promise<void>;
  deleteDemoCases: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setAiApiKey: (key: string) => Promise<void>;
  runSecurityScan: () => Promise<{ scanned: number; redacted: number }>;
  exportData: () => string;
  importData: (json: string) => Promise<boolean>;
}

const Ctx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore خارج مزود المتجر');
  return v;
}

function logEntry(
  kind: SecurityLogEntry['kind'],
  messageAr: string,
  messageEn: string,
  count?: number
): SecurityLogEntry {
  return { id: uid('log'), at: new Date().toISOString(), kind, messageAr, messageEn, count };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cases, setCases] = useState<DebugCase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [securityLog, setSecurityLog] = useState<SecurityLogEntry[]>([]);
  const [analyzingCaseId, setAnalyzingCaseId] = useState<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // مرآة متزامنة للحالات: تُحدَّث لحظيًا داخل persist/mutate (آمنة ضد السباقات)
  const casesRef = useRef<DebugCase[]>(cases);

  const pushLog = useCallback((entry: SecurityLogEntry) => {
    setSecurityLog((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      void saveJson(KEYS.SECURITY_LOG, next);
      return next;
    });
  }, []);

  // ——— التحميل الأولي ———
  useEffect(() => {
    (async () => {
      try {
        const [savedCases, savedSettings, savedLog, savedProjects] = await Promise.all([
          loadJson<DebugCase[]>(KEYS.CASES),
          loadJson<AppSettings>(KEYS.SETTINGS),
          loadJson<SecurityLogEntry[]>(KEYS.SECURITY_LOG),
          loadJson<Project[]>(KEYS.PROJECTS),
        ]);
        const s = { ...DEFAULT_SETTINGS, ...(savedSettings ?? {}) };
        setSettings(s);
        setSecurityLog(savedLog ?? []);

        if (savedCases && savedCases.length > 0) {
          casesRef.current = savedCases;
          setCases(savedCases);
          setProjects(savedProjects ?? []);
        } else {
          const { demoCases, demoProjects } = buildDemoCases();
          casesRef.current = demoCases;
          setCases(demoCases);
          setProjects(demoProjects);
          await saveJson(KEYS.CASES, demoCases);
          await saveJson(KEYS.PROJECTS, demoProjects);
        }
      } catch {
        const { demoCases, demoProjects } = buildDemoCases();
        casesRef.current = demoCases;
        setCases(demoCases);
        setProjects(demoProjects);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persistCases = useCallback((updater: DebugCase[] | ((prev: DebugCase[]) => DebugCase[])) => {
    const next = typeof updater === 'function' ? updater(casesRef.current) : updater;
    casesRef.current = next;
    setCases(next);
    void saveJson(KEYS.CASES, next);
  }, []);

  const mutateCase = useCallback(
    (caseId: string, fn: (c: DebugCase) => DebugCase) => {
      const next = casesRef.current.map((c) =>
        c.id === caseId ? { ...fn(c), updatedAt: new Date().toISOString() } : c
      );
      casesRef.current = next;
      setCases(next);
      void saveJson(KEYS.CASES, next);
    },
    []
  );

  // ——— إنشاء مشكلة (مع حجب الأسرار من كل الحقول) ———
  const createCase = useCallback(
    async (input: CaseInput & { projectId?: string }): Promise<DebugCase> => {
      let redactionTotal = 0;
      const clean = (v?: string) => {
        if (!v) return v;
        const r = redactText(v);
        redactionTotal += r.hits.length;
        return r.text;
      };
      const cleaned: CaseInput = {
        ...input,
        description: clean(input.description) ?? '',
        errorMessage: clean(input.errorMessage),
        stackTrace: clean(input.stackTrace),
        codeSnippet: clean(input.codeSnippet),
        environment: clean(input.environment),
        recentChange: clean(input.recentChange),
        triedFixes: clean(input.triedFixes),
      };
      const nowIso = new Date().toISOString();
      const fingerprint = buildFingerprint({
        errorMessage: cleaned.errorMessage,
        stackTrace: cleaned.stackTrace,
        title: cleaned.title,
        description: cleaned.description,
      });
      const debugCase: DebugCase = {
        id: uid('case'),
        ...cleaned,
        state: 'open',
        severity: assessSeverity([
          cleaned.errorMessage,
          cleaned.description,
          cleaned.stackTrace,
          cleaned.title,
        ]),
        projectId: input.projectId,
        changes: [],
        events: [],
        isDemo: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        evidence: [],
        verifications: [],
        tags: [],
        fingerprint,
      };
      persistCases((prev) => [debugCase, ...prev]);
      if (redactionTotal > 0) {
        pushLog(
          logEntry(
            'redaction',
            `حُجبت ${redactionTotal} قيمة سرية عند إنشاء المشكلة`,
            `Redacted ${redactionTotal} secret(s) on case creation`,
            redactionTotal
          )
        );
      }
      return debugCase;
    },
    [persistCases, pushLog]
  );

  // ——— إضافة دليل (مع الحجب) ———
  const addEvidence = useCallback(
    async (caseId: string, input: NewEvidenceInput) => {
      const r = redactText(input.content);
      const ev: Evidence = {
        id: uid('ev'),
        caseId,
        type: input.type,
        title: input.title,
        content: r.text,
        source: input.source,
        imageDataUri: input.imageDataUri,
        createdAt: new Date().toISOString(),
        redactionCount: r.hits.length,
      };
      mutateCase(caseId, (c) => ({ ...c, evidence: [...c.evidence, ev] }));
      if (r.hits.length > 0) {
        pushLog(
          logEntry(
            'redaction',
            `حُجبت ${r.hits.length} قيمة سرية من دليل جديد (${summarizeHits(r.hits) && Object.keys(summarizeHits(r.hits)).join('، ')})`,
            `Redacted ${r.hits.length} secret(s) from new evidence`,
            r.hits.length
          )
        );
      }
    },
    [mutateCase, pushLog]
  );

  const deleteEvidence = useCallback(
    async (caseId: string, evidenceId: string) => {
      mutateCase(caseId, (c) => ({
        ...c,
        evidence: c.evidence.filter((e) => e.id !== evidenceId),
      }));
    },
    [mutateCase]
  );

  // ——— التحليل: قواعد محلية أولًا ثم AI اختياريًا ———
  const runAnalysis = useCallback(
    async (caseId: string) => {
      const target = casesRef.current.find((c) => c.id === caseId);
      if (!target) return;
      setAnalyzingCaseId(caseId);
      mutateCase(caseId, (c) => ({ ...c, state: 'analyzing' }));

      const s = settingsRef.current;
      const apiKey = s.ai.enabled ? await secureGet('tw_ai_key') : null;
      try {
        const { diagnosis, fixPlan } = await analyzeCase(target, {
          ai: {
            enabled: s.ai.enabled,
            baseUrl: s.ai.baseUrl,
            model: s.ai.model,
            apiKey: apiKey ?? undefined,
            sendRedactedData: s.ai.sendRedactedData,
          },
        });
        mutateCase(caseId, (c) => ({
          ...c,
          diagnosis,
          fixPlan,
          severity: diagnosis.severity,
          state: 'fix_plan',
          fingerprint: diagnosis.fingerprint,
        }));
        if (diagnosis.engine === 'ai') {
          pushLog(
            logEntry(
              'outbound',
              'أُرسلت بيانات الحالة (بعد الحجب) إلى مزود الذكاء الاصطناعي',
              'Case data (redacted) sent to AI provider'
            )
          );
        } else if (diagnosis.aiNoticeAr) {
          pushLog(
            logEntry('outbound', `تعذر استخدام الذكاء الاصطناعي: ${diagnosis.aiNoticeAr}`, 'AI unavailable — local results used')
          );
        }
      } finally {
        setAnalyzingCaseId(null);
      }
    },
    [mutateCase, pushLog]
  );

  const markFixApplied = useCallback(
    async (caseId: string) => {
      mutateCase(caseId, (c) =>
        c.fixPlan
          ? {
              ...c,
              fixPlan: { ...c.fixPlan, status: 'applied', appliedAt: new Date().toISOString() },
            }
          : c
      );
    },
    [mutateCase]
  );

  // ——— تسجيل نتيجة التحقق ———
  const recordVerification = useCallback(
    async (
      caseId: string,
      input: { before: string; after: string; evidenceIds: string[]; note?: string }
    ): Promise<VerificationRecord | null> => {
      const outcome = evaluateVerification({
        before: input.before,
        after: input.after,
        newEvidenceCount: input.evidenceIds.length,
      });
      const record: VerificationRecord = {
        id: uid('ver'),
        before: input.before,
        after: input.after,
        evidenceIds: input.evidenceIds,
        result: outcome.result,
        note: input.note ?? outcome.reasonAr,
        createdAt: new Date().toISOString(),
      };
      mutateCase(caseId, (c) => {
        let state: CaseState = c.state;
        if (outcome.result === 'verified' && canTransition(c.state, 'verified')) state = 'verified';
        else if (outcome.result === 'likely' && canTransition(c.state, 'likely_resolved'))
          state = 'likely_resolved';
        else if (outcome.result === 'unresolved' && canTransition(c.state, 'fix_plan'))
          state = 'fix_plan';
        return { ...c, state, verifications: [...c.verifications, record] };
      });
      return record;
    },
    [mutateCase]
  );

  const changeState = useCallback(
    async (caseId: string, to: CaseState): Promise<boolean> => {
      const target = casesRef.current.find((c) => c.id === caseId);
      if (!target || !canTransition(target.state, to)) return false;
      const now = new Date().toISOString();
      const explicit: TimelineEvent | null =
        to === 'open' && target.state === 'closed'
          ? { id: uid('tl'), type: 'reopened', at: now, titleAr: 'أُعيد فتح المشكلة', titleEn: 'Reopened' }
          : to === 'closed'
            ? { id: uid('tl'), type: 'closed', at: now, titleAr: 'أُغلقت المشكلة', titleEn: 'Closed' }
            : null;
      mutateCase(caseId, (c) => ({
        ...c,
        state: to,
        events: explicit ? [...(c.events ?? []), explicit] : c.events,
      }));
      return true;
    },
    [mutateCase]
  );

  const deleteCase = useCallback(
    async (caseId: string) => {
      persistCases((prev) => prev.filter((c) => c.id !== caseId));
    },
    [persistCases]
  );

  const deleteDemoCases = useCallback(async () => {
    persistCases((prev) => prev.filter((c) => !c.isDemo));
  }, [persistCases]);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settingsRef.current, ...patch };
      settingsRef.current = next;
      setSettings(next);
      await saveJson(KEYS.SETTINGS, next);
    },
    []
  );

  const setAiApiKey = useCallback(
    async (key: string) => {
      await secureSet('tw_ai_key', key);
      await updateSettings({
        ai: { ...settingsRef.current.ai, hasApiKey: key.length > 0 },
      });
    },
    [updateSettings]
  );

  // ——— فحص أمني: إعادة فحص كل نصوص الحالات وحجب أي سر متبقٍ ———
  const runSecurityScan = useCallback(async () => {
    let scanned = 0;
    let redacted = 0;
    const next = casesRef.current.map((c) => {
      let changed = false;
      const scan = (v?: string) => {
        if (!v) return v;
        scanned += 1;
        const r = redactText(v);
        if (r.hits.length > 0) {
          redacted += r.hits.length;
          changed = true;
          return r.text;
        }
        return v;
      };
      const evidence = c.evidence.map((e) => {
        const r = redactText(e.content);
        if (r.hits.length === 0) return e;
        redacted += r.hits.length;
        changed = true;
        return { ...e, content: r.text, redactionCount: e.redactionCount + r.hits.length };
      });
      if (!changed) return c;
      return {
        ...c,
        description: scan(c.description) ?? c.description,
        errorMessage: scan(c.errorMessage),
        stackTrace: scan(c.stackTrace),
        codeSnippet: scan(c.codeSnippet),
        evidence,
      };
    });
    if (redacted > 0) persistCases(next);
    pushLog(
      logEntry(
        'scan',
        `فحص أمني: ${scanned} نصًا، حُجبت ${redacted} قيمة سرية جديدة`,
        `Security scan: ${scanned} texts, ${redacted} new secret(s) redacted`,
        redacted
      )
    );
    return { scanned, redacted };
  }, [persistCases, pushLog]);

  // ——— المشاريع ———
  const createProject = useCallback(
    async (p: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
      const project: Project = { ...p, id: uid('proj'), createdAt: new Date().toISOString() };
      setProjects((prev) => {
        const next = [...prev, project];
        void saveJson(KEYS.PROJECTS, next);
        return next;
      });
      return project;
    },
    []
  );

  const deleteProject = useCallback(async (id: string) => {
    setProjects((prev) => {
      const nextP = prev.filter((p) => p.id !== id);
      void saveJson(KEYS.PROJECTS, nextP);
      return nextP;
    });
    // فك ربط الحالات (لا حذفها) — تحديث متزامن عبر المرآة
    const next = casesRef.current.map((c) => (c.projectId === id ? { ...c, projectId: undefined } : c));
    casesRef.current = next;
    setCases(next);
    void saveJson(KEYS.CASES, next);
  }, []);

  // ——— ما الذي تغير؟ ———
  const addChange = useCallback(
    async (caseId: string, kind: ChangeKind, description: string) => {
      const now = new Date().toISOString();
      const label = CHANGE_KIND_LABELS[kind];
      const evId = uid('ev');
      const changeEv: Evidence = {
        id: evId,
        caseId,
        type: 'recent_change',
        title: `${label.ar}`,
        content: description,
        createdAt: now,
        redactionCount: 0,
      };
      // الحجب يسري على وصف التغيير أيضًا
      const r = redactText(description);
      changeEv.content = r.text;
      changeEv.redactionCount = r.hits.length;
      mutateCase(caseId, (c) => ({
        ...c,
        changes: [
          ...(c.changes ?? []),
          { id: uid('chg'), kind, description: r.text, at: now, linkedEvidenceId: evId },
        ],
        evidence: [...c.evidence, changeEv],
      }));
    },
    [mutateCase]
  );

  // ——— اعتماد خطة الإصلاح (موافقة صريحة قبل التطبيق) ———
  const approveFixPlan = useCallback(
    async (caseId: string) => {
      mutateCase(caseId, (c) =>
        c.fixPlan && c.fixPlan.status === 'proposed'
          ? { ...c, fixPlan: { ...c.fixPlan, status: 'approved' } }
          : c
      );
    },
    [mutateCase]
  );

  const exportData = useCallback((): string => {
    return JSON.stringify(
      {
        app: 'TRACEWISE',
        version: 1,
        exportedAt: new Date().toISOString(),
        cases: casesRef.current,
        settings: settingsRef.current,
      },
      null,
      2
    );
  }, []);

  const importData = useCallback(
    async (json: string): Promise<boolean> => {
      try {
        const parsed = JSON.parse(json) as { cases?: DebugCase[]; settings?: AppSettings };
        if (!Array.isArray(parsed.cases)) return false;
        persistCases(parsed.cases);
        if (parsed.settings) {
          const s = { ...DEFAULT_SETTINGS, ...parsed.settings };
          setSettings(s);
          await saveJson(KEYS.SETTINGS, s);
        }
        return true;
      } catch {
        return false;
      }
    },
    [persistCases]
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      cases,
      projects,
      settings,
      securityLog,
      analyzingCaseId,
      createProject,
      deleteProject,
      addChange,
      approveFixPlan,
      createCase,
      addEvidence,
      deleteEvidence,
      runAnalysis,
      markFixApplied,
      recordVerification,
      changeState,
      deleteCase,
      deleteDemoCases,
      updateSettings,
      setAiApiKey,
      runSecurityScan,
      exportData,
      importData,
    }),
    [
      ready,
      cases,
      projects,
      settings,
      securityLog,
      analyzingCaseId,
      createProject,
      deleteProject,
      addChange,
      approveFixPlan,
      createCase,
      addEvidence,
      deleteEvidence,
      runAnalysis,
      markFixApplied,
      recordVerification,
      changeState,
      deleteCase,
      deleteDemoCases,
      updateSettings,
      setAiApiKey,
      runSecurityScan,
      exportData,
      importData,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
