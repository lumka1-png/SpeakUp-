import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, Icon, Meter, Pill, PillText, Ring, Row, Screen, s, Star, T } from '../../components/ui';
import { buzzGood } from '../../lib/haptics';
import { useLesson } from '../../store/lesson';
import { useProgress } from '../../store/progress';
import { C } from '../../theme';

const COLORS = [C.sun, C.coral, C.teal, C.violet, '#F59AB5'];

function makePieces(width: number) {
  return Array.from({ length: 36 }, (_, i) => ({
    x: Math.random() * width, delay: Math.random() * 900, rot: Math.random() * 180, color: COLORS[i % COLORS.length], anim: new Animated.Value(0),
  }));
}

function Confetti() {
  const { width, height } = Dimensions.get('window');
  const [pieces] = useState(() => makePieces(width));
  useEffect(() => {
    Animated.parallel(pieces.map((p) => Animated.timing(p.anim, { toValue: 1, duration: 3000, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }))).start();
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x, top: -24, width: 9, height: 14, borderRadius: 2, backgroundColor: p.color,
          opacity: p.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] }),
          transform: [
            { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
            { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: [`${p.rot}deg`, `${p.rot + 600}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}

export default function Done() {
  const { result, scores, words, practice, start, quit } = useLesson();
  const myWords = useProgress((p) => p.myWords);
  const streak = useProgress((p) => p.stats.streak);
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(true);
  const shown = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
    if (!shown.current) { shown.current = true; buzzGood(); }
  }, []);
  if (!result) return null;

  const bar = (label: string, v: number | undefined, color: string) => (
    <View style={{ gap: 5 }}>
      <Row style={{ justifyContent: 'space-between' }}><T v="bodyBold" style={{ fontSize: 14 }}>{label}</T><T v="bodyBold" style={{ fontSize: 14 }}>{v == null ? 'Skipped' : `${v}%`}</T></Row>
      <Meter value={v ?? 0} color={color} />
    </View>
  );
  const pct = (v: number | undefined) => (v == null ? 'skipped' : `${v}%`);

  const footer = (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 + insets.bottom, gap: 10, borderTopWidth: 2, borderTopColor: C.line }}>
      <Button title="Next lesson" iconRight="right" onPress={() => start()} />
      <Button kind="secondary" title="Back to home" onPress={() => { quit(); if (router.canGoBack()) router.back(); else router.replace('/'); }} />
    </View>
  );

  if (result.skippedAll) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={[s.scroll, { alignItems: 'stretch', paddingTop: 24 }]}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <T v="eyebrow">Lesson ended</T>
            <T v="h2" accessibilityRole="header" style={{ textAlign: 'center' }}>You skipped every part this time</T>
            <T muted style={{ textAlign: 'center' }}>{"No score this time. Your words are saved in My Words, so you can practice them whenever you're ready."}</T>
          </View>
          <Card style={{ gap: 8 }}>
            <T v="h3">{practice ? 'Words in this review' : 'Saved to My Words'}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{words.map((w) => <Chip key={w.id} on text={w.w} />)}</View>
          </Card>
        </ScrollView>
        {footer}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[s.scroll, { alignItems: 'stretch', paddingTop: 24 }]}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <T v="eyebrow">Lesson complete</T>
          <Ring value={result.overall} size={170} />
          <View accessible accessibilityLabel={`${result.stars} of 3 stars`} style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 1, 2].map((i) => <Star key={i} on={i < result.stars} />)}
          </View>
          <T v="h2" accessibilityRole="header" style={{ textAlign: 'center', fontSize: 24, lineHeight: 30 }}>{result.affirmation[0]}</T>
          <T v="zh" muted style={{ textAlign: 'center' }}>{result.affirmation[1]}</T>
          <Row gap={8}>
            <Pill><Icon name="bolt" size={16} color="#B7791F" /><PillText>+{result.xp} XP</PillText></Pill>
            <Pill><Icon name="flame" size={16} color={C.coral} /><PillText>{streak} day streak</PillText></Pill>
          </Row>
        </View>
        <Card style={{ gap: 12 }}>
          <T v="h3">Your scores</T>
          {bar('Vocabulary', result.vocab, C.teal)}
          <T v="small" style={{ marginTop: -6 }}>Chinese meaning {pct(scores.g1)} · Match {pct(scores.g2)} · Quick Think {pct(scores.g3)}</T>
          {bar('Speaking', scores.speak, C.coral)}
          {bar('Listening', scores.listen, C.violet)}
          {[result.vocab, scores.speak, scores.listen].some((v) => v == null) && <T v="small">Your lesson score counts only the parts you did.</T>}
        </Card>
        <Card style={{ gap: 8 }}>
          <T v="h3">{practice ? 'Words you reviewed' : 'Saved to My Words'}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {words.map((w) => <Chip key={w.id} on text={`${w.w}${myWords[w.id] ? `  ${'●'.repeat(myWords[w.id].mastery)}${'○'.repeat(3 - myWords[w.id].mastery)}` : ''}`} />)}
          </View>
        </Card>
      </ScrollView>
      {footer}
      {result.stars > 0 && !reduceMotion && <Confetti />}
    </Screen>
  );
}
