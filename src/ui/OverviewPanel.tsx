import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  Building2,
  Gauge,
  StopCircle,
  TrainFront,
  Users,
} from 'lucide-react';
import type { WorldState } from '@/sim/engine';
import { STATIONS, TRAINS, ROUTES } from '@/sim/network';
import type { SimHandle } from '@/sim/useSimulation';
import { formatEta } from './format';

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Gauge;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur-lg transition-colors hover:border-white/20">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <div className={`rounded-lg p-1.5 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-100">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export function OverviewPanel({ world, sim }: { world: WorldState; sim: SimHandle }) {
  const active = world.trains.filter(
    (t) => t.started && !t.paused && t.status !== 'Stopped' && t.status !== 'Emergency stop',
  ).length;
  const stopped = world.trains.filter(
    (t) => !t.started || t.paused || t.status === 'Stopped' || t.status === 'Emergency stop',
  ).length;
  const delayed = world.trains.filter((t) => t.delaySeconds > 30).length;
  const totalPassengers = world.passengers.length;
  const networkOk = world.emergency ? 'EMERGENCY' : delayed > 2 ? 'DEGRADED' : 'NORMAL';

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Control Center Overview
        </h2>
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            world.emergency
              ? 'bg-red-500/20 text-red-300'
              : networkOk === 'DEGRADED'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-emerald-500/20 text-emerald-300'
          }`}
        >
          <span className={`h-2 w-2 animate-pulse rounded-full ${
            world.emergency ? 'bg-red-400' : networkOk === 'DEGRADED' ? 'bg-amber-400' : 'bg-emerald-400'
          }`} />
          Network {networkOk}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Trains" value={TRAINS.length} icon={TrainFront} tone="bg-sky-500/20 text-sky-300" sub={`${TRAINS.length} in fleet`} />
        <MetricCard label="Active" value={active} icon={Activity} tone="bg-emerald-500/20 text-emerald-300" sub="currently moving" />
        <MetricCard label="Stopped" value={stopped} icon={StopCircle} tone="bg-zinc-500/20 text-zinc-300" sub="held or halted" />
        <MetricCard label="Delayed" value={delayed} icon={AlertTriangle} tone="bg-amber-500/20 text-amber-300" sub="signal delays" />
        <MetricCard label="Stations" value={STATIONS.length} icon={Building2} tone="bg-cyan-500/20 text-cyan-300" sub="operational" />
        <MetricCard label="Passengers" value={totalPassengers} icon={Users} tone="bg-fuchsia-500/20 text-fuchsia-300" sub={`${world.throughput} arrived`} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Passenger throughput
          </span>
          <ArrowDownRight className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-2xl font-semibold tabular-nums text-zinc-100">
            {world.boardedTotal}
          </span>
          <span className="pb-1 text-xs text-zinc-500">boarded · {world.throughput} completed journeys</span>
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-red-300">Emergency Control</div>
            <div className="text-xs text-red-400/70">Stops all trains across the network</div>
          </div>
          <button
            onClick={() => sim.api.emergencyAll(!world.emergency)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              world.emergency
                ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {world.emergency ? 'Resume Network' : 'Emergency Stop All'}
          </button>
        </div>
      </div>

      {/* Live announcements */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur-lg">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Live Announcements
        </div>
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {world.announcements.slice(0, 12).map((a) => (
            <div
              key={a.id}
              className={`rounded-lg border px-3 py-2 text-xs ${
                a.kind === 'arrival'
                  ? 'border-sky-500/20 bg-sky-500/10 text-sky-200'
                  : a.kind === 'departure'
                    ? 'border-lime-500/20 bg-lime-500/10 text-lime-200'
                    : a.kind === 'warning'
                      ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                      : 'border-white/10 bg-white/5 text-zinc-300'
              }`}
            >
              <span className="mr-2 tabular-nums text-zinc-500">{a.time}</span>
              {a.text}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export function TrainMonitorRow({
  world,
  sim,
}: {
  world: WorldState;
  sim: SimHandle;
}) {
  return (
    <div className="space-y-1.5">
      {world.trains.map((t) => {
        const next = STATIONS[t.def.route[t.nextStationIndex % t.def.route.length]];
        const dest = STATIONS[t.def.route[t.def.route.length - 1]];
        const routeDef = ROUTES.find((r) => r.id === t.def.id) ?? ROUTES[0];
        return (
          <button
            key={t.id}
            onClick={() => sim.setSelectedTrainId(t.id)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
              sim.selectedTrainId === t.id
                ? 'border-sky-400/50 bg-sky-500/10'
                : 'border-white/10 bg-zinc-900/60 hover:border-white/20 hover:bg-zinc-800/60'
            }`}
          >
            <span
              className="h-8 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: t.def.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100">{t.def.number}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                  {t.def.kind}
                </span>
              </div>
              <div className="truncate text-xs text-zinc-500">
                {next.name} → {dest.name} · ETA {formatEta(t.etaSeconds)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums text-zinc-200">
                {Math.round(t.speed)} <span className="text-[10px] text-zinc-500">km/h</span>
              </div>
              <div className="text-[10px] text-zinc-500">{t.passengerCount}/{t.capacity} pax</div>
            </div>
            <div className="w-20 text-right text-[10px] uppercase tracking-wide text-zinc-400">
              {routeDef.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}
