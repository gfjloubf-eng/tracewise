/**
 * TRACEWISE Visuals — طبقة UI بصرية فوق الشاشات الحالية (ADDITIVE).
 * الهوية: ‎</> → 💡‎ (كود ← مشكلة ← تحليل ← حل).
 * لا صور، لا أصول خارجية، لا شبكة — كل الخلفيات Views وألوان من الثيم الحالي فقط.
 * لا يغيّر أي منطق أعمال: كل مكوّن عرضي (presentational) يقرأ getTheme(dark) نفسه.
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme, Theme } from '../../core/theme';
import { useI18n } from '../../core/i18n/I18nProvider';
import { Severity } from '../../domain/types';
import { Logo } from '../components';

/** خلفية TRACEWISE الهادئة — دوائر إضاءة ناعمة مولّدة بـ Views (بدون أي صورة). */
export function TracewiseBackdrop({ dark, children }: { dark: boolean; children?: React.ReactNode }) {
  const t = getTheme(dark);
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* توهج تركواز علوي */}
        <View
          style={{
            position: 'absolute',
            top: -120,
            end: -90,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: `${t.colors.accent}12`,
          }}
        />
        {/* توهج أزرق سفلي */}
        <View
          style={{
            position: 'absolute',
            bottom: -140,
            start: -100,
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: `${t.colors.primary}10`,
          }}
        />
        {/* نقطة ضوء صغيرة وسطية */}
        <View
          style={{
            position: 'absolute',
            top: '38%',
            start: '18%',
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: `${t.colors.info}0A`,
          }}
        />
      </View>
      {children}
    </View>
  );
}

/**
 * هوية TRACEWISE الموحدة: الشعار المركزي + الاسم + الشعار اللفظي.
 * يستخدم مكوّن Logo الموجود (لا تكرار للشعار).
 */
export function BrandLockup({ dark, compact }: { dark: boolean; compact?: boolean }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  return (
    <View style={{ alignItems: 'center', gap: compact ? 6 : t.spacing(2) }}>
      <Logo size={compact ? 44 : 64} dark={dark} />
      <Text
        style={{
          color: t.colors.text,
          fontSize: compact ? 20 : 28,
          fontWeight: '800',
          letterSpacing: compact ? 2 : 4,
          writingDirection: 'ltr',
        }}
      >
        TRACEWISE
      </Text>
      {!compact && (
        <Text style={{ color: t.colors.accent, fontSize: t.font.body, fontWeight: '600' }}>
          {tr('app.nameAr')} — {tr('app.subtitle')}
        </Text>
      )}
      <Text
        style={{
          color: t.colors.textMuted,
          fontSize: t.font.tiny,
          fontWeight: '700',
          letterSpacing: 2,
          writingDirection: 'ltr',
        }}
      >
        DEBUG • SOLVE • LEARN • BUILD
      </Text>
      {!compact && (
        <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>«{tr('app.tagline')}»</Text>
      )}
    </View>
  );
}

/** عنوان قسم موحّد — شارة أيقونة + خط هوية رفيع. */
export function SectionHeader({
  dark,
  title,
  icon,
  action,
}: {
  dark: boolean;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: React.ReactNode;
}) {
  const t = getTheme(dark);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
      {icon ? (
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            backgroundColor: t.colors.primaryDim,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={14} color={t.colors.primary} />
        </View>
      ) : (
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: t.colors.accent }} />
      )}
      <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.body, fontWeight: '800' }}>{title}</Text>
      {action}
    </View>
  );
}

const SEVERITY_STYLE: Record<Severity, { colorKey: 'info' | 'warning' | 'danger'; bgKey: 'infoDim' | 'warningDim' | 'dangerDim' }> = {
  low: { colorKey: 'info', bgKey: 'infoDim' },
  medium: { colorKey: 'warning', bgKey: 'warningDim' },
  high: { colorKey: 'danger', bgKey: 'dangerDim' },
  critical: { colorKey: 'danger', bgKey: 'dangerDim' },
};

/** حبة الخطورة — تُعرض فقط عند وجود severity حقيقية (الألوان للدلالة لا للزينة). */
export function SeverityPill({ dark, severity }: { dark: boolean; severity: Severity }) {
  const t: Theme = getTheme(dark);
  const { t: tr } = useI18n();
  const s = SEVERITY_STYLE[severity];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: t.colors[s.bgKey],
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.colors[s.colorKey] }} />
      <Text style={{ color: t.colors[s.colorKey], fontSize: t.font.tiny, fontWeight: '700' }}>
        {tr(`severity.${severity}`)}
      </Text>
    </View>
  );
}

