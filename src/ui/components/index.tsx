/**
 * نظام تصميم TRACEWISE — مكوّنات أساسية Mobile First.
 * Touch targets ≥ 44، بطاقات نظيفة، بلا ازدحام.
 */
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  Switch,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTheme, Theme } from '../../core/theme';
import { CASE_STATE_LABELS, SEVERITY_LABELS } from '../../domain/caseStates';
import { CaseState, Severity } from '../../domain/types';
import { useI18n } from '../../core/i18n/I18nProvider';

export interface ThemeCtx {
  theme: Theme;
  rtl: boolean;
}

export function useThemeCtx(dark: boolean): ThemeCtx {
  const { rtl } = useI18n();
  return { theme: getTheme(dark), rtl };
}

// ——— Screen ———
export function Screen({
  children,
  dark,
  scroll = true,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  dark: boolean;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = getTheme(dark);
  const body = padded ? <View style={{ padding: t.spacing(4), gap: t.spacing(3) }}>{children}</View> : <>{children}</>;
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: t.colors.bg }, style]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

// ——— AppHeader ———
export function AppHeader({
  title,
  dark,
  onBack,
  right,
}: {
  title: string;
  dark: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const t = getTheme(dark);
  const { rtl } = useI18n();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: t.spacing(4),
        paddingVertical: t.spacing(3),
        gap: t.spacing(3),
        backgroundColor: t.colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.cardBorder,
      }}
    >
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
        >
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={24} color={t.colors.text} />
        </Pressable>
      )}
      <Text
        numberOfLines={1}
        style={{ flex: 1, color: t.colors.text, fontSize: t.font.title, fontWeight: '700' }}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

// ——— Card ———
export function Card({
  children,
  dark,
  style,
  onPress,
}: {
  children: React.ReactNode;
  dark: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const t = getTheme(dark);
  const box = (
    <View
      style={[
        {
          backgroundColor: t.colors.card,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.cardBorder,
          padding: t.spacing(4),
          gap: t.spacing(2),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        {box}
      </Pressable>
    );
  }
  return box;
}

// ——— SectionTitle ———
export function SectionTitle({ text, dark, icon }: { text: string; dark: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const t = getTheme(dark);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(2), marginTop: t.spacing(2) }}>
      {icon && <Ionicons name={icon} size={17} color={t.colors.accent} />}
      <Text style={{ color: t.colors.text, fontSize: t.font.body, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

// ——— Button ———
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export function Btn({
  label,
  onPress,
  dark,
  variant = 'primary',
  icon,
  disabled,
  loading,
  full = true,
}: {
  label: string;
  onPress: () => void;
  dark: boolean;
  variant?: BtnVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
}) {
  const t = getTheme(dark);
  const palette: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: t.colors.primary, fg: '#FFFFFF' },
    secondary: { bg: 'transparent', fg: t.colors.text, border: t.colors.cardBorder },
    ghost: { bg: 'transparent', fg: t.colors.primary },
    danger: { bg: t.colors.dangerDim, fg: t.colors.danger, border: t.colors.danger },
    success: { bg: t.colors.successDim, fg: t.colors.success, border: t.colors.success },
  };
  const p = palette[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: t.radius.md,
          backgroundColor: p.bg,
          borderWidth: p.border ? 1 : 0,
          borderColor: p.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.spacing(2),
          paddingHorizontal: t.spacing(4),
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : (
        icon && <Ionicons name={icon} size={18} color={p.fg} />
      )}
      <Text style={{ color: p.fg, fontSize: t.font.body, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

// ——— Chip ———
export function Chip({
  label,
  active,
  onPress,
  dark,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  dark: boolean;
}) {
  const t = getTheme(dark);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        minHeight: 38,
        paddingHorizontal: t.spacing(3),
        borderRadius: 999,
        backgroundColor: active ? t.colors.chipBgActive : t.colors.chipBg,
        borderWidth: 1,
        borderColor: active ? t.colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: active ? t.colors.text : t.colors.textMuted,
          fontSize: t.font.small,
          fontWeight: active ? '700' : '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ——— Badges ———
export const STATE_COLORS: Record<CaseState, { fg: string; bgKey: 'infoDim' | 'warningDim' | 'primaryDim' | 'accentDim' | 'successDim' | 'chipBg' }> = {
  open: { fg: 'info', bgKey: 'infoDim' },
  analyzing: { fg: 'warning', bgKey: 'warningDim' },
  fix_plan: { fg: 'primary', bgKey: 'primaryDim' },
  likely_resolved: { fg: 'accent', bgKey: 'accentDim' },
  verified: { fg: 'success', bgKey: 'successDim' },
  closed: { fg: 'textFaint', bgKey: 'chipBg' },
};

export function StateBadge({ state, dark }: { state: CaseState; dark: boolean }) {
  const t = getTheme(dark);
  const { lang } = useI18n();
  const c = STATE_COLORS[state];
  const fg = t.colors[c.fg as keyof typeof t.colors] as string;
  const bg = t.colors[c.bgKey];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: t.font.tiny, fontWeight: '700' }}>
        {lang === 'ar' ? CASE_STATE_LABELS[state].ar : CASE_STATE_LABELS[state].en}
      </Text>
    </View>
  );
}

export function SeverityBadge({ severity, dark }: { severity: Severity; dark: boolean }) {
  const t = getTheme(dark);
  const { lang } = useI18n();
  const map: Record<Severity, { fg: string; bg: string }> = {
    low: { fg: t.colors.success, bg: t.colors.successDim },
    medium: { fg: t.colors.warning, bg: t.colors.warningDim },
    high: { fg: t.colors.danger, bg: t.colors.dangerDim },
    critical: { fg: '#FFFFFF', bg: t.colors.danger },
  };
  const c = map[severity];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ color: c.fg, fontSize: t.font.tiny, fontWeight: '700' }}>
        {lang === 'ar' ? SEVERITY_LABELS[severity].ar : SEVERITY_LABELS[severity].en}
      </Text>
    </View>
  );
}

// ——— Inputs ———
export function Field({
  label,
  value,
  onChangeText,
  dark,
  placeholder,
  multiline,
  hint,
  mono,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  dark: boolean;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
  mono?: boolean;
}) {
  const t = getTheme(dark);
  return (
    <View style={{ gap: t.spacing(1) }}>
      <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textFaint}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          backgroundColor: t.colors.inputBg,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.cardBorder,
          color: t.colors.text,
          fontSize: t.font.body,
          padding: t.spacing(3),
          minHeight: multiline ? 110 : 48,
          fontFamily: mono ? 'monospace' : undefined,
          // الكود/المسارات/المخرجات تبقى LTR دائمًا؛ النصوص العادية تتبع اللغة
          writingDirection: mono ? 'ltr' : 'auto',
          textAlign: mono ? 'left' : undefined,
        }}
      />
      {hint && <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{hint}</Text>}
    </View>
  );
}

