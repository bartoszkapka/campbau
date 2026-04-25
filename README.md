# Camp Bau

Mały, prywatny festiwal — aplikacja webowa.

Built with **Vite + React + Tailwind**, deployed on **Vercel** with **Vercel KV** for shared persistence.

---

## Features

- Login-only access (no public registration — admin creates accounts)
- Default admin: `bau` / `kambau` (auto-created on first launch)
- Pages: Start (homepage with sun/moon widgets), Wydarzenia, Stacje kosmiczne, Cnoty kosmiczne, O Festiwalu, Miejsce, Profil, Goście, Admin
- Light & dark mode with animated holographic background
- Sun event timeline + moon phase widget on the homepage (computed locally, no API)
- Mobile-friendly with horizontal-scrolling event tiles

---

## Quick start (local dev)

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. Uses **localStorage** as the storage backend, so no database setup is needed for local development. Each browser stores its own copy of the data.

To test against the production KV store from your local machine:

```bash
vercel link
vercel env pull
VITE_FORCE_API=1 npm run dev
```

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
gh repo create camp-bau --private --source=. --push
```

### 2. Import in Vercel

- Go to [vercel.com/new](https://vercel.com/new)
- Import the repo (Vercel auto-detects Vite)
- Click **Deploy**

The first deploy will succeed but the storage API will fail until you add KV.

### 3. Set up Upstash Redis (free tier)

Vercel KV was sunset in late 2024. New projects should use the Upstash Redis integration.

In the Vercel project dashboard:

- **Storage** → **Marketplace** → **Upstash** → **Install**
- (or visit [vercel.com/marketplace/upstash](https://vercel.com/marketplace/upstash))
- Choose **Redis**
- Pick a region close to your users (e.g. `eu-west-1` for Europe)
- Connect it to your project — Vercel auto-injects:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `KV_REST_API_URL` (legacy alias, also auto-injected)
  - `KV_REST_API_TOKEN` (legacy alias, also auto-injected)

The API supports both naming conventions, so it works regardless of which integration version Vercel installs.

### 4. Redeploy

Either push a new commit or click **Redeploy** in the Vercel dashboard. The app will:
- Auto-create the admin user `bau` / `kambau` on first storage write
- Seed demo data (sample users, events, stacje, cnoty, etc.)

### 5. Log in

Visit your deployment, sign in with `bau` / `kambau`, then go to **Admin** to create real users.

---

## Architecture

### Storage abstraction (`src/storage.js`)

Identical API surface (`get` / `set` / `delete` / `list` / `getAll`) regardless of backend:
- **Production / `VITE_FORCE_API=1`** → calls `/api/storage` (Vercel KV)
- **`localhost` (default)** → reads/writes `localStorage` with key prefix `campbau:`

### API endpoints

- `GET    /api/storage?key=...` — fetch one value
- `POST   /api/storage` — body `{ key, value }` (value must be a string)
- `DELETE /api/storage?key=...` — delete one value
- `GET    /api/storage/list?prefix=...` — list keys matching prefix

All keys are namespaced with `campbau:` inside KV to avoid collisions if you reuse the KV instance.

### Data model

| Key prefix      | Stored value                                                        |
|-----------------|---------------------------------------------------------------------|
| `user:<name>`   | User record (`{ id, username, password, role, firstName, ... }`)    |
| `cnota:<id>`    | Cnota kosmiczna (rule item)                                         |
| `stacja:<id>`   | Stacja record (incl. `owners[]`, `visibility`, `image` data URL)    |
| `wydarzenie:<id>` | Festival event                                                    |
| `fsection:<id>` | "O Festiwalu" section                                               |
| `miejsce`       | Single record with venue info, photos, lat/lng, contact             |
| `settings`      | App settings (`{ guestListVisible }`)                               |
| `seeded:v1`     | Marker that demo data was seeded                                    |

Images are stored inline as base64 data URLs after client-side resizing. KV has a 5MB-per-value limit, which is enough for one reasonable JPEG.

### Authentication

Plaintext password match (this is a small private festival app, not a public service). Session is persisted in browser `localStorage` under `campbau:session` — refreshing keeps you signed in until you log out.

---

## Customizing

### Default admin credentials

Change the bootstrap in `src/App.jsx` (search for `username: "bau"`). Be sure to log in with the new credentials immediately after deploying.

### Default location for sunset widget

Default coordinates are Grójec, Poland. Change them either:
- In **Miejsce** → **Edytuj** after logging in (Szerokość / Długość fields), or
- In `src/App.jsx`, search for `51.8667` to find the seed and migration defaults.

### Reset all data

If you need to wipe the production storage:
```bash
vercel env pull
node -e "import('@upstash/redis').then(async ({Redis})=>{const r=Redis.fromEnv();const ks=[];let c='0';do{const [n,b]=await r.scan(c,{match:'campbau:*',count:200});c=String(n);ks.push(...b)}while(c!=='0');await Promise.all(ks.map(k=>r.del(k)));console.log('deleted',ks.length)})"
```
On next visit, the app will re-seed demo data and create the admin user.

---

## Notes & limitations

- Passwords are stored in plaintext. This is acceptable for a closed friend group but not for anything more public.
- No password reset — admin must edit the user via the **Admin** panel to issue a new password.
- KV's 5 MB-per-value limit means very large images can fail to save. Images are auto-resized to 1000–1200px max dimension at quality 0.82 to stay well under that.
- Last-write-wins for concurrent edits — fine for low-traffic festival use.
- Sunrise/sunset times are computed in-browser using a standard astronomical formula. No external API is contacted.
