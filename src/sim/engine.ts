import type {
  Announcement,
  PassengerJourney,
  SignalState,
  TrainState,
} from './types';
import {
  BLOCK_LENGTH,
  MAIN_LOOP_LENGTH,
  ROUTES,
  SIGNAL_COUNT,
  STATIONS,
  TRAINS,
  blockOf,
  loopPose,
  sidingPose,
  stationTrackDistance,
} from './network';

export type { TrainState } from './types';

export interface WorldState {
  trains: TrainState[];
  signals: SignalState[];
  passengers: PassengerJourney[];
  announcements: Announcement[];
  time: number; // seconds since sim start
  weather: 'clear' | 'cloudy' | 'rain' | 'fog';
  emergency: boolean;
  throughput: number; // passengers arrived at destination
  boardedTotal: number;
}

export function createWorld(): WorldState {
  const trains: TrainState[] = TRAINS.map((def) => {
    const route = def.route;
    const startStation = route[0];
    const dist = stationTrackDistance(startStation);
    return {
      id: def.id,
      def,
      dist: dist + def.id * 6, // small stagger so trains don't overlap visually
      legIndex: 0,
      direction: 1,
      speed: 0,
      targetSpeed: Math.round(def.maxSpeed * 0.6),
      status: 'Stopped',
      paused: false,
      started: false,
      reversing: false,
      reversingPending: false,
      doorOpen: false,
      boardingTimer: 0,
      passengerCount: 0,
      capacity: 80 + def.carriages * 40,
      nextStationIndex: 1 % route.length,
      distToNextStation: 0,
      etaSeconds: 0,
      condition: 92 + Math.random() * 8,
      delaySeconds: 0,
      wheelRotation: 0,
      signalHold: false,
      emergency: false,
    };
  });

  const signals = Array.from({ length: SIGNAL_COUNT }, (_, i) => {
    const angle = (i / SIGNAL_COUNT) * 360;
    return {
      id: `S${String(i + 1).padStart(2, '0')}`,
      aspect: 'green' as const,
      blockId: i,
      pos: (angle / 360) * MAIN_LOOP_LENGTH,
      side: (i % 2 === 0 ? 1 : -1) as 1 | -1,
      branch: 'main' as const,
    };
  });

  const passengers: PassengerJourney[] = [];
  let pid = 0;
  for (let i = 0; i < 160; i++) {
    const originIndex = i % STATIONS.length;
    let destIndex = (originIndex + 1 + Math.floor(Math.random() * (STATIONS.length - 1))) % STATIONS.length;
    passengers.push({
      id: pid++,
      originIndex,
      destIndex,
      state: i % 3 === 0 ? 'toPlatform' : 'waiting',
      walkT: Math.random(),
      trainId: null,
      waitTimer: Math.random() * 20,
      seed: Math.random() * 1000,
    });
  }

  return {
    trains,
    signals,
    passengers,
    announcements: [
      {
        id: 0,
        text: 'RailVerse control center online. All systems nominal.',
        kind: 'info',
        time: '00:00',
      },
    ],
    time: 0,
    weather: 'clear',
    emergency: false,
    throughput: 0,
    boardedTotal: 0,
  };
}

// mutable announcement id counter
let annId = 1;
export function nextAnnouncementId(): number {
  return annId++;
}

export interface SimEvents {
  onArrival?: (train: TrainState, stationIndex: number) => void;
  onDeparture?: (train: TrainState, stationIndex: number) => void;
}

/**
 * Advance the simulation by dt seconds. This is a pure mutation of the world
 * state (for performance) driven from a single animation loop.
 */
export function stepSim(world: WorldState, dt: number, events?: SimEvents) {
  world.time += dt;

  // ---- Signals: compute block occupancy from train positions ----
  const blockOccupancy = new Array(SIGNAL_COUNT).fill(false);
  for (const train of world.trains) {
    if (train.status === 'At station' || train.status === 'Boarding' || train.status === 'Stopped') {
      // stopped trains still occupy their block
    }
    blockOccupancy[blockOf(train.dist + 4)] = true; // +4m lookahead of lead wheels
  }

  for (const sig of world.signals) {
    const occ = blockOccupancy[sig.blockId];
    const nextBlock = (sig.blockId + 1) % SIGNAL_COUNT;
    if (occ) sig.aspect = 'red';
    else if (blockOccupancy[nextBlock]) sig.aspect = 'yellow';
    else sig.aspect = 'green';
  }

  // ---- Trains ----
  for (const train of world.trains) {
    stepTrain(world, train, dt, blockOccupancy, events);
  }

  // ---- Passengers ----
  stepPassengers(world, dt);
}

