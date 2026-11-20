# Catopia project instructions

## Product identity

Catopia is a cozy, artistic community world dedicated to real cats around a campus and its neighborhood. Preserve the indie-game visual direction: warm cream, sage, muted forest green, terracotta, readable typography, organic details and restrained motion. Avoid generic SaaS layouts.

## Engineering

- Use TypeScript and keep features modular.
- Keep business rules out of visual components.
- Treat Supabase as the planned source of truth; never fabricate persisted production data.
- Validate user input on the server and enforce permissions with trusted server/database rules.
- Use migrations for schema changes. Never expose service-role credentials in browser code.
- Keep the app runnable and implement features in dependency order.
- Do not mark a feature complete without observing it work and recording what was checked.

## World and animal safety

- Share location/world records between the map and 3D view.
- Keep real geographic coordinates separate from presentation coordinates.
- Show public landmarks or approximate locations by default; do not expose precise sensitive cat locations.
- Use manual-first cat identity review. Similar photographs may suggest a match but must not automatically merge identities.
- Do not encourage chasing, feeding, handling, or disturbing cats.

## Assets

- Inspect existing assets before creating replacements.
- Verify source, author, license, attribution, format, compatibility and file size before production use.
- Prefer coherent, optimized web assets; do not import a pack wholesale.
- Maintain the asset catalog, license register and compatibility report as assets are added.
- Never claim a download or license check succeeded unless verified.

## Workflow

1. Read relevant project docs and inspect existing code/assets.
2. Identify dependencies and security/privacy implications.
3. Implement one stage at a time.
4. Run the checks relevant to the change and report exact results.
5. Update `docs/PROJECT_STATUS.md`, the implementation plan and decision/issue logs as needed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
