import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Announcement, TrainStatus } from './types';
import {
  createWorld,
  formatClock,
  stepSim,
  type WorldState,
} from './engine';
import { STATIONS } from './network';

export interface SimSettings {
  sound: boolean;
  volume: number;
  weather: 'clear' | 'cloudy' | 'rain' | 'fog';
  timeOfDay: number; // 0-24
}

export function useSimulation() {
  const worldRef = useRef<WorldState | null>(null);
  if (!worldRef.current) worldRef.current = createWorld();
  const world = worldRef.current;

  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(true);
  const [selectedTrainId, setSelectedTrainId] = useState<number | null>(null);
  const [selectedStationIdx, setSelectedStationIdx] = useState<number | null>(null);
  const [cameraMode, setCameraMode] = useState<
    'overview' | 'follow' | 'station' | 'free'
  >('overview');
  const [cameraTab, setCameraTab] = useState<
    'overview' | 'network' | 'trains' | 'stations' | 'routes' | 'signals' | 'settings'
  >('overview');
  const [settings, setSettings] = useState<SimSettings>({
    sound: false,
    volume: 0.5,
    weather: 'clear',
    timeOfDay: 10,
  });

  const eventsRef = useRef<{
    onArrival?: (trainId: number, stationIdx: number) => void;
    onDeparture?: (trainId: number, stationIdx: number) => void;
  }>({});

  // announce refs collected from engine callbacks
  const pushAnnouncement = useCallback(
    (text: string, kind: Announcement['kind']) => {
      world.announcements.unshift({
        id: Date.now() + Math.random(),
        text,
        kind,
        time: formatClock(world.time),
      });
      if (world.announcements.length > 40) world.announcements.pop();
    },
    [world],
  );

  useEffect(() => {
    eventsRef.current.onArrival = (trainId, stationIdx) => {
      pushAnnouncement(
        `${world.trains.find((t) => t.id === trainId)?.def.number ?? 'Train'} arriving at ${STATIONS[stationIdx].name}`,
        'arrival',
      );
    };
    eventsRef.current.onDeparture = (trainId, stationIdx) => {
      pushAnnouncement(
        `${world.trains.find((t) => t.id === trainId)?.def.number ?? 'Train'} departing ${STATIONS[stationIdx].name}`,
        'departure',
      );
    };
  }, [world, pushAnnouncement]);

  // central animation loop
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    const loop = (t: number) => {
      const dt = Math.min((t - lastRef.current) / 1000, 0.05);
      lastRef.current = t;
      if (runningRef.current && dt > 0) {
        stepSim(world, dt, {
          onArrival: (train, stIdx) => {
            // avoid duplicate announcements: engine also pushes; fire sound hook only
            void train;
            void stIdx;
          },
        });
      }
      setTick((x) => x + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [world]);

  const selectedTrain = selectedTrainId != null
    ? world.trains.find((t) => t.id === selectedTrainId) ?? null
    : null;

  const api = useMemo(
    () => ({
      startTrain: (id: number) => {
        const t = world.trains.find((x) => x.id === id);
        if (!t) return;
        t.started = true;
        t.paused = false;
        t.emergency = false;
        if (t.status === 'Stopped' || t.status === 'Emergency stop') t.status = 'Running';
      },
      stopTrain: (id: number) => {
        const t = world.trains.find((x) => x.id === id);
        if (!t) return;
        t.started = false;
        t.status = 'Stopped';
      },
      pauseTrain: (id: number) => {
        const t = world.trains.find((x) => x.id === id);
        if (t) t.paused = true;
      },
      resumeTrain: (id: number) => {
        const t = world.trains.find((x) => x.id === id);
        if (t) {
          t.paused = false;
          t.emergency = false;
        }
      },
      setTrainSpeed: (id: number, kmh: number) => {
        const t = world.trains.find((x) => x.id === id);
        if (t) t.targetSpeed = Math.min(kmh, t.def.maxSpeed);
      },
      nudgeSpeed: (id: number, delta: number) => {
        const t = world.trains.find((x) => x.id === id);
        if (!t) return;
        t.targetSpeed = Math.max(
          0,
          Math.min(t.def.maxSpeed, t.targetSpeed + delta),
        );
      },
      reverseTrain: (id: number) => {
        const t = world.trains.find((x) => x.id === id);
        if (!t) return;
        if (t.speed < 2) {
          t.reversing = !t.reversing;
          t.reversingPending = false;
        } else {
          t.reversingPending = true;
        }
      },
      emergencyStop: (id: number) => {
        const t = world.trains.find((x) => x.id === id);
        if (t) {
          t.emergency = true;
          t.status = 'Emergency stop';
        }
      },
      emergencyAll: (on: boolean) => {
        world.emergency = on;
        if (!on) {
          for (const t of world.trains) {
            t.emergency = false;
            if (t.status === 'Emergency stop' && t.started) t.status = 'Running';
          }
        }
      },
    }),
    [world],
  );

  return {
    world,
    tick,
    running,
    setRunning,
    selectedTrain,
    selectedTrainId,
    setSelectedTrainId,
    selectedStationIdx,
    setSelectedStationIdx,
    cameraMode,
    setCameraMode,
    cameraTab,
    setCameraTab,
    settings,
    setSettings,
    api,
  };
}

export type SimHandle = ReturnType<typeof useSimulation>;

export function statusColor(status: TrainStatus): string {
  switch (status) {
    case 'Running': return 'text-emerald-400';
    case 'Approaching station': return 'text-sky-400';
    case 'Braking': return 'text-amber-400';
    case 'At station':
    case 'Boarding': return 'text-cyan-300';
    case 'Departing': return 'text-lime-300';
    case 'Stopped': return 'text-zinc-400';
    case 'Delayed': return 'text-orange-400';
    case 'Emergency stop': return 'text-red-400';
    default: return 'text-zinc-300';
  }
}
