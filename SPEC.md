# SpeakUp! Product Spec (v0.3)

**Tagline:** Learn it. Say it. Hear it. (學單字・開口說・用耳聽)
**Platforms:** iOS, Android, and web from one codebase
**Audience:** Adult ESL learners in Taiwan who read Traditional Chinese, many preparing for the TOEIC
**Launch plan:** free beta in Taiwan, then Hong Kong, mainland China, and other markets
**Status:** Clickable prototype done. Expo app and API server started (see README.md); this spec covers the beta build

**Decisions made (v0.2):**
1. Name: **SpeakUp!**
2. Market: Taiwan first as a beta; expand to Hong Kong, mainland China, and others later
3. Content review: beta users report problems in the app
4. Business model: free during beta testing

## 1. Name: SpeakUp!

"SpeakUp!" is short, upbeat, and says what the app does. Like Speakeasy, it is used by other English-learning apps on the App Store, including "Speak-Up: AI English Learning," "SpeakUp AI-Learn English," and "Speak-Up App."

**Recommendations:**

* **Pair it with a Chinese name** on the store listing and app icon label, for example **SpeakUp! 開口說英文**. This makes the app easier to tell apart from the others and much easier to find for learners searching in Chinese.
* The beta runs through TestFlight and Google Play closed testing, where name conflicts matter less. **Before the public launch**, have a trademark attorney check Taiwan (TIPO) and any other launch markets, Classes 9 and 41.
* Register the domain and social handles early (for example speakup-app or speakuptw variants), once the checks pass.

## 2. Goals

* Help learners **actively use** new words, not just recognize them, through one repeatable 15 to 20 minute lesson.
* Make every lesson feel finished: a clear score, a short bilingual affirmation, and a visible streak.
* Keep running costs predictable: one AI provider (Claude), with on-device speech recognition and text-to-speech.

**Beta success metrics:** lesson completion rate above 60%, Day 7 retention above 25%, at least 8 of 10 speaking sentences attempted per lesson, and fewer than 2% of words reported as wrong by the end of the beta.

## 3. The lesson loop

1. **Set up:** choose a level and a topic from dropdowns (or Random).
2. **Vocabulary:** choose 10 words. They move from the list into **My Words**. Then play 3 games:
   * Game 1: Traditional Chinese meaning (multiple choice)
   * Game 2: Match the meaning (tap to pair, 2 rounds of 5)
   * Game 3: Quick Think (45-second true or false sprint with combos)
3. **Speaking:** record one short sentence per word. Get grammar and pronunciation feedback.
4. **Listening:** a roughly 5-minute two-host podcast that uses all 10 words, then a 5-question quiz.
5. **Results:** overall score, stars, XP, streak, a bilingual affirmation, then **Next lesson**.

At any point, a learner can tap **Report** on a word to flag a problem (see section 6).

## 4. Levels and placement

Four levels, mapped to CEFR and approximate TOEIC Listening and Reading totals:

* **Beginner:** CEFR A1 to A2, TOEIC below 550
* **Intermediate:** CEFR B1, TOEIC 550 to 780
* **Advanced:** CEFR B2, TOEIC 785 to 940
* **Expert:** CEFR C1 and above, TOEIC 945 and up

The beta uses self-selection from a dropdown (shown at first launch and editable in Profile). A later version adds an optional 3-minute placement quiz and an automatic suggestion to move up when a learner scores 90% or higher in 5 lessons in a row.

## 5. Content

### 5.1 Lists

* **TOEIC Essentials:** 4 lists, one per level.
* **Themed lists (28):** Business, Conversation, Office, Finance, Shopping, Travel, Movies, Music, plus Health & Medicine, Food & Dining, Technology, Marketing, Human Resources, Customer Service, Real Estate & Housing, Transportation, Sports & Fitness, Education, Environment, Law & Contracts, Manufacturing, Hospitality, News & Media, Social Media, Job Interviews, Emotions & Personality, Daily Routines, and Science.
* Every themed list has words at all 4 levels, so the level dropdown filters every topic.

**Beta content:** TOEIC at all 4 levels (150 words per level) plus the first 8 themes (20 words per level each), about 1,240 words. That gives roughly 15 lessons per list, which is plenty for an 8-week beta.
**Public launch target:** 300 TOEIC words per level and 40 words per level per theme (about 5,700 words total).

