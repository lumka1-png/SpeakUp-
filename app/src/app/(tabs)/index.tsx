import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import type { IconName } from '@/components/icons';
import { Select, type SelectOption } from '@/components/Select';
import { BrandHeader } from '@/components/BrandHeader';
import { Badge, Button, Card, Icon, Row, Screen, s, T } from '@/components/ui';
import { COMING_SOON, getPool, LEVELS, THEME_IDS, topicColor, topicName } from '@/data/words';
import { useLesson } from '@/store/lesson';
import { useProgress } from '@/store/progress';
import { C } from '@/theme';


const STEPS: { icon: IconName; bg: string; fg: string; title: string; body: string }[] = [
  { icon: 'book', bg: C.tealTint, fg: C.tealDark, title: '1. Vocabulary', body: 'Choose 5 words, then play 3 quick games.' },
  { icon: 'mic', bg: C.coralTint, fg: C.coralDark, title: '2. Speaking', body: 'Say a sentence with each word and get feedback.' },
  { icon: 'headphones', bg: C.sunTint, fg: '#6B4A00', title: '3. Listening', body: 'Hear your words in a 5-minute podcast, then take a quiz.' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const { level, topic, myWords, history, setLevel, setTopic } = useProgress();
  const start = useLesson((l) => l.start);
  const pool = topic === 'random' ? null : getPool(level, topic, myWords);
  const saved = Object.keys(myWords).length;

  const levelOptions: SelectOption[] = LEVELS.map((l, i) => ({ value: String(i), label: `${l.name} (CEFR ${l.cefr})` }));
  const topicOptions: SelectOption[] = [
    { value: 'random', label: 'Random topic' },
    { value: 'toeic', label: 'TOEIC Essentials', group: 'Core list' },
    ...THEME_IDS.map((id) => ({ value: id, label: topicName(id), group: 'Themed lists' })),
    ...COMING_SOON.map((n) => ({ value: `soon:${n}`, label: n, disabled: true, group: 'More lists coming soon' })),
  ];

  return (
    <Screen>
      <BrandHeader />
      <ScrollView contentContainerStyle={s.scroll}>
        <View>
          <T v="eyebrow">{greeting()}</T>
          <T v="h1" accessibilityRole="header" style={{ marginTop: 6 }}>{"Ready for today's lesson?"}</T>
          <T muted style={{ marginTop: 6 }}>Learn 5 words, say them out loud, then hear them in a mini podcast.</T>
        </View>
        <Card style={{ gap: 14 }}>
          <Select label="Your level" value={String(level)} options={levelOptions} onChange={(v) => setLevel(Number(v))} />
          <Select label="Topic" value={topic} options={topicOptions} onChange={setTopic} />
          <Row gap={12}>
            <Badge text={topic === 'random' ? '?' : topic === 'toeic' ? 'T' : topicName(topic)[0]} color={topicColor(topic)} />
            <View style={{ flex: 1 }}>
              <T v="bodyBold">{topicName(topic)}</T>
              <T v="small">{pool ? `${pool.length} words left to learn · ${LEVELS[level].name}` : "We'll pick a topic for you"}</T>
            </View>
          </Row>
          <Button title="Start lesson" iconRight="right" onPress={() => { start(); router.push('/lesson'); }} />
        </Card>
        <Card style={{ gap: 10 }}>
          <Row gap={12}>
            <Icon name="bookmark" color={C.teal} />
            <View style={{ flex: 1 }}>
              <T v="h3">My Words</T>
              <T v="small">{saved ? `${saved} word${saved > 1 ? 's' : ''} you have chosen so far, with meanings and progress.` : 'Every word you choose in a lesson is saved here.'}</T>
            </View>
          </Row>
          <Button kind="secondary" title={saved ? 'See my words' : 'Open My Words'} onPress={() => router.navigate('/words')} />
        </Card>
        <View style={{ gap: 10 }}>
          <T v="h2" accessibilityRole="header">How a lesson works</T>
          {STEPS.map((st) => (
            <Row key={st.title} gap={12} style={{ backgroundColor: C.white, borderWidth: 2, borderColor: C.line, borderRadius: 18, padding: 14, alignItems: 'flex-start' }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: st.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={st.icon} color={st.fg} /></View>
              <View style={{ flex: 1 }}><T v="h3">{st.title}</T><T v="small">{st.body}</T></View>
            </Row>
          ))}
          <T v="small">About 10 to 15 minutes per lesson.</T>
        </View>
        {history.length > 0 && (
          <Card>
            <T v="h3">Recent lessons</T>
            {history.slice(0, 4).map((h, i) => (
              <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: i ? 2 : 0, borderTopColor: C.line }}>
                <View><T v="bodyBold">{h.topic}</T><T v="small">{h.d}</T></View>
                <T v="bodyBold">{h.score}%</T>
              </Row>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
