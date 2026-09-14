/**
 * نظام مسودة «مشكلة جديدة» — end-to-end:
 * إدخال ← حفظ تلقائي ← إلغاء ← (إغلاق التطبيق) ← إعادة فتح ← استعادة ← إنشاء ← حذف المسودة.
 *
 * ملاحظة منهجية: الرحلة مقسمة على اختبارين يحاكي كلٌّ منهما «جلسة تطبيق» مستقلة
 * (الاستعادة تحدث عند الفتح من التخزين — كما بعد إغلاق التطبيق فعليًا)،
 * لأن عرضين متزامنين مع عمليات async داخل اختبار واحد يفسدان طابور act في RTL v14.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoreProvider } from '../../state/AppStore';
import { I18nProvider } from '../../core/i18n/I18nProvider';
import { NewCaseScreen } from '../newcase/NewCaseScreen';
import { deleteNewCaseDraft, loadNewCaseDraft, saveNewCaseDraft } from '../../state/draftStore';
import { containsSecrets } from '../../security/redaction';

const RAW_TOKEN = 'ghp_' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ab';
const TITLE_PLACEHOLDER = 'مثال: فشل تسجيل الدخول — HTTP 401';
const RESTORED_BANNER = 'تم استعادة مسودة محفوظة — استكمل من حيث توقفت.';

async function wrap(ui: React.ReactNode) {
  return await render(
    <StoreProvider>
      <I18nProvider lang="ar">{ui}</I18nProvider>
    </StoreProvider>
  );
}
const noop = () => undefined;
const baseDraft = { title: 'مشكلة الشبكة', description: 'الطلبات تفشل ليلًا', step: 0 };
/** انتظار الحفظ التلقائي (debounce = 800ms) دون RTL — فحص مباشر للتخزين */
const settle = (ms = 1300) => new Promise((res) => setTimeout(res, ms));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Draft Store — حفظ / تحديث / حذف / أمان', () => {
  it('يحفظ المسودة ويعيد قراءتها بكل حقولها', async () => {
    await saveNewCaseDraft({
      ...baseDraft,
      language: 'Dart',
      errorMessage: 'HTTP 500',
      stackTrace: 'at main.dart:42',
      projectId: 'p1',
      step: 2,
    });
    const d = await loadNewCaseDraft();
    expect(d).not.toBeNull();
    expect(d!.title).toBe('مشكلة الشبكة');
    expect(d!.description).toBe('الطلبات تفشل ليلًا');
    expect(d!.language).toBe('Dart');
    expect(d!.errorMessage).toBe('HTTP 500');
    expect(d!.stackTrace).toBe('at main.dart:42');
    expect(d!.projectId).toBe('p1');
    expect(d!.step).toBe(2);
    expect(d!.updatedAt).toBeTruthy();
  });

  it('يحدّث المسودة — آخر حفظ هو المعتمد', async () => {
    await saveNewCaseDraft(baseDraft);
    await saveNewCaseDraft({ ...baseDraft, title: 'عنوان محدث', step: 1 });
    const d = await loadNewCaseDraft();
    expect(d!.title).toBe('عنوان محدث');
    expect(d!.step).toBe(1);
  });

  it('يحذف المسودة نهائيًا', async () => {
    await saveNewCaseDraft(baseDraft);
    await deleteNewCaseDraft();
    expect(await loadNewCaseDraft()).toBeNull();
  });

  it('لا يخزن أسرارًا خام — الحجب قبل التخزين', async () => {
    await saveNewCaseDraft({
      ...baseDraft,
      errorMessage: `فشل الطلب مع ${RAW_TOKEN}`,
      environment: 'password=OldPass123',
    });
    const d = await loadNewCaseDraft();
    expect(d!.errorMessage).not.toContain(RAW_TOKEN);
    expect(d!.errorMessage).toMatch(/\[REDACTED/);
    expect(d!.environment).not.toContain('OldPass123');
    expect(d!.environment).toMatch(/\[REDACTED\]/);
    // التخزين الخام نفسه نظيف
    const rawDump = (await AsyncStorage.getItem('tw_new_case_draft_v1')) ?? '';
    expect(containsSecrets(rawDump)).toBe(false);
  });
});