function speedMs(train: TrainState): number {
  return train.speed / 3.6;
}

function legLength(train: TrainState): number {
  // length of current leg along the loop, respecting route order
  const route = train.def.route;
  const from = route[train.legIndex % route.length];
  const to = route[(train.legIndex + 1) % route.length];
  const a = stationTrackDistance(from);
  const b = stationTrackDistance(to);
  let d = b - a;
  if (d < 0) d += MAIN_LOOP_LENGTH;
  return d;
}

function stepTrain(
  world: WorldState,
  train: TrainState,
  dt: number,
  blockOccupancy: boolean[],
  events?: SimEvents,
) {
  const route = train.def.route;
  const routeLen = route.length;

  // Track full route progress for passenger destination matching
  const leg = legLength(train);

  // Distance from current position to next station along travel direction
  const nextRouteIdx = train.nextStationIndex % routeLen;
  const nextStationIdx = route[nextRouteIdx];
  const targetDist = stationTrackDistance(nextStationIdx);

  // distance ahead along loop to reach target
  let toTarget = targetDist - train.dist;
  toTarget = ((toTarget % MAIN_LOOP_LENGTH) + MAIN_LOOP_LENGTH) % MAIN_LOOP_LENGTH;
  if (toTarget < 0.5 && train.speed < 1 && train.status !== 'Departing') {
    // effectively at target
  }
  train.distToNextStation = toTarget;

  // ---- Station stop / boarding state machine ----
  if (train.boardingTimer > 0) {
    train.boardingTimer -= dt;
    train.status = train.boardingTimer > 0 ? (train.doorOpen ? 'Boarding' : 'Departing') : 'Departing';
    if (train.boardingTimer <= 0) {
      train.doorOpen = false;
      train.status = 'Departing';
      events?.onDeparture?.(train, nextStationIdx);
      // depart
      train.boardingTimer = 0;
    }
    // while boarding, speed stays 0
    train.speed = 0;
    updateEta(train);
    return;
  }

  if (train.emergency || world.emergency) {
    train.status = 'Emergency stop';
    train.speed = Math.max(0, train.speed - 60 * dt * 3.6);
    advancePosition(train, dt);
    return;
  }

  if (!train.started || train.paused || (train.status === 'Stopped' && !train.reversing)) {
    train.speed = Math.max(0, train.speed - 30 * dt * 3.6);
    train.status = train.paused ? train.status : train.started ? train.status : 'Stopped';
    if (!train.started) train.status = 'Stopped';
    updateEta(train);
    // still advance position slightly to come to rest smoothly
    advancePosition(train, dt);
    return;
  }

  // ---- Signal check ahead ----
  const lookAhead = 12 + speedMs(train) * 3; // braking distance in meters
  let holdForSignal = false;
  const blocksAhead: number[] = [];
  for (let m = 2; m <= lookAhead; m += 4) {
    blocksAhead.push(blockOf(train.dist + m));
  }
  for (const b of blocksAhead) {
    if (blockOccupancy[b]) {
      // is the occupancy caused by ourselves? If our own tail is in this block only, ignore
      holdForSignal = true;
      break;
    }
  }

  // Determine whether the next block (beyond immediate lookahead) is occupied
  const nextBlock = blockOf(train.dist + lookAhead + BLOCK_LENGTH);
  const twoBlocksAhead = blockOf(train.dist + lookAhead + BLOCK_LENGTH * 2);
  if (!holdForSignal && blockOccupancy[nextBlock] && blockOccupancy[twoBlocksAhead]) {
    holdForSignal = true;
  }

  train.signalHold = holdForSignal;

  // ---- Determine desired speed ----
  const approachingStation = toTarget < 60;
  let desired: number; // km/h

  if (toTarget < 8 && train.speed < 6) {
    // Arrived: snap into station stop
    train.dist = targetDist;
    train.speed = 0;
    arriveAtStation(world, train, nextStationIdx, nextRouteIdx, events);
    updateEta(train);
    return;
  }

  if (approachingStation) {
    // braking curve: v = sqrt(2 * a * d) in consistent units, a = 0.9 m/s^2
    const vMax = Math.sqrt(2 * 0.9 * Math.max(toTarget - 4, 0)) * 3.6;
    desired = Math.min(train.targetSpeed, vMax);
    if (desired < 2) desired = 0;
  } else if (holdForSignal) {
    // slow to crawl near red signal
    const dToSignal = 20;
    const vMax = Math.sqrt(2 * 0.7 * dToSignal) * 3.6;
    desired = Math.min(train.targetSpeed, vMax, 15);
    if (toTarget < 25) {
      // stop short before an occupied block
      desired = 0;
    }
  } else {
    desired = train.reversing ? Math.min(train.targetSpeed, 40) : train.targetSpeed;
  }

  // Weather limits speed
  if (world.weather === 'rain') desired = Math.min(desired, train.def.maxSpeed * 0.75);
  if (world.weather === 'fog') desired = Math.min(desired, train.def.maxSpeed * 0.6);

  desired = Math.min(desired, train.def.maxSpeed);

  // ---- Accelerate / brake toward desired ----
  const accel = train.def.kind === 'Freight' ? 0.5 : train.def.kind === 'High-Speed' ? 1.1 : 0.8;
  const brake = 1.2;
  if (train.speed < desired) {
    train.speed = Math.min(desired, train.speed + accel * 3.6 * dt);
    if (toTarget < 60 && !holdForSignal) train.status = 'Approaching station';
    else if (train.status !== 'Running') train.status = 'Running';
  } else if (train.speed > desired + 0.5) {
    train.speed = Math.max(desired, train.speed - brake * 3.6 * dt);
    train.status = 'Braking';
  }

  if (train.status !== 'Approaching station' && train.status !== 'Braking' && train.speed > 1) {
    train.status = 'Running';
  }

  // Delay accumulation when crawling
  if (holdForSignal && train.speed < 20) {
    train.delaySeconds += dt * 0.5;
  }

  advancePosition(train, dt);

  // wheels
  train.wheelRotation += speedMs(train) * dt * 1.2;

  updateEta(train);
}

