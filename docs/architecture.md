# Pulse — Architecture Reference

> Living document. Update as decisions change. Reference this at the start of every Claude Code session.

**Direction (current):** Pulse is a **local-first session planner with a lineup creator**. Everything is stored **on the device** — no backend, no accounts, no network required. The next version (v2) adds **account-based cloud sync**: sign in on phone or on the web and see the same library on both. The app is structured now so that arrives as an additive layer, not a rewrite.

---

## Product shape

Two things the MVP does, both fully offline:

1. **Session planner** — diagram drills on a pitch canvas, save them as reusable activities, and sequence activities into a training session. Export a session to PDF/image via the OS share sheet.
2. **Lineups** — build and save a matchday lineup (a formation of labelled players on a pitch), export it the same way.

Everything else (teams/rosters, practices, player development, notes/reflection, AI, payments) is out of the near-term plan. **The headline v2 feature is account-based cloud sync — the same library on phone and web** — with share-by-link as a feature within it.

---

## Stack decisions

| Layer | Choice | Why |
|---|---|---|
| Mobile | Expo bare workflow (RN 0.74+) | Skia needs native modules; bare gets Expo DX without managed limitations |
| Canvas | React Native Skia | GPU-accelerated, gesture-composable, serialisable drawing primitives |
| Navigation | React Navigation v7 (native stack + bottom tabs) | Industry standard, excellent TypeScript support |
| State | Zustand | Lightweight, no boilerplate, easy to slice per domain |
| **Persistence** | **expo-sqlite behind a repository layer** | On-device relational store for sessions, activities, and lineups. Screens never touch SQLite directly — they go through repositories, so the v2 cloud layer is a swap, not a rewrite |
| File/thumbnail storage | expo-file-system | Canvas thumbnails and exported PDFs live in the app's local document directory |
| Export | expo-print + expo-sharing (and/or react-native-view-shot) | Generate a PDF/image on-device and hand it to the native share sheet — no server |
| IDs | Device-generated UUIDs | Cloud-ready primary keys; no server round-trip needed to create a record |

### Deferred to v2 (cloud release)

v2 turns the on-device library into an **account-based, multi-platform** one: a coach signs in and sees the same sessions and lineups on **their phone and on the web**.

| Layer | Choice | Notes |
|---|---|---|
| Backend | Go + Gin | REST API, introduced with v2 |
| Database | PostgreSQL | Server-side copy of the local schema (per-user rows) |
| Object storage | Cloudflare R2 | Thumbnails, exports, shared assets |
| Auth | JWT (access + refresh) | Real accounts — required for a per-coach cloud library |
| Sync | Cloud path inside the repositories | Phone's local SQLite syncs up/down; web reads/writes the cloud directly. Records already carry UUIDs + `updated_at`, so the initial strategy is last-write-wins keyed on `updated_at` |
| Web app | React Native for Web (or a thin web client) | Renders the same library; the **canvas** (Skia) is the one piece to validate on web early |
| Share links | REST + public share tokens | Export/share a session or lineup by URL — a feature *within* the synced product, not the whole of it |
| Payments | Stripe | Later still; only once the cloud service is worth paying for |

> **On a sync engine (e.g. WatermelonDB):** because v2 is now genuine multi-device sync (not just one-way share-to-cloud), a real sync strategy is required. The default plan is to build it **on top of the repository layer** using each record's `updated_at` (last-write-wins), which is enough for a single coach editing their own library across two devices. WatermelonDB becomes worth reconsidering only if conflict handling gets more demanding than that. Decide at the start of v2, not now.

---

## The repository layer (read this before building any data code)

The single most important structural rule in the app: **screens and stores never talk to SQLite directly.** They call a repository — a small module that owns all the storage logic for one kind of data.

```
Screen / store  ──►  Repository (the only thing that knows about storage)  ──►  SQLite
```

There is one repository per data type:

- `activityRepository` — `list()`, `getById(id)`, `create(input)`, `update(id, patch)`, `delete(id)`
- `sessionRepository` — same shape, plus activity ordering
- `lineupRepository` — same shape

Every screen that needs data calls these methods and nothing else. All SQL lives inside the repositories.

**Why this matters for v2:** when cloud sync arrives, the cloud read/write logic is added *inside* (or alongside) the repositories. Screens keep calling the exact same methods, so the phone touches a handful of repository files instead of every screen — and the **web app reuses the same backend the repositories talk to**. This is what lets us start local without painting ourselves into a corner.

---

## Repository structure

