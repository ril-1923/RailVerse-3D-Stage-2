import { TrainFront, Building2, Route as RouteIcon, TrafficCone, Globe } from 'lucide-react';
import type { WorldState } from '@/sim/engine';
import { STATIONS, ROUTES, TRAINS, MAIN_LOOP_LENGTH } from '@/sim/network';
import type { SimHandle } from '@/sim/useSimulation';
import { TrainMonitorRow } from './OverviewPanel';
import { formatEta } from './format';

export function TrainsPanel({ world, sim }: { world: WorldState; sim: SimHandle }) {
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Train Fleet
      </h2>
      <TrainMonitorRow world={world} sim={sim} />
      <p className="text-xs text-zinc-600">
        Select a train to open its control panel and camera view.
      </p>
    </div>
  );
}

export function StationsPanel({ world, sim }: { world: WorldState; sim: SimHandle }) {
  return (
    <div className="space-y-2 p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Stations
      </h2>
      {STATIONS.map((s, i) => {
        const waiting = world.passengers.filter(
          (p) => p.originIndex === i && (p.state === 'waiting' || p.state === 'toPlatform'),
        ).length;
        const stoppedHere = world.trains.filter(
          (t) =>
            t.status === 'At station' &&
            STATIONS[t.def.route[t.legIndex % t.def.route.length]]?.id === s.id,
        ).length;
        return (
          <button
            key={s.id}
            onClick={() => {
              sim.setSelectedStationIdx(i);
              sim.setCameraMode('station');
            }}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
              sim.selectedStationIdx === i
                ? 'border-sky-400/50 bg-sky-500/10'
                : 'border-white/10 bg-zinc-900/60 hover:border-white/20'
            }`}
          >
            <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-100">{s.name}</div>
              <div className="text-xs text-zinc-500">
                {waiting} waiting · {stoppedHere > 0 ? 'train at platform' : 'no train'}
              </div>
            </div>
            <Building2 className="h-4 w-4 text-zinc-600" />
          </button>
        );
      })}
    </div>
  );
}

export function RoutesPanel({ world, sim }: { world: WorldState; sim: SimHandle }) {
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Route Management
      </h2>
      {ROUTES.map((r) => {
        const train = world.trains.find((t) => t.def.id === r.id || t.def.name === r.name);
        const assigned = TRAINS.find((t) => t.route.join() === r.path.join());
        const t = train ?? (assigned ? world.trains.find((x) => x.def.id === assigned.id) : null);
        const names = r.path.map((i) => STATIONS[i].id).join(' → ');
        return (
          <div
            key={r.id}
            className="rounded-xl border border-white/10 bg-zinc-900/60 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-sm font-semibold text-zinc-100">{r.name}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                {r.path.length} stops
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-zinc-500">{names}</div>
            {t && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
                <span className="text-zinc-300">
                  {t.def.number} · {t.status}
                </span>
                <span className="tabular-nums text-zinc-500">
                  next {STATIONS[t.def.route[t.nextStationIndex % t.def.route.length]].id} ·{' '}
                  {formatEta(t.etaSeconds)}
                </span>
              </div>
            )}
          </div>
        );
      })}
      <button
        onClick={() => sim.setCameraMode('overview')}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 py-2.5 text-xs text-zinc-300 hover:border-white/20"
      >
        <RouteIcon className="h-4 w-4" /> View full network from above
      </button>
    </div>
  );
}

export function SignalsPanel({ world }: { world: WorldState }) {
  const colors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500',
  };
  return (
    <div className="space-y-2 p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Signal Blocks
      </h2>
      {world.signals.map((s) => {
        const from = (s.blockId * MAIN_LOOP_LENGTH / world.signals.length) / 1000;
        const to = ((s.blockId + 1) * MAIN_LOOP_LENGTH / world.signals.length) / 1000;
        return (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5"
          >
            <span className={`h-3 w-3 animate-pulse rounded-full ${colors[s.aspect]}`} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-100">Signal {s.id}</div>
              <div className="text-[11px] text-zinc-500">
                Block {s.blockId + 1} · {from.toFixed(1)}–{to.toFixed(1)} km
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                s.aspect === 'green'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : s.aspect === 'yellow'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-red-500/20 text-red-300'
              }`}
            >
              {s.aspect}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function NetworkPanel({ world }: { world: WorldState }) {
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Network Topology
      </h2>
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 text-xs text-zinc-400">
        <div className="mb-2 flex items-center gap-2 text-zinc-200">
          <Globe className="h-4 w-4 text-sky-400" />
          <span className="font-semibold">Main Loop</span>
        </div>
        <p>
          {STATIONS.length} stations · {(MAIN_LOOP_LENGTH / 1000).toFixed(1)} km
          circumference · {world.signals.length} signal blocks · 1 freight siding.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATIONS.map((s) => (
            <span
              key={s.id}
              className="rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{ backgroundColor: `${s.color}22`, color: s.color }}
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <TrainFront className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-200">Live block occupancy</span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {world.signals.map((s) => (
            <div
              key={s.blockId}
              title={`Block ${s.blockId + 1}`}
              className={`flex h-8 items-center justify-center rounded text-[9px] font-bold ${
                s.aspect === 'red'
                  ? 'bg-red-500/30 text-red-200'
                  : s.aspect === 'yellow'
                    ? 'bg-amber-500/30 text-amber-100'
                    : 'bg-emerald-500/20 text-emerald-200'
              }`}
            >
              {s.blockId + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