function advancePosition(train: TrainState, dt: number) {
  if (train.speed <= 0) return;
  const move = speedMs(train) * dt;
  if (train.reversing) {
    train.dist -= move;
  } else {
    train.dist += move;
  }
  // Route leg progression
  const routeLen = train.def.route.length;
  const nextRouteIdx = train.nextStationIndex % routeLen;
  const nextStationIdx = train.def.route[nextRouteIdx];
  const targetDist = stationTrackDistance(nextStationIdx);
  let toTarget = targetDist - train.dist;
  toTarget = ((toTarget % MAIN_LOOP_LENGTH) + MAIN_LOOP_LENGTH) % MAIN_LOOP_LENGTH;
  // wrap-around leg progression when passing a station without stopping (skip-stop routes)
  const leg = legLength(train);
  if (toTarget > leg * 0.98 && train.speed > 5) {
    // passed the station; advance leg
    train.legIndex = (train.legIndex + 1) % routeLen;
    train.nextStationIndex = (train.nextStationIndex + 1) % routeLen;
  }
}

function arriveAtStation(
  world: WorldState,
  train: TrainState,
  stationIdx: number,
  _nextRouteIdx: number,
  events?: SimEvents,
) {
  train.status = 'At station';
  train.doorOpen = true;
  train.boardingTimer = 10; // seconds of boarding + departure
  train.dist = stationTrackDistance(stationIdx);

  // passengers: alight + board
  const alight = Math.min(
    train.passengerCount,
    Math.round(train.passengerCount * (0.35 + Math.random() * 0.3)),
  );
  train.passengerCount -= alight;
  world.throughput += alight;

  const waiting = world.passengers.filter(
    (p) => p.state === 'waiting' && p.originIndex === stationIdx,
  );
  const board = Math.min(
    waiting.length,
    train.capacity - train.passengerCount,
    6 + Math.floor(Math.random() * 10),
  );
  for (let i = 0; i < board; i++) {
    const p = waiting[i];
    p.state = 'onTrain';
    p.trainId = train.id;
  }
  train.passengerCount += board;
  world.boardedTotal += board;

  const station = STATIONS[stationIdx];
  world.announcements.unshift({
    id: nextAnnouncementId(),
    text: `${train.def.number} ${train.def.name} arriving at ${station.name}. Doors opening.`,
    kind: 'arrival',
    time: formatClock(world.time),
  });
  if (world.announcements.length > 30) world.announcements.pop();

  events?.onArrival?.(train, stationIdx);

  // advance route bookkeeping
  const routeLen = train.def.route.length;
  train.legIndex = (train.legIndex + 1) % routeLen;
  train.nextStationIndex = (train.nextStationIndex + 1) % routeLen;
}

