# Scenar Subagent Rules & Context

- Workspace: `/Users/mrnetwork/Scenar`
- Primary Tech: Next.js 16 (App Router), React 19, TypeScript, RevenueCat Web Billing (`@revenuecat/purchases-js`).
- Target: RevenueCat Shipaton 2026 - **Next Gen (student) award** (web app + open-source repo + <2 min demo video). Deadline Sep 30, 2026 11:45pm PDT.
- Key UI Requirements: Monochrome design system (see docs/DESIGN.md), responsive tension meter, smooth paywall transition animations, custom icon set in src/components/icons. No Tailwind / UI libs - CSS Modules + tokens in `src/app/globals.css`.
- RevenueCat Entitlements: `scenar_pro` (paid). `starter_scenarios` = free tier (no purchase).
- Contracts live in `src/lib/types.ts`. Scenario secrets live in `src/lib/scenarios.ts` and must never be imported into client components (use `toPublic()`).
- LLM: OpenAI-compatible endpoint via `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`; offline mock fallback in `src/lib/mock.ts`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
