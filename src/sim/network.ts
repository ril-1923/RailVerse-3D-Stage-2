import * as THREE from 'three';
import type { StationDef, TrainDef, SignalState } from './types';

// ---------------------------------------------------------------------------
// Track network geometry
// ---------------------------------------------------------------------------

/** A closed main loop used by most trains. */
export const MAIN_LOOP_RADIUS = 130;

/** Station layout around the loop (angles in degrees, clockwise order). */
export const STATIONS: StationDef[] = [
  { id: 'CTR', name: 'Central Station', trackPos: 0, platformSide: -1, color: '#38bdf8' },
  { id: 'RVS', name: 'Riverside Junction', trackPos: 1, platformSide: 1, color: '#4ade80' },
  { id: 'MAP', name: 'Maple Grove', trackPos: 2, platformSide: 1, color: '#fbbf24' },
  { id: 'IRN', name: 'Ironworks Park', trackPos: 3, platformSide: 1, color: '#f87171' },
  { id: 'HRB', name: 'Harbor Terminal', trackPos: 4, platformSide: 1, color: '#c084fc' },
];

/** Angles (degrees) around the loop at which each station sits, in travel order. */

export const STATION_ANGLES = [0, 72, 144, 216, 288]; // degrees, order of travel

const DEG = Math.PI / 180;

/** Compute a point on the main loop for a given angle in degrees. */
export function loopPoint(angleDeg: number, radius = MAIN_LOOP_RADIUS): THREE.Vector3 {
  const a = angleDeg * DEG;
  return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
}

/** Station world positions on the main loop. */
export const STATION_POINTS = STATION_ANGLES.map((a) => loopPoint(a));

/** Total main loop length in meters (1 unit = 1 meter). */
export const MAIN_LOOP_LENGTH = 2 * Math.PI * MAIN_LOOP_RADIUS;

/**
 * Build the track centerline: a closed 3D path made of the main circle plus
 * gentle vertical undulation for realism. Returns sampled points and a
 * Catmull-Rom closed curve for exact arc-length evaluation.
 */
function buildLoopCurve(): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const N = 72;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 360;
    const p = loopPoint(a);
    p.y = 0.6 * Math.sin((i / N) * Math.PI * 4) + 0.3 * Math.cos((i / N) * Math.PI * 7);
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
}

export const LOOP_CURVE = buildLoopCurve();

/**
 * A straight branch/loop siding used by the freight route: passes near
 * Harbor Terminal and rejoins. Built as its own closed path segment.
 */
function buildSidingCurve(): THREE.CatmullRomCurve3 {
  const p0 = loopPoint(288).clone().multiplyScalar(0.82);
  const p1 = new THREE.Vector3(18, 0.4, 132);
  const p2 = new THREE.Vector3(85, -0.2, 118);
  const p3 = loopPoint(324).clone().multiplyScalar(0.9);
  const p4 = loopPoint(306).clone().multiplyScalar(0.7);
  return new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4], true, 'catmullrom', 0.5);
}

export const SIDING_CURVE = buildSidingCurve();
export const SIDING_LENGTH = SIDING_CURVE.getLength();

/**
 * Get position + tangent (as a quaternion-ready basis) at a distance along
 * the main loop, with arc-length parameterization.
 */
export function loopPose(dist: number): { pos: THREE.Vector3; tangent: THREE.Vector3 } {
  const d = ((dist % MAIN_LOOP_LENGTH) + MAIN_LOOP_LENGTH) % MAIN_LOOP_LENGTH;
  const t = d / MAIN_LOOP_LENGTH;
  return { pos: LOOP_CURVE.getPointAt(t), tangent: LOOP_CURVE.getTangentAt(t) };
}

/** Siding pose helper. */
export function sidingPose(dist: number): { pos: THREE.Vector3; tangent: THREE.Vector3 } {
  const d = ((dist % SIDING_LENGTH) + SIDING_LENGTH) % SIDING_LENGTH;
  const t = d / SIDING_LENGTH;
  return { pos: SIDING_CURVE.getPointAt(t), tangent: SIDING_CURVE.getTangentAt(t) };
}

