# 🚀 StreamX — Vercel Deployment Guide

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [GitHub](https://github.com) account with the StreamX repo
- A [Neon](https://neon.tech) PostgreSQL database
- A [TMDB API Key](https://www.themoviedb.org/settings/api)

---

## Step 1: Fork / Clone the Repository

```bash
git clone https://github.com/hasnmahamudbinance-dev/StreamX.git
cd StreamX
```

---

## Step 2: Set Up Neon PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) and create a new project
2. Copy the **Pooled connection string** and **Direct connection string**
3. You'll need both for the environment variables

---

## Step 3: Push Schema to Database

```bash
# Install dependencies
bun install

# Set your .env file (see .env.example)
cp .env.example .env
# Edit .env with your actual values

# Generate Prisma client and push schema
bun run db:push

# Seed the database (creates admin account + subscription plans)
bun run db:seed
```

---

## Step 4: Deploy to Vercel

### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hasnmahamudbinance-dev/StreamX)

### Option B: Manual Deploy

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository: `hasnmahamudbinance-dev/StreamX`
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Build Command**: `bun run build` (or leave as default)
   - **Output Directory**: Leave default
4. Add environment variables (see below)
5. Click **Deploy**

---

## Step 5: Environment Variables

Add these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon Pooled connection string | ✅ Yes |
| `DIRECT_URL` | Neon Direct connection string | ✅ Yes |
| `NEXTAUTH_SECRET` | Random secret key (`openssl rand -base64 32`) | ✅ Yes |
| `NEXTAUTH_URL` | Your Vercel URL (e.g., `https://streamx.vercel.app`) | ✅ Yes |
| `TMDB_API_KEY` | TMDB API key | ✅ Yes |
| `TMDB_BASE_URL` | `https://api.themoviedb.org/3` | ✅ Yes |
| `EMAIL_PROVIDER` | `resend` | ✅ Yes |
| `RESEND_API_KEY` | Resend API key | ✅ Yes |
| `EMAIL_FROM` | Sender email (e.g., `StreamX <noreply@yourdomain.com>`) | ✅ Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ❌ Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ❌ Optional |

---

## Step 6: Verify Deployment

1. Visit your deployed URL
2. Login with the admin account:
   - **Email**: `hasnmahamudbinance@gmail.com`
   - **Password**: `StreamX@2026`
3. Check the Admin Dashboard
4. Browse content from TMDB

---

## Production Security Checklist

- [x] `NEXTAUTH_SECRET` is set to a strong random value
- [x] No hardcoded fallback secrets in production
- [x] `ignoreBuildErrors` removed from next.config.ts
- [x] Path traversal protection on file serving
- [x] X-Frame-Options set to `SAMEORIGIN`
- [x] Content-Security-Policy configured
- [x] Unauthenticated 2FA code sending blocked
- [x] Prisma schema uses PostgreSQL with `directUrl`
- [x] `.env` excluded from git via `.gitignore`
- [x] `.env.example` provided as template

---

## Troubleshooting

### Database Connection Errors
- Neon serverless databases sleep when idle — first request may be slow
- Ensure `DATABASE_URL` uses the **pooled** connection string
- Ensure `DIRECT_URL` uses the **direct** connection string
- Both must include `?sslmode=require`

### Prisma Client Errors
- Run `bun run db:generate` locally to regenerate the client
- On Vercel, `postinstall` script runs `prisma generate` automatically
- `binaryTargets` in schema includes `rhel-openssl-3.0.x` for Vercel

### Build Failures
- Check that all environment variables are set in Vercel
- Review build logs for TypeScript errors
- Ensure `prisma generate` runs before `next build`

---

## Local Development

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Push schema and seed
bun run db:push
bun run db:seed

# Start dev server
bun run dev
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: Neon PostgreSQL (via Prisma ORM)
- **Auth**: NextAuth.js v4 (JWT strategy)
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Email**: Resend
- **API**: TMDB API for movie/TV data
- **Deploy**: Vercel (serverless)
