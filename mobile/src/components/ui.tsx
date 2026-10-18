import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { duration, level, price } from '../lib/format';
import type { CourseCard as Course } from '../lib/types';
import { fonts, hueOf, radius } from '../theme/palette';
import { usePalette } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

// ---- Text ---------------------------------------------------------------------------------------

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'small'
  | 'label'
  | 'overline';

const VARIANTS: Record<Variant, TextStyle> = {
  display: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  h3: { fontFamily: fonts.display, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
};

export function T({
  v = 'body',
  color,
  style,
  ...rest
}: TextProps & { v?: Variant; color?: string }) {
  const p = usePalette();
  const base =
    v === 'body' || v === 'small'
      ? p.body
      : v === 'overline'
      ? p.muted
      : p.text;
  return (
    <Text {...rest} style={[VARIANTS[v], { color: color ?? base }, style]} />
  );
}

// ---- Layout -------------------------------------------------------------------------------------

/** Scrollable screen body with pull-to-refresh and the app background. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={[
        padded && { padding: 16, gap: 16 },
        { paddingBottom: 24 + insets.bottom },
        style,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={p.accent}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Content rises in once, gently. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: true,
    }).start();
  }, [a, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: a,
          transform: [
            {
              translateY: a.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function Card({
  children,
  style,
  onPress,
  padding = 16,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
}) {
  const p = usePalette();
  const box: ViewStyle = {
    backgroundColor: p.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: p.border,
    padding,
    shadowColor: p.shadow,
    shadowOpacity: p.dark ? 0.35 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  };
  if (!onPress) return <View style={[box, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        box,
        style,
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.94 },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <T v="h2">{title}</T>
      {action && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <T v="label" color={p.accentText}>
            {action}
          </T>
          <Icon name="chevron-right" size={14} color={p.accentText} />
        </Pressable>
      )}
    </View>
  );
}

// ---- Controls -----------------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const c = {
    primary: [p.accent, '#FFFFFF', p.accent],
    secondary: [p.card, p.text, p.borderStrong],
    ghost: ['transparent', p.text, 'transparent'],
    dark: [p.inverse, p.onInverse, p.inverse],
    danger: [p.danger, '#FFFFFF', p.danger],
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: small ? 36 : 48,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: small ? 10 : 12,
          backgroundColor: c[0],
          borderWidth: 1,
          borderColor: c[2],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: off ? 0.5 : 1,
        },
        variant === 'primary' &&
          !off && {
            shadowColor: p.accent,
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c[1]} size="small" />
      ) : (
        icon && <Icon name={icon} size={small ? 16 : 18} color={c[1]} />
      )}
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: small ? 13 : 15,
          color: c[1],
        }}
      >
        {title}
      </Text>
      {iconRight && !loading && (
        <Icon name={iconRight} size={small ? 14 : 16} color={c[1]} />
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  badge,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  badge?: number;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? p.hover : 'transparent',
      })}
    >
      <Icon name={icon} size={22} color={p.text} />
      {!!badge && (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 4,
            borderRadius: 8,
            backgroundColor: p.accent,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: p.bg,
          }}
        >
          <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 9 }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  icon,
  error,
  hint,
  style,
  ...input
}: TextInputProps & {
  label?: string;
  icon?: IconName;
  error?: string;
  hint?: string;
}) {
  const p = usePalette();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ gap: 6 }, style]}>
      {label && <T v="label">{label}</T>}
      <View
        style={{
          flexDirection: 'row',
          alignItems: input.multiline ? 'flex-start' : 'center',
          gap: 10,
          minHeight: 48,
          paddingHorizontal: 14,
          paddingVertical: input.multiline ? 12 : 0,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: error ? p.danger : focus ? p.accent : p.borderStrong,
          backgroundColor: p.card,
        }}
      >
        {icon && <Icon name={icon} size={18} color={p.muted} />}
        <TextInput
          placeholderTextColor={p.subtle}
          {...input}
          onFocus={e => {
            setFocus(true);
            input.onFocus?.(e);
          }}
          onBlur={e => {
            setFocus(false);
            input.onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              fontFamily: fonts.body,
              fontSize: 15,
              color: p.text,
              paddingVertical: 0,
            },
            input.multiline && { minHeight: 96, textAlignVertical: 'top' },
          ]}
        />
      </View>
      {(error || hint) && (
        <T v="small" color={error ? p.dangerText : p.muted}>
          {error ?? hint}
        </T>
      )}
    </View>
  );
}

/** Pill-shaped segmented control (tabs, filters, area and theme switches). */
export function Segmented<V extends string>({
  value,
  onChange,
  items,
  style,
}: {
  value: V;
  onChange: (v: V) => void;
  items: { value: V; label?: string; icon?: IconName }[];
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          padding: 4,
          borderRadius: 14,
          backgroundColor: p.sunken,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
        },
        style,
      ]}
    >
      {items.map(it => {
        const on = it.value === value;
        return (
          <Pressable
            key={it.value}
            onPress={() => onChange(it.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.label ?? it.value}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: on ? p.card : 'transparent',
              shadowColor: p.shadow,
              shadowOpacity: on ? 0.08 : 0,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            {it.icon && (
              <Icon name={it.icon} size={16} color={on ? p.accent : p.muted} />
            )}
            {it.label && (
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 13,
                  color: on ? p.text : p.muted,
                }}
              >
                {it.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal chips (categories, filters). */
export function Chips<V extends string>({
  value,
  onChange,
  items,
}: {
  value: V;
  onChange: (v: V) => void;
  items: { value: V; label: string }[];
}) {
  const p = usePalette();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      style={{ marginHorizontal: -16 }}
    >
      {items.map(it => {
        const on = it.value === value;
        return (
          <Pressable
            key={it.value}
            onPress={() => onChange(it.value)}
            style={{
              height: 34,
              paddingHorizontal: 14,
              borderRadius: 99,
              justifyContent: 'center',
              backgroundColor: on ? p.inverse : p.card,
              borderWidth: 1,
              borderColor: on ? p.inverse : p.border,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: 13,
                color: on ? p.onInverse : p.body,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---- Display ------------------------------------------------------------------------------------

type Tone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'orbit'
  | 'dark';

export function Badge({
  label,
  tone = 'neutral',
  dot,
}: {
  label: string;
  tone?: Tone;
  dot?: boolean;
}) {
  const p = usePalette();
  const c = {
    neutral: [p.sunken, p.body],
    accent: [p.accentTint, p.accentText],
    success: [p.successSoft, p.successText],
    warning: [p.warningSoft, p.warningText],
    danger: [p.dangerSoft, p.dangerText],
    info: [p.infoSoft, p.infoText],
    orbit: [p.orbitSoft, p.orbitText],
    dark: [p.inverse, p.onInverse],
  }[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        height: 22,
        paddingHorizontal: 8,
        borderRadius: 99,
        backgroundColor: c[0],
      }}
    >
      {dot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: c[1],
          }}
        />
      )}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: c[1] }}>
        {label}
      </Text>
    </View>
  );
}

/** Rounded tinted tile holding a duotone icon. */
export function IconTile({
  icon,
  hue = 'coral',
  size = 40,
}: {
  icon: string;
  hue?: string | null;
  size?: number;
}) {
  const p = usePalette();
  const [bg, fg] = hueOf(p, hue);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={size * 0.5} color={fg} />
    </View>
  );
}

export function ProgressBar({
  value,
  color,
  height = 6,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const p = usePalette();
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, {
      toValue: Math.max(0, Math.min(100, value)),
      duration: 900,
      delay: 150,
      useNativeDriver: false,
    }).start();
  }, [w, value]);
  return (
    <View
      style={{
        height,
        borderRadius: 99,
        backgroundColor: p.dark ? p.border : '#ECEDF3',
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height,
          borderRadius: 99,
          backgroundColor: color ?? p.accent,
          width: w.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  color,
  track,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const p = usePalette();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track ?? p.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? p.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
        />
      </Svg>
      {children ?? <T v="label">{Math.round(value)}%</T>}
    </View>
  );
}

export function Avatar({
  name,
  uri,
  size = 36,
}: {
  name?: string | null;
  uri?: string | null;
  size?: number;
}) {
  const p = usePalette();
  const initials = (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('');
  if (uri)
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: p.sunken,
        }}
      />
    );
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: p.orbitSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: size * 0.36,
          color: p.orbitText,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name="star" size={14} color={p.warning} weight="fill" />
      <T v="label">{Number(rating).toFixed(1)}</T>
      {count != null && (
        <T v="small" color={p.muted}>
          ({count})
        </T>
      )}
    </View>
  );
}

export function CourseCard({
  course,
  onPress,
  progress,
  badge,
  wide,
}: {
  course: Course;
  onPress?: () => void;
  progress?: number;
  badge?: string;
  wide?: boolean;
}) {
  const p = usePalette();
  const [bg, fg] = hueOf(p, course.hue);
  return (
    <Card
      onPress={onPress}
      padding={0}
      style={[{ overflow: 'hidden' }, wide ? { width: 260 } : null]}
    >
      <View
        style={{
          aspectRatio: 16 / 9,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {course.coverUrl ? (
          <Image
            source={{ uri: course.coverUrl }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Icon name={course.icon} size={40} color={fg} />
        )}
        {(badge || course.featured) && (
          <View style={{ position: 'absolute', top: 10, left: 10 }}>
            <Badge
              label={badge ?? 'Bestseller'}
              tone={badge ? 'success' : 'dark'}
            />
          </View>
        )}
      </View>
      <View style={{ padding: 14, gap: 6 }}>
        {course.categoryName && (
          <T v="overline" color={fg}>
            {course.categoryName}
          </T>
        )}
        <T v="h3" numberOfLines={2}>
          {course.title}
        </T>
        {progress != null ? (
          <View style={{ gap: 6, marginTop: 4 }}>
            <ProgressBar value={progress} />
            <T v="small" color={p.muted}>
              {progress}% complete
            </T>
          </View>
        ) : (
          <>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              {course.ratingCount > 0 && (
                <Stars rating={course.ratingAvg} count={course.ratingCount} />
              )}
              <T v="small" color={p.muted}>
                {course.lessonCount} lessons ·{' '}
                {duration(course.durationMinutes)} · {level(course.level)}
              </T>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <T
                v="small"
                color={p.muted}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {course.instructorName}
              </T>
              <T v="h3" color={course.priceCents ? p.text : p.successText}>
                {price(course.priceCents, course.currency)}
              </T>
            </View>
          </>
        )}
      </View>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hue = 'coral',
  hint,
}: {
  label: string;
  value: string;
  icon: string;
  hue?: string;
  hint?: string;
}) {
  const p = usePalette();
  return (
    <Card style={{ flex: 1, minWidth: 150, gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <T v="small" color={p.muted} style={{ flex: 1 }}>
          {label}
        </T>
        <IconTile icon={icon} hue={hue} size={34} />
      </View>
      <T v="display" style={{ fontSize: 28, lineHeight: 32 }}>
        {value}
      </T>
      {hint && (
        <T v="small" color={p.muted}>
          {hint}
        </T>
      )}
    </Card>
  );
}

/** A tappable list row with a leading icon/avatar, title, subtitle and trailing content. */
export function Row({
  title,
  subtitle,
  left,
  right,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string | null;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: p.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label" numberOfLines={2} style={{ fontSize: 14 }}>
          {title}
        </T>
        {!!subtitle && (
          <T v="small" color={p.muted} numberOfLines={2}>
            {subtitle}
          </T>
        )}
      </View>
      {right ??
        (onPress ? (
          <Icon name="chevron-right" size={16} color={p.subtle} />
        ) : null)}
    </Pressable>
  );
}

export function EmptyState({
  icon = 'book-open',
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: 8,
        padding: 32,
        borderRadius: radius.lg,
        backgroundColor: p.sunken,
      }}
    >
      <IconTile icon={icon} hue="ink" size={48} />
      <T v="h3" style={{ marginTop: 6, textAlign: 'center' }}>
        {title}
      </T>
      {message && (
        <T v="small" color={p.muted} style={{ textAlign: 'center' }}>
          {message}
        </T>
      )}
      {action && <View style={{ marginTop: 8 }}>{action}</View>}
    </View>
  );
}

export function Loading() {
  const p = usePalette();
  return (
    <View
      style={{
        flex: 1,
        minHeight: 200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: p.bg,
      }}
    >
      <ActivityIndicator color={p.accent} />
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        gap: 12,
        padding: 16,
        borderRadius: radius.md,
        backgroundColor: p.dangerSoft,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Icon name="circle-alert" size={20} color={p.dangerText} />
        <T v="small" color={p.dangerText} style={{ flex: 1 }}>
          {message}
        </T>
      </View>
      {onRetry && (
        <Button
          title="Try again"
          variant="secondary"
          small
          onPress={onRetry}
          icon="refresh-cw"
          style={{ alignSelf: 'flex-start' }}
        />
      )}
    </View>
  );
}

/** Wordmark: orbitly. */
export function Logo({ size = 26, color }: { size?: number; color?: string }) {
  const p = usePalette();
  return (
    <Text
      style={{
        fontFamily: fonts.displayBold,
        fontSize: size,
        letterSpacing: -size * 0.04,
        color: color ?? p.text,
      }}
    >
      orbitly<Text style={{ color: p.accent }}>.</Text>
    </Text>
  );
}