/** Distance along the loop for a given station index. */
export function stationTrackDistance(stationIdx: number): number {
  return (STATION_ANGLES[stationIdx] / 360) * MAIN_LOOP_LENGTH;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export interface RouteDef {
  id: number;
  name: string;
  color: string;
  path: number[]; // station indices
  usesSiding?: boolean;
}

export const ROUTES: RouteDef[] = [
  { id: 1, name: 'Coastal Express', color: '#38bdf8', path: [0, 1, 2, 3, 4] },
  { id: 2, name: 'Valley Regional', color: '#4ade80', path: [0, 2, 4] },
  { id: 3, name: 'City Metro Loop', color: '#fbbf24', path: [0, 1, 2, 3, 4] },
  { id: 4, name: 'Ironworks Freight', color: '#f87171', path: [4, 0, 1], usesSiding: true },
  { id: 5, name: 'Harbor High-Speed', color: '#c084fc', path: [0, 4, 1, 3] },
  { id: 6, name: 'Riverside Commuter', color: '#fb923c', path: [1, 2, 3, 4, 0] },
];

// ---------------------------------------------------------------------------
// Trains
// ---------------------------------------------------------------------------

export const TRAINS: TrainDef[] = [
  {
    id: 1, number: 'RX-101', name: 'Coastal Express', kind: 'Express',
    color: '#0ea5e9', accent: '#e0f2fe', maxSpeed: 160, carriages: 4,
    route: [0, 1, 2, 3, 4],
  },
  {
    id: 2, number: 'RG-202', name: 'Valley Regional', kind: 'Regional',
    color: '#22c55e', accent: '#dcfce7', maxSpeed: 120, carriages: 3,
    route: [0, 2, 4],
  },
  {
    id: 3, number: 'MT-303', name: 'City Metro', kind: 'Metro',
    color: '#eab308', accent: '#fef9c3', maxSpeed: 100, carriages: 4,
    route: [0, 1, 2, 3, 4],
  },
  {
    id: 4, number: 'FR-404', name: 'Ironworks Freight', kind: 'Freight',
    color: '#ef4444', accent: '#fee2e2', maxSpeed: 80, carriages: 5,
    route: [4, 0, 1],
  },
  {
    id: 5, number: 'HS-505', name: 'Harbor Bullet', kind: 'High-Speed',
    color: '#a855f7', accent: '#f3e8ff', maxSpeed: 160, carriages: 3,
    route: [0, 4, 1, 3],
  },
  {
    id: 6, number: 'CM-606', name: 'Riverside Commuter', kind: 'Commuter',
    color: '#f97316', accent: '#ffedd5', maxSpeed: 110, carriages: 3,
    route: [1, 2, 3, 4, 0],
  },
];

// ---------------------------------------------------------------------------
// Signals — one per block boundary on the main loop, 8 blocks
// ---------------------------------------------------------------------------

export const SIGNAL_COUNT = 8;

export function buildSignals(): SignalState[] {
  const signals: SignalState[] = [];
  for (let i = 0; i < SIGNAL_COUNT; i++) {
    const angle = (i / SIGNAL_COUNT) * 360;
    const dist = (angle / 360) * MAIN_LOOP_LENGTH;
    signals.push({
      id: `S${String(i + 1).padStart(2, '0')}`,
      aspect: 'green',
      blockId: i,
      pos: dist,
      side: i % 2 === 0 ? 1 : -1,
      branch: 'main',
    });
  }
  return signals;
}

/** Block length used by the signalling logic. */
export const BLOCK_LENGTH = MAIN_LOOP_LENGTH / SIGNAL_COUNT;

export function blockOf(dist: number): number {
  const d = ((dist % MAIN_LOOP_LENGTH) + MAIN_LOOP_LENGTH) % MAIN_LOOP_LENGTH;
  return Math.floor(d / BLOCK_LENGTH) % SIGNAL_COUNT;
}
