# InsightPulse — Next.js + Supabase + Turnstile

Migrated from the original single-file `index.html` into a Next.js app with:

- **Authentication** — Google **or** email/password (Supabase Auth). Creators only; respondents never sign in.
- **Bot detection** — Cloudflare Turnstile, **login/signup page only**.
- **Shareable interview links** — unique `/i/<slug>` URLs with a respondent cap and an "end early" switch.
- **Respondent thank-you screen** — "Thanks for finishing this interview — [Company], powered by InsightPulse" + optional "Go to homepage".
- **Owner-only results** — per-link results are only visible to the logged-in creator who owns the link.
- **Cross-device sync** — creator workspace state moved from `localStorage` → Postgres, tied to the account.

> **Everything from the original app is preserved verbatim.** The original markup,
> CSS and JS are served from `public/legacy/` and run as-is; only `save()`,
> `callGemini()`, the final-submit step of `ivNext()`, and the bootstrap were
> extended (see "What changed" below).

---

## 1. What changed (and what didn't)

| Original feature | Status |
|---|---|
| Question builder (MC / Likert / Text, reorder, options) | ✅ untouched |
| AI assistant chat + app commands (Gemini) | ✅ untouched — calls now go through `/api/gemini` so the key isn't forced into client code |
| AI question generation & AI synthesis | ✅ untouched (same Gemini proxy) |
| Interview flow (progress, prev/next, end early, exit) | ✅ untouched for creator in-app sessions |
| Results view + session picker + aggregation + export JSON | ✅ untouched |
| Translation (MyMemory) + translation settings email | ✅ untouched — still per-browser by design (see §6) |
| Themes (7), sound effects, toasts, modals, landing page | ✅ untouched |

**Four surgical patches** to the original JS (in `public/legacy/app.js`):

1. `save()` — still writes `localStorage`, and **also** debounce-syncs the whole `State` to Postgres when signed in (skipped for respondents).
2. `callGemini()` — calls `/api/gemini` instead of hitting Google directly. Uses the user's own key from the Settings modal if set, else the server's `GEMINI_API_KEY` fallback.
3. `ivNext()` — when in **respondent mode**, the final "Submit ✓" sends answers to the public endpoint instead of writing local state, then shows the thank-you screen.
4. Bootstrap — after the original `load(); bind(); hydrate();`, it pulls the server-saved state and re-hydrates if found (cross-device sync).

Plus an **appended** module (`public/legacy/features.js`) with the share dialog,
respondent submit/thank-you/closed screens, and the auth-area UI — it touches
nothing above it.

---

## 2. File structure

```
project/
├── package.json
├── next.config.js
├── jsconfig.json
├── .gitignore                     # .env.local is gitignored
├── .env.example                   # copy to .env.local and fill in
├── supabase-schema.sql            # run ONCE in Supabase SQL editor
├── app/
│   ├── layout.js
│   ├── globals.css
│   ├── page.js                    # creator workspace ("/")
│   ├── login/page.js              # sign-in / sign-up + Turnstile
│   ├── auth/callback/route.js     # OAuth / email-confirm redirect
│   ├── i/[slug]/page.js           # public respondent page (no auth)
│   └── api/
│       ├── state/route.js                    # GET/PUT account state (auth)
│       ├── gemini/route.js                   # POST Gemini proxy
│       ├── shares/route.js                   # GET list / POST create (auth)
│       ├── shares/[id]/route.js              # PATCH end-early/reopen (owner)
│       ├── shares/[id]/responses/route.js    # GET results (owner only)
│       └── shares/slug/[slug]/
│           ├── route.js                      # GET public interview content
│           └── respond/route.js              # POST anonymous answer (capped)
├── components/
│   └── AppShell.js                # mounts legacy app + window.IPS bridge
├── lib/supabase/
│   ├── client.js                  # browser client (anon key)
│   └── server.js                  # service client + token verification
└── public/legacy/
    ├── app.css                    # original stylesheet (verbatim)
    ├── body.html                  # original markup (verbatim) + new screens
    ├── app.js                     # original JS + 4 patches + features module
    ├── app.orig.js                # pristine copy of the original <script>
    └── features.js                # the appended new-features module
```

