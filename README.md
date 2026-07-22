# L-C (Lucian Creation)

AI-Powered Novel Writing Platform — a dark-academia themed workspace for writers, with community Hubs, private DMs, a 12-tab project workspace (Full Writing, Characters, World Building, etc.), an AI Co-Pilot, and a cultivation-style "Ascension Status" progression system.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion
- **Editor**: TipTap (rich text)
- **UI**: Radix UI primitives, Lucide icons, Sonner toasts
- **State**: Zustand (client), React useState (local UI), localStorage (user preferences)
- **Backend**: Next.js Route Handlers (serverless API routes)
- **Database**: PostgreSQL via Prisma ORM (Supabase-compatible)
- **Auth**: PBKDF2 password hashing + DB-backed sessions (HTTP-only cookies)

---

## Local Development

### 1. Install dependencies

```bash
bun install
# or: npm install / pnpm install
```

### 2. Set up the database

You can use a local PostgreSQL instance, or skip ahead to the Supabase section below and use Supabase for both local and production.

Create a `.env` file at the project root:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/lc_novel"
DIRECT_URL="postgresql://user:password@localhost:5432/lc_novel"
NEXTAUTH_URL="http://localhost:3000"
```

Then run the Prisma migration:

```bash
npx prisma migrate dev --name init
npx prisma db seed   # optional — seeds admin + demo novel + The Hub
```

> The seed creates two demo accounts:
> - **Admin**: `lucian1975` / `PASSWORD@@1975`
> - **Author**: `1975lucian` / `1975@1975`
>
> New users can also self-register via the "Create one" link on the login screen.

### 3. Run the dev server

```bash
bun dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production Deployment

This is the full path: **GitHub → Supabase → Vercel**.

### Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g., `lc-novel`).
2. From the project root:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: L-C novel writing platform"
   git branch -M main
   git remote add origin https://github.com/<your-username>/lc-novel.git
   git push -u origin main
   ```
3. Verify on GitHub that the repo contains `package.json`, `prisma/schema.prisma`, `src/`, `.env.example`, and `vercel.json`.

> **Important**: `.env*` is gitignored, so your secrets will NOT be pushed. You'll set them directly in Vercel.

### Step 2: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**. Pick a name (e.g., `lc-novel`), choose a region close to your Vercel region, set a strong database password.
3. Wait ~2 minutes for the project to provision.
4. Go to **Project Settings → Database**.
5. Under **Connection string**, you'll see two URLs:
   - **Connection pooling** (port `6543`) — use this as `DATABASE_URL` (works with Vercel serverless).
   - **Direct connection** (port `5432`) — use this as `DIRECT_URL` (used by Prisma migrations).
6. Both look like:
   ```
   postgresql://postgres.xxxxxxxxx:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
   ```
7. Save both URLs — you'll paste them into Vercel next.

### Step 3: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project**.
3. Import your `lc-novel` repository.
4. Vercel auto-detects Next.js — leave the defaults.
5. Expand **Environment Variables** and add these (for **Production**, **Preview**, and **Development** environments):

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | `postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres` |
   | `DIRECT_URL` | `postgresql://postgres.xxxxx:PASSWORD@aws-0-region.supabase.com:5432/postgres` |
   | `NEXTAUTH_URL` | `https://your-project-name.vercel.app` (use the URL Vercel assigns after first deploy — you can update it later) |
   | `ZAI_API_KEY` | (optional, only if you wire up the AI Co-Pilot) |

6. Click **Deploy**. The first build will take 1-2 minutes.

> **Note**: The build runs `prisma generate && next build` (defined in `vercel.json`). This generates the Prisma Client from `schema.prisma` so the API routes can talk to your database.

### Step 4: Run the Production Migration

After the first deploy, you need to create the database tables on Supabase. You have two options:

**Option A — From your local machine (recommended)**:

1. Add the Supabase URLs to your local `.env`:
   ```
   DATABASE_URL="postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres"
   DIRECT_URL="postgresql://postgres.xxxxx:PASSWORD@aws-0-region.supabase.com:5432/postgres"
   ```
2. Run the migration against production:
   ```bash
   npx prisma migrate deploy
   ```
3. (Optional) Seed the production DB with the admin + The Hub:
   ```bash
   node -e "import('./src/lib/seed.ts').then(m => m.ensureSeed()).then(() => process.exit(0))"
   ```
   Or just visit your deployed site — the `/api/auth/login` route calls `ensureSeed()` automatically on first login attempt.

**Option B — From Supabase SQL Editor**:

1. In Supabase, go to **SQL Editor**.
2. Generate the SQL with `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` locally, paste it into Supabase SQL Editor, and run it.

### Step 5: Update NEXTAUTH_URL (if needed)

If your Vercel URL is different from what you set in Step 3 (e.g., Vercel assigned `lc-novel-abc123.vercel.app`), update `NEXTAUTH_URL` in **Vercel → Settings → Environment Variables** to match, then redeploy.

### Step 6: Test the live site

1. Visit your Vercel URL.
2. Log in with `lucian1975` / `PASSWORD@@1975` (or register a new account).
3. Open **The Guild** — you should see "The Hub" with seeded messages.
4. Send a message — it should persist across page refreshes.
5. Open **Settings → Profile** — upload an avatar, change your display name, and refresh. The changes should stick.

---

## API Routes (live)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Sign in (sets `lc_session` cookie) |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/guild/hubs` | List visible hubs |
| POST | `/api/guild/hubs` | Create a new hub |
| GET | `/api/guild/hubs/[id]` | Get hub + paginated messages |
| POST | `/api/guild/hubs/[id]` | Send a message to a hub |
| PATCH | `/api/guild/messages/[id]` | Star / react / delete a message |
| GET | `/api/circle/conversations` | List DM conversations |
| POST | `/api/circle/conversations` | Start a new DM |
| GET | `/api/circle/conversations/[id]` | Get conversation + messages |
| POST | `/api/circle/conversations/[id]` | Send a DM |
| PATCH | `/api/circle/conversations/[id]` | Archive / pin / mute |
| PATCH | `/api/circle/messages/[id]` | Star / react / delete |
| GET | `/api/settings` | Load user settings |
| PUT | `/api/settings` | Save user settings |
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/[id]` | Get project + tabs |
| PATCH | `/api/projects/[id]` | Rename / archive |
| DELETE | `/api/projects/[id]` | Delete project |
| GET | `/api/projects/[id]/tabs/[key]` | Get tab content |
| PUT | `/api/projects/[id]/tabs/[key]` | Save tab content |

---

## Project Structure

```
prisma/
  schema.prisma           # PostgreSQL schema (User, Session, Hub, Message, Conversation, Project, etc.)
src/
  app/
    api/                  # All API routes (auth, guild, circle, settings, projects)
    page.tsx              # Boot screen → Login or Dashboard
  components/
    chat/                 # Chat input + layout + search
    circle/               # The Circle (DMs) view
    guild/                # The Guild (Hubs) view
    lc/                   # LoginScreen, Dashboard shell, MercuryCanvas
    library/              # Library view
    modals/               # Settings modal
    profile/              # Writer profile modal
    projects/             # Projects dashboard + workspace
    sidebar/              # Bottom-left profile pill
    ui/                   # Radix UI primitives
  hooks/
    use-accounts.ts       # Multi-account state (localStorage)
  lib/
    auth.ts               # PBKDF2 hashing + DB-backed sessions
    db.ts                 # Prisma client singleton
    seed.ts               # Demo data (admin, novel, The Hub)
    store.ts              # Zustand store (current user, view state)
.env.example              # Template for env vars
vercel.json               # Build config (prisma generate && next build)
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` / `npm run dev` | Start dev server |
| `bun build` / `npm run build` | Production build |
| `npx prisma generate` | Regenerate Prisma Client after schema changes |
| `npx prisma migrate dev --name <name>` | Create + apply a new migration (dev) |
| `npx prisma migrate deploy` | Apply pending migrations (prod) |
| `npx prisma studio` | Visual DB browser at `localhost:5555` |

---

## Troubleshooting

**Build fails with "PrismaClient is not defined"** — Make sure `vercel.json` has `"buildCommand": "prisma generate && next build"`. This generates the Prisma Client before the Next.js build runs.

**Login returns 401 even with correct credentials** — Verify the database is migrated (`npx prisma migrate deploy`) and seeded (`ensureSeed()` runs automatically on first `/api/auth/login` call).

**`DATABASE_URL` errors on Vercel** — Use the **Connection pooler** URL (port `6543`), not the direct URL, for `DATABASE_URL`. Use the direct URL (port `5432`) for `DIRECT_URL`. Both must be set.

**Avatar uploads don't persist** — Avatars are stored as data URLs in the `User.avatar` column (PostgreSQL `text` type, no size limit). This works for images up to ~2MB. For larger files, wire up Supabase Storage and store the URL instead.

**Sessions expire immediately** — Check that `NEXTAUTH_URL` matches your deployed URL exactly (including `https://`). The cookie `secure` flag is `true` in production.