describe('الجلسة 1 — إدخال ← حفظ تلقائي ← إلغاء (المسودة تبقى)', () => {
  it('الحفظ التلقائي يخزن أثناء الكتابة، والإلغاء لا يحذف المسودة', async () => {
    const onCancel = jest.fn();
    const r = await wrap(<NewCaseScreen dark onCreated={noop} onCancel={onCancel} onScan={noop} />);

    // لا مسودة عند الفتح الأول
    expect(await loadNewCaseDraft()).toBeNull();

    await fireEvent.changeText(r.getByPlaceholderText(TITLE_PLACEHOLDER), 'مشكلة الشبكة');
    await settle(); // debounce 800ms + هامش

    const d = await loadNewCaseDraft();
    expect(d?.title).toBe('مشكلة الشبكة');
    expect(d?.updatedAt).toBeTruthy();

    // مؤشر الحالة للمستخدم
    expect(await r.findByText('تم حفظ المسودة ✓')).toBeTruthy();

    // الإلغاء — لا حذف تلقائي
    await fireEvent.press(r.getByText('إلغاء'));
    expect(onCancel).toHaveBeenCalled();
    expect((await loadNewCaseDraft())!.title).toBe('مشكلة الشبكة');
  });

  it('حفظ يدوي عبر زر «💾 حفظ المسودة»', async () => {
    const r = await wrap(<NewCaseScreen dark onCreated={noop} onCancel={noop} onScan={noop} />);
    await fireEvent.changeText(r.getByPlaceholderText(TITLE_PLACEHOLDER), 'حفظ يدوي');
    await fireEvent.press(r.getByText('💾 حفظ المسودة'));
    await waitFor(
      async () => {
        const d = await loadNewCaseDraft();
        expect(d?.title).toBe('حفظ يدوي');
      },
      { timeout: 4000 }
    );
    expect(await r.findByText('تم حفظ المسودة ✓')).toBeTruthy();
  });
});

describe('الجلسة 2 — إعادة الفتح: استعادة ← إنشاء ← حذف المسودة', () => {
  it('يستعيد المسودة: الحقول + خطوة الـWizard + شريط التنبيه + آخر حفظ', async () => {
    await saveNewCaseDraft({ ...baseDraft, errorMessage: 'HTTP 500', step: 2 });
    const r = await wrap(<NewCaseScreen dark onCreated={noop} onCancel={noop} onScan={noop} />);

    expect(await r.findByText(RESTORED_BANNER)).toBeTruthy();
    expect(r.getByText('بدء مشكلة جديدة')).toBeTruthy();
    // step=2 → «الخطوة 3 من 4»
    expect(r.getByText('الخطوة 3 من 4')).toBeTruthy();
    // بعد الاستعادة يعمل الحفظ التلقائي مجددًا وتظهر حالة الحفظ
    expect(await r.findByText('تم حفظ المسودة ✓', {}, { timeout: 4000 })).toBeTruthy();
    // والخطوة المستعادة ما زالت كما هي (لم يقفز الـWizard)
    expect(r.getByText('الخطوة 3 من 4')).toBeTruthy();
  });

  it('الاستعادة في الخطوة الأولى تعيد العنوان، وإكمال المعالج يحذف المسودة بعد الإنشاء', async () => {
    await saveNewCaseDraft(baseDraft);
    const onCreated = jest.fn();
    const r = await wrap(<NewCaseScreen dark onCreated={onCreated} onCancel={noop} onScan={noop} />);

    // الاستعادة ظاهرة في الحقل نفسه
    expect(await r.findByText(RESTORED_BANNER)).toBeTruthy();
    expect(r.getByPlaceholderText(TITLE_PLACEHOLDER).props.value).toBe('مشكلة الشبكة');

    // إكمال الخطوات حتى الإنشاء
    await fireEvent.press(r.getByText('التالي'));
    await fireEvent.press(r.getByText('التالي'));
    await fireEvent.press(r.getByText('التالي'));
    await fireEvent.press(r.getByText('إنشاء المشكلة'));
    await waitFor(() => expect(onCreated).toHaveBeenCalled(), { timeout: 5000 });

    // المسودة حُذفت بعد نجاح الإنشاء — ولا تُبعث من أي مؤجل
    await settle(1300);
    expect(await loadNewCaseDraft()).toBeNull();
  });
});
