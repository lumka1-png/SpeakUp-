import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { ScrollView, type ScrollViewInstance, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Pill, PillText, Screen, s } from '../../components/ui';
import { stopSpeaking } from '../../lib/speech';
import { useLesson } from '../../store/lesson';
import { useUi } from '../../store/ui';
import { C, F } from '../../theme';

const SEGMENTS: [string, number, number][] = [['Vocabulary', 0, 0.4], ['Speaking', 0.4, 0.7], ['Listening', 0.7, 1]];

export function confirmQuit() {
  useUi.getState().askConfirm({
    title: 'Leave this lesson?',
    body: 'Your progress in this lesson will be lost. Words you chose stay in My Words.',
    ok: 'Leave lesson',
    onOk: () => { stopSpeaking(); useLesson.getState().quit(); if (router.canGoBack()) router.back(); else router.replace('/'); },
  });
}

/**
 * Frame for every lesson step: close button, three-part progress bar,
 * scrolling body, and a fixed footer for the main action.
 * `scrollKey` resets the scroll position when it changes (for example, a new question).
 */
export function Shell({ progress, count, footer, children, scrollKey, scrollToEnd }: {
  progress: number; count?: string; footer?: ReactNode; children: ReactNode; scrollKey?: string | number; scrollToEnd?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollViewInstance>(null);
  useEffect(() => { ref.current?.scrollTo({ y: 0, animated: false }); }, [scrollKey]);
  useEffect(() => { if (scrollToEnd) setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 50); }, [scrollToEnd]);
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 }}>
        <IconButton name="x" label="Leave lesson" onPress={confirmQuit} />
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`Lesson progress ${Math.round(progress * 100)} percent`}>
          {SEGMENTS.map(([name, a, b]) => {
            const f = Math.max(0, Math.min(1, (progress - a) / (b - a)));
            const cur = progress >= a && progress < b;
            return (
              <View key={name} style={{ flex: 1, gap: 4 }}>
                <View style={{ height: 10, borderRadius: 999, backgroundColor: C.track, overflow: 'hidden' }}>
                  <View style={{ width: `${f * 100}%`, height: '100%', backgroundColor: C.teal, borderRadius: 999 }} />
                </View>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, textAlign: 'center', color: cur ? C.ink : C.muted }}>{name}</Text>
              </View>
            );
          })}
        </View>
        {count ? <Pill><PillText>{count}</PillText></Pill> : null}
      </View>
      <ScrollView ref={ref} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 + insets.bottom, borderTopWidth: 2, borderTopColor: C.line, backgroundColor: C.bg }}>{footer}</View> : null}
    </Screen>
  );
}
