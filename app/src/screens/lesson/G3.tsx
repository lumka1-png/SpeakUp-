import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { Button, Card, Icon, Row, T } from '../../components/ui';
import type { Word } from '../../data/words';
import { buzzBad, buzzGood } from '../../lib/haptics';
import { pick } from '../../lib/util';
import { useLesson } from '../../store/lesson';
import { C, F } from '../../theme';
import { Shell } from './Shell';

const SECONDS = 45;
interface Item { w: Word; shown: Word; truth: boolean; mode: 'def' | 'zh' }

function makeItem(words: Word[]): Item {
  const w = words[Math.floor(Math.random() * words.length)];
  const truth = Math.random() < 0.5 || words.length < 2;
  const shown = truth ? w : pick(words.filter((x) => x.id !== w.id), 1)[0];
  return { w, shown, truth, mode: Math.random() < 0.5 ? 'def' : 'zh' };
}

export default function G3() {
  const words = useLesson((l) => l.words);
  const finish = useLesson((l) => l.finishG3);
  const [state, setState] = useState<'ready' | 'run'>('ready');
  const [left, setLeft] = useState(SECONDS);
  const [item, setItem] = useState<Item>(() => makeItem(words));
  const [stats, setStats] = useState({ correct: 0, attempts: 0, streak: 0, best: 0, points: 0 });
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const statsRef = useRef(stats);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  const ended = useRef(false);

  useEffect(() => {
    if (state !== 'run') return;
    const started = Date.now();
    const id = setInterval(() => {
      const t = Math.max(0, SECONDS - (Date.now() - started) / 1000);
      setLeft(t);
      if (t <= 0 && !ended.current) {
        ended.current = true;
        clearInterval(id);
        const s = statsRef.current;
        finish(s.correct, s.attempts, s.best);
      }
    }, 100);
    return () => clearInterval(id);
  }, [state, finish]);

  const answer = useCallback((yes: boolean) => {
    if (state !== 'run' || ended.current) return;
    const ok = yes === item.truth;
    if (ok) buzzGood(); else buzzBad();
    setStats((s) => {
      const streak = ok ? s.streak + 1 : 0;
      return { correct: s.correct + (ok ? 1 : 0), attempts: s.attempts + 1, streak, best: Math.max(s.best, streak), points: s.points + (ok ? 10 + Math.min(streak, 5) * 2 : 0) };
    });
    setFlash(ok ? 'good' : 'bad');
    setItem(makeItem(words));
  }, [state, item, words]);

  // Keyboard shortcuts on the web: left arrow = No, right arrow = Yes.
  useEffect(() => {
    if (Platform.OS !== 'web' || state !== 'run') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); answer(true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); answer(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, state]);

  if (state === 'ready') {
    return (
      <Shell progress={0.28} footer={<Button title="Start" iconRight="right" onPress={() => setState('run')} />}>
        <View>
          <T v="eyebrow">Game 3 of 3 · Quick Think</T>
          <T v="h2" accessibilityRole="header" style={{ marginTop: 6 }}>How fast can you think?</T>
        </View>
        <Card style={{ gap: 10 }}>
          <Row><Icon name="bolt" color="#B7791F" /><T v="bodyBold">{SECONDS} seconds on the clock</T></Row>
          <T muted>{"You'll see one of your words with a meaning. Is it a match? Answer as fast as you can. Correct answers in a row build a combo for bonus points."}</T>
          {Platform.OS === 'web' && <T v="small">On a keyboard, press the left arrow for No and the right arrow for Yes.</T>}
        </Card>
      </Shell>
    );
  }

  const tint = flash === 'good' ? { borderColor: C.ok } : flash === 'bad' ? { borderColor: C.bad } : null;
  return (
    <Shell progress={0.28 + 0.1 * (1 - left / SECONDS)}
      footer={
        <Row gap={12}>
          <Button kind="no" icon="x" title="No" onPress={() => answer(false)} style={{ flex: 1 }} />
          <Button kind="yes" icon="check" title="Yes" onPress={() => answer(true)} style={{ flex: 1 }} />
        </Row>
      }>
      <T v="eyebrow">Game 3 of 3 · Quick Think</T>
      <Row>
        <View style={{ flex: 1, height: 14, borderRadius: 999, backgroundColor: '#F1E8DC', overflow: 'hidden' }}>
          <View style={{ width: `${(left / SECONDS) * 100}%`, height: '100%', backgroundColor: C.sun, borderRadius: 999 }} />
        </View>
        <Text style={{ fontFamily: F.bodyHeavy, color: C.ink, minWidth: 36, textAlign: 'right' }} accessibilityLabel={`${Math.ceil(left)} seconds left`}>{Math.ceil(left)}s</Text>
      </Row>
      <Row gap={8}>
        {[['Points', stats.points], ['Combo', stats.streak], ['Correct', `${stats.correct}/${stats.attempts}`]].map(([label, value]) => (
          <View key={label as string} style={{ flex: 1, backgroundColor: C.white, borderWidth: 2, borderColor: C.line, borderRadius: 14, padding: 8, alignItems: 'center' }}>
            <Text style={{ fontFamily: F.display, fontSize: 22, color: C.ink }}>{value}</Text>
            <T v="smallBold">{label as string}</T>
          </View>
        ))}
      </Row>
      <View accessibilityLiveRegion="polite" style={[{ backgroundColor: C.white, borderWidth: 2, borderColor: C.line, borderRadius: 24, paddingVertical: 26, paddingHorizontal: 18, minHeight: 210, justifyContent: 'center', alignItems: 'center', gap: 10 }, tint]}>
        <Text style={{ fontFamily: F.display, fontSize: 34, color: C.ink, textAlign: 'center' }}>{item.w.w}</Text>
        <T v="smallBold" style={{ letterSpacing: 1 }}>MEANS</T>
        <Text style={{ fontFamily: item.mode === 'zh' ? F.zh : F.bodyBold, fontWeight: item.mode === 'zh' ? '700' : undefined, fontSize: 19, lineHeight: 26, color: C.ink, textAlign: 'center' }}>
          {item.mode === 'zh' ? item.shown.zh : item.shown.def}
        </Text>
      </View>
    </Shell>
  );
}
