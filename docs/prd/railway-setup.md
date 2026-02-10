# Railway Deployment Setup

## Overview
This document describes how to set up Railway for LocaFleet deployment.

## Setup Steps

### 1. Create Railway Account & Project
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose the `sam-0l/LocaFleet` repository

### 2. Configure Environment Variables
In Railway dashboard, go to your service → Variables tab.

Copy all variables from `.env.local` (except `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` which need to be updated for production):

```
DATABASE_URL=<from .env.local>
DIRECT_URL=<from .env.local>
NEXT_PUBLIC_SUPABASE_URL=<from .env.local>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from .env.local>
SUPABASE_SERVICE_ROLE_KEY=<from .env.local>
RESEND_API_KEY=<from .env.local>
BETTER_AUTH_SECRET=<from .env.local>
BETTER_AUTH_URL=https://<your-railway-domain>
NEXT_PUBLIC_APP_URL=https://<your-railway-domain>
```

**Note:** Replace `<your-railway-domain>` with the actual Railway-provided domain after deployment.

### 3. Configure Deployment Settings

#### Staging Environment (develop branch)
1. Create a new environment called "staging"
2. Set source branch to `develop`
3. Enable auto-deploy on push

#### Production Environment (main branch)
1. Create a new environment called "production"
2. Set source branch to `main`
3. Enable auto-deploy on push

### 4. Build Settings
Railway auto-detects Next.js projects. Default settings should work:
- Build Command: `npm run build` (or `pnpm build`)
- Start Command: `npm start` (or `pnpm start`)

### 5. Domain Configuration
1. Go to Settings → Domains
2. Add a custom domain or use the Railway-provided domain
3. Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` with the final domain

## Environment-Specific Variables

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `BETTER_AUTH_URL` | `http://localhost:3000` | Railway staging URL | Railway production URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Railway staging URL | Railway production URL |

## Verification Checklist
- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] Environment variables configured
- [ ] Staging environment (develop branch) set up
- [ ] Production environment (main branch) set up
- [ ] Auto-deploy enabled
- [ ] Domain configured
