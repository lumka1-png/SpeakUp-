import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Button, Card, Icon, IconButton, LinkButton, Note, Row, s, T } from '../../components/ui';
import { type Feedback, readBackScore } from '../../lib/analyze';
import { getFeedback } from '../../lib/api';
import { speak, startListening, getRecognizer, stopSpeaking } from '../../lib/speech';
import { speakItemScore } from '../../lib/scoring';
import { useLesson } from '../../store/lesson';
import { useProgress } from '../../store/progress';
import { useUi } from '../../store/ui';
import { C, F } from '../../theme';
import { QuestionCard } from './G1';
import { Shell } from './Shell';

function MicButton({ listening, onPress, size = 96 }: { listening: boolean; onPress: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={listening ? 'Stop recording' : 'Start recording'}
      style={({ pressed }) => ({ alignSelf: 'center', width: size, height: size, borderRadius: size / 2, backgroundColor: listening ? C.bad : C.coral, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: listening ? C.badDark : C.coralDark, transform: [{ translateY: pressed ? 3 : 0 }] })}>
      <Icon name={listening ? 'stop' : 'mic'} size={size * 0.42} color={C.white} />
    </Pressable>
  );
}

export default function Speak() {
  const { words, spoken, addSpoken, finishSpeak } = useLesson();
  const { level, installId } = useProgress();
  const { openReport, showToast } = useUi();
  const canRecord = !!getRecognizer();
  const [i, setI] = useState(() => Math.min(spoken.length, words.length - 1));
  const w = words[i];
  const [text, setText] = useState('');
  const [viaMic, setViaMic] = useState(false);
  const [conf, setConf] = useState<number | null>(null);
  const [listening, setListening] = useState<null | 'say' | 'readback'>(null);
  const [loading, setLoading] = useState(false);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [idea, setIdea] = useState(false);
  const [readBack, setReadBack] = useState<{ heard: string; score: number; missed: string[] } | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { stopRef.current?.(); stopSpeaking(); }, []);

  const reset = () => { setText(''); setViaMic(false); setConf(null); setFb(null); setIdea(false); setReadBack(null); };

  const record = async (mode: 'say' | 'readback') => {
    if (listening) { stopRef.current?.(); return; }
    stopSpeaking();
    let heard = '';
    setListening(mode);
    stopRef.current = await startListening({
      onText: (t, c, isFinal) => {
        heard = t;
        if (mode === 'say') { setText(t); setViaMic(true); if (isFinal && c != null) setConf(c); }
      },
      onEnd: () => {
        setListening(null);
        stopRef.current = null;
        if (mode === 'readback' && fb && heard) setReadBack({ heard, ...readBackScore(fb.corrected, heard) });
      },
      onError: (msg) => showToast(msg),
    });
    if (!stopRef.current) setListening(null);
  };

  const check = async () => {
    if (!text.trim() || loading) return;
    stopRef.current?.();
    setLoading(true);
    const result = await getFeedback({ word: w, text, confidence: conf, viaMic, level, installId });
    setLoading(false);
    setFb(result);
  };

  const advance = (feedback: Feedback | null) => {
    const pron = feedback ? (readBack ? readBack.score : feedback.pronScore) : null;
    addSpoken({ wordId: w.id, feedback, score: feedback ? speakItemScore(feedback.grammarScore, pron) : 0 });
    stopSpeaking();
    if (i + 1 >= words.length) { finishSpeak(); return; }
    setI(i + 1);
    reset();
  };

  const pron = fb ? (readBack ? readBack.score : fb.pronScore) : null;
  const footer = fb ? (
    <Row gap={10}>
      <Button kind="secondary" icon="refresh" title="Retry" onPress={reset} style={{ flex: 1 }} />
      <Button title={i + 1 < words.length ? 'Next word' : 'Finish'} iconRight="right" onPress={() => advance(fb)} style={{ flex: 1.3 }} />
    </Row>
  ) : (
    <Row gap={10}>
      <LinkButton title="Skip" onPress={() => advance(null)} />
      <Button title={loading ? 'Checking…' : 'Check my sentence'} onPress={check} disabled={!text.trim() || loading} style={{ flex: 1 }} />
    </Row>
  );

  return (
    <Shell progress={0.4 + 0.3 * (i / words.length)} scrollKey={i} scrollToEnd={!!fb} footer={footer}>
      <View>
        <T v="eyebrow">Step 2 · Speaking</T>
        <T v="h2" accessibilityRole="header" style={{ marginTop: 6 }}>Say a sentence with this word</T>
      </View>
      <QuestionCard w={w}>
        <Text style={{ fontFamily: F.bodyBold, color: '#C9CBE0', marginTop: 2 }}>{w.pos} · <Text style={{ fontFamily: F.zh }}>{w.zh}</Text></Text>
        <Text style={{ fontFamily: F.bodySemi, color: '#E4E5F0', fontSize: 15, marginTop: 8, textAlign: 'center' }}>{w.def}</Text>
      </QuestionCard>
      <LinkButton icon="flag" title="Report this word" onPress={() => openReport(w.id)} style={{ alignSelf: 'flex-end', marginTop: -8 }} />

      {!fb && (
        <>
          <LinkButton icon="bulb" title={idea ? 'Hide the idea' : 'Need an idea?'} onPress={() => setIdea(!idea)} />
          {idea && (
            <Note>
              <Row gap={8} style={{ alignItems: 'flex-start' }}>
                <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: C.sunText }}>{w.ex}</Text>
                <IconButton name="vol" label="Hear the example" onPress={() => speak(w.ex, { rate: 0.9 })} />
              </Row>
            </Note>
          )}
          {canRecord ? (
            <View style={{ gap: 6 }}>
              <MicButton listening={listening === 'say'} onPress={() => record('say')} />
              <T v="smallBold" style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">{listening === 'say' ? 'Listening… tap to stop' : 'Tap to record'}</T>
            </View>
          ) : (
            <Note>Voice input needs the full app build. For now, type your sentence below. 目前請先用打字輸入。</Note>
          )}
          <View>
            <Text style={s.label}>{canRecord ? 'Or type what you said' : 'Your sentence'}</Text>
            <TextInput value={text} onChangeText={(t) => { setText(t); setViaMic(false); }} multiline placeholder={`Example: ${w.ex}`} placeholderTextColor="#8C8FA6"
              accessibilityLabel="Your sentence" style={[s.input, { minHeight: 84, textAlignVertical: 'top' }]} />
          </View>
          {loading && <Row style={{ justifyContent: 'center' }}><ActivityIndicator color={C.coral} /><T v="small">Checking your sentence…</T></Row>}
        </>
      )}

      {fb && (
        <View style={{ gap: 12 }}>
          <Row gap={10}>
            <View style={{ flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', backgroundColor: C.tealTint }}>
              <Text style={{ fontFamily: F.display, fontSize: 28, color: C.ink }}>{fb.grammarScore}%</Text><T v="smallBold">Grammar</T>
            </View>
            <View style={{ flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', backgroundColor: C.coralTint }}>
              <Text style={{ fontFamily: F.display, fontSize: 28, color: C.ink }}>{pron != null ? `${pron}%` : 'n/a'}</Text><T v="smallBold">Pronunciation</T>
            </View>
          </Row>
          {pron == null && <T v="small">Pronunciation is measured when you record with the microphone. Typed sentences get grammar feedback only.</T>}
          {fb.encouragement ? <T v="bodyBold">{fb.encouragement}</T> : null}
          {fb.issues.length ? fb.issues.map((x, k) => (
            <Card key={k} style={{ padding: 12, borderRadius: 14 }}>
              <T v="bodyBold" style={{ fontSize: 14.5 }}>{x.msg}</T>
              <T v="zh" muted style={{ fontSize: 13.5 }}>{x.zh}</T>
            </Card>
          )) : (
            <View style={{ backgroundColor: C.okTint, borderRadius: 16, padding: 12 }}><T v="bodyBold" style={{ color: C.okDark }}>Great sentence! The grammar is clear and correct.</T></View>
          )}
          {fb.corrected !== fb.original && (
            <Row style={{ backgroundColor: C.okTint, borderRadius: 16, padding: 12 }}>
              <View style={{ flex: 1 }}><T v="smallBold" style={{ color: C.okDark }}>CORRECTED</T><T v="bodyBold" style={{ color: C.okDark }}>{fb.corrected}</T></View>
              <IconButton name="vol" label="Hear the corrected sentence" onPress={() => speak(fb.corrected, { rate: 0.9 })} />
            </Row>
          )}
          {fb.natural ? (
            <Row style={{ backgroundColor: C.white, borderWidth: 2, borderColor: C.line, borderRadius: 16, padding: 12 }}>
              <View style={{ flex: 1 }}><T v="smallBold">MORE NATURAL</T><T v="bodyBold">{fb.natural}</T></View>
              <IconButton name="vol" label="Hear the natural version" onPress={() => speak(fb.natural!, { rate: 0.9 })} />
            </Row>
          ) : null}
          {canRecord && (
            <Card style={{ gap: 10 }}>
              <T v="h3">Read it back</T>
              <T v="small">Read this sentence out loud. It gives you a more accurate pronunciation score.</T>
              <T v="bodyBold">{fb.corrected}</T>
              <MicButton size={72} listening={listening === 'readback'} onPress={() => record('readback')} />
              {readBack && (
                <View style={{ gap: 4 }}>
                  <T v="bodyBold">{readBack.score}% matched</T>
                  <T v="small">We heard: “{readBack.heard}”</T>
                  {readBack.missed.length > 0 && <T v="small">Practice these words: {readBack.missed.join(', ')}</T>}
                </View>
              )}
            </Card>
          )}
          {(fb.mispronunciations.length > 0 || fb.soundTips.length > 0) && (
            <Card style={{ gap: 10, padding: 14 }}>
              <T v="h3">Sound tips for “{w.w}”</T>
              {fb.mispronunciations.map((m, k) => (
                <View key={`m${k}`}><T v="bodyBold" style={{ fontSize: 14 }}>We heard “{m.heard}”, not “{m.intended}”. {m.tip}</T><T v="zh" muted style={{ fontSize: 13.5 }}>{m.tipZh}</T></View>
              ))}
              {fb.soundTips.map((t) => (
                <View key={t.key}>
                  <Row gap={6} style={{ alignItems: 'flex-start' }}>
                    <View style={{ backgroundColor: C.ink, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1 }}><Text style={{ color: C.white, fontFamily: F.bodyHeavy, fontSize: 12 }}>{t.key}</Text></View>
                    <T v="small" style={{ flex: 1, color: C.ink }}>{t.en}</T>
                  </Row>
                  <T v="zh" muted style={{ fontSize: 13.5, marginTop: 2 }}>{t.zh}</T>
                </View>
              ))}
            </Card>
          )}
          <T v="small" style={{ textAlign: 'center' }}>{fb.source === 'claude' ? 'Feedback by Claude.' : 'Offline feedback (rule-based).'}</T>
        </View>
      )}
      <T v="smallBold">Word {i + 1} of {words.length}</T>
    </Shell>
  );
}
