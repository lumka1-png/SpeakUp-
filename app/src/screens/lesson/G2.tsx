import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { T } from '../../components/ui';
import type { Word } from '../../data/words';
import { buzzBad, buzzGood, tap } from '../../lib/haptics';
import { shuffle } from '../../lib/util';
import { useLesson } from '../../store/lesson';
import { C, F } from '../../theme';
import { Shell } from './Shell';

function makeRounds(words: Word[]): Word[][] {
  const ws = shuffle(words);
  const rounds: Word[][] = [];
  for (let i = 0; i < ws.length; i += 5) rounds.push(ws.slice(i, i + 5));
  if (rounds.length > 1 && rounds[rounds.length - 1].length < 2) rounds[rounds.length - 2].push(...rounds.pop()!);
  return rounds;
}

export default function G2() {
  const words = useLesson((l) => l.words);
  const finish = useLesson((l) => l.finishG2);
  const rounds = useMemo(() => makeRounds(words), [words]);
  const [r, setR] = useState(0);
  const order = useMemo(() => ({ left: shuffle(rounds[r]), right: shuffle(rounds[r]) }), [rounds, r]);
  const [selL, setSelL] = useState<string | null>(null);
  const [selR, setSelR] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [bad, setBad] = useState<[string, string] | null>(null);
  const mistakes = useRef(0);
  const misses = useRef<Record<string, number>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const check = (l: string | null, rr: string | null) => {
    if (!l || !rr) return;
    if (l === rr) {
      buzzGood();
      const nd = [...done, l];
      setDone(nd); setSelL(null); setSelR(null);
      if (nd.length === rounds[r].length) {
        later(() => {
          if (r + 1 >= rounds.length) finish(mistakes.current, misses.current);
          else { setR(r + 1); setDone([]); }
        }, 450);
      }
    } else {
      buzzBad();
      mistakes.current += 1;
      [l, rr].forEach((id) => { misses.current[id] = (misses.current[id] ?? 0) + 1; });
      setBad([l, rr]);
      later(() => { setBad(null); setSelL(null); setSelR(null); }, 650);
    }
  };
  const press = (side: 'L' | 'R', id: string) => {
    if (bad || done.includes(id)) return;
    tap();
    if (side === 'L') { const v = selL === id ? null : id; setSelL(v); check(v, selR); }
    else { const v = selR === id ? null : id; setSelR(v); check(selL, v); }
  };
  const style = (side: 'L' | 'R', id: string) => {
    if (done.includes(id)) return { borderColor: C.ok, backgroundColor: C.okTint, opacity: 0.6 };
    if (bad && ((side === 'L' && bad[0] === id) || (side === 'R' && bad[1] === id))) return { borderColor: C.bad, backgroundColor: C.badTint };
    if ((side === 'L' && selL === id) || (side === 'R' && selR === id)) return { borderColor: C.teal, backgroundColor: C.tealTint };
    return {};
  };
  const item = (side: 'L' | 'R', w: Word) => (
    <Pressable key={side + w.id} testID={`m${side}`} onPress={() => press(side, w.id)} disabled={done.includes(w.id)} accessibilityRole="button"
      accessibilityState={{ selected: (side === 'L' ? selL : selR) === w.id, disabled: done.includes(w.id) }}
      style={[{ minHeight: 70, borderWidth: 2, borderBottomWidth: 4, borderColor: C.line, backgroundColor: C.white, borderRadius: 14, padding: 9, justifyContent: 'center' }, style(side, w.id)]}>
      <Text style={side === 'L'
        ? { fontFamily: F.display, fontSize: 17, textAlign: 'center', color: C.ink }
        : { fontFamily: F.bodyBold, fontSize: 13.5, lineHeight: 18, color: C.ink }}>{side === 'L' ? w.w : w.def}</Text>
    </Pressable>
  );

  return (
    <Shell progress={0.15 + 0.12 * (r / rounds.length)} scrollKey={r}>
      <View>
        <T v="eyebrow">Game 2 of 3 · Match the meaning</T>
        <T v="h2" accessibilityRole="header" style={{ marginTop: 6 }}>Tap a word, then its meaning</T>
        <T muted style={{ marginTop: 6 }}>Round {r + 1} of {rounds.length}</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 10 }}>{order.left.map((w) => item('L', w))}</View>
        <View style={{ flex: 1.45, gap: 10 }}>{order.right.map((w) => item('R', w))}</View>
      </View>
    </Shell>
  );
}
