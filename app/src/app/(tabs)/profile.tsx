import { ScrollView, View } from 'react-native';

import { CreatorSection } from '@/components/Promo';
import { Select } from '@/components/Select';
import { Button, Card, Row, Screen, s, T } from '@/components/ui';
import { hasServer } from '@/lib/api';
import { SHOW_PROMOS } from '@/data/promos';
import { LEVELS } from '@/data/words';
import { useProgress } from '@/store/progress';
import { useUi } from '@/store/ui';
import { C } from '@/theme';

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.white, borderWidth: 2, borderColor: C.line, borderRadius: 18, padding: 14 }}>
      <T v="h1">{value}</T>
      <T v="smallBold">{label}</T>
    </View>
  );
}

export default function Profile() {
  const { stats, level, setLevel, myWords, history, reports, reset } = useProgress();
  const askConfirm = useUi((u) => u.askConfirm);
  const nWords = Object.keys(myWords).length;
  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}><T v="h1" accessibilityRole="header">Profile</T></View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Row><Tile value={stats.lessons} label="Lessons" /><Tile value={stats.xp} label="Total XP" /></Row>
        <Row><Tile value={stats.streak} label="Day streak" /><Tile value={`${stats.best}%`} label="Best score" /></Row>
        <Card style={{ gap: 10 }}>
          <Select label="Your level" value={String(level)} onChange={(v) => setLevel(Number(v))}
            options={LEVELS.map((l, i) => ({ value: String(i), label: `${l.name} (CEFR ${l.cefr} · TOEIC ${l.toeic})` }))} />
          <T v="small">{nWords} words saved in My Words.</T>
          <T v="small">Beta feedback: {reports.length} word report{reports.length === 1 ? '' : 's'} sent. Thank you!</T>
        </Card>
        <Card>
          <T v="h3">Lesson history</T>
          {history.length ? history.map((h, i) => (
            <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: i ? 2 : 0, borderTopColor: C.line }}>
              <View><T v="bodyBold">{h.topic}</T><T v="small">{h.d}</T></View>
              <T v="bodyBold">{h.score}%</T>
            </Row>
          )) : <T muted style={{ marginTop: 6 }}>Finish a lesson to see your history.</T>}
        </Card>
        {SHOW_PROMOS && <CreatorSection />}
        <Button title="Reset my progress" kind="secondary" onPress={() => askConfirm({ title: 'Reset your progress?', body: 'This clears your level, My Words, scores, and streak on this device.', ok: 'Reset everything', onOk: reset })} />
        <T v="small" style={{ textAlign: 'center' }}>Progress is saved on this device only. {hasServer() ? 'AI feedback is on.' : 'Offline mode: feedback is rule-based.'}</T>
      </ScrollView>
    </Screen>
  );
}
