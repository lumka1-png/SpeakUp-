import { Redirect } from 'expo-router';

import Done from '@/screens/lesson/Done';
import G1 from '@/screens/lesson/G1';
import G2 from '@/screens/lesson/G2';
import G3 from '@/screens/lesson/G3';
import Interlude from '@/screens/lesson/Interlude';
import Listen from '@/screens/lesson/Listen';
import Pick from '@/screens/lesson/Pick';
import Quiz from '@/screens/lesson/Quiz';
import Speak from '@/screens/lesson/Speak';
import { useLesson } from '@/store/lesson';

const STEPS = { pick: Pick, g1: G1, g2: G2, g3: G3, inter: Interlude, speak: Speak, listen: Listen, quiz: Quiz, done: Done };

export default function LessonScreen() {
  const active = useLesson((l) => l.active);
  const step = useLesson((l) => l.step);
  const key = useLesson((l) => `${l.step}:${l.words.map((w) => w.id).join(',')}:${l.pool.length}`);
  if (!active) return <Redirect href="/" />;
  const Step = STEPS[step];
  return <Step key={key} />;
}