// ——— Confidence bar ———
export function ConfidenceBar({ value, dark }: { value: number; dark: boolean }) {
  const t = getTheme(dark);
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const color = pct >= 70 ? t.colors.success : pct >= 45 ? t.colors.warning : t.colors.danger;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(2) }}>
      <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: t.colors.chipBg, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 999, backgroundColor: color }} />
      </View>
      <Text style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '700', minWidth: 42, textAlign: 'center' }}>
        {pct}%
      </Text>
    </View>
  );
}

// ——— EmptyState ———
export function EmptyState({ dark, icon, title, body }: { dark: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; body?: string }) {
  const t = getTheme(dark);
  return (
    <View style={{ alignItems: 'center', paddingVertical: t.spacing(8), gap: t.spacing(2) }}>
      <Ionicons name={icon} size={44} color={t.colors.textFaint} />
      <Text style={{ color: t.colors.textMuted, fontSize: t.font.body, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {body && (
        <Text style={{ color: t.colors.textFaint, fontSize: t.font.small, textAlign: 'center', paddingHorizontal: t.spacing(6) }}>
          {body}
        </Text>
      )}
    </View>
  );
}

// ——— Toggle row ———
export function ToggleRow({
  label,
  note,
  value,
  onValueChange,
  dark,
  disabled,
  lockIcon,
}: {
  label: string;
  note?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  dark: boolean;
  disabled?: boolean;
  lockIcon?: boolean;
}) {
  const t = getTheme(dark);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(3), minHeight: 48 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: t.colors.text, fontSize: t.font.body, fontWeight: '600' }}>{label}</Text>
          {lockIcon && <Ionicons name="lock-closed" size={13} color={t.colors.accent} />}
        </View>
        {note && <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{note}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: t.colors.chipBg, true: t.colors.primaryDim }}
        thumbColor={value ? t.colors.primary : t.colors.textFaint}
      />
    </View>
  );
}

// ——— KeyValue ———
export function KeyValue({ k, v, dark, mono }: { k: string; v: string; dark: boolean; mono?: boolean }) {
  const t = getTheme(dark);
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: t.colors.textMuted, fontSize: t.font.small, fontWeight: '600' }}>{k}</Text>
      <Text
        selectable
        style={{
          color: t.colors.text,
          fontSize: t.font.body,
          fontFamily: mono ? 'monospace' : undefined,
          writingDirection: 'auto',
        }}
      >
        {v}
      </Text>
    </View>
  );
}

// ——— Modal ———
export function BottomModal({
  visible,
  onClose,
  dark,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  dark: boolean;
  title: string;
  children: React.ReactNode;
}) {
  const t = getTheme(dark);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          style={{
            backgroundColor: t.colors.bgElevated,
            borderTopStartRadius: t.radius.xl,
            borderTopEndRadius: t.radius.xl,
            padding: t.spacing(4),
            gap: t.spacing(3),
            maxHeight: '85%',
          }}
          onPress={() => undefined}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.title, fontWeight: '700' }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={24} color={t.colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ gap: t.spacing(3), paddingBottom: t.spacing(6) }}>{children}</View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ——— Stat card ———
export function StatCard({
  dark,
  icon,
  value,
  label,
  color,
}: {
  dark: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
}) {
  const t = getTheme(dark);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.card,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.colors.cardBorder,
        padding: t.spacing(4),
        gap: t.spacing(1),
      }}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: t.colors.textMuted, fontSize: t.font.tiny, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ——— Small helpers ———
export function MonoText({ children, dark, small }: { children: React.ReactNode; dark: boolean; small?: boolean }) {
  const t = getTheme(dark);
  const style: StyleProp<TextStyle> = {
    color: t.colors.text,
    fontSize: small ? t.font.small : t.font.body,
    fontFamily: 'monospace',
    writingDirection: 'ltr',
    textAlign: 'left',
  };
  return <Text selectable style={style}>{children}</Text>;
}

export function Logo({ size = 56, dark }: { size?: number; dark: boolean }) {
  const t = getTheme(dark);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: t.colors.primaryDim,
        borderWidth: 1.5,
        borderColor: t.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="git-branch" size={size * 0.55} color={t.colors.accent} />
    </View>
  );
}
