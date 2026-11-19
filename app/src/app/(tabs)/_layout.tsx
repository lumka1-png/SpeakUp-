import { Redirect } from 'expo-router';
import { TabList, TabSlot, TabTrigger, type TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { forwardRef } from 'react';
import { type HostInstance, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/icons';
import { Icon } from '@/components/ui';
import { useProgress } from '@/store/progress';
import { C, F } from '@/theme';

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string };
const TabButton = forwardRef<HostInstance, TabButtonProps>(function TabButton({ icon, label, isFocused, ...props }, ref) {
  return (
    <Pressable ref={ref} {...props} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }} accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4, minHeight: 52 }}>
      <View style={{ width: 54, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: isFocused ? C.coralTint : 'transparent' }}>
        <Icon name={icon} color={isFocused ? C.coral : C.muted} />
      </View>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: isFocused ? C.coral : C.muted }}>{label}</Text>
    </Pressable>
  );
});

export default function TabsLayout() {
  const onboarded = useProgress((p) => p.onboarded);
  const insets = useSafeAreaInsets();
  if (!onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={{ flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 2, borderTopColor: C.line, paddingTop: 6, paddingHorizontal: 6, paddingBottom: 8 + insets.bottom }}>
        <TabTrigger name="index" href="/" asChild><TabButton icon="book" label="Learn" /></TabTrigger>
        <TabTrigger name="words" href="/words" asChild><TabButton icon="bookmark" label="My Words" /></TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild><TabButton icon="user" label="Profile" /></TabTrigger>
      </TabList>
    </Tabs>
  );
}