---

## 3. Accounts to create (in order) & where each key goes

You need **three** accounts, all free tier is fine:

### A. Supabase — database + auth
1. Go to <https://supabase.com> → **Start your project** → sign in (GitHub is easiest).
2. **New organization** (any name) → **New project** → pick a name, set a **database password** (save it somewhere), pick a region near you → **Create project** (takes ~1 min).
3. **Copy your keys:** left sidebar → ⚙ **Project Settings** → **API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (click **Reveal**) → `SUPABASE_SERVICE_ROLE_KEY` ⚠ keep secret
4. **Create the tables:** left sidebar → **SQL Editor** → **New query** → paste the
   entire contents of `supabase-schema.sql` → **Run**. You should see "Success".

### B. Google sign-in (inside Supabase)
1. In Supabase: **Authentication** → **Sign In / Up** → **Auth Providers** → enable **Google**.
2. It shows a **Callback URL** like `https://<ref>.supabase.co/auth/v1/callback` — copy it.
3. Go to <https://console.cloud.google.com> → create a project → **APIs & Services** →
   **OAuth consent screen** → External → fill app name/email → Save.
4. **Credentials** → **Create Credentials** → **OAuth client ID** → type **Web application** →
   under **Authorized redirect URIs** paste the Supabase callback URL → **Create**.
5. Copy the **Client ID** and **Client Secret** back into the Supabase Google provider → **Save**.
6. In Supabase **Authentication → URL Configuration**: set **Site URL** to `http://localhost:3000`
   for local testing (change to your Vercel URL later) and add both
   `http://localhost:3000/auth/callback` and `https://<your-app>.vercel.app/auth/callback`
   to **Redirect URLs**.

### C. Cloudflare Turnstile — login bot detection
1. Go to <https://dash.cloudflare.com> → sign up → left sidebar **Turnstile** → **Add site**.
2. Site name anything; **Domain**: add `localhost` now (add your Vercel domain later);
   Widget mode **Managed** → **Create**.
3. Copy: **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, **Secret Key** → `TURNSTILE_SECRET_KEY`.
4. **Link it to Supabase** (required — Supabase verifies the token server-side):
   Supabase → **Authentication** → **Bot and Abuse Protection** → enable **Enable Captcha protection**,
   provider **Turnstile**, paste the **Secret Key** → Save.

### D. Gemini (optional fallback)
- <https://aistudio.google.com/app/apikey> → **Create API key** → `GEMINI_API_KEY`.
- Users can also paste their own key in the app's **⚙ Settings** modal (per-user, stored with their account).

---

