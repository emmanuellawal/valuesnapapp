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

Set in the dashboard — **names only**; copy values from your local `backend/.env` (never commit that file). `render.yaml` declares each variable with `sync: false`, which means the blueprint apply step never overwrites a dashboard value — drift can still happen if someone edits the dashboard directly without a PR. Audit periodically.

| Variable | Notes |
|----------|--------|
| `OPENAI_API_KEY` | Required for real appraisals |
| `OPENAI_MODEL` | Optional — defaults to `gpt-4o-mini` in `backend/services/ai.py`. See Story 5.5-10 for the model-upgrade evaluation. |
| `EBAY_PROD_APP_ID` | Production eBay app id (`EBAY_APP_ID` is **wrong** — not read by `config.py`) |
| `EBAY_PROD_CERT_ID` | Production eBay cert id |
| `EBAY_USE_SANDBOX` | `false` for real device / prod-like tests |
| `USE_MOCK` | `false` for real appraisals |
| `SUPABASE_URL` | Same project as mobile |
| `SUPABASE_SERVICE_KEY` | Backend only — not the anon key |
| `CORS_ORIGINS` | Optional — if unset, server uses `allow_origins=["*"]` (see `backend/main.py`). For exact origins only; no `https://*.example.com` wildcards in the list (Starlette matches origins literally). |

**First-time blueprint bootstrap:** `sync: false` protects dashboard-managed secrets from being overwritten; it does **not** create values on a brand-new service. Before the first deploy or blueprint sync for a new Render service, set `OPENAI_API_KEY`, `EBAY_PROD_APP_ID`, `EBAY_PROD_CERT_ID`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` in the dashboard. Otherwise the service can deploy successfully but fail real appraisals because the credentials are blank.

**Dashboard drift caveat:** `render.yaml` locks build/start/rootDir and the three non-secret vars (`PYTHON_VERSION`, `USE_MOCK`, `EBAY_USE_SANDBOX`) but only **declares** the secrets above with `sync: false`. Render does not validate that secret values match between the blueprint declaration and the dashboard — if someone toggles `USE_MOCK=true` in the dashboard for debugging and forgets to revert, prod silently switches to mock mode with no git trace. Treat dashboard edits as a PR-equivalent change and document them in the relevant story's Change Log.

### Mobile app

Set in `apps/mobile/.env` (gitignored — copy from `apps/mobile/.env.render`):

```
# Uncomment only when intentionally testing against live Render APIs.
# EXPO_PUBLIC_API_URL=https://valuesnapapp.onrender.com
# EXPO_PUBLIC_USE_MOCK=false
```

`EXPO_PUBLIC_USE_MOCK=false` routes mobile appraisals to real OpenAI/eBay/Render paths. Leave it commented or set mock mode for local UI-only work.

### Running on a physical device — use LAN, not tunnel

Since the API is now public, **do not** use `expo start --tunnel` for device testing. Tunnels were only needed when Metro AND the backend both had to be reachable by the phone. Now:

- **Supported default path:** from `apps/mobile`, run `npm start`. That now routes through the WSL-aware LAN launcher instead of raw `expo start`, so the QR code cannot silently advertise the wrong interface.
- **macOS / native Linux:** `npm start` (or `npm run ios`). Phone and dev laptop on the same private Wi-Fi or phone hotspot — no TLS, no ngrok.
- **WSL2 on Windows:** `npm start` uses the same launcher. In mirrored mode it advertises the Windows LAN IP directly; verify the phone can open `http://<lan-ip>:8083/status` if Expo Go fails. If mirrored mode is unavailable and WSL has a 172.x.x.x address, use `npm run start:wsl`.
- **No tunnel option.** `start:tunnel` and `ios:tunnel` were removed in Story 5.5-7. The ngrok-free.dev interstitial breaks Expo Go's WSS upgrade on iOS; since the backend is on Render, tunnelling Metro is no longer useful. For off-network testing use an EAS update channel instead.

