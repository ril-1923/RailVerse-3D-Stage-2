import { Cloud, CloudRain, CloudFog, Sun, Volume2, VolumeX, Camera } from 'lucide-react';
import type { SimHandle, SimSettings } from '@/sim/useSimulation';
import type { CameraMode } from '@/three/CameraRig';

const WEATHERS: { key: SimSettings['weather']; label: string; icon: typeof Sun }[] = [
  { key: 'clear', label: 'Clear', icon: Sun },
  { key: 'cloudy', label: 'Cloudy', icon: Cloud },
  { key: 'rain', label: 'Rain', icon: CloudRain },
  { key: 'fog', label: 'Fog', icon: CloudFog },
];

const CAMERAS: { key: CameraMode; label: string }[] = [
  { key: 'overview', label: 'Network Overview' },
  { key: 'follow', label: 'Follow Train' },
  { key: 'station', label: 'Station View' },
  { key: 'free', label: 'Free Orbit' },
];

export function SettingsPanel({ sim }: { sim: SimHandle }) {
  const { settings, setSettings } = sim;
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Settings</h2>

      {/* Weather */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
        <div className="mb-2 text-xs font-medium text-zinc-300">Weather</div>
        <div className="grid grid-cols-4 gap-1.5">
          {WEATHERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSettings((s: SimSettings) => ({ ...s, weather: key }))}
              className={`flex flex-col items-center gap-1 rounded-lg py-2.5 text-[10px] font-medium transition-colors ${
                settings.weather === key
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera modes */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
          <Camera className="h-3.5 w-3.5" /> Camera Mode
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {CAMERAS.map((c) => (
            <button
              key={c.key}
              onClick={() => sim.setCameraMode(c.key)}
              className={`rounded-lg py-2 text-[11px] font-medium transition-colors ${
                sim.cameraMode === c.key
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sound */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            {settings.sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Simulation Sound
          </div>
          <button
            onClick={() =>
              setSettings((s: SimSettings) => ({ ...s, sound: !s.sound }))
            }
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.sound ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                settings.sound ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Volume</div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.volume * 100}
            onChange={(e) =>
              setSettings((s: SimSettings) => ({
                ...s,
                volume: Number(e.target.value) / 100,
              }))
            }
            className="w-full accent-sky-400"
          />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
          Sounds are synthesized and off by default. Includes horns, door chimes and
          departure bells tied to live simulation events.
        </p>
      </div>
    </div>
  );
}
