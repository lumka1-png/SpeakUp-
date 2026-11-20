# Put SpeakUp! online with Hostinger

SpeakUp! runs in the browser on phones and computers, with no app store and no developer
accounts. Learners open a link, and on a phone they can add it to the home screen, where it
opens full screen like an app.

Everything runs on your Hostinger Business Web Hosting plan, in two parts:

| Part | What it is | Address |
|---|---|---|
| 1. The server | Claude feedback, new podcasts, natural voices | `api.takeacourse.online` |
| 2. The app | The website files learners open | `app.takeacourse.online` |

Do part 1 first, because the app needs the server's address. The addresses above are
suggestions; any subdomains work.

**Running costs:** nothing extra for hosting (it is part of your plan), plus your Claude and
OpenAI usage.

Menu names below are from Hostinger's hPanel and may change a little over time.

---

## Part 1: The server (Node.js web app)

### Before you start

1. **Merge the latest work into `main`** on GitHub, so Hostinger uses it.
2. **Choose a folder for saved data** outside the app, so podcast audio and testers' word
   reports survive updates. In hPanel's **File Manager**, your home folder is shown at the top,
   for example `/home/u123456789`. Your data folder will be
   `/home/u123456789/speakup-data` (use your own number). You don't need to create it; the
   server does.

### Create the app

1. In hPanel, go to **Websites** > **Add Website** > **Node.js web app**.
2. Choose **GitHub**, install the Hostinger GitHub App when asked, and give it access to the
   `SpeakUp-` repository. Choose the `main` branch.
3. Build settings:
   * **Root directory:** `server`
   * **Node version:** 20 or 22
   * **Build script:** `build`
   * **Entry file:** `dist/server.js` (if it asks; the start command is `node dist/server.js`)
4. **Environment variables:** add these.

   | Name | Value |
   |---|---|
   | `SPEAKUP_CLAUDE_KEY` | Your Claude API key |
   | `SPEAKUP_OPENAI_KEY` | Your OpenAI API key (natural podcast voices) |
   | `ALLOWED_ORIGINS` | `https://app.takeacourse.online` (exactly, no slash at the end) |
   | `ADMIN_TOKEN` | A long random password you make up, for downloading word reports |
   | `CLAUDE_MODEL` | `claude-haiku-5-5` |
   | `AUDIO_DIR` | `/home/u123456789/speakup-data/audio` (your number) |
   | `REPORTS_FILE` | `/home/u123456789/speakup-data/reports.jsonl` (your number) |

5. **Domain:** start with the temporary domain Hostinger offers, or connect
   `api.takeacourse.online` right away.
6. Deploy. When it finishes, open the address with `/health` at the end, for example
   `https://api.takeacourse.online/health`. It should show `{"ok":true}`.

If the deploy fails or the data folder cannot be written, ask Hostinger's AI: "My Node.js web
app needs to save files in /home/u123456789/speakup-data. Is that allowed, or which folder should
I use so files are kept between deploys?" Then put that folder in `AUDIO_DIR` and
`REPORTS_FILE`.

**Updates:** after changes are merged into `main`, redeploy from the app's page in hPanel (or
turn on automatic deploys if Hostinger offers it).

**Word reports from testers:** `https://api.takeacourse.online/admin/reports.csv`, sent with the
header `Authorization: Bearer YOUR_ADMIN_TOKEN`. Ask Claude for a one-line command to download
it.

---

## Part 2: The app (website files)

### Get the files

Send Claude the server address from part 1, and you get a ZIP file built for it.

To build it yourself instead (Node.js 20 or later): in the `app` folder, create a file named
`.env.production` with the line `EXPO_PUBLIC_API_URL=https://api.takeacourse.online`, then run:

```bash
npm install
```

```bash
npm run build:web
```

Zip the **contents** of `app/dist` (not the folder itself), including the hidden `.htaccess`
file.

### Upload

1. **Create the subdomain:** hPanel > **Domains** > **Subdomains** > create
   `app.takeacourse.online`. Note the folder Hostinger gives it (for example
   `public_html/app`).
2. **HTTPS:** hPanel > **Security** > **SSL**, and make sure the subdomain has a certificate
   (Hostinger usually adds a free one automatically). The microphone only works on `https://`.
3. **Upload:** **File Manager** > open the subdomain's folder > upload the ZIP > right-click >
   **Extract**. Check that `index.html` and `.htaccess` sit directly in that folder, not inside
   another folder.
4. Open `https://app.takeacourse.online`. You should see the SpeakUp! welcome screen.

### Check that it works

* Choose a level and start a lesson.
* On the Speaking step, type a sentence. The feedback should end with "Feedback by Claude."
* On the Listening step, the footer should say "Natural voices by OpenAI."

If it says "Offline feedback" or "Read by your device", the app cannot reach the server: check
that the server's `/health` page works and that `ALLOWED_ORIGINS` is exactly
`https://app.takeacourse.online`.

### Add it to a phone's home screen

* **Android (Chrome):** menu (⋮) > **Add to Home screen** or **Install app**.
* **iPhone (Safari):** Share button > **Add to Home Screen**.

**Updates:** upload the new files over the old ones. Learners get the new version the next time
they open the app.

---

## Good to know

* Progress is saved in each learner's browser. Clearing browser data, or using another device
  or browser, starts fresh.
* Voice recording works in Chrome, Edge, and Safari. In Firefox, learners type instead.
* Inside some apps' built-in browsers (for example, a link opened inside a chat app), speech may
  not work. The podcast screen's **Sound check** explains how to open the page in Chrome.
