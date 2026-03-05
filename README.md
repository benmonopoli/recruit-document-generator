# Recruit Document Generator

An AI-powered tool that empowers hiring teams to create better recruiting documents — faster, more consistently, and with less effort.

## The problem

Recruiting documents are hard to get right. Job descriptions are often copy-pasted from old roles, bloated with buzzwords, vague about what the person will actually do, and disconnected from how the company actually sounds. Interview questions get recycled without thought. Application screening questions are an afterthought. The result is a candidate experience that undersells the role, and a hiring process that filters poorly.

Recruit Document Generator solves this with an AI assistant that knows your company's voice, pulls in context from your existing Greenhouse roles, and guides hiring managers through creating documents that are specific, honest, and effective — without needing a recruiter in the room for every step.

## What it generates

- **Job Descriptions** — conversational AI-guided flow that asks the right questions, avoids buzzwords, and produces JDs that are honest about what the role actually involves
- **Interview Questions** — structured question banks with follow-ups, evaluation criteria, and red flag guidance, tailored to the role
- **Test Tasks** — take-home assignment briefs with problem statements, constraints, deliverables, and weighted evaluation rubrics
- **Application Screening Questions** — questions that filter for genuine interest and fit, with purpose notes and answer signals for the reviewer

## Designed to grow

The tool is intentionally modular. Current document types are a foundation — the same AI-assisted generation pattern can be extended to cover:

- **Interview packs** — combined briefing docs for the full interview loop
- **Recruiting policy** — company-specific hiring guidelines and best practice
- **Offer letter templates** — tailored to seniority and role type
- **Onboarding briefs** — role context docs for hiring managers
- **Sourcing playbooks** — where to find candidates for specific roles
- Any other document type your recruiting process relies on

## Key features

- **Company voice matching** — optionally syncs your About and Careers pages via AI analysis so generated content sounds like you, not generic corporate
- **Greenhouse integration** — pulls in your existing live and historical roles as templates and context
- **Tone controls** — adjustable sliders for formality, detail level, and unconventionality
- **Project-based workflow** — all documents for a role live in one project (JD, interview questions, test task, application questions)
- **Collaborative** — share projects with hiring managers for review and contribution
- **Export** — export documents to PDF or copy for use in your ATS

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (database, auth, edge functions)
- **AI:** Configurable via Lovable AI gateway
- **Integrations:** Greenhouse Harvest API

## Getting started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase project
- A Lovable API key (for AI generation)
- Greenhouse Harvest API key (optional — for role templates and context)

### Setup

```bash
# Clone the repo
git clone https://github.com/benmonopoli/recruit-document-generator.git
cd recruit-document-generator

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start the dev server
npm run dev
```

### Environment variables

See `.env.example` for the full list. Frontend variables go in `.env`. Backend secrets are set via Supabase:

```bash
supabase secrets set LOVABLE_API_KEY=your-key
supabase secrets set GREENHOUSE_API_KEY=your-key

# Optional: for company voice/tone matching
supabase secrets set COMPANY_ABOUT_URL=https://yourcompany.com/about
supabase secrets set COMPANY_CAREERS_URL=https://yourcompany.com/careers
```

To restrict access to a specific email domain (e.g. your company), set in `.env`:

```
VITE_ALLOWED_EMAIL_DOMAIN=yourcompany.com
```

Leave unset to allow any email address.

### Deploy Supabase functions

```bash
supabase functions deploy generate-content
supabase functions deploy analyze-knowledge
supabase functions deploy greenhouse
supabase functions deploy analyze-cv
supabase functions deploy admin-users
```

### Run database migrations

```bash
supabase db push
```

## Project structure

```
src/
├── components/
│   ├── dashboard/      # Project list and dashboard views
│   ├── export/         # PDF export and data utilities
│   └── ui/             # shadcn/ui component library
├── hooks/              # Auth, settings, job search hooks
├── integrations/       # Supabase client + types
├── lib/                # AI client, API helpers, utilities
├── pages/              # Route-level pages (projects, library, admin, settings)
└── types/              # Shared TypeScript types
supabase/
├── functions/
│   ├── generate-content/    # Streams AI-generated recruiting documents
│   ├── analyze-knowledge/   # Syncs company website + Greenhouse for voice matching
│   ├── greenhouse/          # Fetches and caches Greenhouse job data
│   ├── analyze-cv/          # Parses uploaded CVs and LinkedIn profiles
│   └── admin-users/         # User management for admins
└── migrations/              # Database schema
```

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Lint
```
