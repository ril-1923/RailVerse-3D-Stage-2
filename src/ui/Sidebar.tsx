import { Gauge, Globe, TrainFront, Building2, Route, TrafficCone, Settings as SettingsIcon } from 'lucide-react';

export type PanelKey = 'overview' | 'network' | 'trains' | 'stations' | 'routes' | 'signals' | 'settings';

const ITEMS: { key: PanelKey; label: string; icon: typeof Gauge }[] = [
  { key: 'overview', label: 'Overview', icon: Gauge },
  { key: 'network', label: 'Network', icon: Globe },
  { key: 'trains', label: 'Trains', icon: TrainFront },
  { key: 'stations', label: 'Stations', icon: Building2 },
  { key: 'routes', label: 'Routes', icon: Route },
  { key: 'signals', label: 'Signals', icon: TrafficCone },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar({
  active,
  onChange,
}: {
  active: PanelKey;
  onChange: (k: PanelKey) => void;
}) {
  return (
    <div className="flex h-full w-[68px] flex-col items-center gap-1 border-r border-white/10 bg-zinc-950/80 py-4 backdrop-blur-xl">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30">
        <TrainFront className="h-5 w-5 text-zinc-950" />
      </div>
      {ITEMS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          title={label}
          className={`group relative flex h-12 w-12 flex-col items-center justify-center rounded-xl transition-all duration-200 ${
            active === key
              ? 'bg-sky-500/20 text-sky-300 shadow-inner'
              : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
          }`}
        >
          <Icon className="h-5 w-5" />
          {active === key && (
            <span className="absolute left-0 h-6 w-1 rounded-r-full bg-sky-400" />
          )}
          <span className="pointer-events-none absolute left-14 z-50 hidden whitespace-nowrap rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-lg group-hover:block">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
