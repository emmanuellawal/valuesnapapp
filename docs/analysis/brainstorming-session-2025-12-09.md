---
stepsCompleted: [1]
inputDocuments: ['plan.md', 'brainstorming-session-2025-12-08.md']
session_topic: 'ValueSnap Deployment Requirements - Vercel Frontend + Railway Backend'
session_goals: 'Clarify deployment requirements, environment variables, and CI/CD setup for production deployment'
selected_approach: 'deployment-focused'
techniques_used: ['Deployment Requirements Analysis']
techniques_in_progress: []
techniques_pending: []
ideas_generated: 5
critical_findings: 3
session_status: 'active'
context_file: 'project-context-template.md'
---

# Brainstorming Session Results

**Facilitator:** Multi-Agent Team (Party Mode)  
**Participant:** Elawa  
**Date:** 2025-12-09

---

## Session Overview

**Topic:** ValueSnap Deployment Requirements - Vercel Frontend + Railway Backend

**Goals:** 
- Clarify deployment requirements for Vercel (frontend)
- Identify environment variables needed for production
- Document CI/CD setup and build configuration
- Create deployment checklist

**Context:** This is the **original ValueSnap** (not V2). Focus on getting a working deployment with clean CI builds and public URL.

---

## Key Findings

### 1. Tech Stack Confirmation

**Frontend:**
- ✅ React 19.1.0
- ✅ Expo Router ~6.0.17
- ✅ React Native Web 0.21.0 (for web deployment)
- ✅ NativeWind 4.2.1 (Tailwind for React Native)

**Backend:**
- ✅ FastAPI (Python)
- ✅ Railway deployment (confirmed)

**Database:**
- ✅ Supabase (Postgres + Auth + Storage)

---

### 2. Deployment Requirements

**Must Have:**
- ✅ Deploy to Vercel (frontend)
- ✅ Deploy to Railway (backend)
- ✅ Build cleanly through CI
- ✅ Working public URL
- ⏸️ Cookie banner + consent logic (deferred to post-MVP - US-only)
- ⏸️ Analytics only after consent (deferred to post-MVP)

**Decision:** Cookie consent deferred since US-only launch. Focus on core functionality.

---

### 3. Environment Variables Audit

#### Frontend (Vercel) - ✅ Created

**File:** `apps/mobile/.env`