function updateEta(train: TrainState) {
  const toTarget = train.distToNextStation;
  const avg = Math.max(train.speed, 30) / 3.6;
  train.etaSeconds = toTarget / avg;
}

/** Overall route completion percentage (0-100) for a train. */
export function routeProgressPct(train: TrainState): number {
  const routeLen = train.def.route.length;
  // Sum of leg lengths across the route, then how far through we are
  let total = 0;
  for (let i = 0; i < routeLen; i++) {
    const a = stationTrackDistance(train.def.route[i]);
    const b = stationTrackDistance(train.def.route[(i + 1) % routeLen]);
    let d = b - a;
    if (d < 0) d += MAIN_LOOP_LENGTH;
    total += d;
  }
  let done = 0;
  for (let i = 0; i < train.legIndex % routeLen; i++) {
    const a = stationTrackDistance(train.def.route[i]);
    const b = stationTrackDistance(train.def.route[(i + 1) % routeLen]);
    let d = b - a;
    if (d < 0) d += MAIN_LOOP_LENGTH;
    done += d;
  }
  const curLegLen = (() => {
    const a = stationTrackDistance(train.def.route[train.legIndex % routeLen]);
    const b = stationTrackDistance(train.def.route[(train.legIndex + 1) % routeLen]);
    let d = b - a;
    if (d < 0) d += MAIN_LOOP_LENGTH;
    return d;
  })();
  const intoLeg = Math.max(0, curLegLen - train.distToNextStation);
  done += Math.min(intoLeg, curLegLen);
  return Math.max(0, Math.min(100, (done / total) * 100));
}

function stepPassengers(world: WorldState, dt: number) {
  for (const p of world.passengers) {
    p.seed += dt * 0.3;
    switch (p.state) {
      case 'toPlatform':
        p.walkT += dt * 0.25;
        if (p.walkT >= 1) {
          p.walkT = 1;
          p.state = 'waiting';
          p.waitTimer = 5 + Math.random() * 25;
        }
        break;
      case 'waiting':
        p.waitTimer -= dt;
        break;
      case 'onTrain':
        // ride until we reach destination
        {
          const train = world.trains.find((t) => t.id === p.trainId);
          if (train) {
            const route = train.def.route;
            const routePos = route.indexOf(p.destIndex);
            if (routePos >= 0) {
              // next station the train will stop at
              const nextStop = route[train.nextStationIndex % route.length];
              if (nextStop === p.destIndex && train.status === 'At station') {
                p.state = 'arrived';
                p.walkT = 0;
                p.trainId = null;
                world.throughput += 1;
              }
            } else {
              // destination not on this route: get off at end and re-plan
              p.state = 'arrived';
              p.walkT = 0;
              p.trainId = null;
              world.throughput += 1;
            }
          } else {
            p.state = 'waiting';
            p.trainId = null;
          }
        }
        break;
      case 'arrived':
        p.walkT += dt * 0.3;
        if (p.walkT >= 1) {
          // re-plan a new journey from the arrival station
          p.originIndex = p.destIndex;
          p.destIndex =
            (p.destIndex + 1 + Math.floor(Math.random() * (STATIONS.length - 1))) % STATIONS.length;
          p.state = 'toPlatform';
          p.walkT = 0;
        }
        break;
      case 'leaving':
        break;
    }
  }
}

export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600) % 24;
  const m = Math.floor(seconds / 60) % 60;
  const s = Math.floor(seconds) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function trainWorldPose(train: TrainState, out: { pos: import('three').Vector3; angle: number }) {
  if (train.def.id === 4) {
    const { pos, tangent } = sidingPose(train.dist * 0.3);
    out.pos.copy(pos);
    out.angle = Math.atan2(tangent.z, tangent.x);
  } else {
    const { pos, tangent } = loopPose(train.dist);
    out.pos.copy(pos);
    out.angle = Math.atan2(tangent.z, tangent.x);
  }
}

export function routeOfTrain(train: TrainState) {
  return ROUTES.find((r) => r.path.join() === train.def.route.join()) ?? ROUTES[0];
}
