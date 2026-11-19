import { type ReactNode, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, type TextProps, type TextStyle, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, SvgXml } from 'react-native-svg';

import { C, F, R } from '../theme';
import { ICONS, type IconName } from './icons';

/* ---------------- Text ---------------- */
type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bodyBold' | 'small' | 'smallBold' | 'eyebrow' | 'zh' | 'display';
const tv: Record<Variant, TextStyle> = {
  h1: { fontFamily: F.display, fontSize: 28, lineHeight: 33, color: C.ink },
  h2: { fontFamily: F.display, fontSize: 22, lineHeight: 27, color: C.ink },
  h3: { fontFamily: F.display, fontSize: 17, lineHeight: 22, color: C.ink },
  display: { fontFamily: F.display, fontSize: 20, color: C.ink },
  body: { fontFamily: F.body, fontSize: 16, lineHeight: 23, color: C.ink },
  bodyBold: { fontFamily: F.bodyHeavy, fontSize: 16, lineHeight: 23, color: C.ink },
  small: { fontFamily: F.bodySemi, fontSize: 13.5, lineHeight: 19, color: C.muted },
  smallBold: { fontFamily: F.bodyHeavy, fontSize: 13.5, lineHeight: 19, color: C.muted },
  eyebrow: { fontFamily: F.bodyHeavy, fontSize: 12.5, letterSpacing: 1, textTransform: 'uppercase', color: C.teal },
  zh: { fontFamily: F.zh, fontSize: 15, lineHeight: 22, color: C.ink },
};
export function T({ v = 'body', muted, style, ...rest }: TextProps & { v?: Variant; muted?: boolean }) {
  return <Text {...rest} style={[tv[v], muted && { color: C.muted }, style]} />;
}

/* ---------------- Icons ---------------- */
export function Icon({ name, size = 22, color = C.ink, stroke = 2.2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const xml = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name].replace('COLOR', color)}</svg>`;
  // Hide decorative icons from screen readers on the wrapping View: react-native-svg passes these props
  // straight to the DOM <svg> on web, where React warns about them and they have no effect.
  return (
    <View style={{ width: size, height: size }} aria-hidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
export function Logo({ size = 34 }: { size?: number }) {
  const xml = `<svg viewBox="0 0 34 34"><path d="M7 3h20a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H15l-7 6v-6H7a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z" fill="${C.coral}"/><path d="M10 13v3M14 10v9M18 8v13M22 11v7M26 13v3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}
