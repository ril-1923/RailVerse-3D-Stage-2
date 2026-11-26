import { Canvas } from '@react-three/fiber';
import { TrackNetwork } from './TrackNetwork';
import { Terrain, StationView } from './Stations';
import { Trains } from './Trains';
import { Signals } from './Signals';
import { Passengers } from './Passengers';
import { Weather } from './Weather';
import { CameraRig, type CameraMode } from './CameraRig';
import type { WorldState } from '@/sim/engine';
import type { SimSettings } from '@/sim/useSimulation';

interface SceneProps {
  world: WorldState;
  settings: SimSettings;
  selectedTrainId: number | null;
  selectedStationIdx: number | null;
  cameraMode: CameraMode;
  onSelectTrain: (id: number) => void;
  onSelectStation: (i: number) => void;
  followTrain: WorldState['trains'][number] | null;
}

export function Scene({
  world,
  settings,
  selectedTrainId,
  selectedStationIdx,
  cameraMode,
  onSelectTrain,
  onSelectStation,
  followTrain,
}: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [0, 190, 210], fov: 50, near: 0.5, far: 1200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      className="absolute inset-0"
    >
      <Weather settings={settings} />
      <Terrain />
      <TrackNetwork />
      {STATIONS_ALL.map((i) => (
        <StationView
          key={i}
          stationIdx={i}
          world={world}
          onSelect={onSelectStation}
          selected={selectedStationIdx === i}
        />
      ))}
      <Signals world={world} />
      <Trains world={world} selectedTrainId={selectedTrainId} onSelectTrain={onSelectTrain} />
      <Passengers world={world} />
      <CameraRig mode={cameraMode} train={followTrain} stationIdx={selectedStationIdx} />
    </Canvas>
  );
}

const STATIONS_ALL = [0, 1, 2, 3, 4];
