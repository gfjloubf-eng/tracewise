/** اختبارات TRACEWISE Visuals — الطبقة البصرية الجديدة */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { I18nProvider } from '../../../core/i18n/I18nProvider';
import {
  TracewiseBackdrop,
  BrandLockup,
  SectionHeader,
  SeverityPill,
  EvidenceChip,
  JourneyRail,
  TracewiseEmptyState,
  TracewiseLoadingState,
  TracewiseErrorState,
} from '../TracewiseVisuals';
import type { JourneyStep } from '../TracewiseVisuals';

async function wrap(ui: React.ReactNode) {
  return await render(<I18nProvider lang="ar">{ui}</I18nProvider>);
}

describe('TracewiseBackdrop', () => {
  it('يعرض المحتوى فوق الخلفية دون أي صور', async () => {
    const r = await wrap(
      <TracewiseBackdrop dark>
        <Text>{'محتوى الشاشة'}</Text>
      </TracewiseBackdrop>
    );
    // لا Image في الشجرة كلها (الخلفية Views وألوان فقط — لا صور ولا شبكة)
    const json = JSON.stringify(r.toJSON());
    expect(json).not.toContain('"type":"Image"');
    expect(r.getByText('محتوى الشاشة')).toBeTruthy();
  });
});

describe('BrandLockup', () => {
  it('يعرض الهوية </> → 💡 مع الاسم والشعار اللفظي', async () => {
    const r = await wrap(<BrandLockup dark />);
    expect(r.getByText('</>')).toBeTruthy();
    expect(r.getByText('TRACEWISE')).toBeTruthy();
    expect(r.getByText('DEBUG • SOLVE • LEARN • BUILD')).toBeTruthy();
    expect(r.getByText('مساعد المبرمج الذكي', { exact: false })).toBeTruthy();
  });
});

describe('SectionHeader', () => {
  it('يعرض عنوان القسم', async () => {
    const r = await wrap(<SectionHeader dark title="إجراءات سريعة" icon="flash-outline" />);
    expect(r.getByText('إجراءات سريعة')).toBeTruthy();
  });
});

describe('SeverityPill', () => {
  it('يترجم كل مستوى ويعرضه', async () => {
    const r = await wrap(
      <>
        <SeverityPill dark severity="low" />
        <SeverityPill dark severity="medium" />
        <SeverityPill dark severity="high" />
        <SeverityPill dark severity="critical" />
      </>
    );
    expect(r.getByText('منخفضة')).toBeTruthy();
    expect(r.getByText('متوسطة')).toBeTruthy();
    expect(r.getByText('عالية')).toBeTruthy();
    expect(r.getByText('حرجة')).toBeTruthy();
  });

  it('low → info و medium → warning و high/critical → danger (ألوان الثيم)', async () => {
    const low = await wrap(<SeverityPill dark severity="low" />);
    const med = await wrap(<SeverityPill dark severity="medium" />);
    const high = await wrap(<SeverityPill dark severity="high" />);
    const crit = await wrap(<SeverityPill dark severity="critical" />);
    expect(low.getByText('منخفضة').props.style.color).toBe('#60A5FA'); // info
    expect(med.getByText('متوسطة').props.style.color).toBe('#FBBF24'); // warning
    expect(high.getByText('عالية').props.style.color).toBe('#F87171'); // danger
    expect(crit.getByText('حرجة').props.style.color).toBe('#F87171'); // danger
  });
});

describe('EvidenceChip', () => {
  it('mono يفرض LTR للقيم التقنية', async () => {
    const r = await wrap(<EvidenceChip dark label="Stack" value="at auth/login.ts:42" mono />);
    const value = r.getByText('at auth/login.ts:42');
    expect(value.props.style.writingDirection).toBe('ltr');
    expect(value.props.style.fontFamily).toBe('monospace');
    expect(r.getByText('Stack')).toBeTruthy();
  });
});

describe('JourneyRail', () => {
  const steps: JourneyStep[] = [
    { label: 'المشكلة', status: 'done', icon: 'bug-outline' },
    { label: 'الأدلة', status: 'done', icon: 'documents-outline' },
    { label: 'الاحتمالات', status: 'current', icon: 'git-branch-outline' },
    { label: 'السبب المحتمل', status: 'pending' },
    { label: 'الحل', status: 'pending' },
    { label: 'التحقق', status: 'pending' },
  ];

  it('يعرض مراحل الرحلة الست بالترتيب', async () => {
    const r = await wrap(<JourneyRail dark steps={steps} />);
    for (const s of steps) expect(r.getByText(s.label)).toBeTruthy();
    const labels = ['المشكلة', 'الأدلة', 'الاحتمالات', 'السبب المحتمل', 'الحل', 'التحقق'];
    const json = JSON.stringify(r.toJSON());
    const idx = labels.map((l) => json.indexOf(l));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
});

describe('حالات Empty / Loading / Error', () => {
  it('EmptyState يعرض العنوان والوصف', async () => {
    const r = await wrap(<TracewiseEmptyState dark icon="file-tray-outline" title="لا توجد مشاكل بعد" subtitle="ابدأ بإضافة حالة" />);
    expect(r.getByText('لا توجد مشاكل بعد')).toBeTruthy();
    expect(r.getByText('ابدأ بإضافة حالة')).toBeTruthy();
  });

  it('LoadingState يعرض رسالة التحميل الافتراضية', async () => {
    const r = await wrap(<TracewiseLoadingState dark />);
    expect(r.getByText('جارٍ التحميل…')).toBeTruthy();
  });

  it('ErrorState ينفّذ إعادة المحاولة فعليًا', async () => {
    const onRetry = jest.fn();
    const r = await wrap(<TracewiseErrorState dark title="تعذّر الاتصال" message="تحقق من الشبكة" onRetry={onRetry} />);
    expect(r.getByText('تعذّر الاتصال')).toBeTruthy();
    await fireEvent.press(r.getByText('إعادة المحاولة'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
