import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Icon, IconButton, Note, Row, T } from '../../components/ui';
import { LEVELS, topicName, type Word } from '../../data/words';
import { tap } from '../../lib/haptics';
import { speak } from '../../lib/speech';
import { LESSON_SIZE, neededCount, useLesson } from '../../store/lesson';
import { useProgress } from '../../store/progress';
import { useUi } from '../../store/ui';
import { C, F } from '../../theme';
import { Shell } from './Shell';

function WordCard({ w, on, showZh, onPress }: { w: Word; on: boolean; showZh: boolean; onPress: () => void }) {
  return (
    <View>
      <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${w.w}, ${w.def}`}
        style={{ backgroundColor: on ? C.tealTint : C.white, borderWidth: 2, borderColor: on ? C.teal : C.line, borderRadius: 18, paddingVertical: 14, paddingLeft: 52, paddingRight: 62 }}>
        <View style={{ position: 'absolute', left: 14, top: 17, width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? C.teal : C.lineDark, backgroundColor: on ? C.teal : C.white, alignItems: 'center', justifyContent: 'center' }}>
          {on && <Icon name="check" size={16} color={C.white} />}
        </View>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: F.display, fontSize: 20, color: C.ink }}>{w.w}</Text>
          <Text style={{ fontFamily: F.bodyBold, fontStyle: 'italic', fontSize: 13, color: C.muted }}>{w.pos}</Text>
          <View style={{ backgroundColor: C.sunTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: '#6B4A00' }}>{LEVELS[w.lvl].name}</Text>
          </View>
        </Row>
        <T v="small" style={{ marginTop: 3 }}>{w.def}</T>
        {showZh && <T v="zh" style={{ marginTop: 3 }}>{w.zh}</T>}
      </Pressable>
      <View style={{ position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' }}>
        <IconButton name="vol" label={`Hear ${w.w}`} onPress={() => speak(w.w, { rate: 0.9 })} />
      </View>
    </View>
  );
}

export default function Pick() {
  const { pool, selected, topic, random, toggle, autoPick, confirmPick } = useLesson();
  const level = useProgress((p) => p.level);
  const toast = useUi((u) => u.showToast);
  const [show, setShow] = useState(20);
  const [showZh, setShowZh] = useState(false);
  const need = neededCount(pool.length);
  const n = selected.length;

  if (need < 4) {
    return (
      <Shell progress={0.02} footer={<Button title="Choose another topic" onPress={() => { useLesson.getState().quit(); router.back(); }} />}>
        <T v="eyebrow">Step 1 · Vocabulary</T>
        <T v="h2">{`You've learned the ${LEVELS[level].name} words in ${topicName(topic)}!`}</T>
        <T muted>{pool.length ? `Only ${pool.length} ${LEVELS[level].name} word${pool.length > 1 ? 's are' : ' is'} left here.` : 'There are no new words left at your level here.'} Choose another topic, move up a level on the home screen, or review your words in My Words.</T>
      </Shell>
    );
  }

  const onToggle = (id: string) => {
    if (!selected.includes(id) && n >= need) { toast(`You've chosen ${need} words. Tap a word to remove it first.`); return; }
    tap();
    toggle(id);
  };

  return (
    <Shell progress={0.02} count={`${n}/${need}`}
      footer={<Button title={n < need ? `Choose ${need - n} more` : `Start with these ${n} words`} iconRight={n < need ? undefined : 'right'} disabled={n < need} onPress={confirmPick} />}>
      <View>
        <T v="eyebrow">Step 1 · Vocabulary</T>
        <T v="h2" accessibilityRole="header" style={{ marginTop: 6 }}>Choose {need} words</T>
        <T muted style={{ marginTop: 6 }}>
          {topicName(topic)}{random ? ' (random)' : ''} · {LEVELS[level].name}. Pick words that are new or that you want to practice. They move to My Words.
        </T>
      </View>
      <T v="small">After you choose, you can tap Vocabulary, Speaking, or Listening at the top to jump to that part, or skip any exercise.</T>
      {pool.length < LESSON_SIZE && <Note>{`Only ${pool.length} words are left in this list, so this lesson will use ${need}.`}</Note>}
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <Button small kind="secondary" icon="shuffle" title="Auto-pick" onPress={autoPick} disabled={n >= need} />
        <Button small kind="secondary" title={`中 ${showZh ? 'Hide' : 'Show'} Chinese`} onPress={() => setShowZh(!showZh)} />
      </Row>
      <View style={{ gap: 10 }}>
        {pool.slice(0, show).map((w) => <WordCard key={w.id} w={w} on={selected.includes(w.id)} showZh={showZh} onPress={() => onToggle(w.id)} />)}
      </View>
      {pool.length > show && <Button kind="secondary" title="Show more words" onPress={() => setShow(show + 20)} />}
    </Shell>
  );
}
