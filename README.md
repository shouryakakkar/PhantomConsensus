# Phantom Consensus

A production-ready Enterprise web application designed for rapid data extraction and processing to detect hidden misalignment in team decisions. Phantom Consensus analyzes internal communications across Microsoft Teams, Slack, Notion, and Jira to reveal implicit disagreements before they derail your execution.

## 🌟 Features

- **Autopilot Integrations**: Connect seamlessly via OAuth to Slack, Notion, Jira, and Microsoft Teams. The application automatically background-syncs recent conversations, pages, and tickets to track decision-making.
- **Manual Analysis**: Upload a `.txt` or `.vtt` meeting transcript manually, specify the decision topic, and let the AI extract alignment data.
- **AI-Powered Extraction**: Uses advanced LLMs (Llama 3.3 70b via Groq / OpenAI GPT models) to extract deep belief signals, analyzing what people *actually* mean, their confidence levels, and the evidence behind it.
- **Divergence Maps & Belief Bars**: Visual gap scoring per participant to instantly see alignment or disconnect. Generates visual, presentation-ready dashboards.
- **Privacy & Security**: Tokens are handled securely via backend serverless functions, state is protected, and transcript data is processed effectively. The stack eliminates long-term credential leakage.

## 💻 Tech Stack

### Frontend
- **Next.js 14** (App Router) - React framework
- **Tailwind CSS** - For styling, heavily utilizing modern glassmorphism and animated components
- **Lucide React** - SVG icons

### Backend & Infrastructure
- **Serverless API Routes** - Handled directly within Next.js API boundaries
- **Supabase (PostgreSQL)** - Serverless-friendly production database connection mapping
- **Prisma ORM** - For strongly typed database schema management and querying
- **Groq API / OpenAI API** - Powering the intensive LLM data extraction logic
- **Vercel** - Optimized hosting and staging pipeline

## 🏗️ Architecture & Flow

The system is built on a clean separation of concerns and optimized for a serverless environment (Vercel):

1. **Identity & OAuth (`/api/auth/*`)**
   - Users authenticate with various platforms.
   - Credentials (Access Tokens/Refresh Tokens) are stored against user accounts in Supabase via Prisma.
   - Global in-memory state validations are avoided to maintain strict compatibility with Vercel's stateless serverless function lifecycle.

2. **Data Sync & Ingestion (`/api/sync/*`)**
   - Background tasks ping the respective provider APIs (e.g., Notion pages edited in the last 7 days, Jira tickets updated recently, Slack channel histories).
   - Data is cleaned, unstructured text is extracted, and pre-filtered to check for readable content and/or decision keywords.

3. **Belief Extraction (`/src/lib/extractBeliefs.ts`)**
   - The gathered text is formatted and sent to the LLM.
   - The LLM parses the payload to identify a specific `Decision Topic`, each `Participant`, their `Belief Statement`, `Reasoning`, `Confidence` score (1-100), and `Key Quotes` as evidence.

4. **Persistence & Presentation (`/dashboard`, `/analyze`)**
   - Extracted structures are saved relationally into the `Session`, `Participant`, and `Belief` tables in Supabase.
   - `GapScores` are calculated (max confidence - min confidence).
   - The Dashboard (`/dashboard`) lists tracked decisions, color-coded by the source platform integration (Source Badges) and highlighting misalignments.
   - The detailed Report view (`/analyze`) provides granular breakdowns of the consensus map.

## 🚀 Getting Started (Local Development)

First, set up your local environment by copying `.env.example` to `.env` and fill out your Provider Credentials (Slack, Jira, Teams, Notion, Groq, OpenAI) and Supabase database URLs (`DATABASE_URL`, `DIRECT_URL`).

Install dependencies:

```bash
npm install
```

Generate Prisma Client and push the schema to your development database:

```bash
npx prisma generate
npx prisma db push
```

Run the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to test the application locally. Make sure the `NEXT_PUBLIC_APP_URL` environment variable points to your localhost for OAuth redirects, and transition to your Vercel URL upon deployment.

## 🗄️ Database Schema Overview

- **`User` / `Account`**: Standard OAuth account mapping for users and their connected third-party integrations.
- **`Session`**: Represents a single tracked decision or a manually uploaded meeting analysis, including overall `gapScore`, `decisionTopic`, and `source` (e.g., slack, notion, jira, teams, manual).
- **`Participant`**: Represents users, actors, or document authors grouped under a Session.
- **`Belief`**: Captures the exact parsed mindset of a Participant holding references back to the source keys via `keyQuotes`.

## 📄 License

This project is licensed under the MIT License.
