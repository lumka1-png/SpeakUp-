import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { C, F } from '../theme';
import { Sheet } from './Sheet';
import { Icon, T } from './ui';

export interface SelectOption { value: string; label: string; disabled?: boolean; group?: string }

/** A dropdown: shows the chosen option, opens a list in a bottom sheet. */
export function Select({ label, value, options, onChange }: { label: string; value: string; options: SelectOption[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 14, color: C.ink, marginBottom: 6 }}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${current?.label ?? ''}. Change`}
        style={({ pressed }) => ({ minHeight: 52, borderWidth: 2, borderColor: C.line, borderRadius: 14, backgroundColor: C.white, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
        <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 16, color: C.ink }}>{current?.label}</Text>
        <View style={{ transform: [{ rotate: '90deg' }] }}><Icon name="right" size={18} color={C.muted} /></View>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <T v="h2">{label}</T>
        <View style={{ gap: 6 }}>
          {options.map((o, idx) => {
            const header = o.group && o.group !== options[idx - 1]?.group ? o.group : null;
            const on = o.value === value;
            return (
              <View key={o.value}>
                {header && <T v="eyebrow" style={{ marginTop: 10, marginBottom: 4 }}>{header}</T>}
                <Pressable disabled={o.disabled} onPress={() => { onChange(o.value); setOpen(false); }}
                  accessibilityRole="button" accessibilityState={{ selected: on, disabled: !!o.disabled }}
                  style={({ pressed }) => ({ minHeight: 48, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: on ? C.tealTint : pressed ? C.track : C.white, borderWidth: 2, borderColor: on ? C.teal : C.line, opacity: o.disabled ? 0.5 : 1 })}>
                  <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 16, color: C.ink }}>{o.label}{o.disabled ? '  (coming soon)' : ''}</Text>
                  {on && <Icon name="check" size={20} color={C.teal} />}
                </Pressable>
              </View>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}