**Required Variables:**
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_API_URL` - Railway backend URL

**Status:** Template created. User has Supabase credentials ready to add.

#### Backend (Railway) - ✅ Already Exists

**File:** `backend/.env`

**Required Variables:**
- `OPENAI_API_KEY` - ✅ Present
- `OPENAI_MODEL` - ✅ Present (gpt-4o-mini)
- `EBAY_SANDBOX_APP_ID` - ✅ Present
- `EBAY_SANDBOX_CERT_ID` - ✅ Present
- `EBAY_SANDBOX_DEV_ID` - ✅ Present
- `EBAY_USE_SANDBOX` - ✅ Present (true)
- `SECRET_KEY` - ✅ Present (needs production value)
- `JWT_SECRET` - ✅ Present (needs production value)
- `DATABASE_URL` - ✅ Present (sqlite for dev, needs Supabase for prod)

**Production Updates Needed:**
- Generate new `SECRET_KEY` for production
- Generate new `JWT_SECRET` for production
- Update `CORS_ORIGINS` with Vercel production URL
- Update `DATABASE_URL` with Supabase production connection string
- Update `EBAY_OAUTH_REDIRECT_URI` with production URL (if using OAuth)

---

## Vercel Deployment Configuration

### Build Settings

**Framework Preset:** Other (Expo)
**Root Directory:** `apps/mobile`
**Build Command:** `npx expo export --platform web`
**Output Directory:** `web-build`
**Install Command:** `npm install`

**Environment Variables:**
- Set in Vercel Dashboard → Settings → Environment Variables
- Add for Production, Preview, Development environments
- All variables must be prefixed with `EXPO_PUBLIC_`

### CI/CD Setup

**Automatic:**
- ✅ Vercel auto-detects Expo projects
- ✅ Builds on git push (if connected to GitHub/GitLab)
- ✅ Provides public URL automatically

**Manual Steps:**
1. Connect repository to Vercel
2. Set root directory: `apps/mobile`
3. Configure build settings (above)
4. Add environment variables
5. Deploy

---

## Railway Deployment Configuration

### Build Settings

**Root Directory:** `backend`
**Build Command:** `pip install -r requirements.txt`
**Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
- Set in Railway Dashboard → Variables
- Copy from `backend/.env` (update production values)
- Generate new secrets for production

### CI/CD Setup

**Automatic:**
- ✅ Railway auto-builds on git push
- ✅ Provides public URL automatically
- ✅ Handles Python dependencies

**Manual Steps:**
1. Create Railway project
2. Connect GitHub repository
3. Set root directory: `backend`
4. Add environment variables
5. Deploy and get production URL
6. Update frontend `EXPO_PUBLIC_API_URL` with Railway URL

---

## Deployment Checklist

### Pre-Deployment

- [x] Confirm tech stack (React + Expo Router)
- [x] Create frontend `.env` template
- [x] Document environment variables
- [ ] Add Supabase credentials to frontend `.env`
- [ ] Get Railway backend URL
- [ ] Update backend `.env` with production values

### Frontend (Vercel)

- [ ] Connect repository to Vercel
- [ ] Set root directory: `apps/mobile`
- [ ] Configure build command: `npx expo export --platform web`
- [ ] Set output directory: `web-build`
- [ ] Add environment variables:
  - [ ] `EXPO_PUBLIC_SUPABASE_URL`
  - [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `EXPO_PUBLIC_API_URL` (Railway backend URL)
- [ ] Test build locally: `cd apps/mobile && npx expo export --platform web`
- [ ] Verify `web-build/` directory created
- [ ] Deploy to Vercel
- [ ] Verify public URL works

### Backend (Railway)

- [ ] Create Railway project
- [ ] Connect GitHub repository
- [ ] Set root directory: `backend`
- [ ] Add environment variables (from `backend/.env`)
- [ ] Generate new `SECRET_KEY` for production
- [ ] Generate new `JWT_SECRET` for production
- [ ] Update `DATABASE_URL` with Supabase connection string
- [ ] Update `CORS_ORIGINS` with Vercel production URL
- [ ] Deploy and get production URL
- [ ] Update frontend `EXPO_PUBLIC_API_URL` with Railway URL

### Post-Deployment

- [ ] Test frontend → backend API calls
- [ ] Verify Supabase connection works
- [ ] Test authentication flow
- [ ] Verify CORS is configured correctly
- [ ] Monitor error logs
- [ ] Set up billing alerts (OpenAI, Railway, Vercel)

---

## Decisions Made

1. **Cookie Consent:** Deferred to post-MVP (US-only launch)
2. **Analytics:** Deferred to post-MVP (no consent needed yet)
3. **Backend Hosting:** Railway (confirmed)
4. **Frontend Hosting:** Vercel (confirmed)
5. **Database:** Supabase (already planned)

---

## Documentation Created

1. **`apps/mobile/.env`** - Frontend environment variables template
2. **`docs/deployment/environment-variables.md`** - Complete environment variables documentation
3. **`apps/mobile/.gitignore`** - Updated to exclude `.env` files

---

## Next Steps

1. **Add Supabase credentials** to `apps/mobile/.env`
2. **Deploy backend to Railway** and get production URL
3. **Update frontend `.env`** with Railway backend URL
4. **Configure Vercel** with build settings and environment variables
5. **Deploy frontend** to Vercel
6. **Test end-to-end** deployment

---

## Questions Resolved

✅ **Tech Stack:** Confirmed React + Expo Router (not Next.js)  
✅ **Deployment Platform:** Vercel (frontend) + Railway (backend)  
✅ **Environment Variables:** Documented and templates created  
✅ **Cookie Consent:** Deferred (US-only MVP)  
✅ **CI/CD:** Automatic with Vercel/Railway git integration

---

## Session Notes

**Key Insight:** Deployment is straightforward with Expo web builds on Vercel. Main work is environment variable configuration and ensuring backend URL is set correctly in frontend.

**Risk:** Backend URL must be set in frontend before deployment, or API calls will fail. Consider using Railway's public URL or custom domain.

**Action Items:**
- User: Add Supabase credentials to frontend `.env`
- User: Deploy backend to Railway, get URL
- User: Update frontend `.env` with Railway URL
- User: Configure Vercel and deploy

---

*Session focused on deployment requirements and environment configuration. All templates and documentation created. Ready for deployment setup.*