### 5.2 Word record

`id, word, partOfSpeech, level, topics[], definition (simple English, under 15 words), example sentence (uses the exact word form), IPA, syllable stress, translations: { zhTW, zhHK, zhCN }, reviewStatus, reportCount`

Storing translations by locale from day one makes the later Hong Kong and mainland China launches a content task, not a rebuild. The beta fills only `zhTW`.

### 5.3 Content pipeline

1. **Seed the word lists** from frequency research. The TOEIC Service List (TSL) and New General Service List (NGSL) are published under Creative Commons licenses (confirm the license terms before use). Themed seeds come from editorial selection.
2. **Draft with Claude** (definitions, examples, and Taiwan-usage Traditional Chinese) in batches, using the Message Batches API at 50% of the normal cost. The prompt asks for Taiwan wording specifically (for example 影印, 資料夾, 網路, 軟體, rather than mainland terms).
3. **Automatic checks:** every example contains the word, definitions stay under 15 words, no duplicate words across lists, and translations contain no Simplified characters.
4. **Beta-user review** (section 6). Testers flag problems in the app, and fixes ship without an app update.
5. **One recommendation:** beta testers are learners, so some will report correct translations as wrong, and some real errors will go unreported. Before the beta opens, have one native Taiwanese speaker with strong English spot-check a sample (about 10%, or 2 hours of work). First impressions of content quality strongly affect whether testers stay.

## 6. Beta content review: Report a problem

**In the app (built in the prototype):**

* A **Report** (flag) button appears after each Game 1 answer, on each Speaking word card, and on every word in My Words.
* A bottom sheet asks what is wrong, in English and Chinese: the Chinese translation, the definition, the example sentence, the pronunciation, or something else. An optional note lets the tester suggest a fix (for example "should be 收據, not 發票").
* After sending, the tester sees a thank-you message, and Profile shows how many reports they have sent.

**Behind the scenes (beta build):**

* Reports go to `POST /v1/report` with the word ID, reason, note, lesson step, app version, and the anonymous install ID.
* A simple dashboard (a spreadsheet or a lightweight admin page is enough for the beta) lists words by report count.
* **Triage rule:** review any word with a suggested fix, or with 3 or more reports. Claude can draft a proposed correction for each flagged word, and a person approves it.
* Approved fixes go into a new content version, which the app downloads at launch (no app store update needed).
* **Thank testers:** a "Word Detective" badge after a tester's first accepted report, and a short thank-you in the release notes. This keeps people reporting.

## 7. Word selection rules

* A learner must choose exactly 10 words (fewer only when a list has fewer than 10 left; the minimum is 4).
* Chosen words disappear from every list (they are matched by the word itself, across topics) and appear in **My Words**.
* **Auto-pick** fills the remaining slots. **Show Chinese** reveals translations to help learners find new words.
* Words closest to the learner's level appear first. Nearby levels follow, tagged with a level badge.
* In My Words, learners can **return a word to its list**, filter by Learning and Mastered, search, hear the word, report it, and start a **Practice my words** lesson. That lesson uses the 10 words with the lowest mastery and skips selection.
* **Random topic** picks from the available lists at the start of the lesson.

## 8. Vocabulary games

* **Game 1, Chinese meaning:** the English word plus 3 distractors taken from words with the same part of speech. After each answer, show the correct pair and the example sentence. Score = percentage correct.
* **Game 2, Match the meaning:** 2 rounds of 5 pairs. A wrong pair shakes and counts as a mistake. Score = 100 minus 10 per mistake (minimum 0).
* **Game 3, Quick Think:** 45 seconds. A word appears with either an English definition or a Chinese meaning, and the learner answers Yes or No. Combos add bonus points. Score = accuracy, scaled down when the learner answers fewer than 10 items, so speed matters a little.

Each game feeds per-word mastery data (see section 11).

## 9. Speaking (Claude only)

### 9.1 The constraint

Claude reads text and images, not audio. So the device turns speech into text, and Claude evaluates the transcript. This makes grammar feedback excellent. Pronunciation feedback is about **intelligibility** (did the recognizer understand you?), not detailed accent scoring.

### 9.2 Flow per word

