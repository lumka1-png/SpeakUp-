import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button, Card, Chip, IconButton, Icon, Meter, Row, T } from '../../components/ui';
import { PODCAST_NAME } from '../../config';
import { episodeSeconds, wordsInLine } from '../../lib/podcast';
import { speak, stopSpeaking } from '../../lib/speech';
import { fmtTime, wordRe } from '../../lib/util';
import { episodeWaitStart, playQuickEpisode, prefetchEpisode, useLesson } from '../../store/lesson';
import { useProgress } from '../../store/progress';
import type { Word } from '../../data/words';
import { C, F } from '../../theme';
import { Shell } from './Shell';

const RATES = [0.8, 1, 1.2];

function Highlighted({ text, words }: { text: string; words: string[] }) {
  const re = new RegExp('\\b(' + words.map((w) => wordRe(w).source.slice(2)).sort((a, b) => b.length - a.length).join('|') + ')', 'gi');
  const parts = text.split(re);
  return (
    <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.ink }}>
      {parts.map((p, i) => (i % 2 ? <Text key={i} style={{ fontFamily: F.bodyHeavy, textDecorationLine: 'underline', textDecorationColor: C.sun }}>{p}</Text> : p))}
    </Text>
  );
}

/** Episodes usually take 25 to 45 seconds to write. Messages follow the typical wait. */
const WAIT_STEPS: [number, string][] = [
  [0, 'Choosing a story for your topic…'],
  [8, 'Writing what Mia and Leo say…'],
  [20, 'Putting all of your words into the story…'],
  [32, 'Writing your quiz questions…'],
  [45, 'Almost ready. Long episodes take a little longer…'],
];
const QUICK_AFTER = 20;

/** Estimated progress that slows down near the end and never reaches 100% before the episode arrives. */
const waitProgress = (sec: number) => 95 * (1 - Math.exp(-sec / 22));

