# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages and API routes (`app/api/*`).
- `components/`: UI modules such as recorder, transcript panel, chat, and notes editor.
- `lib/`: shared logic (state store, ASR/LLM helpers, DB client, types).
- `prisma/`: schema and migrations for SQLite (`dev.db`).
- `public/`: static assets.
- Root config: `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `.env.example`.

Keep feature code close to its domain. Example: ASR server endpoints in `app/api/asr/*`, ASR client logic in `components/AudioRecorder.tsx`, shared ASR config in `lib/asr.ts`.

## Build, Test, and Development Commands
- `npm run dev`: start local dev server (default `http://localhost:3000`).
- `npm run build`: production build + type checks.
- `npm run start`: run built app.
- `npm run lint`: run ESLint.
- `npx prisma migrate dev`: apply local DB migrations.

If `next dev` reports lock/port issues, stop old processes first, then restart.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts/.tsx`), React function components.
- Indentation: 2 spaces; keep imports grouped and sorted logically.
- Naming: `PascalCase` for components, `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for constants.
- Use existing lint rules (`eslint-config-next`); run `npm run lint` before commit.
- Prefer small, focused modules over large utility files.

## Testing Guidelines
- No formal test framework is configured yet.
- Minimum quality gate for contributions: `npm run lint` and `npm run build` must pass.
- For behavior changes, include manual verification steps in PR description (for example: recording flow, ASR status endpoint, meeting save/load).

## Commit & Pull Request Guidelines
- Follow Conventional Commit style used in history: `feat:`, `fix:`, `chore:`, `docs:`.
- Keep commits scoped (one logical change per commit).
- Do not finish work without Git version tracking: stage relevant files and create a commit for each completed task.
- Prefer Chinese commit messages (for example: `feat: 接入阿里云实时转写`).
- PRs should include:
  - what changed and why,
  - impacted paths/endpoints,
  - local verification commands and results,
  - screenshots or short clips for UI changes.

## Agent Communication
- Codex responses in this repository should default to Chinese for plans, progress updates, and final summaries.
- Keep technical terms and commands in English when needed for accuracy, but explain decisions in Chinese first.

## Security & Configuration Tips
- Never commit `.env`, `.env.local`, API keys, tokens, or secrets.
- Use `.env.example` as the template for required variables.
- Rotate any credential immediately if it was shared in logs/chat.