1. **Say it.** The learner records a free sentence using the word. On-device speech recognition returns a transcript, alternatives, and per-word confidence where the platform provides it.
2. **Claude feedback** (one call): grammar issues, a corrected sentence, a more natural version at the learner's level, whether the word was used correctly, likely mispronunciations (inferred from low-confidence words and odd substitutions, such as "sink" for "think"), and one short tip in Traditional Chinese.
3. **Read it back** (optional but recommended): the learner reads the corrected sentence aloud. Because the target text is now known, the app compares the transcript to it word by word and gives a reliable pronunciation score for that sentence. This needs no AI call.
4. Learners can tap any sentence to hear a model reading.

### 9.3 Speech technology

* **iOS:** Apple's Speech framework (SFSpeechRecognizer), on-device where supported. It returns per-segment confidence.
* **Android:** SpeechRecognizer. Confidence data varies by device.
* **Web:** the Web Speech API (Chrome, Edge, Safari). Firefox users type their sentence.
* In Expo, use a maintained speech recognition module (for example `expo-speech-recognition`) inside a development build.
* **Privacy advantage:** audio never leaves the device. Only text goes to the server.

### 9.4 Claude request design

* **Model:** `claude-opus-5-5` (the default). Set effort to `low` for speaking feedback, since speed matters more than depth here.
* **Structured output** (`output_config.format` with a JSON schema) so the app always gets fields it can render:
  `{ usedTargetWordCorrectly, grammarScore, issues: [{ type, explanation, explanationZh }], correctedSentence, naturalVersion, suspectedMispronunciations: [{ heard, intended, tip, tipZh }], encouragement }`
* **System prompt:** a stable prompt (learner level, first language Mandarin, Taiwan usage for Chinese, kind tone, under 60 words of feedback, never shame) placed first so prompt caching can apply. Per-request details (word, transcript, confidence) go last.
* **Safety:** treat the learner's sentence as data, not instructions. Handle the `refusal` stop reason, and enable the server-side `fallbacks` option.

## 10. Listening

### 10.1 Podcast

* **Claude writes the script** in one call per lesson: two hosts (Mia and Leo), 650 to 750 words, roughly 5 minutes at learner speed. Every chosen word appears at least twice. The script stays at the learner's CEFR level and on the lesson's topic. Settings and names can feel familiar to Taiwanese learners (Taipei, night markets, the MRT) without becoming stereotyped. It returns JSON: `{ title, lines: [{ speaker, text }], quiz: [...] }`.
* **Audio:** with "Claude only," audio uses on-device text-to-speech (Expo Speech on mobile, the Web Speech API on web), with two different voices. This is free and works offline, but voice quality varies by device. A cloud neural voice service would greatly improve the "podcast" feel. That would be a second vendor, so it is listed in the roadmap.
* **Player:** play and pause, previous and next line, speeds of 0.8x, 1x, and 1.2x, transcript off by default, and "Words to catch" chips that light up when each word is heard.
* Generate the script while the learner is in the speaking step, so there is no wait.

### 10.2 Quiz

Five questions generated with the script: comprehension questions ("Why did Leo cancel the meeting?") plus at least 2 vocabulary-in-context questions. The prototype uses template questions (fill in the blank and definition match) as a stand-in.

## 11. Scoring, rewards, and review

* **Lesson score** = Vocabulary 40% (average of the 3 games) + Speaking 30% + Listening 30%.
* **Speaking item score** = 60% grammar + 40% pronunciation when recorded, or grammar only when typed. A skipped word scores 0.
* **Stars:** 3 at 90% or higher, 2 at 70%, 1 at 50%.
* **XP** = lesson score + 5 per word. **Streak** = consecutive days with at least one completed lesson.
* **Affirmations:** short, specific, and bilingual (English plus Traditional Chinese), chosen by score band. They never shame a learner for a low score.
* **Mastery (0 to 3 per word):** a word earns up to 3 points per lesson (Game 1 correct, no mistakes in Game 2, used well in speaking). Earning 2 or more adds 1 mastery; earning 0 removes 1. At 3, a word is **Mastered**.
* **Spaced review (after the beta):** schedule review lessons at 1, 3, 7, and 21 days, with a daily reminder notification.

## 12. Screens

