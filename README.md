# Recruit Document Generator

An AI-powered tool that helps recruiting teams create better documents — job descriptions, interview questions, test tasks, and application screening questions — faster and more consistently.

## The problem

Recruiting documents are hard to get right. Job descriptions are often copy-pasted from old roles, bloated with buzzwords, vague about what the person will actually do, and disconnected from how the company actually sounds. Interview questions get recycled without thought. Application screening questions are an afterthought. The result is a candidate experience that undersells the role, and a hiring process that filters poorly.

Recruit Document Generator solves this with a conversational AI assistant that knows your company's voice, pulls in context from your existing Greenhouse roles, and guides hiring managers through creating documents that are specific, honest, and effective.

## What it generates

- **Job Descriptions** — conversational AI-guided flow that asks the right questions, avoids buzzwords, and produces JDs that are honest about what the role actually involves
- **Interview Questions** — structured question banks with follow-ups, evaluation criteria, and red flag guidance, tailored to the role
- **Test Tasks** — take-home assignment briefs with problem statements, constraints, deliverables, and weighted evaluation rubrics
- **Application Screening Questions** — questions that filter for genuine interest and fit, with purpose notes and answer signals for the reviewer

## Key features

### Company voice matching

The tool fetches and analyses your About page, Careers page, and existing Greenhouse job descriptions to build a voice profile for your company. Once synced, generated content sounds like you wrote it — not like it came from a generic AI.

Set up voice matching via Settings → Knowledge Base → Sync. This runs the `analyze-knowledge` edge function, which:

1. Fetches your About and Careers pages (set as edge function secrets)
2. Analyses up to 50 of your existing Greenhouse job posts
3. Stores a structured voice profile in Supabase that gets injected into every generation request

**Getting the best results from voice matching:**
- Make sure your `COMPANY_ABOUT_URL` and `COMPANY_CAREERS_URL` secrets are set before syncing
- If you have Greenhouse connected, run `sync_all` — your existing JDs are often the best signal for how you write about roles
- Re-sync periodically as your voice and roles evolve
- For roles that have a distinct tone (e.g. engineering vs marketing), paste additional context directly into the project chat before generating

### Candidate profiles for JD building

You can upload candidate CVs or paste LinkedIn profiles into a project as context. This is useful in two ways:

1. **Defining the bar** — uploading a profile of someone who'd be a strong hire lets the AI understand what "good" looks like for the role, and calibrate the JD requirements accordingly
2. **Reverse-engineering a JD** — useful for roles that are hard to define from scratch, especially senior or hybrid roles. Drop in 2–3 strong candidate profiles and the AI can help you articulate what you're actually looking for
3. **Level calibration** — a mid-level profile vs a senior profile produces meaningfully different output for the same role title

Accepted formats: PDF, DOCX, TXT. For best results, use PDF.

### Greenhouse integration

The job search sidebar pulls live and historical roles from your Greenhouse instance. You can:

- Use an existing JD as a starting point or reference
- Merge two existing roles into a new hybrid JD (useful for evolving or new team structures)
- Pull requirements from a related role to avoid starting from scratch

### Project-based workflow

All documents for a role live in one project — JD, interview questions, test task, application questions. Projects can be shared with hiring managers for review and contribution. Documents can be exported to PDF or copied for use in your ATS.

### Library

The Library stores all your generated documents across projects. Use it as a template store — past JDs, question banks, and test tasks can be opened and used as the basis for new documents without starting fresh. Particularly useful for similar roles hired repeatedly.

### Tone controls

Adjustable sliders per project for formality, detail level, and unconventionality. Useful for calibrating across teams — an engineering JD and a marketing JD often need different registers even within the same company.

## AI and model

The tool was built using [Lovable](https://lovable.dev), which routes AI requests through its gateway to **Gemini 2.5 Flash** by default. If you want to use a different model — Anthropic Claude, OpenAI, or another provider — you can swap this out in the edge functions.

The relevant functions are `generate-content`, `analyze-knowledge`, and `analyze-cv`. Each makes a POST request to `https://ai.gateway.lovable.dev/v1/chat/completions`. To swap models:

1. Replace the endpoint with your preferred provider's API URL
2. Update the `Authorization` header to use your API key (set as a Supabase secret)
3. Update the `model` field to your chosen model ID

The edge functions use the standard OpenAI-compatible chat completions format, so any provider that supports this interface is a straightforward swap.

**Recommended alternatives:**
- Anthropic Claude (claude-sonnet-4-6 or opus) — strong on long-form structured content and following nuanced instructions
- OpenAI GPT-4o — reliable, widely documented

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (database, auth, edge functions)
- **AI:** Lovable AI gateway → Gemini 2.5 Flash (swappable — see above)
- **Integrations:** Greenhouse Harvest API

## Getting started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase project
- A Lovable API key (or alternative AI provider key)
- Greenhouse Harvest API key (optional — for role templates and voice matching)

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
# Edit .env with your Supabase URL and anon key

# Start the dev server
npm run dev
```

### Environment variables

Frontend variables go in `.env` (see `.env.example`). Backend secrets are set via Supabase:

```bash
supabase secrets set LOVABLE_API_KEY=your-key
supabase secrets set GREENHOUSE_API_KEY=your-key   # optional

# For company voice matching
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

## Extending it

The document types and AI prompts are defined in `supabase/functions/generate-content/`. Adding a new document type means adding a prompt template and wiring a new content type through the frontend. The same AI-assisted generation pattern can be extended to:

- Interview packs — combined briefing docs for the full loop
- Offer letter templates — tailored to seniority and role type
- Onboarding briefs — role context docs for new hires and their managers
- Sourcing playbooks — where to find candidates for specific roles
- Recruiting policy docs — company-specific hiring guidelines

## Project structure

```
src/
├── components/             # UI components (chat, editor, sidebar, project views)
├── hooks/                  # Auth, settings, job search hooks
├── integrations/           # Supabase client + types
├── lib/                    # AI client, Greenhouse API helpers, utilities
├── pages/                  # Route-level pages (projects, library, admin, settings)
└── types/                  # Shared TypeScript types
supabase/
├── functions/
│   ├── generate-content/    # Streams AI-generated recruiting documents
│   ├── analyze-knowledge/   # Syncs company website + Greenhouse for voice matching
│   ├── greenhouse/          # Fetches and caches Greenhouse job data
│   ├── analyze-cv/          # Parses uploaded CVs and documents (PDF, DOCX, TXT)
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
