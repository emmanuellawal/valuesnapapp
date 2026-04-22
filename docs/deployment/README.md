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

- **macOS / native Linux:** `npm run start:lan` (or `npm run ios:lan`). Phone and dev laptop on same Wi-Fi — no TLS, no ngrok.
- **WSL2 on Windows:** see the WSL subsection below — the default `--lan` binds Metro to WSL's virtual NIC (172.x.x.x), which is **not** routable from your phone.
- Only fall back to `start:tunnel` if LAN is impossible (corporate Wi-Fi client-isolation, different networks). Expect to hit the ngrok-free.dev interstitial that breaks Expo Go's WSS upgrade on iOS.

#### WSL2 setup — pick one

**Option A (preferred, zero repo changes): `networkingMode=mirrored`**

Requires Windows 11 22H2+ and WSL 2.0+ (check with `wsl --version`). In `%USERPROFILE%\.wslconfig` on Windows:

```ini
[wsl2]
networkingMode=mirrored
```

Then `wsl --shutdown` and reopen WSL. Linux now sees the Windows host's real network adapters (your Wi-Fi IP is directly available inside WSL). After that, `npm run start:lan` works with no tricks.

**Option B (fallback): `npm run start:wsl`**

For older WSL, company-managed Windows, or if mirrored mode isn't viable. One-time Windows setup (admin PowerShell on the Windows host, NOT inside WSL):

```powershell
# From the repo root on Windows:
powershell -ExecutionPolicy Bypass -File apps\mobile\scripts\setup-wsl-portproxy.ps1
```

That adds a `netsh portproxy` rule and a firewall allow-rule for port 8083. You only need to re-run it if your WSL IP changes (which happens on reboot unless you use mirrored mode).

Then from inside WSL:

```bash
cd apps/mobile
npm run start:wsl
```

The script auto-detects your Windows LAN IP via `ipconfig.exe`, exports `REACT_NATIVE_PACKAGER_HOSTNAME` so Metro advertises the Windows IP (not WSL's) to Expo Go, and hands off to `expo start --lan`. The QR you scan on your phone will point at `192.168.x.x:8083`.

### Smoke tests (acceptance)

1. `curl` `/health` — 200 and `{"status":"healthy"}`.
2. One real appraisal from a device with `EXPO_PUBLIC_API_URL` set to the Render URL.
3. From a browser on `http://localhost:8083`, DevTools console: `fetch('https://<url>/health').then(r => r.json())` — no CORS error when `CORS_ORIGINS` is unset (wildcard allowed).
4. `curl https://valuesnapapp.onrender.com/admin/api-stats` — the `cache_stats` key must be a count object, **not** `{"error":"[Errno -2] Name or service not known"}`. That error means Supabase env vars on Render are misconfigured (URL typo, missing, or service key wrong) — appraisals will silently return `valuation_id: null` and history/migration will be broken.

---

## Legacy references

Earlier docs mentioned Railway for the backend; Render is the current target for Story 5.5-2. Vercel setup for the Expo web build remains future work.

---

## Support

For backend env semantics, see `backend/config.py` and `backend/README.md`.