#### WSL2 setup — pick one

**Option A (preferred, zero repo changes): `networkingMode=mirrored`**

Requires Windows 11 22H2+ and WSL 2.0+ (check with `wsl --version`). In `%USERPROFILE%\.wslconfig` on Windows:

```ini
[wsl2]
networkingMode=mirrored
```

Then `wsl --shutdown` and reopen WSL. Linux now sees the Windows host's real network adapters (your Wi-Fi IP is directly available inside WSL). If Expo Go fails, verify from the phone browser that `http://<your-lan-ip>:8083/status` responds before debugging the app. iPhone hotspots commonly advertise as `172.20.10.x`; that is a valid LAN address for this workflow, unlike WSL's virtual 172.x.x.x NAT address.

As of the current mobile scripts, `npm start` and `npm run start:lan` are WSL-aware. In mirrored mode they advertise the Windows LAN IP directly. A Windows-host self-probe may fail on some mirrored WSL setups even when the phone route works, so it is warning-only; the phone browser `/status` check is the source of truth. If mirrored networking is not active, the launcher fails fast instead of launching a broken `exp://172.x.x.x:8083` session.

**Option B (fallback): `npm run start:wsl`**

For older WSL, company-managed Windows, or if mirrored mode isn't viable. One-time Windows setup (admin PowerShell on the Windows host, NOT inside WSL):

```powershell
# From the repo root on Windows:
powershell -ExecutionPolicy Bypass -File apps\mobile\scripts\setup-wsl-portproxy.ps1
```

That adds a `netsh portproxy` rule and a firewall allow-rule for port 8083. This fallback is only for classic WSL where the distro has a 172.x.x.x IP. Do not use it in mirrored mode; portproxy can occupy Metro's port and force Expo onto an unforwarded fallback port.

Then from inside WSL:

```bash
cd apps/mobile
npm run start:wsl
```

The script auto-detects your Windows LAN IP via `ipconfig.exe`, rejects non-routable advertised hosts up front, verifies the Windows portproxy is actually configured, exports `REACT_NATIVE_PACKAGER_HOSTNAME` so Metro advertises the Windows IP (not WSL's) to Expo Go, and hands off to `expo start --lan`. The QR you scan on your phone will point at `192.168.x.x:8083` or `10.x.x.x:8083`, never WSL's virtual NIC.

### Smoke tests (acceptance)

1. `curl` `/health` — 200 and `{"status":"healthy"}`.
2. One real appraisal from a device with `EXPO_PUBLIC_API_URL` set to the Render URL.
3. CORS check from the browser. Two equivalent paths — either is sufficient evidence:
   - **Curl probe (CI-friendly):** `curl -I -H "Origin: http://localhost:8083" https://valuesnapapp.onrender.com/health` — response headers must include `access-control-allow-origin: http://localhost:8083`.
   - **DevTools probe (manual):** with `npm run web` running, open `http://localhost:8083`, paste into the console:
     ```js
     fetch('https://valuesnapapp.onrender.com/health').then(r => r.json()).then(console.log)
     ```
     Expected: `{ status: 'healthy' }` logged, zero CORS errors in the console. Both probes exercise the same `CORSMiddleware` response path; the curl version is preferred for repeated automated checks.
4. `curl https://valuesnapapp.onrender.com/admin/api-stats` — the `cache_stats` key must be a count object, **not** `{"error":"[Errno -2] Name or service not known"}`. That error means Supabase env vars on Render are misconfigured (URL typo, missing, or service key wrong) — appraisals will silently return `valuation_id: null` and history/migration will be broken.

---

## Legacy references

Earlier docs mentioned Railway for the backend; Render is the current target for Story 5.5-2. Vercel setup for the Expo web build remains future work.

---

## Support

For backend env semantics, see `backend/config.py` and `backend/README.md`.
