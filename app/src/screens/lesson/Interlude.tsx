import { View } from 'react-native';

import { Button, Note, Ring, T } from '../../components/ui';
import { useLesson } from '../../store/lesson';
import { Shell } from './Shell';

export default function Interlude() {
  const inter = useLesson((l) => l.inter);
  const next = useLesson((l) => l.next);
  if (!inter) return null;
  return (
    <Shell progress={inter.progress} footer={<Button kind="teal" title={inter.button} iconRight="right" onPress={next} />}>
      <View style={{ alignItems: 'center', gap: 14, paddingTop: 18 }}>
        <Ring value={inter.score} />
        <T v="h2" accessibilityRole="header" style={{ textAlign: 'center' }}>{inter.title}</T>
        <T muted style={{ textAlign: 'center' }}>{inter.sub}</T>
      </View>
      {inter.tip ? <Note>{inter.tip}</Note> : null}
    </Shell>
  );
}