1. Welcome and level choice, with a "free beta" note (first launch only)
2. **Learn** tab (home): level and topic dropdowns, topic preview, Start lesson, "How a lesson works," recent lessons
3. Lesson flow: Pick words, Game 1, Game 2, Game 3, a short summary screen between steps, Speaking ×10, Podcast, Quiz, Results
4. **My Words** tab: Practice card, filter, search, and the word list
5. **Profile** tab: stats, level, history, beta report count, reset
6. Bottom sheets: Leave lesson, Report a problem

A **BETA** label sits next to the logo during the beta.

## 13. Visual design

* **Personality:** warm, playful, and confident, never childish. Chunky "pressable" buttons, rounded cards, and short celebrations.
* **Colors:** Ink #1E2140 (text), Cream #FFF9F2 (background), Coral #D24A22 (primary actions), Teal #0E7C74 (progress and success), Sun #FFC94A (stars and highlights), plus a light tint of each. All text meets WCAG AA contrast (4.5:1).
* **Type:** Fredoka (headings), Nunito (body), Noto Sans TC (Chinese).
* **Motion:** a quick press-down on buttons, a shake on a wrong match, confetti for 1 star or more. Every animation is turned off when the device's reduced-motion setting is on.
* **Accessibility:** touch targets of 44 points or more, screen reader labels on every icon button, transcripts for all audio, and no meaning carried by color alone (icons and text accompany every green or red state).

## 14. Technical architecture

* **App:** Expo (React Native with React Native Web) in TypeScript, Expo Router for navigation, and Zustand for state. Storage is MMKV on mobile and IndexedDB on web.
* **Offline first:** word lists ship inside the app, and all progress lives on the device (no account in the beta). Speaking feedback and new podcasts need a connection; Games 1 to 3 work offline.
* **Content updates:** the app checks for a new content version at launch and downloads corrected word data, so report fixes reach testers within a day.
* **Backend:** a small serverless proxy (for example Cloudflare Workers or Vercel Functions) in TypeScript using the official Anthropic SDK (`@anthropic-ai/sdk`). It holds the API key, which never ships in the app.
  * `POST /v1/feedback` takes a word, transcript, confidence, and level, and returns feedback JSON.
  * `POST /v1/episode` takes 10 words, a topic, and a level, and returns the script and quiz JSON.
  * `POST /v1/report` stores a word report.
  * `GET /v1/content` returns the latest content version.
  * Each install gets an anonymous ID. Add per-device rate limits (for example 10 lessons a day in the beta) and App Attest or Play Integrity checks to stop abuse.
* **Permissions:** iOS needs NSMicrophoneUsageDescription and NSSpeechRecognitionUsageDescription strings (written in English and Traditional Chinese). Android needs RECORD_AUDIO.
* **Localization:** the app interface supports locales from the start (`zh-TW` now; `zh-HK` and `zh-CN` later), even though the beta interface is mostly English with Chinese help text.

## 15. Free beta plan (Taiwan)

**Distribution:**

