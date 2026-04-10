# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phantom Consensus is a Next.js application that analyzes meeting transcripts and team communications to detect hidden misalignment in team decisions. It uses AI (Groq/Llama 3.3) to extract beliefs from participants and calculates a "gap score" representing the divergence in how different team members understood a decision.

## Commands

```bash
# Development
npm run dev          # Start dev server on localhost:3000

# Build & Production
npm run build        # Build for production
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint

# Database
npx prisma studio    # Open Prisma Studio to view/edit database
npx prisma db push   # Push schema changes to database
npx prisma generate  # Generate Prisma client after schema changes
```

## Architecture

### Core Flow
1. User provides a meeting transcript (paste/drag-drop) and decision topic on the home page
2. `POST /api/extract` extracts speakers via `parseTranscript.ts`, then calls Groq API to extract beliefs for each participant
3. Results are stored in SQLite via Prisma (Session → Participant → Belief models)
4. User is redirected to `/analyze?session=<id>` to view the DivergenceMap visualization

### Key Files

**Data Flow:**
- `src/lib/parseTranscript.ts` - Extracts speaker names from transcript text (supports "Name:" and WEBVTT `<v Name>` formats)
- `src/lib/extractBeliefs.ts` - Calls Groq API (Llama 3.3 70B) to extract beliefs per participant
- `src/lib/computeDivergence.ts` - Calculates gap score (max confidence - min confidence)
- `src/lib/types.ts` - Shared TypeScript types and `dbSessionToSessionData` converter

**API Routes:**
- `src/app/api/extract/route.ts` - Main extraction endpoint
- `src/app/api/session/[id]/route.ts` - Fetch session by ID
- `src/app/api/sessions/route.ts` - List all sessions
- `src/app/api/slack/route.ts` & `callback/route.ts` - Slack OAuth integration (in progress)
- `src/app/api/auth/teams/*` - Microsoft Teams OAuth integration (in progress)

**Pages:**
- `src/app/page.tsx` - Home page with transcript input (manual mode) and provider linking (autopilot mode)
- `src/app/analyze/page.tsx` - Analysis results view
- `src/app/dashboard/page.tsx` - Team dashboard listing all sessions

**Components:**
- `src/components/DivergenceMap.tsx` - Main visualization showing gap score and belief bars
- `src/components/BeliefBar.tsx` - Individual participant belief display
- `src/components/ThemeProvider.tsx` / `ThemeToggle.tsx` - Dark/light mode support

### Database Schema (Prisma/SQLite)
- `Session` - decision topic, gap score, timestamps
- `Participant` - name, role, linked to session
- `Belief` - belief statement, confidence, reasoning, key quotes, signal type
- `User` / `Account` - OAuth accounts for provider integrations

## Environment Variables

Required for full functionality:
- `GROQ_API_KEY` - Groq API key for Llama 3.3 inference
- `DATABASE_URL` - SQLite database path (defaults to `file:./dev.db`)
- `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` / `SLACK_REDIRECT_URI` - Slack OAuth
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` - Teams OAuth

## Notes

- The app uses path alias `@/*` mapping to `./src/*`
- Theme system uses next-themes with CSS variables for dark/light mode
- Global styles use Tailwind CSS with custom glass morphism classes (`glass`, `glass-strong`, `gradient-border`)
- Prisma client is singleton pattern to prevent connection exhaustion in dev HMR