/** رقاقة دليل/معلومة تقنية — mono ⇒ LTR إلزامي للكود والمسارات والسجلات. */
export function EvidenceChip({
  dark,
  label,
  value,
  mono,
}: {
  dark: boolean;
  label: string;
  value?: string;
  mono?: boolean;
}) {
  const t = getTheme(dark);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: t.colors.chipBg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny, fontWeight: '600' }}>{label}</Text>
      {value ? (
        <Text
          style={{
            color: t.colors.text,
            fontSize: t.font.tiny,
            fontWeight: '700',
            fontFamily: mono ? 'monospace' : undefined,
            writingDirection: mono ? 'ltr' : 'auto',
          }}
        >
          {value}
        </Text>
      ) : null}
    </View>
  );
}

export type JourneyStepStatus = 'done' | 'current' | 'pending';

export interface JourneyStep {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  status: JourneyStepStatus;
}

/**
 * سكة رحلة التشخيص — UI فقط:
 * Problem → Evidence → Hypotheses → Root Cause → Fix Plan → Verification.
 * الحالات (done/current/pending) تُمرَّر من الشاشة — لا منطق هنا.
 */
export function JourneyRail({ dark, steps }: { dark: boolean; steps: JourneyStep[] }) {
  const t = getTheme(dark);
  return (
    <View>
      {steps.map((s, i) => {
        const color =
          s.status === 'done' ? t.colors.success : s.status === 'current' ? t.colors.warning : t.colors.textFaint;
        const icon = s.status === 'done' ? 'checkmark-circle' : s.status === 'current' ? 'radio-button-on' : 'ellipse-outline';
        return (
          <View key={s.label} style={{ flexDirection: 'row' }}>
            {/* العمود: نقطة + خط */}
            <View style={{ alignItems: 'center', width: 30 }}>
              <Ionicons name={icon} size={20} color={color} />
              {i < steps.length - 1 && (
                <View
                  style={{
                    flex: 1,
                    width: 2,
                    minHeight: 22,
                    backgroundColor: s.status === 'done' ? t.colors.successDim : t.colors.cardBorder,
                  }}
                />
              )}
            </View>
            {/* المحتوى */}
            <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 12 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    flex: 1,
                    color: s.status === 'pending' ? t.colors.textFaint : t.colors.text,
                    fontSize: t.font.body,
                    fontWeight: '600',
                  }}
                >
                  {s.label}
                </Text>
                {s.icon ? <Ionicons name={s.icon} size={16} color={color} /> : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** حالة فارغة موحدة — تُعرض فقط عندما لا توجد بيانات حقيقية. */
export function TracewiseEmptyState({
  dark,
  icon,
  title,
  subtitle,
  action,
}: {
  dark: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const t = getTheme(dark);
  return (
    <View
      style={{
        alignItems: 'center',
        gap: t.spacing(2),
        paddingVertical: t.spacing(8),
        paddingHorizontal: t.spacing(4),
      }}
    >
      {icon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: t.colors.bgElevated,
            borderWidth: 1,
            borderColor: t.colors.cardBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={26} color={t.colors.accent} />
        </View>
      ) : null}
      <Text style={{ color: t.colors.text, fontSize: t.font.body, fontWeight: '700', textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: t.colors.textFaint, fontSize: t.font.small, textAlign: 'center', lineHeight: 19 }}>
          {subtitle}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

/** حالة تحميل موحدة. */
export function TracewiseLoadingState({ dark, label }: { dark: boolean; label?: string }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  return (
    <View style={{ alignItems: 'center', gap: t.spacing(2), paddingVertical: t.spacing(4) }}>
      <ActivityIndicator color={t.colors.primary} />
      <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{label ?? tr('common.loading')}</Text>
    </View>
  );
}

/** حالة خطأ موحدة — رسالة واضحة + إعادة محاولة اختيارية. */
export function TracewiseErrorState({
  dark,
  title,
  message,
  onRetry,
}: {
  dark: boolean;
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  return (
    <View style={{ alignItems: 'center', gap: t.spacing(2), paddingVertical: t.spacing(8), paddingHorizontal: t.spacing(4) }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.colors.dangerDim,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="alert-circle-outline" size={26} color={t.colors.danger} />
      </View>
      <Text style={{ color: t.colors.text, fontSize: t.font.body, fontWeight: '700', textAlign: 'center' }}>
        {title ?? tr('common.error')}
      </Text>
      {message ? (
        <Text style={{ color: t.colors.textFaint, fontSize: t.font.small, textAlign: 'center', lineHeight: 19 }}>
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 18,
            borderRadius: t.radius.md,
            backgroundColor: pressed ? t.colors.primaryDim : t.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Text style={{ color: '#FFFFFF', fontSize: t.font.small, fontWeight: '800' }}>{tr('common.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
