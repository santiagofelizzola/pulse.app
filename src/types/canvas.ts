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
  // Paint order relative to every other object AND arrow (a single shared counter, not just
  // within this array) — lets "bring to front" move an object above arrows and vice versa.
  // See canvasStore.ts's nextZIndex.
  zIndex: number
}

export interface PlayerMarker extends BaseCanvasObject {
  type: 'player'
  label: string        // '' = blank, or 1–2 chars
  teamIndex: 0 | 1
  color?: string        // fill color; defaults to colors.surface (white) when unset
}

export interface Cone extends BaseCanvasObject { type: 'cone'; color?: string }
// `variant` is a Session 2 scaffolding field so the two comparison ball assets render
// distinctly on canvas. Collapse to a single fixed asset (and drop this field) once one is picked.
export interface Ball extends BaseCanvasObject { type: 'ball'; variant?: 'bw' | 'color' }
// Pole/Ladder/Flag/Disc: types retained for possible future re-add, but removed from the tool
// palette as of the Session 2 simplification (see store/canvasStore.ts's PlaceableToolType).
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

// Circle counterpart to Zone (rectangle) — a separate per-type interface rather than a
// 'shape' + variant field, matching the established pattern (see architecture.md's
// "Equipment objects" decisions-log entry re: per-type interfaces over generic+variant).
export interface CircleZone extends BaseCanvasObject {
  type: 'circle-zone'
  radius: number
}

export interface Label extends BaseCanvasObject {
  type: 'label'
  text: string
}

export type PlacedObject =
  | PlayerMarker | Cone | Pole | Ladder | Flag | Disc
  | Goal | Ball | Zone | CircleZone | Label

export interface Arrow {
  id: string
  type: ArrowType
  points: { x: number; y: number }[]  // cubic bezier: start, cp1, cp2, end
  zIndex: number
}

export interface CanvasData {
  version: 1
  background: CanvasBackground
  objects: PlacedObject[]
  arrows: Arrow[]
}
