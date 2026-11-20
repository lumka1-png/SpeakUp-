import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ALL_WORDS, getPool, TOPIC_IDS, wordsOf } from '../src/data/words';
import { checkGrammar, readBackScore, soundTips, usesWord } from '../src/lib/analyze';
import { episodeSeconds, templateEpisode, templateQuiz } from '../src/lib/podcast';
import { lessonScore, matchScore, nextMastery, nextStreak, quickScore, speakItemScore, starsFor } from '../src/lib/scoring';
import { wordRe } from '../src/lib/util';

test('word data is complete and well formed', () => {
  assert.equal(TOPIC_IDS.length, 9);
  assert.equal(ALL_WORDS.length, 181 + 240);
  // Every list needs at least 10 words per level (two 5-word lessons), and levels are 0 to 3.
  for (const t of TOPIC_IDS) for (let l = 0; l < 4; l++) {
    const n = wordsOf(t).filter((w) => w.lvl === l).length;
    assert.ok(n >= 10, `${t} has only ${n} words at level ${l}`);
  }
  for (const w of ALL_WORDS) {
    assert.ok(w.w && w.zh && w.def && w.ex, `missing field in ${w.id}`);
    assert.ok(['n.', 'v.', 'adj.', 'adv.', 'phr.'].includes(w.pos), `bad part of speech for ${w.id}`);
    assert.ok(wordRe(w.w).test(w.ex), `example for "${w.w}" does not contain the word`);
  }
  const ids = ALL_WORDS.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate words across lists');
});

test('pool only offers unsaved words at the learner level', () => {
  const all = wordsOf('travel');
  const beginner = all.filter((w) => w.lvl === 0);
  const pool = getPool(0, 'travel', { [beginner[0].id]: true });
  assert.equal(pool.length, beginner.length - 1);
  assert.ok(pool.every((w) => w.lvl === 0), 'pool mixed in other levels');
  assert.ok(!pool.some((w) => w.id === beginner[0].id));
  assert.ok(getPool(3, 'travel', {}).every((w) => w.lvl === 3));
  // A few spot checks on the level fixes.
  const lvl = (w: string) => ALL_WORDS.find((x) => x.w === w)?.lvl;
  assert.equal(lvl('catch up'), 1);
  assert.equal(lvl('itinerary'), 2);
  assert.equal(lvl('purchase'), 1);
  assert.equal(lvl('invoice'), 2);
  assert.equal(lvl('passport'), 0);
});

test('grammar rules fix common learner errors', () => {
  const r = checkGrammar('she want go to the meeting with a apple', 'meeting')!;
  assert.equal(r.corrected, 'She wants to go to the meeting with an apple.');
  assert.ok(r.usedWord);
  assert.ok(r.grammarScore < 70);
  const clean = checkGrammar('The meeting starts at nine today.', 'meeting')!;
  assert.equal(clean.issues.length, 0);
  assert.equal(clean.grammarScore, 100);
  assert.equal(checkGrammar('   ', 'x'), null);
  assert.ok(!checkGrammar('I like coffee very much.', 'refund')!.usedWord);
});

test('word use detection allows inflections', () => {
  assert.ok(usesWord('We postponed the trip.', 'postpone'));
  assert.ok(usesWord('He is applying for a job.', 'apply'));
  assert.ok(!usesWord('We moved the trip.', 'postpone'));
});

test('read-back scoring compares word by word', () => {
  assert.equal(readBackScore('I need a refund.', 'i need a refund').score, 100);
  const r = readBackScore('Can I get a full refund?', 'can I get a full re fun');
  assert.ok(r.score < 100 && r.score > 50);
  assert.deepEqual(r.missed, ['refund']);
});

test('sound tips target Mandarin speaker difficulties', () => {
  assert.equal(soundTips('think')[0].key, 'TH');
  assert.ok(soundTips('negotiation').some((t) => t.key === '-tion'));
  assert.ok(soundTips('catch up').some((t) => t.key === 'Linking'));
});

test('scoring formulas', () => {
  assert.equal(lessonScore({ g1: 100, g2: 100, g3: 100, speak: 100, listen: 100 }), 100);
  assert.equal(lessonScore({ g1: 60, g2: 90, g3: 30, speak: 50, listen: 80 }), 63);
  // Skipped parts are left out, and the remaining weights are scaled up.
  assert.equal(lessonScore({ speak: 80 }), 80);
  assert.equal(lessonScore({ g1: 100, speak: 50 }), 79);
  assert.equal(lessonScore({}), 0);
  assert.deepEqual([starsFor(95), starsFor(75), starsFor(55), starsFor(30)], [3, 2, 1, 0]);
  assert.equal(matchScore(3), 70);
  assert.equal(matchScore(20), 0);
  assert.equal(quickScore(5, 5), 100);
  assert.equal(quickScore(2, 2), 40);
  assert.equal(quickScore(4, 8), 50);
  assert.equal(quickScore(12, 12), 100);
  assert.equal(quickScore(0, 0), 0);
  assert.equal(speakItemScore(80, null), 80);
  assert.equal(speakItemScore(80, 60), 72);
});

test('mastery and streaks', () => {
  assert.equal(nextMastery(1, { g1: true, g2Misses: 0, spoke: false }), 2);
  assert.equal(nextMastery(3, { g1: true, g2Misses: 0, spoke: true }), 3);
  assert.equal(nextMastery(1, { g1: false, g2Misses: 2, spoke: false }), 0);
  assert.equal(nextMastery(1, { g1: true, g2Misses: 1, spoke: false }), 1);
  // Skipped parts neither help nor hurt.
  assert.equal(nextMastery(2, {}), 2);
  assert.equal(nextMastery(1, { g1: true, spoke: true }), 2);
  assert.equal(nextMastery(1, { spoke: false }), 0);
  const now = new Date(2026, 10, 19, 10);
  assert.deepEqual(nextStreak(4, '2026-11-18', now), { streak: 5, lastDay: '2026-11-19' });
  assert.deepEqual(nextStreak(4, '2026-11-19', now), { streak: 4, lastDay: '2026-11-19' });
  assert.deepEqual(nextStreak(4, '2026-11-10', now), { streak: 1, lastDay: '2026-11-19' });
});

test('template podcast and quiz use every word', () => {
  const words = wordsOf('toeic').slice(0, 10);
  const ep = templateEpisode(words, 'toeic');
  const text = ep.lines.map((l) => l.t).join(' ');
  for (const w of words) assert.ok(wordRe(w.w).test(text), `${w.w} missing from podcast`);
  const mins = episodeSeconds(ep.lines, ep.lines.length, 1) / 60;
  assert.ok(mins > 0.8 && mins < 7, `episode length ${mins} minutes`);
  assert.ok(!/\b(means|vocabulary|the word|today's words)\b/i.test(text), 'the offline podcast should not teach the words');
  const quiz = templateQuiz(words);
  assert.equal(quiz.length, 5);
  for (const q of quiz) {
    assert.ok(q.options.includes(q.answer));
    assert.equal(new Set(q.options).size, q.options.length);
    if (q.quote) assert.ok(q.quote.includes('_____'));
  }
});
