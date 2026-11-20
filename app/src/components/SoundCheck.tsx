import { useState } from 'react';
import { View } from 'react-native';

import { speechInfo, testBeep, testSpeech } from '../lib/speech';
import { C } from '../theme';
import { Sheet } from './Sheet';
import { Button, Card, T } from './ui';

/**
 * Step-by-step check for "I can't hear the podcast". It shows what the phone's browser offers
 * for speech and records exactly what happens on each test, so testers can send a screenshot.
 */
export function SoundCheck({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [log, setLog] = useState<string[]>([]);
  const [info, setInfo] = useState(() => speechInfo());
  const add = (line: string) => setLog((l) => [...l, line]);
  const refresh = () => setInfo(speechInfo());

  return (
    <Sheet visible={visible} onClose={onClose}>
      <T v="h2" accessibilityRole="header">Sound check</T>
      <T muted>Try each test in order and tell us which ones you can hear. A screenshot of this screen helps us fix the problem.</T>

      {info.inAppBrowser && (
        <View style={{ backgroundColor: C.badTint, borderRadius: 14, padding: 12 }}>
          <T v="bodyBold" style={{ color: '#8A1C16' }}>You are in an app&apos;s built-in browser.</T>
          <T v="small" style={{ color: C.ink }}>Speech usually does not work here. Open this page in Chrome: tap the menu (⋮) and choose &quot;Open in Chrome&quot; or &quot;Open in browser&quot;.</T>
        </View>
      )}
      {!info.supported && (
        <View style={{ backgroundColor: C.badTint, borderRadius: 14, padding: 12 }}>
          <T v="bodyBold" style={{ color: '#8A1C16' }}>This browser cannot read text aloud.</T>
          <T v="small" style={{ color: C.ink }}>Try Chrome, Edge, or Safari.</T>
        </View>
      )}

      <Card style={{ gap: 10 }}>
        <T v="h3">1. Can your phone play sound?</T>
        <T v="small">Turn your media volume up. Silent mode can also mute it.</T>
        <Button kind="secondary" title="Play a beep" icon="vol" onPress={() => testBeep(add)} />
      </Card>
      <Card style={{ gap: 10 }}>
        <T v="h3">2. Can it read text aloud?</T>
        <Button kind="secondary" title="Test the default voice" icon="vol" onPress={() => { testSpeech(undefined, add); setTimeout(refresh, 2000); }} />
        {info.mia ? <Button kind="secondary" title="Test Mia's voice" icon="vol" onPress={() => { testSpeech(info.mia, add); setTimeout(refresh, 2000); }} /> : null}
        {info.leo && info.leo !== info.mia ? <Button kind="secondary" title="Test Leo's voice" icon="vol" onPress={() => { testSpeech(info.leo, add); setTimeout(refresh, 2000); }} /> : null}
        <T v="small">If the beep works but no voice does, your phone may be missing an English voice. On Android, open Settings and search for &quot;Text-to-speech&quot;, choose Speech Services by Google, and install English (United States). Then close and reopen Chrome.</T>
      </Card>

      <Card style={{ gap: 6 }}>
        <T v="h3">Details for the SpeakUp! team</T>
        <T v="small">Speech supported: {info.supported ? 'yes' : 'no'} · In-app browser: {info.inAppBrowser ? 'yes' : 'no'}</T>
        <T v="small">Voices: {info.voices} total, {info.englishVoices.length} English</T>
        <T v="small">Mia: {info.mia ?? 'default'} · Leo: {info.leo ?? 'default'}</T>
        {info.broken.length ? <T v="small">Voices that failed: {info.broken.join(', ')}</T> : null}
        {info.englishVoices.length ? <T v="small">English voices: {info.englishVoices.slice(0, 8).join('; ')}{info.englishVoices.length > 8 ? '; …' : ''}</T> : null}
        <T v="small" style={{ fontSize: 11 }}>{info.browser}</T>
        {log.length ? (
          <View accessibilityLiveRegion="polite" style={{ marginTop: 6, gap: 2 }}>
            <T v="smallBold">Test log</T>
            {log.map((l, i) => <T key={i} v="small">{l}</T>)}
          </View>
        ) : null}
      </Card>
      <Button title="Close" onPress={onClose} />
    </Sheet>
  );
}
