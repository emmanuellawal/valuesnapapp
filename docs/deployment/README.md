# Deployment Documentation

**Last Updated:** 2026-04-21

---

## Quick Start

1. **Frontend:** Vercel (planned — see architecture doc)
2. **Backend:** [Render](#render-backend-fastapi) (Story 5.5-2)
3. **Database:** Supabase (already configured)

---

## Render backend (FastAPI)

Deploy the API from the **repository root** so `from backend.*` imports resolve.

### Service settings (Render dashboard)

| Setting | Value |
|--------|--------|
| Root Directory | `.` (repo root — leave blank if Render treats empty as root) |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |
| Python version | Pinned via `.python-version` at **repo root** AND `PYTHON_VERSION` in `render.yaml` (`3.11.9`). Render does **not** read `runtime.txt` (Heroku convention) — do not use it. |

### Live URL

**Render service URL:** `https://valuesnapapp.onrender.com`

Health check:

```bash
curl -sS "https://valuesnapapp.onrender.com/health"
# Expected: {"status":"healthy"}
```

Free tier spins down after ~15 min idle; first request after sleep may take 30–60 s.

### Auto-deploy

With auto-deploy enabled (default), every push to the connected branch (e.g. `main`) triggers a new deploy. A broken merge can take the API down until the next good deploy. CI (Story 5.5-6) should block bad merges before they land; Render does not wait for GitHub Actions unless you add that integration separately.

### Environment variables (Render)

Set in the dashboard — **names only**; copy values from your local `backend/.env` (never commit that file).

| Variable | Notes |
|----------|--------|
| `OPENAI_API_KEY` | Required for real appraisals |
| `EBAY_PROD_APP_ID` | Production eBay app id (`EBAY_APP_ID` is **wrong** — not read by `config.py`) |
| `EBAY_PROD_CERT_ID` | Production eBay cert id |
| `EBAY_USE_SANDBOX` | `false` for real device / prod-like tests |
| `USE_MOCK` | `false` for real appraisals |
| `SUPABASE_URL` | Same project as mobile |
| `SUPABASE_SERVICE_KEY` | Backend only — not the anon key |
| `CORS_ORIGINS` | Optional — if unset, server uses `allow_origins=["*"]` (see `backend/main.py`). For exact origins only; no `https://*.example.com` wildcards in the list (Starlette matches origins literally). |

### Mobile app

Set in `apps/mobile/.env` (gitignored — copy from `apps/mobile/.env.render`):

```
EXPO_PUBLIC_API_URL=https://valuesnapapp.onrender.com
EXPO_PUBLIC_USE_MOCK=false
```

### Running on a physical device — use LAN, not tunnel

Since the API is now public, **do not** use `expo start --tunnel` for device testing. Tunnels were only needed when Metro AND the backend both had to be reachable by the phone. Now:

- `npm run start:lan` (or `npm run ios:lan`) — phone and dev laptop on same WiFi — works instantly, no TLS, no ngrok.
- Only fall back to `start:tunnel` if LAN is impossible (corporate WiFi client-isolation, different networks).

Why not tunnel:
- ngrok free tier serves an HTML interstitial on `*.ngrok-free.dev`, which breaks Expo Go's WSS upgrade and surfaces as "A TLS error caused the secure connection to fail" on iOS.
- The custom `scripts/patch-expo-ngrok.cjs` patch exists only because the Expo-bundled ngrok drifted against the local binary; LAN mode eliminates both sides of that problem.

### Smoke tests (acceptance)

1. `curl` `/health` — 200 and `{"status":"healthy"}`.
2. One real appraisal from a device with `EXPO_PUBLIC_API_URL` set to the Render URL.
3. From a browser on `http://localhost:8083`, DevTools console: `fetch('https://<url>/health').then(r => r.json())` — no CORS error when `CORS_ORIGINS` is unset (wildcard allowed).

---

## Legacy references

Earlier docs mentioned Railway for the backend; Render is the current target for Story 5.5-2. Vercel setup for the Expo web build remains future work.

---

## Support

For backend env semantics, see `backend/config.py` and `backend/README.md`.
