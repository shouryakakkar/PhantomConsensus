# Phantom Consensus

A Next.js application designed for rapid data extraction and processing to detect hidden misalignment in team decisions.

## Features

- **Llama 3.3 Powered**: Extracts deep belief signals from unstructured text.
- **Divergence Map**: Visual gap scoring per participant to instantly see alignment.
- **Privacy First**: Transcripts are processed in-memory.
- **Integrations**: Supports pulling signals from Slack, Microsoft Teams, Notion, and Jira.

## Tech Stack

- Next.js 14 (App Router)
- React & Tailwind CSS
- Prisma & SQLite
- Google Generative AI

## Getting Started

First, install dependencies and set up your Prisma database:

```bash
npm install
npx prisma generate
npx prisma db push
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture

- Client components are located in `src/components/`, heavily utilizing glassmorphism aesthetics.
- Backend logic runs via Serverless functions in `src/app/api/`.

## License

This project is licensed under the MIT License.
