# Pulse — Product Scope

> The boundary document. It defines what the MVP is, the principles that don't change, and what is deliberately deferred. **Check this before adding any feature.** If a task touches something marked deferred or parked, stop and confirm before building.

---

## Vision

A focused, premium tool for **solo youth soccer coaches** — the ones running club, high-school, or competitive teams without assistant staff. Pulse does two things well: it lets a coach **plan training sessions** on a pitch canvas, and **set matchday lineups**. Everything is stored **on the coach's device** — it works with no account and no internet. The interface is clean, minimal, and content-led.

The next version adds **account-based cloud sync** — sign in on your phone or on the web and see the same sessions and lineups on both.

---

## Target user

A single coach doing everything themselves. They plan sessions and set lineups — alone, on a phone, often on the touchline or the night before a match. The product optimizes for that person.

---

## MVP scope (non-negotiable core)

Two features, both fully offline and stored locally:

### 1. Session planner

> **Free-draw canvas → activity library → session builder → local export.**

- **Canvas** — pitch with tool palette, background picker, player markers, equipment, and movement lines (pass / shot / off-ball / dribble). Free-draw diagramming of a single drill or phase.
- **Activity library** — save canvas diagrams as reusable activities. An activity carries a name, a single `tag`, optional duration, and freeform notes. Grid view with filter chips that key off the activity tag.
- **Session builder** — sequence activities into a session (the hybrid card: color bar + canvas thumbnail + inline expandable coaching points). **Block type and coaching points are assigned per session block** (`SessionActivity`) when an activity is dropped into a session — not on the activity itself. The same activity can be a "warm-up" in one session and "technical" in another.

### 2. Lineups

- Build a matchday lineup by picking a **squad size** (7v7 / 9v9 / 11v11), then a **formation** for that size (three named options + custom free placement), and arranging **labelled players** on a pitch. Reuses the canvas pitch and player markers — no roster needed; labels are entered ad-hoc.
- Save lineups locally with a name and match date; browse, reopen, and delete them.

### Shared: local export

- Export a session or a lineup to **PDF/image on-device** and hand it to the **native share sheet** (AirDrop, Messages, email). This is local — no account, no upload. A shareable **cloud link** is the v2 feature.
- Sessions up to 6 activities export on a single PDF page; longer sessions paginate automatically (see `docs/architecture.md`).

This is the entire build — roughly six Claude Code sessions across four phases (see `docs/architecture.md`). **There is no backend, no account, and no network dependency in the MVP.**

---

## Permanent principles

These hold regardless of release. They are not features to be traded away.

1. **Focused by design.** The app does session planning and lineups well rather than doing everything adequately. A coach who only ever plans sessions is a complete user — the UI must never imply otherwise.
2. **Local-first.** Everything works offline and lives on the device. No account, no network required to use the app. Cloud sharing is an *additive* v2 layer, never a prerequisite.
3. **Content is reusable and coach-owned.** Activities, sessions, and lineups live in a personal on-device library and are reusable. The coach owns their content; it is never held hostage to a login.
4. **Storage goes through repositories.** Screens never talk to the database directly — they go through a repository layer (see `docs/architecture.md`). This is what lets cloud sharing arrive later without a rewrite.
5. **Simple, direct navigation.** Three tabs, no landing dashboard: **Library**, **Training** (center — opens the canvas directly), **Lineups**. No adaptive home state, no engagement-based content — the app gets out of the way and takes the coach straight to work.
6. **Content leads, UI disappears.** Premium, minimal, typography-led. (See `docs/design.md`.)

---

## Navigation

Three tabs: **Library · Training · Lineups**, with Training in the center. Training has no screen of its own — tapping it opens the Canvas full-screen modal directly (see `docs/architecture.md`). There is no Home tab, no landing dashboard, and no adaptive/engagement-based home content. The coach opens the app and is one tap from either drawing a drill, browsing their library, or setting a lineup.

---

## v2 — Account-based cloud sync (the headline next step)

The one clearly-planned next version. It turns the on-device library into a **per-coach cloud library available on both phone and web**: a coach signs in and sees the same sessions and lineups everywhere.

What it introduces:
- **Accounts** (JWT) — required, since the library now belongs to a coach rather than a device.
- A **backend** (Go + Postgres + R2) holding a per-user copy of the same data.
- **Sync** — the phone stays local-first and syncs its SQLite up/down; the web reads/writes the cloud directly. Records already carry UUIDs and `updated_at`, so the starting strategy is last-write-wins.
- A **web app** that renders the same library. It's built on the same stack (React Native for Web); the canvas (Skia) is the one piece to validate on web early.
- **Share-by-link** — export/share a session or lineup by URL, as a feature *within* the synced product.

Because all storage already flows through the repository layer, this lands as an additive path inside the repositories — the phone screens are untouched, and the web app reuses the same backend. See `docs/architecture.md`.

---

## Later / backlog (post-v2)

Real possibilities, but well beyond the current plan. Do not implement without an explicit decision to pull them forward.

- **Teams & rosters** — managed player lists, injury tracking.
- **Practice scheduling** — a calendar of practices with sessions assigned to dates.
- **On-pitch run view** — swipe through a session's drills with a timer and check-off.
- **Notes & reflection** — quick notes and post-session reflection.
- **AI assistance** — reactive, contextual prompts; voice-note transcription; pre-game briefs. (Reactive, never prescriptive.)
- **Player development** — challenge-based individual development plans (IDPs).
- **Season management** — a season/fixtures hierarchy with W-T-L records.
- **Payments** — a paid tier, once there is a cloud service worth paying for.
- **Multi-user / assistant coach**, and a **partnership drill library**.

---

## Parked / unresolved

Decisions intentionally not made yet. Surface these when relevant rather than guessing.

- **Pricing** — no payments in the MVP; the model and price are entirely open until a cloud service exists.

All other items previously parked here — lineup formation set, session PDF pagination, equipment data model, dribble line treatment — are resolved. See the decisions log in `docs/architecture.md` and §7 of `docs/design.md`.

---

## Out of scope (for now)

- Anything serving leagues, clubs, or multi-coach organizations as the primary user. Pulse optimizes for the solo coach.
- Real-time collaboration or live match operations.
- A **web app in the MVP.** The MVP is mobile-only; the web experience arrives in **v2** as part of account-based cloud sync (see above), not before.
