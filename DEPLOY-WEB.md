# Put SpeakUp! online as a web app

SpeakUp! runs in the browser on phones and computers, with no app store and no developer
accounts. Learners open a link, and on a phone they can add it to the home screen, where it
opens full screen like an app.

There are two parts:

1. **The server** (Claude feedback, new podcasts, natural voices) runs on Render.
2. **The app** (a folder of website files) goes on your own website, at a subdomain such as
   `app.yourwebsite.com`.

Do part 1 first, because the app needs the server's address.

**Running costs:** about US$7 to $8 a month for Render (Starter plan plus a 1 GB disk), plus
your Claude and OpenAI usage. Check Render's pricing page for current prices.

---

## Part 1: The server on Render

1. **Merge the latest work into `main`** on GitHub, so Render uses it.
2. Create a free account at [render.com](https://render.com) and connect your GitHub account.
3. In Render, choose **New > Blueprint**, then pick the `SpeakUp-` repository. Render reads the
   `render.yaml` file and sets everything up.
4. Render asks for three values:
   * `SPEAKUP_CLAUDE_KEY`: your Claude API key.
   * `SPEAKUP_OPENAI_KEY`: your OpenAI API key (for natural podcast voices).
   * `ALLOWED_ORIGINS`: your app's address, for example `https://app.yourwebsite.com`
     (exactly, with `https://` and no slash at the end).
5. Choose **Apply**. The first deploy takes a few minutes.
6. Copy the server's address from the top of the service page, for example
   `https://speakup-api.onrender.com`. Open it with `/health` at the end; it should show
   `{"ok":true}`.

Render redeploys the server by itself whenever `main` changes.

**Word reports from testers:** open `https://YOUR-SERVER/admin/reports.csv` with the
`ADMIN_TOKEN` that Render created (in the service's **Environment** tab). Ask Claude for a
one-line command to download it, or use a browser extension that adds an
`Authorization: Bearer YOUR_ADMIN_TOKEN` header.

---

## Part 2: The app on your website

### Build the app files

Either ask Claude to build them with your server's address (you get a ZIP file), or build them
yourself with Node.js 20 or later:

1. In the `app` folder, create a file named `.env.production` containing one line:
   ```
   EXPO_PUBLIC_API_URL=https://speakup-api.onrender.com
   ```
2. Run:
   ```bash
   npm install
   ```
   ```bash
   npm run build:web
   ```
3. The files are now in `app/dist`. Zip the **contents** of that folder (not the folder
   itself). It includes a hidden file named `.htaccess`, which must be included.

### Upload to your hosting (cPanel)

The names below are from cPanel; other hosting panels have the same steps under similar names.

1. **Create the subdomain:** **Domains** > **Create A New Domain**, enter
   `app.yourwebsite.com`, and give it its own folder (for example `public_html/app`), not the
   main site's folder.
2. **Turn on HTTPS:** **SSL/TLS Status** > **Run AutoSSL** (it can take a few minutes). The
   microphone only works on `https://` sites.
3. **Upload:** **File Manager** > open the subdomain's folder > **Upload** the ZIP > select it >
   **Extract**. Then turn on **Settings** > **Show Hidden Files** and check that `index.html`
   and `.htaccess` are directly in that folder, not inside another folder.
4. Open `https://app.yourwebsite.com`. You should see the SpeakUp! welcome screen.

### Check that it works

* Choose a level and start a lesson.
* On the Speaking step, type a sentence. The feedback should end with "Feedback by Claude."
* On the Listening step, the footer should say "Natural voices by OpenAI."

If it says "Offline feedback" or "Read by your device", the app cannot reach the server: check
the address in `.env.production` and `ALLOWED_ORIGINS` on Render.

### Add it to a phone's home screen

* **Android (Chrome):** menu (⋮) > **Add to Home screen** or **Install app**.
* **iPhone (Safari):** Share button > **Add to Home Screen**.

---

## Updating

* **Server:** merge changes into `main`; Render redeploys.
* **App:** build again and upload the new files over the old ones. Learners get the new version
  the next time they open the app.

## Good to know

* Progress is saved in each learner's browser. Clearing browser data, or using another device
  or browser, starts fresh.
* Voice recording works in Chrome, Edge, and Safari. In Firefox, learners type instead.
* Inside some apps' built-in browsers (for example, a link opened inside a chat app), speech may
  not work. The podcast screen's **Sound check** explains how to open the page in Chrome.
