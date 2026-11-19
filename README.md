# SpeakUp!

An English practice app for learners in Taiwan. Each lesson has three parts:
**Vocabulary** (choose 10 words, then play 3 games), **Speaking** (say a sentence with
each word and get feedback), and **Listening** (a 5-minute podcast with a quiz).

* `app/`: the iOS, Android, and web app (Expo SDK 58, React Native, TypeScript)
* `server/`: the API that talks to Claude (speaking feedback, podcast episodes, word reports)
* `SPEC.md`: the product spec
* `prototype/index.html`: the original clickable prototype

The app works without the server ("offline mode"): speaking feedback is rule-based
and the podcast uses a template. Connect the server to get Claude's feedback and a
new podcast episode for every lesson.

## Run the app

You need Node.js 20 or later.

```bash
cd app
```

```bash
npm install
```

```bash
npx expo start
```

Then press `w` to open the web version, or scan the QR code with the **Expo Go** app
on your phone (phone and computer on the same Wi-Fi).

**Voice recording** needs a development build, because Expo Go does not include the
speech recognition module. In Expo Go and in Firefox, learners type their sentence
instead. Every other feature works in Expo Go. To build one for your phone (free Expo
account needed):

```bash
npx eas-cli@latest build --profile development --platform ios
```

Use `--platform android` for Android. The web version records voice in Chrome, Edge,
and Safari.

## Run the server

```bash
cd server
```

```bash
npm install
```

```bash
cp .env.example .env
```

Put your Claude API key in `.env` (`SPEAKUP_CLAUDE_KEY=...`; `ANTHROPIC_API_KEY` also works), then:

```bash
npm run dev
```

Point the app at it by creating `app/.env` with:

```
EXPO_PUBLIC_API_URL=http://YOUR-COMPUTER-IP:8787
```

Use your computer's local IP address (not `localhost`) when testing on a phone.
Restart `npx expo start` after changing `.env`.

### Server endpoints

* `POST /v1/feedback`: grammar and pronunciation feedback for one sentence
* `POST /v1/episode`: a podcast script and 5 quiz questions for 10 words
* `POST /v1/report`: stores a beta tester's word report
* `GET /admin/reports.csv`: reports grouped by word, most reported first
  (send `Authorization: Bearer YOUR_ADMIN_TOKEN`; opens in Excel or Google Sheets)

Each install is limited per day (150 feedback checks, 12 episodes, 100 reports) to
protect your API budget. Change `DEFAULT_LIMITS` in `server/src/app.ts`.

The model defaults to `claude-opus-5-5`. To compare cost and quality, set
`CLAUDE_MODEL=claude-haiku-5-5` in `.env` (see SPEC.md, section 15).

### Deploy the server

Any Node.js host works (for example Render, Railway, Fly.io, or a small VPS). Set the
environment variables from `.env.example` in the host's dashboard, and use
`npm start` as the start command. Reports are saved to a file, so give the host a
persistent disk, or move reports to a database before a large beta.

## Checks

```bash
cd app && npm run typecheck && npm run lint && npm test
```

```bash
cd server && npm run typecheck && npm test
```

## Release the beta

1. Create a free account at expo.dev, then run `npx eas-cli@latest init` in `app/`.
2. **iOS (TestFlight):** needs an Apple Developer account (US$99 a year).
   `npx eas-cli@latest build --platform ios`, then `npx eas-cli@latest submit --platform ios`.
   Add testers in App Store Connect under TestFlight.
3. **Android (closed testing):** needs a Google Play Console account (US$25, one time).
   `npx eas-cli@latest build --platform android`, then upload to a closed testing track.
4. **Web:** `npx expo export --platform web` creates `app/dist`, a static site you can
   host on Netlify, Vercel, Cloudflare Pages, or GitHub Pages.
5. Content fixes from reports: edit `app/src/data/wordlists.ts` and ship with
   `npx eas-cli@latest update` (no app store review needed).

## Change the app name

Edit `APP_NAME` and `APP_NAME_ZH` in `app/src/config.ts` and `"name"` in `app/app.json`.
