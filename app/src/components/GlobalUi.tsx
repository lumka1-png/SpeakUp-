import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { findWord } from '../data/words';
import { sendReports, type WordReport } from '../lib/api';
import { useLesson } from '../store/lesson';
import { useProgress } from '../store/progress';
import { useUi } from '../store/ui';
import { C, F } from '../theme';
import { Sheet } from './Sheet';
import { Button, s, T } from './ui';

const REASONS: { key: WordReport['reason']; en: string; zh: string }[] = [
  { key: 'zh', en: 'The Chinese translation is wrong', zh: '中文翻譯有誤' },
  { key: 'def', en: 'The definition is unclear', zh: '英文解釋不清楚' },
  { key: 'ex', en: 'The example sentence is wrong or unnatural', zh: '例句有誤或不自然' },
  { key: 'audio', en: 'The pronunciation sounds wrong', zh: '發音聽起來不對' },
  { key: 'other', en: 'Something else', zh: '其他問題' },
];

function ReportSheet() {
  const wordId = useUi((u) => u.reportWordId);
  const close = useUi((u) => u.closeReport);
  const toast = useUi((u) => u.showToast);
  const saved = useProgress((p) => (wordId ? p.myWords[wordId] : undefined));
  const word = saved ?? (wordId ? findWord(wordId) : undefined);
  const [reason, setReason] = useState<WordReport['reason'] | null>(null);
  const [note, setNote] = useState('');
  const done = () => { setReason(null); setNote(''); close(); };
  const send = () => {
    if (!word || !reason) return;
    const lesson = useLesson.getState();
    useProgress.getState().addReport({ wordId: word.id, word: word.w, reason, note: note.trim(), where: lesson.active ? lesson.step : 'my-words' });
    const p = useProgress.getState();
    sendReports(p.reports, p.installId, '0.1.0').then((keys) => keys.length && useProgress.getState().markReportsSent(keys));
    done();
    toast('Thank you! Your report helps us fix our word lists. 感謝回報！');
  };
  return (
    <Sheet visible={!!word} onClose={done}>
      <T v="h2">Report “{word?.w}”</T>
      <T v="small">{"What's wrong? Your report goes to the team. 請選擇問題類型。"}</T>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {REASONS.map((r) => {
          const on = reason === r.key;
          return (
            <Pressable key={r.key} onPress={() => setReason(r.key)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderWidth: 2, borderColor: on ? C.teal : C.line, borderRadius: 14, padding: 12, minHeight: 52 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.teal : C.lineDark, alignItems: 'center', justifyContent: 'center' }}>
                {on && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.teal }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 15, color: C.ink }}>{r.en}</Text>
                <Text style={{ fontFamily: F.zh, fontSize: 13.5, color: C.muted }}>{r.zh}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View>
        <Text style={s.label} nativeID="repNoteLabel">Details (optional)</Text>
        <TextInput value={note} onChangeText={setNote} multiline placeholder="Example: should be 收據, not 發票" placeholderTextColor="#8C8FA6"
          accessibilityLabelledBy="repNoteLabel" accessibilityLabel="Details" style={[s.input, { minHeight: 84, textAlignVertical: 'top' }]} />
      </View>
      <Button title="Send report" onPress={send} disabled={!reason} />
      <Button title="Cancel" kind="secondary" onPress={done} />
    </Sheet>
  );
}

function ConfirmSheet() {
  const c = useUi((u) => u.confirm);
  const close = useUi((u) => u.closeConfirm);
  return (
    <Sheet visible={!!c} onClose={close}>
      <T v="h2">{c?.title}</T>
      <T muted>{c?.body}</T>
      <Button title={c?.ok ?? 'OK'} onPress={() => { const f = c?.onOk; close(); f?.(); }} />
      <Button title="Cancel" kind="secondary" onPress={close} />
    </Sheet>
  );
}

function Toast() {
  const msg = useUi((u) => u.toast);
  const insets = useSafeAreaInsets();
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 100 + insets.bottom, alignItems: 'center' }}>
      <View accessibilityLiveRegion="polite" accessibilityRole={Platform.OS === 'web' ? undefined : 'alert'}
        style={{ backgroundColor: C.ink, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, maxWidth: 520, width: '100%' }}>
        <Text style={{ color: C.white, fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20 }}>{msg}</Text>
      </View>
    </View>
  );
}

export function GlobalUi() {
  return (<><ReportSheet /><ConfirmSheet /><Toast /></>);
}
