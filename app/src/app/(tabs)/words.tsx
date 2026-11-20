import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button, Card, Icon, IconButton, Logo, MasteryDots, Pill, PillText, Row, Screen, s, T } from '@/components/ui';
import { LEVELS, topicName } from '@/data/words';
import { speak } from '@/lib/speech';
import { LESSON_SIZE, useLesson } from '@/store/lesson';
import { useProgress } from '@/store/progress';
import { useUi } from '@/store/ui';
import { C, F } from '@/theme';

type Filter = 'all' | 'learning' | 'mastered';

export default function MyWords() {
  const myWords = useProgress((p) => p.myWords);
  const unsave = useProgress((p) => p.unsaveWord);
  const { openReport, showToast } = useUi();
  const start = useLesson((l) => l.start);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const all = useMemo(() => Object.values(myWords).sort((a, b) => b.added - a.added), [myWords]);
  const mastered = all.filter((w) => w.mastery >= 3).length;
  const query = q.trim().toLowerCase();
  const list = all.filter((w) => (filter === 'all' || (filter === 'mastered' ? w.mastery >= 3 : w.mastery < 3)) && (!query || `${w.w} ${w.zh} ${w.def}`.toLowerCase().includes(query)));

  const practice = () => {
    const ws = [...all].sort((a, b) => a.mastery - b.mastery || a.added - b.added).slice(0, LESSON_SIZE).map(({ mastery: _m, added: _a, seen: _s, ...w }) => w);
    start(ws);
    router.push('/lesson');
  };

  return (
    <Screen>
      <Row style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <T v="h1" accessibilityRole="header" style={{ flex: 1 }}>My Words</T>
        <Pill><PillText>{all.length} saved</PillText></Pill>
      </Row>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {all.length >= 4 && (
          <Card style={{ gap: 10 }}>
            <Row><Icon name="trophy" color={C.teal} /><T v="h3">Practice my words</T></Row>
            <T v="small">Review the {Math.min(LESSON_SIZE, all.length)} words you know least, with all three exercises.</T>
            <Button title="Start review" kind="teal" onPress={practice} />
          </Card>
        )}
        {all.length > 0 ? (
          <>
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: C.white, borderWidth: 2, borderColor: C.line, borderRadius: 14, padding: 4, gap: 4 }}>
              {([['all', `All ${all.length}`], ['learning', `Learning ${all.length - mastered}`], ['mastered', `Mastered ${mastered}`]] as const).map(([k, label]) => (
                <Pressable key={k} onPress={() => setFilter(k)} accessibilityRole="tab" accessibilityState={{ selected: filter === k }}
                  style={{ flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: filter === k ? C.ink : 'transparent' }}>
                  <Text style={{ fontFamily: F.bodyHeavy, color: filter === k ? C.white : C.muted }}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <View>
              <Text style={s.label} nativeID="searchLabel">Search</Text>
              <TextInput value={q} onChangeText={setQ} placeholder="Find a word" placeholderTextColor="#8C8FA6" accessibilityLabel="Search my words" style={s.input} autoCapitalize="none" />
            </View>
            {list.map((w) => (
              <Row key={w.id} style={{ backgroundColor: C.white, borderWidth: 2, borderColor: C.line, borderRadius: 18, padding: 14, alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Row gap={8}><T v="display">{w.w}</T><T v="small" style={{ fontStyle: 'italic' }}>{w.pos}</T><MasteryDots value={w.mastery} /></Row>
                  <T v="zh">{w.zh}</T>
                  <T v="small">{w.def}</T>
                  <T v="small">{topicName(w.topic)} · {LEVELS[w.lvl]?.name ?? ''} · {w.mastery >= 3 ? 'Mastered' : 'Learning'}</T>
                </View>
                <View style={{ gap: 6 }}>
                  <IconButton name="vol" label={`Hear ${w.w}`} onPress={() => speak(w.w, { rate: 0.9 })} />
                  <IconButton name="flag" label={`Report a problem with ${w.w}`} onPress={() => openReport(w.id)} />
                  <IconButton name="trash" label={`Return ${w.w} to its list`} onPress={() => { unsave(w.id); showToast(`“${w.w}” is back in its word list.`); }} />
                </View>
              </Row>
            ))}
            {list.length === 0 && <T muted style={{ textAlign: 'center', paddingVertical: 20 }}>No words match.</T>}
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
            <Logo size={56} />
            <T v="h2">No words yet</T>
            <T muted style={{ textAlign: 'center' }}>Words you choose in a lesson are saved here so you can review them later.</T>
            <Button title="Start a lesson" onPress={() => router.navigate('/')} style={{ marginTop: 8 }} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
