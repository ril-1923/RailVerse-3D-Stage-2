import { useEffect, useMemo } from 'react';
import { Scene } from '@/three/Scene';
import { Sidebar, type PanelKey } from '@/ui/Sidebar';
import { OverviewPanel } from '@/ui/OverviewPanel';
import { TrainInfoPanel } from '@/ui/TrainInfoPanel';
import { SettingsPanel } from '@/ui/SettingsPanel';
import {
  NetworkPanel,
  RoutesPanel,
  SignalsPanel,
  StationsPanel,
  TrainsPanel,
} from '@/ui/Panels';
import { useSimulation, statusColor } from '@/sim/useSimulation';
import { STATIONS } from '@/sim/network';
import { soundEngine } from '@/audio/sound';
import { saveSettings, loadSettings, saveJourneyEvent } from '@/lib/persist';
import { Play, Pause, MapPin } from 'lucide-react';

export default function App() {
  const sim = useSimulation();
  const { world, settings, setSettings } = sim;

  // load persisted settings once
  useEffect(() => {
    loadSettings().then((s) => {
      if (s) setSettings((prev) => ({ ...prev, ...s }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist settings on change (debounced by nature of user interaction)
  useEffect(() => {
    const t = setTimeout(() => void saveSettings(settings), 800);
    return () => clearTimeout(t);
  }, [settings]);

  // sound engine sync
  useEffect(() => {
    soundEngine.setEnabled(settings.sound);
    soundEngine.setVolume(settings.volume);
    if (settings.sound) soundEngine.startEngine();
  }, [settings.sound, settings.volume]);

  // engine pitch follows selected train speed
  const selectedTrain = sim.selectedTrain;
  useEffect(() => {
    const t = selectedTrain ?? world.trains[0];
    soundEngine.setEngineSpeed(t ? t.speed : 0);
  }, [selectedTrain, world.trains, world.trains.reduce((a, t) => a + t.speed, 0)]);

  // fire sounds on announcement events
  const lastAnnouncementId = useMemo(() => world.announcements[0]?.id ?? 0, [world.announcements]);
  useEffect(() => {
    if (!settings.sound) return;
    const latest = world.announcements[0];
    if (latest && latest.id !== lastAnnouncementId) {
      if (latest.kind === 'arrival') soundEngine.doorChime();
      else if (latest.kind === 'departure') soundEngine.departureBell();
      else soundEngine.announcementChime();
    }
  }, [world.announcements, lastAnnouncementId, settings.sound]);

  // log journey events (async, non-blocking)
  useEffect(() => {
    const latest = world.announcements[0];
    if (latest && latest.id > 0 && latest.kind !== 'info') {
      void saveJourneyEvent(latest.kind, latest.text);
    }
  }, [world.announcements[0]?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const panel = sim.cameraMode;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      <Sidebar active={sim.cameraTab} onChange={(k) => sim.setCameraTab(k)} />

      {/* Main area */}
      <div className="relative flex-1">
        <Scene
          world={world}
          settings={settings}
          selectedTrainId={sim.selectedTrainId}
          selectedStationIdx={sim.selectedStationIdx}
          cameraMode={sim.cameraMode}
          onSelectTrain={(id) => {
            sim.setSelectedTrainId(id);
            if (sim.cameraMode === 'follow') sim.setCameraMode('follow');
          }}
          onSelectStation={(i) => {
            sim.setSelectedStationIdx(i);
            sim.setCameraMode('station');
          }}
          followTrain={selectedTrain}
        />

        {/* Top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-2.5 backdrop-blur-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400">
              <Play className="ml-0.5 h-3.5 w-3.5 text-zinc-950" fill="currentColor" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">RailVerse 3D</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                Railway Operations · Stage 2
              </div>
            </div>
            <div className="ml-4 border-l border-white/10 pl-4">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Sim clock</div>
              <div className="text-sm font-semibold tabular-nums text-sky-300">
                {world.announcements.length > 0 ? world.trains[0].status : ''}
              </div>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => sim.setRunning(!sim.running)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-2.5 text-xs font-semibold backdrop-blur-xl transition-colors hover:border-white/20"
            >
              {sim.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {sim.running ? 'Pause Sim' : 'Resume Sim'}
            </button>
            <div className="rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-2.5 text-xs backdrop-blur-xl">
              <span className="text-zinc-500">Weather: </span>
              <span className="font-semibold capitalize">{settings.weather}</span>
            </div>
          </div>
        </div>

        {/* Camera mode quick selector */}
        <div className="pointer-events-auto absolute left-1/2 top-4 flex -translate-x-1/2 gap-1 rounded-2xl border border-white/10 bg-zinc-950/70 p-1 backdrop-blur-xl">
          {(['overview', 'follow', 'station', 'free'] as const).map((m) => (
            <button
              key={m}
              onClick={() => sim.setCameraMode(m)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                sim.cameraMode === m
                  ? 'bg-sky-500/25 text-sky-200'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Left panel */}
        <div className="pointer-events-auto absolute bottom-4 left-4 top-20 w-[340px] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/70 shadow-2xl backdrop-blur-xl [scrollbar-width:thin]">
          {panel === 'overview' && <OverviewPanel world={world} sim={sim} />}
          {panel === 'network' && <NetworkPanel world={world} />}
          {panel === 'trains' && <TrainsPanel world={world} sim={sim} />}
          {panel === 'stations' && <StationsPanel world={world} sim={sim} />}
          {panel === 'routes' && <RoutesPanel world={world} sim={sim} />}
          {panel === 'signals' && <SignalsPanel world={world} />}
          {panel === 'settings' && <SettingsPanel sim={sim} />}
        </div>

        {/* Selected train info panel (right) */}
        {selectedTrain && (
          <div className="pointer-events-auto absolute right-4 top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <TrainInfoPanel train={selectedTrain} world={world} onClose={() => sim.setSelectedTrainId(null)} sim={sim} />
          </div>
        )}

        {/* Selected station chip */}
        {sim.selectedStationIdx != null && (
          <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 backdrop-blur-xl">
            <MapPin
              className="h-4 w-4"
              style={{ color: STATIONS[sim.selectedStationIdx].color }}
            />
            <div>
              <div className="text-sm font-semibold">
                {STATIONS[sim.selectedStationIdx].name}
              </div>
              <div className="text-[11px] text-zinc-500">
                {world.passengers.filter(
                  (p) => p.originIndex === sim.selectedStationIdx && p.state === 'waiting',
                ).length}{' '}
                passengers waiting
              </div>
            </div>
            <button
              onClick={() => sim.setSelectedStationIdx(null)}
              className="ml-2 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
            >
              Close
            </button>
          </div>
        )}

        {/* status bar bottom */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 flex justify-center pb-2">
          <div className="pointer-events-auto flex gap-4 rounded-full border border-white/10 bg-zinc-950/70 px-5 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 backdrop-blur-xl">
            {world.trains.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: t.def.color }}
                />
                {t.def.number}
                <span className={statusColor(t.status)}>{Math.round(t.speed)} km/h</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