## 4. `.env.local` — exact values

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` (Reveal) |
| `GEMINI_API_KEY` | Google AI Studio (optional fallback) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Turnstile → your site → Site Key |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → your site → Secret Key |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your Vercel URL in prod |

---

## 5. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You should see the original InsightPulse landing page,
now with a **🔐 Sign in** button in the top bar.

**What to test:**
1. Click **🔐 Sign in** → create an account with email (complete the Turnstile check) or use Google.
2. Back on the home page, the top bar now shows your name + **🔗 Share**.
3. Build a few questions (or use the seeded ones), enter a **company name**.
4. Click **🔗 Share** → set a title + **max respondents** → **Generate link** → copy it.
5. Open the link in an **incognito window** (no login!) → answer it → you should get the
   **thank-you screen** with your company name.
6. Back in your signed-in window: **🔗 Share → 📊 Results** shows the response.
7. In the share dialog, click **⏹ End** → reopen the link in incognito → it now shows
   **"This interview is closed."**
8. Sign in on a **second browser** — your questions/settings/results are all there
   (cross-device sync working).

---

## 6. What moved from localStorage → the database

| Data | Before | After |
|---|---|---|
| Questions, sessions, responses, results | `localStorage` (per browser) | Postgres `user_states.state`, per account |
| Company name, session title, participant count | `localStorage` | Postgres (per account) |
| Theme + sound on/off | `localStorage` | Postgres (per account) |
| Gemini API key + model | `localStorage` | Postgres (per account) |
| AI chat history | `localStorage` | Postgres (per account) |
| Interview language preference | `localStorage` | Postgres (per account) |
| **MyMemory translation email** | `localStorage` | **stays per-browser** — it's a per-device quota booster for a third-party free API, not account data |
| **Translation cache** | `localStorage` | **stays per-browser** — a local performance cache only |

`localStorage` is still written as an **offline cache**, but the database is the source
of truth once you're signed in: on load, server state wins and re-hydrates the app.

---

## 7. Deploy to Vercel

1. Push the `project/` folder to a GitHub repo:
   ```bash
   git init && git add . && git commit -m "InsightPulse v2"
   git remote add origin <your-repo-url> && git push -u origin main
   ```
2. <https://vercel.com> → **Add New… → Project** → import your repo → **Deploy**
   (defaults are fine — it auto-detects Next.js).
3. **Add the same env vars to Vercel** (this is separate from your local file):
   Project → **Settings → Environment Variables** → add every variable from
   `.env.local`, but set `NEXT_PUBLIC_SITE_URL=https://<your-app>.vercel.app`.
   Apply to **Production** (and **Preview**/**Development** if you like).
4. **Redeploy** so the new env vars take effect: **Deployments → ⋯ → Redeploy**.
5. Back in **Supabase → Authentication → URL Configuration**: set **Site URL** to
   your Vercel URL and make sure `https://<your-app>.vercel.app/auth/callback`
   is in **Redirect URLs**.
6. In **Cloudflare Turnstile → your site → Domains**: add `<your-app>.vercel.app`.

---

## 8. Common errors & fixes

| Symptom | Cause | Fix |
|---|---|---|
| `Your project's URL and API key are required` | Missing/wrong Supabase env vars | Recheck `.env.local` (local) or Vercel env vars (prod), then restart/redeploy |
| Google login loops or "redirect_uri_mismatch" | Redirect URL not whitelisted | Add `…/auth/callback` to **both** Google OAuth client *and* Supabase Redirect URLs |
| `captcha verification failed` / "invalid captcha" on login | Turnstile secret not in Supabase | Supabase → Auth → Bot and Abuse Protection → paste the **Secret Key** |
| Turnstile widget won't render | Domain not allowed | Add `localhost` / your Vercel domain in Cloudflare → Turnstile → site settings |
| Sign-in works but Share button says "sign in" | Env vars loaded at build time | Restart `npm run dev` / redeploy after adding `NEXT_PUBLIC_*` vars |
| "claim_response_slot" error | Schema not run | Run `supabase-schema.sql` in the SQL Editor |
| Answers submit but Results is empty | Checking the wrong place | Results for a link are under **🔗 Share → 📊 Results**, and also roll into the main Results tab |
| Interview link 404s | Wrong slug / deleted | Recopy the full link from the share dialog |
| Changes on laptop don't show on phone | Not signed in, or sync not finished | Sign in with the **same** account; sync saves ~0.8s after each change |

---

## 9. Security notes

- No secrets are hardcoded — everything comes from env vars. `.env.local` is gitignored.
- The `service_role` key is used **only** in server-side API routes, never shipped to the browser.
- All respondent data access goes through API routes that verify the caller and enforce
  ownership; Postgres Row Level Security is enabled on every table as a second layer.
- The respondent cap is enforced **atomically in the database** (`claim_response_slot`),
  so concurrent submissions can never exceed it.