Single app, no monorepo (there's no backend to co-locate yet).

```
pulse/
├── src/
│   ├── navigation/
│   │   ├── index.tsx           # Root navigator (tabs + modal stack)
│   │   ├── AppNavigator.tsx     # Bottom tabs
│   │   └── types.ts            # All route param types
│   ├── screens/
│   │   ├── Canvas/
│   │   │   ├── CanvasScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── PitchBackground.tsx
│   │   │   │   ├── ToolPalette.tsx
│   │   │   │   ├── CanvasObject.tsx
│   │   │   │   └── BackgroundPicker.tsx
│   │   │   └── hooks/
│   │   │       ├── useCanvasGestures.ts
│   │   │       └── useCanvasState.ts
│   │   ├── Library/
│   │   │   ├── LibraryScreen.tsx        # Drills / Sessions tabs
│   │   │   ├── SessionBuilderScreen.tsx
│   │   │   └── ActivityDetailScreen.tsx
│   │   └── Lineups/
│   │       ├── LineupsScreen.tsx        # Saved lineups list
│   │       └── LineupEditorScreen.tsx   # Formation + pitch editor
│   ├── components/
│   │   └── ui/                 # Shared primitives (Button, Card, etc.)
│   ├── theme/
│   │   └── theme.ts             # Canonical design tokens — copied verbatim from design.md Appendix
│   ├── db/
│   │   ├── database.ts         # Opens SQLite, enables FKs, runs migrations
│   │   ├── migrations/         # Ordered schema migrations
│   │   └── repositories/
│   │       ├── activityRepository.ts
│   │       ├── sessionRepository.ts
│   │       └── lineupRepository.ts
│   ├── store/
│   │   ├── canvasStore.ts      # Active canvas state (in-memory while editing)
│   │   └── libraryStore.ts     # Cached lists for fast UI (hydrated from repos)
│   ├── types/
│   │   ├── activity.ts
│   │   ├── session.ts
│   │   ├── lineup.ts
│   │   ├── canvas.ts
│   │   └── index.ts
│   └── utils/
│       ├── canvasUtils.ts
│       ├── exportUtils.ts      # PDF/image generation + share sheet
│       └── dateUtils.ts
├── assets/
│   ├── fonts/
│   └── icons/
├── docs/
│   ├── wireframes/
│   ├── architecture.md
│   ├── design.md
│   └── scope.md
├── app.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

No auth stack, no login/signup screens — the app opens straight to the tab bar (Training tab active, no landing dashboard).

---

## Navigation architecture

```
RootNavigator (Native Stack)
│
├── AppNavigator (Bottom Tabs)          ← app opens here directly (no auth gate)
│   │
│   ├── [Tab] Library (Stack)
│   │   ├── LibraryScreen               ← Drills / Sessions segmented tabs
│   │   │     • Drills view: saved activities; no create button (activities are made on the Canvas)
│   │   │     • Sessions view: saved sessions; "+" opens SessionBuilder
│   │   ├── SessionBuilderScreen        ← create/edit a session from saved activities
│   │   └── ActivityDetailScreen
│   │
│   ├── [Tab] Training                  ← center tab. NO screen. Regular tab item, intercepted on press
│   │   └── fires: navigate('Canvas')  ← opens Canvas as full-screen modal
│   │
│   └── [Tab] Lineups (Stack)
│       └── LineupsScreen               ← saved lineups; "+" opens LineupEditor
│
└── Modal Stack (overlays tabs — tab bar hidden)
    ├── CanvasScreen
    └── LineupEditorScreen
```

**Tabs:** Library · Training · Lineups. Three tabs, Training in the center, no Home, no landing dashboard. (The old **Team** tab is replaced by **Lineups**; teams/rosters are out of scope.)
**Training tab:** has no screen of its own — its `tabPress` listener is intercepted to call `navigation.navigate('Canvas')` and `preventDefault()` on the default tab switch, so it never shows a blank/active tab state, it just opens the modal. Same underlying mechanism the old center Create button used, now applied to a normal tab slot instead of a custom raised button.
**Lineups:** created via a "+" on `LineupsScreen` that opens `LineupEditorScreen` as a full-screen modal.
**Library — two sub-views with different create affordances.** The Library screen has a Drills / Sessions segmented toggle. **Drills** lists saved activities and has *no* create button — activities are made on the Canvas (via the Training tab) and appear here once saved; the empty state's "Open canvas" CTA routes to the Canvas. **Sessions** lists saved sessions and *does* have a persistent "+" (in the nav bar's trailing action, matching the Lineups tab), because sessions are born in the `SessionBuilder`, not elsewhere — tapping "+" opens `SessionBuilderScreen` to compose a new session from saved activities. The asymmetry is intentional: a Drills "+" would only bounce to the Canvas (a second door to the same action), whereas Sessions genuinely originate in the builder and so need their own persistent entry point.

**Unsaved-changes guard (Canvas and Lineup editor).** Because both editors are dismissible modals, a swipe-down or back gesture can discard in-progress work with no undo. Both must guard against this: when the editor has unsaved changes, intercept the dismiss (React Navigation `beforeRemove`) and show a confirm prompt ("Discard changes?" — discard / keep editing) before actually closing. With no unsaved changes, dismiss immediately with no prompt. This is a Session 3 concern (it lands with save/undo), but the modal presentation is chosen with this guard as a requirement, not an afterthought — one drill's worth of unsaved marks should never be lost to an accidental swipe.

---

## TypeScript data models

### Canvas (unchanged — shared by activities and lineups)

```typescript
export type CanvasBackground =
  | 'full-pitch' | 'half-pitch' | 'final-third'
  | 'middle-third' | 'penalty-box' | 'blank'

export type ArrowType = 'pass' | 'shot' | 'run' | 'dribble'

export interface BaseCanvasObject {
  id: string
  type: string
  x: number
  y: number
  rotation: number
  scale: number
}

export interface PlayerMarker extends BaseCanvasObject {
  type: 'player'
  label: string        // '' = blank, or 1–2 chars
  teamIndex: 0 | 1
}

export interface Cone extends BaseCanvasObject { type: 'cone'; color?: string }
export interface Ball extends BaseCanvasObject { type: 'ball' }
export interface Pole extends BaseCanvasObject { type: 'pole' }
export interface Ladder extends BaseCanvasObject { type: 'ladder' }
export interface Flag extends BaseCanvasObject { type: 'flag' }
export interface Disc extends BaseCanvasObject { type: 'disc'; color?: string }

export interface Goal extends BaseCanvasObject {
  type: 'goal' | 'mini-goal'
  width: number
}

export interface Zone extends BaseCanvasObject {
  type: 'zone'
  width: number
  height: number
}

export interface Label extends BaseCanvasObject {
  type: 'label'
  text: string
}

export type PlacedObject =
  | PlayerMarker | Cone | Pole | Ladder | Flag | Disc
  | Goal | Ball | Zone | Label

export interface Arrow {
  id: string
  type: ArrowType
  points: { x: number; y: number }[]  // cubic bezier: start, cp1, cp2, end
}

export interface CanvasData {
  version: 1
  background: CanvasBackground
  objects: PlacedObject[]
  arrows: Arrow[]
}
```

### Activity

```typescript
export type ActivityTag =
  | 'warm-up' | 'technical' | 'possession' | 'pressing'
  | 'attacking' | 'defending' | 'transition' | 'finishing' | 'set-piece'

export interface Activity {
  id: string                 // device-generated uuid
  name: string
  tag?: ActivityTag
  durationMinutes?: number
  notes?: string
  canvasData: CanvasData
  thumbnailUri?: string      // local file path (expo-file-system), generated on save
  createdAt: string
  updatedAt: string
}

export interface CreateActivityInput {
  name: string
  tag?: ActivityTag
  durationMinutes?: number
  notes?: string
  canvasData: CanvasData
}
```

### Session

```typescript
export type BlockType =
  | 'warm-up' | 'technical' | 'possession' | 'pressing'
  | 'attacking' | 'defending' | 'transition' | 'game'

export interface SessionActivity {
  id: string
  activityId: string
  activity: Activity
  position: number
  blockType: BlockType       // assigned per session block, not on the activity
  coachingPoints?: string    // assigned per session block, not on the activity
  durationOverride?: number
}

export interface Session {
  id: string                 // device-generated uuid
  name: string
  activities: SessionActivity[]
  totalDurationMinutes: number
  createdAt: string
  updatedAt: string
}
```

### Lineup (new)

A lineup reuses the pitch canvas and player-marker concepts: a formation places labelled markers on a pitch background. No roster is required — labels are entered ad-hoc.

```typescript
export type SquadSize = 7 | 9 | 11

// Formation values are only meaningful together with squadSize —
// e.g. '3-2-3' at 9v9 is a different shape than any 11-a-side formation.
// Each squad size ships exactly 3 named formations + 'custom'.
export type Formation7 = '2-3-1' | '3-2-1' | '3-1-2' | 'custom'
export type Formation9 = '3-3-2' | '3-2-3' | '3-1-3-1' | 'custom'
export type Formation11 = '4-4-2' | '4-3-3' | '4-2-3-1' | 'custom'
export type Formation = Formation7 | Formation9 | Formation11

export interface LineupPosition {
  id: string
  label: string              // player name or 1–2 char initials
  role?: string              // optional slot label (GK, CB, ST, …)
  x: number                  // normalized 0..1 across the pitch
  y: number                  // normalized 0..1 down the pitch
}

export interface Lineup {
  id: string                 // device-generated uuid
  name: string
  matchDate?: string         // ISO date of the fixture
  squadSize: SquadSize
  formation?: Formation      // must be valid for squadSize; 'custom' always allowed
  background: CanvasBackground   // typically 'full-pitch'
  positions: LineupPosition[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateLineupInput {
  name: string
  matchDate?: string
  squadSize: SquadSize
  formation?: Formation
  positions: LineupPosition[]
  notes?: string
}
```

---

## Persistence — local SQLite schema

SQLite via `expo-sqlite`. Enable foreign keys on open (`PRAGMA foreign_keys = ON`). Timestamps are ISO-8601 `TEXT`. Complex structures (canvas data, lineup positions) are stored as JSON `TEXT`. Primary keys are device-generated UUID strings.

```sql
CREATE TABLE activities (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  tag              TEXT,
  duration_minutes INTEGER,
  notes            TEXT,
  canvas_data      TEXT NOT NULL,        -- JSON (CanvasData)
  thumbnail_uri    TEXT,                 -- local file path
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE sessions (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);

CREATE TABLE session_activities (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  activity_id       TEXT NOT NULL REFERENCES activities(id),
  position          INTEGER NOT NULL,
  block_type        TEXT NOT NULL,
  coaching_points   TEXT,
  duration_override INTEGER,
  UNIQUE(session_id, position)
);
CREATE INDEX idx_sa_session_id ON session_activities(session_id);

CREATE TABLE lineups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  match_date  TEXT,
  squad_size  INTEGER NOT NULL,          -- 7, 9, or 11
  formation   TEXT,
  background  TEXT NOT NULL DEFAULT 'full-pitch',
  positions   TEXT NOT NULL,             -- JSON (LineupPosition[])
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
```

> The schema deliberately mirrors what a server-side Postgres schema would look like (same tables, same columns, UUID keys). When v2 cloud lands, the server schema is a near-copy and the repositories gain an upload path — no local data model changes required.

---

## Export (local, in MVP)

- A session or lineup can be exported to **PDF or image on-device** and handed to the **native share sheet** (AirDrop, Messages, email, etc.) via `expo-print` / `expo-sharing` (or `react-native-view-shot` for image capture of the pitch).
- **Session PDF pagination:** sessions with up to **6 activities** export on a single page; sessions beyond that paginate automatically (additional pages continue the activity list). Threshold is a tunable constant, not a hard architectural limit — revisit once real sessions are on screen.
- This is entirely local — no account, no upload.
- A **shareable cloud link** (recipient opens it cross-platform without the app) is the v2 feature and requires the backend.

---

## Build order — Claude Code sessions

### Phase 1 — Foundation
| Session | Deliverable | Done when |
|---|---|---|
| 1 | Expo app + navigation shell + SQLite + repository scaffold + `theme.ts` | App runs; 3 tabs work (Library, Training→Canvas modal in center, Lineups); DB opens, migrations run, empty repositories wired; `src/theme/theme.ts` created verbatim from `design.md` Appendix and imported by at least one screen |

### Phase 2 — Session planner (core loop)
| Session | Deliverable | Done when |
|---|---|---|
| 2 | Canvas: backgrounds + object placement | All 6 backgrounds (white pitch, dark line markings); all tool-palette items placeable; equipment rendered from the SVG assets in `assets/icons/` recolored to `canvasInk` (Cone, Pole, Ladder, Flag, Disc as concentric circles, Goal + Mini-goal as separate assets, Ball); player tool offers plain + GK + Co presets; placed objects can be **dragged to reposition** (no selection/handles/toolbar yet — those are Session 3); `Cone`/`Disc` carry the optional `color` field (default `canvasInk`; editing UI is Session 3) |
| 3 | Canvas: selection + arrows + undo + save | Full interaction; all 4 arrow types; undo/redo; activity saves locally with a thumbnail; appears in Library; unsaved-changes guard on dismiss (confirm before discarding in-progress marks) |
| 4 | Activity library + Session builder | Drills grid + tag filter; Sessions view with a persistent "+" that opens the builder; create session, add/reorder activities, set block type + coaching points — all persisted locally |

### Phase 3 — Lineups
| Session | Deliverable | Done when |
|---|---|---|
| 5 | Lineup editor + list | Pick a squad size (7v7/9v9/11v11), then a formation for that size (3 named + custom), arrange/label players on the pitch, set name + match date, save locally; saved lineups list with open/delete |

### Phase 4 — Export + polish
| Session | Deliverable | Done when |
|---|---|---|
| 6 | Local export + polish + build | Session/lineup export to PDF/image via share sheet; tab bar and remaining screens polished to design.md spec; EAS build |

### v2 (later) — Account-based cloud sync
Introduce the Go/Postgres/R2 backend and real accounts (JWT), give the repositories a cloud read/write path (last-write-wins on `updated_at`), and build a **web app** that renders the same library. Share-by-link rides along as a feature within the synced product. The phone stays local-first and syncs up/down; screens are untouched. Validate the Skia canvas on web early — it's the one component that needs porting.

---

## Environment variables

The MVP needs **no server secrets** — there is no backend. (Cloud config — API URL, R2, JWT, etc. — is introduced with v2.)

---

## Decisions log

| Decision | Choice | Rationale |
|---|---|---|
| Product scope | Local session planner + lineups | Ship a focused, offline, single-purpose tool first |
| Persistence | expo-sqlite + repository layer | On-device relational store; repositories isolate storage so cloud is an additive swap |
| No backend at MVP | Correct | Nothing requires a server until cross-platform sharing exists |
| No accounts at MVP | Correct | Accounts only make sense once there's a cloud to sign into |
| IDs | Device-generated UUIDs | Cloud-ready keys; no server round-trip to create records |
| Lineups | Reuse pitch canvas + player markers | New feature is composition of existing primitives, not new foundations |
| Local export | expo-print / expo-sharing (share sheet) | Coaches can share now without any cloud |
| Offline-sync engine (WatermelonDB) | Not now; revisit at v2 | v2 needs real multi-device sync; default plan builds it on the repository layer (last-write-wins), reconsider WatermelonDB only if conflicts get harder |
| Expo workflow | Bare | Skia requires native modules; managed too restrictive |
| State management | Zustand | No boilerplate; sliced per domain |
| v2 = account-based cloud sync (phone + web) | Headline next version | Same library on both platforms; web reuses the repositories' backend; share-links are a feature within it |
| Backend, auth, payments, teams, AI | Deferred | Post-MVP; introduced with (or after) v2 sync |
| Equipment objects | Per-type interfaces (`Pole`, `Ladder`, `Flag`, `Disc`), same pattern as `Cone`/`Ball`/`Goal` | Keeps `PlacedObject` switches exhaustively checked by TypeScript as the curated set grows |
| Dribble line treatment | Squiggly/wavy — finalized | Matches common coaching-diagram convention; no further revision planned |
| Lineup formations | Squad-size-scoped: 3 named formations + custom per size (7v7/9v9/11v11) | Matches real youth match formats instead of only 11-a-side |
| Session PDF export | Single page up to 6 activities, paginate beyond | Keeps typical sessions readable as one sheet without illegibly compressing long ones |
| Navigation | 3 tabs (Library · Training · Lineups), Training in center, no Home tab, no adaptive home content, no raised center Create button | Simpler nav surface; Training is the primary action so it sits center (under the thumb, where the old Create button was); Training tab intercepts its own tabPress to open Canvas directly |
| Pitch rendering | White fill, dark (`canvasInk`) line markings — not a green turf | Maximum legibility for marks/objects, print-friendly, no new color token needed |
| Equipment art | Real SVG assets in `assets/icons/`, recolored to `canvasInk` on load; disc as concentric circles; goal & mini-goal as separate assets | Higher fidelity than hand-drawn Skia primitives; source SVGs were green-pitch colored so they're recolored for the white pitch |
| Per-object color (cone/disc) | Add optional `color` field in Session 2; editing UI in Session 3 with selection | Data model first, UI later — keeps Session 2 to placement while making Session 3's color picker a wiring task |
| Reposition in Session 2 | Drag-to-move placed objects (no selection box/handles/toolbar) | Placement-refinement so mis-taps are fixable; full selection stays Session 3 |
