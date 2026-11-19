import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Feedback, fbText, Option, T } from '../../components/ui';
import { buzzBad, buzzGood } from '../../lib/haptics';
import { useLesson } from '../../store/lesson';
import { C, F } from '../../theme';
import { Shell } from './Shell';

export default function Quiz() {
  const episode = useLesson((l) => l.episode);
  const finish = useLesson((l) => l.finishQuiz);
  const qs = episode?.quiz ?? [];
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  if (!qs.length) return null;
  const q = qs[i];
  const done = picked !== null;
  const ok = done && q.options[picked] === q.answer;

  const choose = (k: number) => {
    if (done) return;
    setPicked(k);
    if (q.options[k] === q.answer) { setCorrect(correct + 1); buzzGood(); } else buzzBad();
  };
  const next = () => {
    if (i + 1 >= qs.length) { finish(correct, qs.length); return; }
    setI(i + 1);
    setPicked(null);
  };

  return (
    <Shell progress={0.85 + 0.15 * (i / qs.length)} scrollKey={i} scrollToEnd={done}
      footer={done ? <Button title={i + 1 < qs.length ? 'Next question' : 'See my results'} iconRight="right" onPress={next} /> : undefined}>
      <View>
        <T v="eyebrow">Step 3 · Listening quiz</T>
        <T v="h2" accessibilityRole="header" style={{ marginTop: 6 }}>{q.prompt}</T>
      </View>
      {q.quote ? (
        <View style={{ backgroundColor: C.white, borderWidth: 2, borderColor: C.line, borderRadius: 16, padding: 14 }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 17, lineHeight: 25, color: C.ink }}>“{q.quote}”</Text>
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        {q.options.map((o, k) => (
          <Option key={k} testID={`opt-${k}`} text={o} disabled={done} onPress={() => choose(k)} state={done ? (o === q.answer ? 'right' : k === picked ? 'wrong' : undefined) : undefined} />
        ))}
      </View>
      {done && <Feedback good={ok}><Text style={fbText(ok)}>{ok ? 'Correct!' : `The answer is “${q.answer}”.`}</Text></Feedback>}
      <T v="smallBold">Question {i + 1} of {qs.length}</T>
    </Shell>
  );
}
