# Pulse — CLAUDE.md

Read these three docs before starting any work in this repo:

- `docs/architecture.md` — system architecture, data models, repository layer, build order. **Source of truth if anything conflicts with the other two docs.**
- `docs/design.md` — design tokens, component specs, canvas rules. All UI must import from `src/theme/theme.ts`, defined in this doc's appendix.
- `docs/scope.md` — what's in the MVP and what's explicitly deferred. If a task touches something marked deferred, stop and confirm before building it.

## Non-negotiable conventions

- **Repository layer only.** Screens and Zustand stores never call SQLite directly — always go through `activityRepository` / `sessionRepository` / `lineupRepository` (see `docs/architecture.md`). This is what lets v2 cloud sync arrive without a rewrite.
- **`fontFamily`, never `fontWeight`.** Custom Poppins weights render unreliably on Android with `fontWeight`. Always set `fontFamily` to the specific weight (e.g. `Poppins_600SemiBold`) via the `fonts` token.
- **No hardcoded style values.** Colors, spacing, radius, typography — all imported from `theme.ts`. No raw hex codes or magic pixel numbers in components.
- **Local-first, no exceptions in the MVP.** No network calls, no auth, no backend code. Everything lives in on-device SQLite via `expo-sqlite`.

## Build order

Follow the Claude Code session sequence in `docs/architecture.md` (Build order section) — one session per table row, in order. Don't jump ahead to a later session's deliverable even if it looks convenient mid-task.

## Commands

```bash
npm install
npx expo run:ios        # or run:android
```

No backend to run or configure — the app is entirely on-device.
