import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { Pressable, ScrollView, type ScrollViewInstance, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, LinkButton, Pill, PillText, Screen, s } from '../../components/ui';
import { stopSpeaking } from '../../lib/speech';
import { type Section, type Step, useLesson } from '../../store/lesson';
import { useUi } from '../../store/ui';
import { C, F } from '../../theme';

const SEGMENTS: [string, number, number, Section][] = [['Vocabulary', 0, 0.4, 'vocab'], ['Speaking', 0.4, 0.7, 'speak'], ['Listening', 0.7, 1, 'listen']];
const SKIP_LABEL: Partial<Record<Step, string>> = {
  g1: 'Skip game', g2: 'Skip game', g3: 'Skip game', speak: 'Skip speaking', listen: 'Skip podcast', quiz: 'Skip quiz',
};

export function confirmQuit() {
  useUi.getState().askConfirm({
    title: 'Leave this lesson?',
    body: 'Your progress in this lesson will be lost. Words you chose stay in My Words.',
    ok: 'Leave lesson',
    onOk: () => { stopSpeaking(); useLesson.getState().quit(); if (router.canGoBack()) router.back(); else router.replace('/'); },
  });
}

/**
 * Frame for every lesson step: close button, three-part progress bar (tap a part to jump to it
 * once words are chosen), a Skip link, scrolling body, and a fixed footer for the main action.
 * `scrollKey` resets the scroll position when it changes (for example, a new question).
 */
export function Shell({ progress, count, footer, children, scrollKey, scrollToEnd }: {
  progress: number; count?: string; footer?: ReactNode; children: ReactNode; scrollKey?: string | number; scrollToEnd?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollViewInstance>(null);
  const step = useLesson((l) => l.step);
  const canJump = useLesson((l) => l.words.length > 0);
  const { skip, goToSection } = useLesson.getState();
  const skipLabel = SKIP_LABEL[step];
  useEffect(() => { ref.current?.scrollTo({ y: 0, animated: false }); }, [scrollKey]);
  useEffect(() => { if (scrollToEnd) setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 50); }, [scrollToEnd]);
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 }}>
        <IconButton name="x" label="Leave lesson" onPress={confirmQuit} />
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          {SEGMENTS.map(([name, a, b, section]) => {
            const f = Math.max(0, Math.min(1, (progress - a) / (b - a)));
            const cur = progress >= a && progress < b;
            return (
              <Pressable key={name} disabled={!canJump || cur} onPress={() => goToSection(section)} hitSlop={6}
                accessibilityRole={canJump ? 'button' : undefined}
                accessibilityLabel={canJump ? (cur ? `${name}, current section` : `Go to ${name}`) : `${name} ${Math.round(f * 100)} percent`}
                style={{ flex: 1, gap: 4, minHeight: 32, justifyContent: 'center' }}>
                <View style={{ height: 10, borderRadius: 999, backgroundColor: C.track, overflow: 'hidden' }}>
                  <View style={{ width: `${f * 100}%`, height: '100%', backgroundColor: C.teal, borderRadius: 999 }} />
                </View>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, textAlign: 'center', color: cur ? C.ink : canJump ? C.tealDark : C.muted, textDecorationLine: canJump && !cur ? 'underline' : 'none' }}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
        {count ? <Pill><PillText>{count}</PillText></Pill> : null}
      </View>
      {skipLabel && canJump ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, marginTop: -4 }}>
          <LinkButton title={skipLabel} icon="right" onPress={skip} />
        </View>
      ) : null}
      <ScrollView ref={ref} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 + insets.bottom, borderTopWidth: 2, borderTopColor: C.line, backgroundColor: C.bg }}>{footer}</View> : null}
    </Screen>
  );
}