function EpisodeLoading({ words }: { words: Word[] }) {
  const [sec, setSec] = useState(() => Math.floor((Date.now() - episodeWaitStart()) / 1000));
  useEffect(() => {
    const t = setInterval(() => setSec(Math.floor((Date.now() - episodeWaitStart()) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const message = [...WAIT_STEPS].reverse().find(([at]) => sec >= at)![1];

  return (
    <Shell progress={0.72} footer={sec >= QUICK_AFTER
      ? <Button kind="secondary" title="Play a quick episode now" icon="play" onPress={playQuickEpisode}
          label="Play a quick episode now instead of waiting. It uses a simpler, ready-made story." />
      : undefined}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 28 }}>
        <ActivityIndicator size="large" color={C.coral} />
        <T v="h3" style={{ textAlign: 'center' }}>Writing your podcast</T>
        <T muted style={{ textAlign: 'center' }}>Mia and Leo are preparing a new episode with all of your words. This takes about 30 seconds.</T>
      </View>
      <View style={{ gap: 8, marginTop: 18 }} accessible accessibilityRole="progressbar"
        accessibilityLabel="Podcast loading" accessibilityValue={{ min: 0, max: 100, now: Math.round(waitProgress(sec)) }}>
        <Meter value={waitProgress(sec)} />
        <T v="smallBold" style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">{message}</T>
      </View>
      <Card style={{ marginTop: 18, gap: 10 }}>
        <T v="h3">While you wait: your words</T>
        <T v="small" muted>Listen for these words in the episode.</T>
        {words.map((w) => (
          <View key={w.id} style={{ gap: 2 }}>
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 16, color: C.ink }}>{w.w} <Text style={{ fontFamily: F.body, color: C.muted }}>{w.pos} {w.zh}</Text></Text>
            <T v="small" muted>{w.def}</T>
          </View>
        ))}
      </Card>
      {sec >= QUICK_AFTER && <T v="small" muted style={{ textAlign: 'center', marginTop: 12 }}>Don&apos;t want to wait? The quick episode uses a simpler story.</T>}
    </Shell>
  );
}

export default function Listen() {
  const { words, episode, episodeLoading, topic } = useLesson();
  const lessons = useProgress((p) => p.stats.lessons);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [rate, setRate] = useState(1);
  const [showT, setShowT] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [heard, setHeard] = useState<string[]>([]);
  const live = useRef({ idx: 0, playing: false, rate: 1 });

  useEffect(() => { if (!episode && !episodeLoading) prefetchEpisode(); }, [episode, episodeLoading]);
  useEffect(() => () => { live.current.playing = false; stopSpeaking(); }, []);

  const playRef = useRef<(i: number) => void>(() => {});
  const playFrom = (i: number) => {
    if (!episode) return;
    const lines = episode.lines;
    if (i >= lines.length) {
      live.current.playing = false;
      setPlaying(false); setFinished(true); setIdx(lines.length);
      return;
    }
    live.current.idx = i;
    setIdx(i);
    const ids = wordsInLine(lines[i].t, words);
    if (ids.length) setHeard((h) => Array.from(new Set([...h, ...ids])));
    speak(lines[i].t, {
      host: lines[i].sp,
      rate: (lines[i].slow ? 0.8 : 1) * live.current.rate,
      onEnd: () => { if (live.current.playing && live.current.idx === i) playRef.current(i + 1); },
      // Speech could not play: stop and explain, instead of racing through every line in silence.
      onFail: () => { live.current.playing = false; setPlaying(false); setAudioFailed(true); setShowT(true); },
    });
  };
  useEffect(() => { playRef.current = playFrom; });

  const toggle = () => {
    if (!episode) return;
    setAudioFailed(false);
    if (playing) { live.current.playing = false; setPlaying(false); stopSpeaking(); return; }
    live.current.playing = true;
    setPlaying(true);
    playFrom(idx >= episode.lines.length ? 0 : idx);
  };
  const jump = (d: number) => {
    if (!episode) return;
    const n = Math.max(0, Math.min(episode.lines.length - 1, idx + d));
    stopSpeaking();
    if (live.current.playing) playFrom(n); else { live.current.idx = n; setIdx(n); }
  };
  const changeRate = (r: number) => {
    live.current.rate = r;
    setRate(r);
    if (live.current.playing) { stopSpeaking(); playFrom(live.current.idx); }
  };

  const toQuiz = () => { live.current.playing = false; stopSpeaking(); useLesson.setState({ step: 'quiz' }); };

  if (!episode) return <EpisodeLoading words={words} />;

  const total = episodeSeconds(episode.lines, episode.lines.length, rate);
  const elapsed = episodeSeconds(episode.lines, idx, rate);
  return (
    <Shell progress={0.72} footer={<Button kind={finished ? 'primary' : 'secondary'} title={finished ? 'Take the quiz' : "I'm ready for the quiz"} iconRight="right" onPress={toQuiz} />}>
      <View>
        <T v="eyebrow">Step 3 · Listening</T>
        <T v="h2" accessibilityRole="header" style={{ marginTop: 6 }}>Your mini podcast</T>
        <T muted style={{ marginTop: 6 }}>Mia and Leo chat about everyday life, and your {words.length} words are hidden in the conversation. Each one lights up when you hear it.</T>
      </View>
      <View style={{ backgroundColor: C.ink, borderRadius: 24, padding: 20, minHeight: 170, justifyContent: 'flex-end', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: 20, top: 22, flexDirection: 'row', gap: 6, alignItems: 'center', height: 80 }} accessibilityElementsHidden>
          {[46, 72, 58, 80, 40, 64].map((h, k) => <View key={k} style={{ width: 8, height: playing ? h : h * 0.6, borderRadius: 8, backgroundColor: k % 2 ? C.coral : C.sun }} />)}
        </View>
        <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, letterSpacing: 1.2, color: C.sun }}>EPISODE {lessons + 1}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 28, color: C.white }}>{PODCAST_NAME}:{'\n'}{episode.title}</Text>
        <Text style={{ fontFamily: F.bodySemi, color: '#D9DAE8' }}>with Mia and Leo · {fmtTime(total)}</Text>
      </View>
      {audioFailed && (
        <View accessibilityRole="alert" style={{ backgroundColor: C.badTint, borderRadius: 16, padding: 12, gap: 4 }}>
          <T v="bodyBold" style={{ color: '#8A1C16' }}>{"The audio didn't play on this device."}</T>
          <T v="small" style={{ color: C.ink }}>Check that your volume is up and your phone is not on silent, then tap play again. If it still does not play, read along with the transcript below, or try another browser such as Chrome or Edge.</T>
          <T v="zh" muted style={{ fontSize: 13.5 }}>無法播放聲音。請確認音量已打開、手機沒有靜音，再按一次播放。如果還是沒有聲音，可以先看下方的逐字稿。</T>
        </View>
      )}
      <Card style={{ gap: 8 }}>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: C.track, overflow: 'hidden' }}>
          <View style={{ width: `${(idx / episode.lines.length) * 100}%`, height: '100%', backgroundColor: C.coral }} />
        </View>
        <Row style={{ justifyContent: 'space-between' }}><T v="smallBold">{fmtTime(elapsed)}</T><T v="smallBold">{fmtTime(total)}</T></Row>
        <Row gap={22} style={{ justifyContent: 'center', marginVertical: 6 }}>
          <IconButton name="back" label="Previous line" onPress={() => jump(-1)} />
          <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'}
            style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.coral, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: C.coralDark }}>
            <Icon name={playing ? 'pause' : 'play'} size={30} color={C.white} />
          </Pressable>
          <IconButton name="fwd" label="Next line" onPress={() => jump(1)} />
        </Row>
        <Row gap={8} style={{ justifyContent: 'center' }}>
          {RATES.map((r) => (
            <Pressable key={r} onPress={() => changeRate(r)} accessibilityRole="button" accessibilityLabel={`Speed ${r}x`} accessibilityState={{ selected: rate === r }}
              style={{ minWidth: 60, minHeight: 44, borderRadius: 12, borderWidth: 2, borderColor: rate === r ? C.ink : C.line, backgroundColor: rate === r ? C.ink : C.white, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bodyHeavy, color: rate === r ? C.white : C.ink }}>{r}x</Text>
            </Pressable>
          ))}
        </Row>
      </Card>
      <View>
        <T v="h3">Words to catch <Text style={{ color: C.muted }}>({heard.length}/{words.length})</Text></T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {words.map((w) => <Chip key={w.id} text={w.w} on={heard.includes(w.id)} icon={heard.includes(w.id) ? 'check' : undefined} />)}
        </View>
      </View>
      <Button kind="secondary" title={showT ? 'Hide transcript' : 'Show transcript'} onPress={() => setShowT(!showT)} />
      {showT && (
        <Card style={{ padding: 10, gap: 2 }}>
          {episode.lines.map((l, k) => (
            <View key={k} style={{ padding: 8, borderRadius: 12, backgroundColor: k === idx && playing ? C.sunTint : 'transparent' }}>
              <Text style={{ fontFamily: F.display, color: l.sp === 'Mia' ? C.coral : C.teal }}>{l.sp}</Text>
              <Highlighted text={l.t} words={words.map((w) => w.w)} />
            </View>
          ))}
        </Card>
      )}
      <T v="small" style={{ textAlign: 'center' }}>{episode.source === 'claude' ? 'Episode written by Claude for this lesson.' : 'Offline episode (template).'}{topic === 'mywords' ? ' Review lesson.' : ''}</T>
    </Shell>
  );
}
