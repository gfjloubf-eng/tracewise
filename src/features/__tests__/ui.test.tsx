/**
 * اختبارات الواجهات الأساسية (Widget Tests)
 * تعمل على jest-expo + @testing-library/react-native (v14: بدون screen العام).
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StoreProvider } from '../../state/AppStore';
import { I18nProvider } from '../../core/i18n/I18nProvider';
import { HomeScreen } from '../home/HomeScreen';
import { NewCaseScreen } from '../newcase/NewCaseScreen';
import { CaseDetailsScreen } from '../casedetails/CaseDetailsScreen';

async function wrap(ui: React.ReactNode) {
  return await render(
    <StoreProvider>
      <I18nProvider lang="ar">{ui}</I18nProvider>
    </StoreProvider>
  );
}

const noop = () => undefined;

describe('HomeScreen', () => {
  it('يعرض الترحيب والحالات التجريبية بعد التحميل', async () => {
    const r = await wrap(
      <HomeScreen dark onOpenCase={noop} onNewCase={noop} onScan={noop} onSecurity={noop} onMemory={noop} />
    );
    expect(r.getByText('أهلًا بك في TRACEWISE')).toBeTruthy();
    // الحالات التجريبية تُحمَّل من التخزين (mock) بعد البذر
    expect(await r.findByText('فشل تسجيل الدخول — HTTP 401')).toBeTruthy();
    expect(r.getByText('مشاكل مفتوحة')).toBeTruthy();
    expect(r.getByText('مشكلة جديدة')).toBeTruthy();
  });

  it('يعرض شارة البيانات التجريبية', async () => {
    const r = await wrap(
      <HomeScreen dark onOpenCase={noop} onNewCase={noop} onScan={noop} onSecurity={noop} onMemory={noop} />
    );
    expect((await r.findAllByText('تجريبية')).length).toBeGreaterThan(0);
  });
});

describe('NewCaseScreen — معالج الإنشاء', () => {
  it('يمنع المتابعة بدون عنوان ثم ينشئ المشكلة', async () => {
    const onCreated = jest.fn();
    const r = await wrap(
      <NewCaseScreen dark onCreated={onCreated} onCancel={noop} onScan={noop} />
    );

    // متابعة بدون عنوان → رسالة خطأ
    await fireEvent.press(r.getByText('التالي'));
    expect(await r.findByText('عنوان المشكلة مطلوب')).toBeTruthy();

    // إدخال عنوان ومتابعة الخطوات
    await fireEvent.changeText(r.getByPlaceholderText('مثال: فشل تسجيل الدخول — HTTP 401'), 'مشكلة اختبار');
    await fireEvent.press(r.getByText('التالي')); // → الخطوة 2
    await fireEvent.press(r.getByText('التالي')); // → الخطوة 3
    await fireEvent.press(r.getByText('التالي')); // → الخطوة 4 (المراجعة)

    expect(await r.findByText('بصمة المشكلة')).toBeTruthy();
    await fireEvent.press(r.getByText('إنشاء المشكلة'));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });
});

describe('CaseDetailsScreen', () => {
  it('يعرض رحلة التشخيص للحالة التجريبية ثم التحليل', async () => {
    const r = await wrap(<CaseDetailsScreen caseId="demo-1" dark onBack={noop} onDeleted={noop} />);

    // الرحلة
    expect(await r.findByText('رحلة التشخيص')).toBeTruthy();
    expect(r.getByText('تم التحقق')).toBeTruthy(); // حالة demo-1

    // تبويب التحليل
    await fireEvent.press(r.getByText('التحليل'));
    expect(await r.findByText('السبب الجذري المحتمل')).toBeTruthy();
    expect(r.getAllByText('مشكلة مصادقة (Authentication) محتملة').length).toBeGreaterThan(0);
  });

  it('تبويب التحقق يعرض سجل التحقق الموثق', async () => {
    const r = await wrap(<CaseDetailsScreen caseId="demo-1" dark onBack={noop} onDeleted={noop} />);
    expect(await r.findByText('رحلة التشخيص')).toBeTruthy();
    await fireEvent.press(r.getAllByText('التحقق')[0]);
    expect(await r.findByText('HTTP 401')).toBeTruthy();
    expect(r.getByText('HTTP 200')).toBeTruthy();
  });
});
