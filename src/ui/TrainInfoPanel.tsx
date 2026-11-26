import {
  FastForward,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Rewind,
  Minus,
  Square,
  X,
  Zap,
} from 'lucide-react';
import type { TrainState, WorldState } from '@/sim/engine';
import { STATIONS, ROUTES } from '@/sim/network';
import { formatEta } from './format';

function Btn({
  onClick,
  children,
  tone = 'default',
  disabled,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'default' | 'go' | 'stop' | 'warn';
  disabled?: boolean;
  title?: string;
}) {
  const tones = {
    default: 'bg-white/10 text-zinc-200 hover:bg-white/20',
    go: 'bg-emerald-600 text-white hover:bg-emerald-500',
    stop: 'bg-red-600 text-white hover:bg-red-500',
    warn: 'bg-amber-600 text-white hover:bg-amber-500',
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export function TrainInfoPanel({
  train,
  world,
  onClose,
  sim,
}: {
  train: TrainState;
  world: WorldState;
  onClose: () => void;
  sim: import('@/sim/useSimulation').SimHandle;
}) {
  const route = ROUTES.find((r) => r.path.join() === train.def.route.join()) ?? ROUTES[0];
  const next = STATIONS[train.def.route[train.nextStationIndex % train.def.route.length]];
  const dest = STATIONS[train.def.route[train.def.route.length - 1]];
  const routeProgress = (() => {
    const leg = train.distToNextStation;
    const legLen = route.path.length;
    void legLen;
    return Math.max(0, Math.min(100, 100 - (leg / 800) * 100));
  })();
  void world;

  return (
    <div className="w-[320px] rounded-2xl border border-white/10 bg-zinc-950/85 p-4 text-zinc-200 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl font-bold text-zinc-950"
            style={{ backgroundColor: train.def.color }}
          >
            {train.def.number.slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-semibold">{train.def.number} — {train.def.name}</div>
            <div className="text-xs text-zinc-500">
              {train.def.kind} · max {train.def.maxSpeed} km/h
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* status + speed */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Speed</div>
          <div className="text-2xl font-semibold tabular-nums text-sky-300">
            {Math.round(train.speed)}
            <span className="text-xs text-zinc-500"> / {train.def.maxSpeed} km/h</span>
          </div>
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Status</div>
          <div
            className={`mt-1 text-sm font-semibold ${
              train.status === 'Running' || train.status === 'Departing'
                ? 'text-emerald-300'
                : train.status === 'Emergency stop'
                  ? 'text-red-300'
                  : train.status === 'Braking' || train.status === 'Approaching station'
                    ? 'text-amber-300'
                    : 'text-zinc-300'
            }`}
          >
            {train.status}
            {train.paused && ' · Paused'}
          </div>
        </div>
      </div>

      {/* route info */}
      <div className="mt-3 space-y-1.5 rounded-xl bg-white/5 p-3 text-xs">
        <div className="flex justify-between"><span className="text-zinc-500">Route</span><span>{route.name}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Current</span><span>{STATIONS[train.def.route[train.legIndex % train.def.route.length]].name}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Next stop</span><span>{next.name}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Destination</span><span>{dest.name}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Distance to next</span><span className="tabular-nums">{Math.round(train.distToNextStation)} m</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">ETA</span><span className="tabular-nums">{formatEta(train.etaSeconds)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Passengers</span><span className="tabular-nums">{train.passengerCount} / {train.capacity}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Condition</span><span className={train.condition > 70 ? 'text-emerald-300' : 'text-amber-300'}>{Math.round(train.condition)}%</span></div>
        {train.signalHold && (
          <div className="rounded bg-amber-500/15 px-2 py-1 text-amber-300">Held at red signal — speed limited</div>
        )}
      </div>

      {/* route progress bar */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Route progress</span><span>{Math.round(routeProgress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${routeProgress}%`, backgroundColor: train.def.color }}
          />
        </div>
      </div>

      {/* speed slider */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Cruise speed</span>
          <span className="tabular-nums text-zinc-300">{train.targetSpeed} km/h</span>
        </div>
        <input
          type="range"
          min={0}
          max={train.def.maxSpeed}
          step={5}
          value={train.targetSpeed}
          onChange={(e) => sim.api.setTrainSpeed(train.id, Number(e.target.value))}
          className="w-full accent-sky-400"
        />
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <Btn onClick={() => sim.api.nudgeSpeed(train.id, -10)} title="Decrease speed"><Minus className="h-3.5 w-3.5" />10</Btn>
          <Btn onClick={() => sim.api.nudgeSpeed(train.id, 10)} title="Increase speed"><Plus className="h-3.5 w-3.5" />10</Btn>
          <Btn onClick={() => sim.api.setTrainSpeed(train.id, train.def.maxSpeed)} title="Full speed"><FastForward className="h-3.5 w-3.5" />Max</Btn>
          <Btn onClick={() => sim.api.setTrainSpeed(train.id, 0)} title="Idle"><Gauge0 /></Btn>
        </div>
      </div>

      {/* operational controls */}
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <Btn tone="go" onClick={() => sim.api.startTrain(train.id)}><Play className="h-3.5 w-3.5" />Start</Btn>
        <Btn tone="stop" onClick={() => sim.api.stopTrain(train.id)}><Square className="h-3.5 w-3.5" />Stop</Btn>
        <Btn onClick={() => sim.api.pauseTrain(train.id)}><Pause className="h-3.5 w-3.5" />Pause</Btn>
        <Btn onClick={() => sim.api.resumeTrain(train.id)}><RefreshCw className="h-3.5 w-3.5" />Resume</Btn>
        <Btn
          tone="warn"
          onClick={() => sim.api.reverseTrain(train.id)}
          title="Reverse when speed is near zero"
        >
          <Rewind className="h-3.5 w-3.5" />
          {train.reversing ? 'Forward' : 'Reverse'}
          {train.reversingPending && '…'}
        </Btn>
        <Btn tone="stop" onClick={() => sim.api.emergencyStop(train.id)}><Zap className="h-3.5 w-3.5" />E-Stop</Btn>
      </div>
    </div>
  );
}

function Gauge0() {
  return <span className="text-[11px]">Idle</span>;
}
