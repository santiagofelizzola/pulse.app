# Pulse

A focused, local-first mobile tool for solo youth soccer coaches: **plan training sessions** on a pitch canvas and **set matchday lineups** — all stored on the device, no account or internet required. Built for coaches who run club, high-school, and competitive teams without assistant staff.

**Status:** Pre-build. Scope finalized, wireframes done, design system in place. MVP implementation starting.

---

## What it does (MVP)

Two features, both fully offline and stored locally on the phone:

1. **Session planner** — *free-draw canvas → activity library → session builder → local export.* Diagram a drill on a full-screen pitch, save it as a reusable activity, sequence activities into a training session, and export to PDF/image via the OS share sheet.
2. **Lineups** — pick a formation, arrange and label players on a pitch, and save the matchday lineup for the weekend. Reuses the same pitch and player markers as the canvas.

There is **no backend, no account, and no network dependency** in the MVP. The headline next version (v2) adds **account-based cloud sync** — sign in on phone or web and see the same library on both, with share-by-link included. See [`docs/scope.md`](docs/scope.md) for the full boundary.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Expo bare workflow, RN 0.74+) + React Native Skia |
| Navigation | React Navigation v7 (native stack + bottom tabs) |
| Client state | Zustand |
| Persistence | expo-sqlite, behind a repository layer |
| Files / thumbnails | expo-file-system |
| Export | expo-print + expo-sharing (native share sheet) |
| Typeface | Poppins (`@expo-google-fonts/poppins`) |
| Version control | GitHub |
| Build tooling | Claude Code (VS Code extension) |

**Introduced in v2 (account-based cloud sync):** Go + Gin, PostgreSQL, Cloudflare R2, JWT auth, a web app (React Native for Web), hosting (Railway). None of these exist in the MVP.

---

## Documentation

These are the durable references for the project. Read them before building anything.

| Doc | What it covers |
|---|---|
| [`docs/scope.md`](docs/scope.md) | Product scope — what the MVP is, the permanent principles, and what's deferred. **Read this before adding any feature.** |
| [`docs/design.md`](docs/design.md) | Design system — color/type/spacing/radius tokens, component specs, canvas rules, and the canonical `theme.ts`. **All UI imports tokens from here; no hardcoded values.** |
| [`docs/architecture.md`](docs/architecture.md) | System architecture — the repository layer, local SQLite schema, data models, navigation, and folder structure. |

---

## Getting started

> Commands are placeholders until the project is scaffolded — update once the Expo app exists.

```bash
npm install
npx expo run:ios        # or run:android
```

No backend to run — the app is entirely on-device. Fonts (Poppins) are bundled via `@expo-google-fonts/poppins` and must finish loading before first paint; the splash screen is held until they're ready. See the typeface section of [`docs/design.md`](docs/design.md).

---

## Conventions

- **Design tokens are the source of truth.** Import `colors`, `typography`, `spacing`, `radius`, etc. from `src/theme/theme.ts`. Never hardcode a hex value, font size, or pixel margin in a component.
- **Type weight is set via `fontFamily`, never `fontWeight`** — custom fonts render unreliably with `fontWeight` on Android.
- **Local-first.** Everything works offline and lives on the device. No accounts, no network in the MVP.
- **Storage goes through repositories.** Screens and stores call `activityRepository` / `sessionRepository` / `lineupRepository` — never SQLite directly. This is what lets v2 cloud sync (and the web app) arrive without a rewrite. See [`docs/architecture.md`](docs/architecture.md).
- **Respect the scope boundary.** The MVP is the session planner + lineups. If a task touches a later feature (cloud sync, web app, teams, AI, payments, etc.), stop and confirm before building it. See [`docs/scope.md`](docs/scope.md).
