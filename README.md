# PulseStack

Tap-at-the-peak stacking game. **Web** is SvelteKit on **Cloudflare Workers** (static assets); **Android** is the same build via Capacitor. Leaderboard is a **Cloudflare Worker** + D1 in `worker/`.

## Develop (web)

```bash
npm install
npm run dev
```

Env (see `.env.example`):

- `PUBLIC_LB_URL` — Cloudflare Worker base URL (no trailing slash)
- `PUBLIC_APP_VERSION` — shown as `v…` inside the Capacitor app

## Build (web)

```bash
npm run build   # → build/
npm run preview
```

## Deploy (Cloudflare) — auto

Every push to `main` / `master` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. **Game** — static build → Worker `pulsestack` (root `wrangler.jsonc`), https://pulsestack.lotusquants.workers.dev
2. **Worker** — leaderboard API → Worker `pulsestack-lb`

**You never commit Cloudflare credentials.** Add secrets/vars in GitHub once:

→ Full checklist: **[`.github/DEPLOY.md`](.github/DEPLOY.md)**

Quick version:

1. Create Cloudflare API token (Workers edit) → secret `CLOUDFLARE_API_TOKEN`
2. Secret `CLOUDFLARE_ACCOUNT_ID`
3. Variable `PUBLIC_LB_URL` = your leaderboard Worker URL (set after first Worker deploy if needed)
4. Push to `master` (or Actions → **deploy** → Run workflow)

Local one-off (optional, uses your own Wrangler login):

```bash
npm run deploy:cf          # game
npm run deploy:worker      # Worker
```

## Android (Capacitor)

```bash
npm run cap:sync   # build + copy into android/
npm run cap:open   # Android Studio
```

App id: `app.pulsestack`. Plugins: App (back button), Haptics, Keep Awake, Share, Splash Screen, Status Bar.

## Layout

| Path                  | Role                                                   |
| --------------------- | ------------------------------------------------------ |
| `src/lib/core/`       | Pure game logic (replay, constants, draw, API types)   |
| `src/lib/adapters/`   | Platform I/O + port types (storage, audio, Cap, LB…)   |
| `src/lib/game/`       | `GameEngine` + `createGame()` factory                  |
| `src/lib/components/` | Svelte UI shell                                        |
| `static/`             | PWA manifest, icon, service worker                     |
| `android/`            | Capacitor Android project                              |
| `worker/`             | Leaderboard API (`worker/src/index.ts` + D1)           |
| `.github/`            | Auto-deploy workflows + deploy guide                   |

Beat RNG / replay (`mulberry32`, `periodFor`, `replay`) live in `src/lib/core/replay.ts` and are shared with the Worker — do not fork.

Override adapters when wiring the game:

```ts
import { createGame } from '$lib/game';
import { createDefaultAdapters } from '$lib/adapters';

createGame({
	hooks,
	adapters: {
		// e.g. mute audio in tests
		audio: { ...createDefaultAdapters().audio, unlock: () => {}, tone: () => {} },
	},
});
```

## Cloudflare leaderboard (manual / first-time)

See **[worker/README.md](worker/README.md)** for D1 schema and local `wrangler` use. CI deploys the Worker automatically once secrets are set.