* **iOS:** TestFlight external testing (up to 10,000 testers; the first build needs Apple's Beta App Review, usually 1 to 2 days).
* **Android:** Google Play closed testing track.
* **Web:** a private beta link for testers on laptops.

**Size and length:** 100 to 200 testers for 8 weeks, in two waves (a small first wave of about 30 to catch serious bugs, then the rest).

**Recruiting in Taiwan:** university English departments and language centers, TOEIC cram schools (補習班), company HR and training teams, LINE groups, Dcard and PTT language boards, and Threads or Instagram. A simple sign-up form asks for level, TOEIC score (if any), phone type, and goals.

**Feedback channels:**

* In-app word reports (section 6)
* A one-question survey after every 5th lesson ("How likely are you to recommend SpeakUp! to a friend?")
* A LINE Official Account for the beta community, which is how most Taiwanese users expect to contact a service
* 5 to 8 short video interviews with testers in weeks 2 and 6

**Free means free:** no payments, ads, or paywalls in the beta. Tell testers clearly that the beta is free and that a paid plan may come later, so there are no surprises.

**Beta AI budget (estimate):** 150 testers × 4 lessons a week × 8 weeks = 4,800 lessons. At about $0.25 per lesson on Claude Opus 5.5, that is roughly **$1,200** for the whole beta (about $30 on Claude Haiku 5.5). Set a monthly spending limit in the Claude Console.

## 16. Expansion: Hong Kong, mainland China, and beyond

Store translations by locale now (section 5.2), and plan each market as its own launch.

**Hong Kong (next):**

* Add `zhHK` translations (Hong Kong wording differs from Taiwan wording) and a Hong Kong reviewer.
* Most learners speak Cantonese, so pronunciation tips need a Cantonese version (common issues differ from Mandarin speakers').
* **Check AI availability first:** confirm that Anthropic's API terms and supported-regions list allow serving users in Hong Kong before launching there.

**Mainland China (the hardest market):**

* **App stores:** Apple requires an ICP filing number for apps in the China App Store. Google Play is unavailable, so Android needs local stores (Huawei, Xiaomi, OPPO, vivo, Tencent).
* **AI rules:** public generative AI services in mainland China must be filed with the Cyberspace Administration of China (CAC). Foreign AI providers, including Anthropic, generally do not serve the mainland. **A China version would likely need a different, locally approved AI provider**, which conflicts with the "Claude only" decision. That is a strategic decision for later.
* **Data:** China's Personal Information Protection Law (PIPL) usually requires keeping user data in China.
* **Speech:** Google-based speech recognition (used by Chrome) is blocked, so web speaking features would not work. Native iOS and Android speech recognition would need testing.
* **Content:** Simplified Chinese translations (`zhCN`) with mainland wording.
* **Recommendation:** treat mainland China as a separate project with a local partner, after Taiwan and Hong Kong are working well.

**Other markets** (for example Japan, Korea, Vietnam, Thailand, and Latin America): each needs a new translation language and pronunciation tips for that language's speakers. The lesson design works unchanged.

## 17. Privacy and safety

* Audio stays on the device. Transcripts are sent to the backend, which does not store them by default (or keeps them only with consent, to improve quality).
* No accounts, names, or emails are needed to use the beta. The beta sign-up form collects contact details separately, with consent, only to invite and update testers.
* Write a short privacy policy in English and Traditional Chinese that covers Taiwan's Personal Data Protection Act (PDPA). Rate the app for adults and teens; if children under 13 might use it in the US later, COPPA applies.
* Claude's feedback prompt instructs a kind tone and handles offensive learner input gracefully.

## 18. Roadmap

* **Phase 0 (done):** clickable web prototype with the full loop, 240 words, and beta word reporting.
* **Phase 1, beta build (about 8 to 10 weeks):** Expo app on iOS, Android, and web; about 1,240 words; Claude feedback and episode endpoints; on-device speech; report pipeline and content updates; local progress.
* **Phase 2, Taiwan beta (8 weeks):** two waves of testers, weekly content fixes, weekly app updates.
* **Phase 3, Taiwan public launch:** all 28 themes, spaced review and reminders, placement quiz, optional accounts with cloud sync, natural-sounding podcast voices, final name and trademark cleared, pricing decided from beta data.
* **Phase 4, expansion:** Hong Kong, then other markets, then a separate plan for mainland China.

## 19. Open questions

1. **Final name:** SpeakUp! or i12Speak (under discussion), plus a Chinese name such as 開口說英文.
2. **Pre-beta spot check:** confirmed. A native Taiwanese reviewer will check a sample before the beta (section 5.3).
3. **Model choice:** Opus 5.5 quality or Haiku 5.5 cost? The beta is the ideal time to compare both on real learner sentences.
4. **Natural voices:** is a second vendor for podcast voices acceptable after the beta?
5. **Build:** started with Claude in this project (Expo app in `app/`, API server in `server/`).

## Appendix: What the prototype simulates

* Speaking feedback uses simple grammar rules (capitalization, punctuation, a/an, third-person -s, "want to," am/is/are, repeated words) and fixed pronunciation tips for Mandarin speakers (th, v and w, r and l, final consonants, -tion). The real app uses Claude.
* The podcast is built from templates and read by browser voices. The real app has Claude write a new episode for each lesson.
* Word reports are saved in the browser. In the beta they go to the team's backend.
* The hosted preview blocks the microphone, so typing is offered. Opening the HTML file directly in Chrome or Safari enables recording.
* Progress is saved in browser storage.
