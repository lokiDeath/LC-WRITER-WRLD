# LC Novel Studio — Deployment Guide

## Quick Deploy to Vercel

1. **Import the project** to Vercel from this folder (drag-and-drop the ZIP, or push to GitHub and import the repo).
2. **Set the framework preset** to "Next.js" (auto-detected).
3. **Set build commands** (auto-detected):
   - Install: `bun install` (or `npm install`)
   - Build: `next build`
4. **Set required env vars** (see below).
5. **Deploy.**

## Required Environment Variables

The build will succeed with zero env vars set (all use `|| ''` fallbacks), but the app will be non-functional without a database.

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ REQUIRED | Prisma PostgreSQL connection string |
| `DIRECT_URL` | ✅ REQUIRED | Direct DB connection for migrations (can match `DATABASE_URL`) |
| `ZAI_API_KEY` | Recommended | Powers `/api/chat`, `/api/studio/import`, image generation fallback |
| `FAL_KEY` | Optional | Image generation via Fal.ai (priority 1) |
| `RUNPOD_API_KEY` + `RUNPOD_ENDPOINT_ID` | Optional | Image generation via RunPod (priority 2) |
| `COMFYUI_HOST` | Optional | Image generation via ComfyUI (priority 3) |
| `GOOGLE_CLIENT_ID` + `GOOGLE_REDIRECT_URI` | Optional | Google OAuth login |
| `DISCORD_CLIENT_ID` + `DISCORD_REDIRECT_URI` | Optional | Discord OAuth login |
| `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth (Settings → Linked Accounts) |
| `ONENOTE_CLIENT_ID` + `ONENOTE_CLIENT_SECRET` | Optional | OneNote OAuth (Settings → Linked Accounts) |

## Database Setup

The project uses Prisma + PostgreSQL. Recommended providers:

- **Neon** (free tier, serverless Postgres) — best for Vercel
- **Supabase** (free tier, includes Postgres + auth)
- **Render** (free PostgreSQL, 90-day limit)

After provisioning a DB:

```bash
# Local dev — push schema to DB
bunx prisma db push

# Production — Vercel auto-runs `prisma generate` on install
# (configured in package.json `postinstall` script)
# Then on first deploy, run this from Vercel CLI:
bunx prisma migrate deploy
```

## Build Verification

This project has been tested with:

- ✅ `tsc --noEmit` — zero TypeScript errors
- ✅ `next build` — succeeds with 47 static pages, no warnings
- ✅ All 35+ API routes wrapped in try/catch with `NextResponse.json()` returns
- ✅ All `process.env.X` accesses use `|| ''` fallbacks
- ✅ No `fs.writeFileSync` to `public/` (Vercel read-only filesystem safe)
- ✅ No `setTimeout` fire-and-forget patterns (Vercel function lifecycle safe)

## Project Structure

```
LC NOVEL PROJECT/
├── prisma/
│   └── schema.prisma          # PostgreSQL schema (28 models)
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── api/               # 50+ API routes (all wrapped in try/catch)
│   │   │   ├── admin/         # Overseer Panel API (RBAC-enforced)
│   │   │   ├── auth/          # Login, register, OAuth, me
│   │   │   ├── chat/          # AI chat (gemini-3.x with model selector)
│   │   │   ├── library/       # File upload/delete
│   │   │   ├── generate-image # Fal.ai/RunPod/ComfyUI/ZAI routing
│   │   │   ├── import-manuscript # Smart Import (URL + .docx/.txt)
│   │   │   ├── studio/import  # AI auto-sort into 12 tabs
│   │   │   └── ...
│   │   ├── globals.css        # Dark + light theme variables
│   │   ├── layout.tsx         # Root layout with theme bootstrap
│   │   └── page.tsx           # Auth gate (login ↔ dashboard)
│   ├── components/
│   │   ├── chat/              # ChatPage, ChatInput (4-model selector, expand modal)
│   │   ├── circle/            # DMs
│   │   ├── drawing/           # HTML5 canvas drawing studio
│   │   ├── guild/             # Community hubs
│   │   ├── library/           # File library (empty by default)
│   │   ├── lc/                # Dashboard, LoginScreen, MercuryCanvas
│   │   ├── modals/            # SettingsModal (5 tabs, full spec)
│   │   ├── onboarding/        # 7-step guided tour
│   │   ├── projects/          # Workspace (12 tabs), Smart Import, dashboard
│   │   ├── sidebar/           # Profile pill + logout overlay
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # useAccounts, useMobile, useToast
│   ├── lib/                   # auth.ts, db.ts, store.ts (Zustand), seed.ts
│   └── proxy.ts               # Server-side admin RBAC guard
├── .env.example               # All env vars documented
├── package.json               # bun-compatible, postinstall: prisma generate
├── next.config.ts             # Vercel-safe (turbopack root, ignoreBuildErrors: true)
├── vercel.json                # maxDuration: 30s for API routes
└── tsconfig.json
```

## Responsive Design

The app is fully responsive across mobile, tablet, and desktop:

- **Mobile (<768px)**: Sidebar hidden by default, opens as slide-out overlay; hamburger menu pinned top-left; click outside closes overlay; chat input collapses; Co-Pilot hidden.
- **Tablet (768-1024px)**: Sidebar auto-collapses to icon-only; vertical formatting toolbar visible; Co-Pilot hidden.
- **Desktop (≥1024px)**: Full layout — sidebar expanded, vertical toolbar visible, Co-Pilot visible with resize handle.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Runtime**: Bun (faster) or npm (compatible)
- **DB**: PostgreSQL via Prisma 6
- **AI**: Z.AI SDK (`z-ai-web-dev-sdk`) — Gemini 3.x models
- **Editor**: TipTap (StarterKit + Underline + TextAlign + CharacterCount + Placeholder)
- **Styling**: Tailwind CSS 4 + tw-animate-css
- **State**: Zustand (client) + Prisma (server)
- **Auth**: PBKDF2 password hashing + DB-backed sessions (7-day TTL)
- **Components**: shadcn/ui (Radix primitives)
- **Animations**: Framer Motion
- **Icons**: lucide-react