export function Star({ on, size = 44 }: { on: boolean; size?: number }) {
  const xml = `<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill="${on ? C.sun : C.line}" stroke="${on ? C.sunDark : '#D6C9B6'}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

/* ---------------- Layout ---------------- */
export function Screen({ children, edges = ['top', 'left', 'right'] as const }: { children: ReactNode; edges?: readonly ('top' | 'bottom' | 'left' | 'right')[] }) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.column}>{children}</View>
    </SafeAreaView>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Stack({ gap = 14, children, style }: { gap?: number; children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}
export function Row({ gap = 10, children, style }: { gap?: number; children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

/* ---------------- Buttons ---------------- */
type BtnKind = 'primary' | 'secondary' | 'teal' | 'yes' | 'no';
const kinds: Record<BtnKind, { face: string; edge: string; text: string; border?: string }> = {
  primary: { face: C.coral, edge: C.coralDark, text: C.white },
  secondary: { face: C.white, edge: C.line, text: C.ink, border: C.line },
  teal: { face: C.teal, edge: C.tealDark, text: C.white },
  yes: { face: C.ok, edge: C.okDark, text: C.white },
  no: { face: C.bad, edge: C.badDark, text: C.white },
};
export function Button({ title, onPress, kind = 'primary', icon, iconRight, disabled, small, style, label }: {
  title: string; onPress?: () => void; kind?: BtnKind; icon?: IconName; iconRight?: IconName; disabled?: boolean; small?: boolean; style?: ViewStyle; label?: string;
}) {
  const k = kinds[kind];
  const h = small ? 44 : 54;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ disabled: !!disabled }}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      {({ pressed }) => (
        <View style={{ borderRadius: small ? 12 : R.md, backgroundColor: k.edge, paddingBottom: pressed && !disabled ? 1 : 4, marginTop: pressed && !disabled ? 3 : 0 }}>
          <View style={[s.btnFace, { minHeight: h, backgroundColor: k.face, borderRadius: small ? 12 : R.md, paddingHorizontal: small ? 14 : 22 }, k.border ? { borderWidth: 2, borderColor: k.border } : null]}>
            {icon && <Icon name={icon} size={20} color={k.text} />}
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: small ? 15 : 17, color: k.text, textAlign: 'center' }}>{title}</Text>
            {iconRight && <Icon name={iconRight} size={20} color={k.text} />}
          </View>
        </View>
      )}
    </Pressable>
  );
}
export function IconButton({ name, onPress, label, dark, size = 44 }: { name: IconName; onPress: () => void; label: string; dark?: boolean; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ pressed }) => [s.iconBtn, { width: size, height: size }, dark && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)' }, pressed && { opacity: 0.6 }]}>
      <Icon name={name} size={20} color={dark ? C.white : C.ink} />
    </Pressable>
  );
}
export function LinkButton({ title, onPress, icon, style }: { title: string; onPress: () => void; icon?: IconName; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 }, style]}>
      {icon && <Icon name={icon} size={18} color={C.muted} />}
      <Text style={{ fontFamily: F.bodyHeavy, color: C.muted, textDecorationLine: 'underline', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

/* ---------------- Small pieces ---------------- */
export function Pill({ children, label }: { children: ReactNode; label?: string }) {
  return <View accessible={!!label} accessibilityLabel={label} style={s.pill}>{children}</View>;
}
export function PillText({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: F.bodyHeavy, fontSize: 14, color: C.ink }}>{children}</Text>;
}
export function Note({ children }: { children: ReactNode }) {
  return <View style={s.note}>{typeof children === 'string' ? <Text style={s.noteText}>{children}</Text> : children}</View>;
}
export const noteTextStyle = { fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: C.sunText } as const;
export function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: C.white }}>{text}</Text>
    </View>
  );
}
export function Meter({ value, color = C.coral, height = 10 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: C.track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', backgroundColor: color, borderRadius: 999 }} />
    </View>
  );
}
export function MasteryDots({ value }: { value: number }) {
  return (
    <View accessible accessibilityLabel={`Mastery ${value} of 3`} style={{ flexDirection: 'row', gap: 4 }}>
      {[0, 1, 2].map((i) => <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: i < value ? C.teal : '#E5D9C8' }} />)}
    </View>
  );
}
export function Ring({ value, size = 150 }: { value: number; size?: number }) {
  const r = (size - 18) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 70 ? C.teal : value >= 50 ? '#E0A100' : C.coral;
  return (
    <View accessible accessibilityLabel={`Score ${value} percent`} style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.track} strokeWidth={14} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={14} fill="none" strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: F.displayBold, fontSize: size * 0.22, color: C.ink }}>{value}%</Text>
      </View>
    </View>
  );
}
export function Chip({ text, on, icon }: { text: string; on?: boolean; icon?: IconName }) {
  return (
    <View style={[s.chip, on && { borderStyle: 'solid', borderColor: C.teal, backgroundColor: C.tealTint }]}>
      {icon && <Icon name={icon} size={15} color={on ? C.tealDark : C.muted} />}
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 14, color: on ? C.tealDark : C.muted }}>{text}</Text>
    </View>
  );
}
/** Multiple-choice option button. state: undefined, 'right', or 'wrong'. */
export function Option({ text, onPress, state, disabled, zh, testID }: { text: string; onPress: () => void; state?: 'right' | 'wrong'; disabled?: boolean; zh?: boolean; testID?: string }) {
  const border = state === 'right' ? C.ok : state === 'wrong' ? C.bad : C.line;
  const bg = state === 'right' ? C.okTint : state === 'wrong' ? C.badTint : C.white;
  return (
    <Pressable onPress={onPress} disabled={disabled} testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled, selected: !!state }}
      style={({ pressed }) => [s.option, { borderColor: border, backgroundColor: bg, borderBottomWidth: 5 }, pressed && { transform: [{ translateY: 2 }] }]}>
      <Text style={{ fontFamily: zh ? F.zh : F.bodyBold, fontWeight: zh ? '700' : undefined, fontSize: zh ? 18 : 17, color: C.ink, textAlign: 'center' }}>{text}</Text>
    </Pressable>
  );
}
export function Feedback({ good, children }: { good: boolean; children: ReactNode }) {
  return (
    <View style={[s.fb, { backgroundColor: good ? C.okTint : C.badTint }]} accessibilityLiveRegion="polite">
      <Icon name={good ? 'check' : 'x'} color={good ? C.okDark : C.badDark} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
export const fbText = (good: boolean): TextStyle => ({ fontFamily: F.bodyHeavy, fontSize: 15, lineHeight: 21, color: good ? C.okDark : '#8A1C16' });

/** A focusable text field with a visible label. */
export function useFocusRing() {
  const [focused, setFocused] = useState(false);
  return { focused, onFocus: () => setFocused(true), onBlur: () => setFocused(false), style: focused ? { borderColor: '#2F6FEB' } : null };
}

export const s = StyleSheet.create({
  column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { backgroundColor: C.card, borderWidth: 2, borderColor: C.line, borderRadius: R.lg, padding: 18 },
  btnFace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  iconBtn: { borderRadius: 14, borderWidth: 2, borderColor: C.line, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: C.white, borderWidth: 2, borderColor: C.line },
  note: { backgroundColor: C.sunTint, borderRadius: 14, padding: 13 },
  noteText: { fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: C.sunText },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, borderStyle: 'dashed', borderColor: C.lineDark, backgroundColor: C.white },
  option: { minHeight: 58, borderWidth: 2, borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 14, justifyContent: 'center' },
  fb: { flexDirection: 'row', gap: 10, borderRadius: R.md, padding: 13, alignItems: 'flex-start' },
  input: { borderWidth: 2, borderColor: C.line, borderRadius: 14, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.body, fontSize: 16, color: C.ink, minHeight: 50, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : null) },
  label: { fontFamily: F.bodyHeavy, fontSize: 14, color: C.ink, marginBottom: 6 },
  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28, gap: 14 },
});
