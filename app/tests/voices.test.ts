import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickHostVoices, voiceGender, voiceScore, type VoiceInfo } from '../src/lib/voices';

const v = (name: string, language = 'en-US', identifier = name, quality = 'Default'): VoiceInfo => ({ name, language, identifier, quality });

test('Edge: picks the online Natural voices over older desktop voices', () => {
  const r = pickHostVoices([
    v('Microsoft David - English (United States)'),
    v('Microsoft Zira - English (United States)'),
    v('Microsoft Ava Online (Natural) - English (United States)'),
    v('Microsoft Andrew Online (Natural) - English (United States)'),
    v('Microsoft Sonia Online (Natural) - English (United Kingdom)', 'en-GB'),
  ]);
  assert.equal(r.Mia, 'Microsoft Ava Online (Natural) - English (United States)');
  assert.equal(r.Leo, 'Microsoft Andrew Online (Natural) - English (United States)');
  assert.equal(r.same, false);
});

test('Apple: prefers premium and enhanced voices and never picks novelty voices like Fred', () => {
  const r = pickHostVoices([
    v('Fred', 'en-US', 'com.apple.speech.synthesis.voice.Fred'),
    v('Rocko', 'en-US', 'com.apple.eloquence.en-US.Rocko'),
    v('Zarvox', 'en-US', 'com.apple.speech.synthesis.voice.Zarvox'),
    v('Samantha', 'en-US', 'com.apple.voice.compact.en-US.Samantha'),
    v('Ava', 'en-US', 'com.apple.voice.premium.en-US.Ava', 'Enhanced'),
    v('Evan', 'en-US', 'com.apple.voice.enhanced.en-US.Evan', 'Enhanced'),
    v('Daniel', 'en-GB', 'com.apple.voice.compact.en-GB.Daniel'),
  ]);
  assert.equal(r.Mia, 'com.apple.voice.premium.en-US.Ava');
  assert.equal(r.Leo, 'com.apple.voice.enhanced.en-US.Evan');
});

test('Apple with only default voices: still a real male voice for Leo, not Fred', () => {
  const r = pickHostVoices([
    v('Fred', 'en-US', 'com.apple.speech.synthesis.voice.Fred'),
    v('Samantha', 'en-US', 'com.apple.voice.compact.en-US.Samantha'),
    v('Daniel', 'en-GB', 'com.apple.voice.compact.en-GB.Daniel'),
  ]);
  assert.equal(r.Mia, 'com.apple.voice.compact.en-US.Samantha');
  assert.equal(r.Leo, 'com.apple.voice.compact.en-GB.Daniel');
});

test('Chrome: Google voices beat older system voices', () => {
  const r = pickHostVoices([
    v('Microsoft David - English (United States)'),
    v('Google US English'),
    v('Google UK English Female', 'en-GB'),
    v('Google UK English Male', 'en-GB'),
    v('Google español', 'es-ES'),
  ]);
  assert.equal(r.Mia, 'Google US English');
  assert.equal(r.Leo, 'Google UK English Male');
});

test('Android: maps voice codes to hosts and prefers voices that work offline', () => {
  const r = pickHostVoices([
    v('en-us-x-sfg-network', 'en-US'),
    v('en-us-x-sfg-local', 'en-US'),
    v('en-us-x-tpd-network', 'en-US'),
    v('en-us-x-tpd-local', 'en-US'),
    v('zh-tw-x-ctc-local', 'zh-TW'),
  ]);
  assert.equal(r.Mia, 'en-us-x-sfg-local');
  assert.equal(r.Leo, 'en-us-x-tpd-local');
});

test('Android voices named only by language: hosts get different voices and pitch', () => {
  const r = pickHostVoices([v('English United States', 'en_US'), v('English United Kingdom', 'en_GB')]);
  assert.equal(r.Mia, 'English United States');
  assert.equal(r.Leo, 'English United Kingdom');
  assert.equal(r.same, true);
});

test('one usable voice, or none: both hosts share it (the app then changes pitch)', () => {
  assert.deepEqual(pickHostVoices([v('Samantha')]), { Mia: 'Samantha', Leo: 'Samantha', same: true });
  assert.deepEqual(pickHostVoices([v('Fred'), v('Mei-Jia', 'zh-TW')]), { same: true });
  assert.deepEqual(pickHostVoices([]), { same: true });
});

test('gender and score helpers', () => {
  assert.equal(voiceGender(v('Google UK English Male')), 'm');
  assert.equal(voiceGender(v('Google UK English Female')), 'f');
  assert.equal(voiceGender(v('Google US English')), 'f');
  assert.equal(voiceGender(v('Microsoft Mystery Voice')), '?');
  assert.equal(voiceScore(v('Mei-Jia', 'zh-TW')), -1);
  assert.ok(voiceScore(v('Ava', 'en_US', 'com.apple.voice.premium.en-US.Ava')) > voiceScore(v('Samantha')));
});
