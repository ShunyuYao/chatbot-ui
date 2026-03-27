# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chatbot UI is an open-source AI chat application built with Next.js 14 (App Router), React 18, TypeScript, Supabase, and TailwindCSS. It supports multiple LLM providers (OpenAI, Anthropic, Google, Azure, Mistral, Groq, Perplexity, OpenRouter, Ollama) with features like file retrieval/RAG, assistants, tool calling, and workspaces.

## Common Commands

- `npm run chat` — Start Supabase + generate DB types + Next.js dev server (primary dev command)
- `npm run dev` — Next.js dev server only (when Supabase is already running)
- `npm run build` — Production build
- `npm run type-check` — TypeScript validation (`tsc --noEmit`)
- `npm run lint` / `npm run lint:fix` — ESLint with Next.js core web vitals
- `npm run clean` — Lint fix + Prettier format
- `npm run format:write` — Prettier format all source files
- `npm test` — Run Jest tests
- `npm run db-reset` — Reset local Supabase DB and regenerate types
- `npm run db-migrate` — Run pending migrations and regenerate types
- `npm run db-types` — Regenerate `supabase/types.ts` from local schema

## Architecture

### Routing (`app/`)

Next.js App Router with i18n. Routes are nested under `app/[locale]/`:
- `[locale]/[workspaceid]/chat/` — Main chat UI
- `[locale]/[workspaceid]/chat/[chatid]/` — Individual chat
- `[locale]/login/` — Authentication
- `[locale]/setup/` — First-time onboarding

### API Routes (`app/api/`)

Each LLM provider has its own route handler at `app/api/chat/[provider]/route.ts` (openai, anthropic, google, azure, mistral, groq, perplexity, openrouter, custom). Chat routes use Vercel Edge Runtime and return streaming responses via the `ai` library (`OpenAIStream`/`StreamingTextResponse`).

Other API routes: `api/retrieval/` (RAG processing and search), `api/keys/` (API key validation), `api/assistants/` (OpenAI assistant management).

### State Management (`context/context.tsx`)

Single React Context (`ChatbotUIContext`) holds all application state: user profile, workspace data, chat messages, model settings, active generation state, UI pickers (slash commands, file picker, tool picker), and retrieval configuration.

### Database Layer (`db/`)

Supabase data access functions organized by entity (one file per table: `chats.ts`, `messages.ts`, `files.ts`, etc.). Storage operations for file uploads and images are in `db/storage/`. Types are auto-generated into `supabase/types.ts`.

### Key Libraries (`lib/`)

- `lib/build-prompt.ts` — Constructs LLM message payloads with system prompt, workspace instructions, token counting/truncation (via `gpt-tokenizer`), and retrieval augmentation
- `lib/models/llm/` — Model registry with per-provider model lists (IDs, context lengths, capabilities)
- `lib/models/fetch-models.ts` — Discovers available models based on configured API keys
- `lib/supabase/` — Supabase client initialization (browser, server, middleware)
- `lib/retrieval/processing/` — File parsers for RAG (PDF, DOCX, CSV, MD, TXT, JSON)

### Components (`components/`)

- `components/chat/` — Chat UI, input handling, command pickers (`/` for prompts, `#` for files, `@` for assistants)
- `components/sidebar/items/` — CRUD UI for each entity type (chats, files, assistants, tools, prompts, etc.)
- `components/ui/` — Radix UI-based primitives
- `components/utility/global-state.tsx` — Wraps the context provider and initializes state

### Supabase Schema (`supabase/migrations/`)

Sequential SQL migrations. Key tables: `profiles`, `workspaces`, `chats`, `messages`, `assistants`, `files`, `file_items` (chunks with embeddings), `collections`, `folders`, `presets`, `prompts`, `tools`, `models`. Row-level security (RLS) is enabled on all tables. The database uses pgvector for embedding storage/search.

## Code Style

- TypeScript strict mode
- Double quotes, no semicolons, 2-space indentation
- Prettier with custom import ordering (react, next, then project imports)
- Path alias: `@/*` maps to project root
- TailwindCSS for styling with class-based dark mode
- Icons from `@tabler/icons-react`

## Environment Setup

Requires `.env.local` (copy from `.env.local.example`) with:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (required for retrieval)
- LLM API keys are optional at server level — users can provide their own in profile settings

Local development requires Docker (for Supabase) and Node.js v18+.
