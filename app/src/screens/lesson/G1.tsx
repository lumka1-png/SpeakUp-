import { type ReactNode, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Feedback, fbText, IconButton, LinkButton, Option, T } from '../../components/ui';
import { ALL_WORDS, type Word } from '../../data/words';
import { buzzBad, buzzGood } from '../../lib/haptics';
import { speak } from '../../lib/speech';
import { pick, shuffle } from '../../lib/util';
import { useLesson } from '../../store/lesson';
import { useUi } from '../../store/ui';
import { C, F } from '../../theme';
import { Shell } from './Shell';

function distractors(w: Word): string[] {
  const same = ALL_WORDS.filter((x) => x.id !== w.id && x.pos === w.pos && x.zh !== w.zh);
  return pick(same.length >= 3 ? same : ALL_WORDS.filter((x) => x.id !== w.id), 3).map((x) => x.zh);
}

export function QuestionCard({ w, children }: { w: Word; children?: ReactNode }) {
  return (
    <View style={{ backgroundColor: C.ink, borderRadius: 24, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' }}>
      <View style={{ position: 'absolute', right: 12, top: 12 }}>
        <IconButton dark name="vol" label={`Hear ${w.w}`} onPress={() => speak(w.w, { rate: 0.9 })} />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 36, color: C.white, textAlign: 'center', paddingHorizontal: 40 }}>{w.w}</Text>
      {children}
    </View>
  );
}

export default function G1() {
  const words = useLesson((l) => l.words);
  const finish = useLesson((l) => l.finishG1);
  const openReport = useUi((u) => u.openReport);
  const qs = useMemo(() => shuffle(words).map((w) => ({ w, options: shuffle([w.zh, ...distractors(w)]) })), [words]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState<string[]>([]);
  const q = qs[i];
  const done = picked !== null;
  const ok = done && q.options[picked] === q.w.zh;

  const choose = (k: number) => {
    if (done) return;
    setPicked(k);
    if (q.options[k] === q.w.zh) { setCorrect([...correct, q.w.id]); buzzGood(); } else buzzBad();
  };
  const next = () => {
    if (i + 1 >= qs.length) { finish(correct); return; }
    setI(i + 1);
    setPicked(null);
  };

  return (
    <Shell progress={0.02 + 0.13 * (i / qs.length)} scrollKey={i} scrollToEnd={done}
      footer={done ? <Button title={i + 1 < qs.length ? 'Next word' : 'Finish game'} iconRight="right" onPress={next} /> : undefined}>
      <View>
        <T v="eyebrow">Game 1 of 3 · Chinese meaning</T>
        <T v="h2" accessibilityRole="header" style={{ marginTop: 6 }}>Choose the Traditional Chinese</T>
      </View>
      <QuestionCard w={q.w}><Text style={{ fontFamily: F.bodyBold, fontStyle: 'italic', color: '#C9CBE0' }}>{q.w.pos}</Text></QuestionCard>
      <View style={{ gap: 10 }}>
        {q.options.map((o, k) => (
          <Option key={k} testID={`opt-${k}`} zh text={o} disabled={done} onPress={() => choose(k)}
            state={done ? (o === q.w.zh ? 'right' : k === picked ? 'wrong' : undefined) : undefined} />
        ))}
      </View>
      {done && (
        <>
          <Feedback good={ok}>
            <Text style={fbText(ok)}>{ok ? 'Correct!' : 'Not quite.'} <Text style={{ fontFamily: F.zh }}>{q.w.w} = {q.w.zh}</Text></Text>
            <Text style={[fbText(ok), { fontFamily: F.bodySemi, marginTop: 2 }]}>{q.w.ex}</Text>
          </Feedback>
          <LinkButton icon="flag" title="Report a problem with this word" onPress={() => openReport(q.w.id)} />
        </>
      )}
      <T v="smallBold">Word {i + 1} of {qs.length}</T>
    </Shell>
  );
}
