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
// `variant` is a Session 2 scaffolding field so the two comparison ball assets render
// distinctly on canvas. Collapse to a single fixed asset (and drop this field) once one is picked.
export interface Ball extends BaseCanvasObject { type: 'ball'; variant?: 'bw' | 'color' }
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
