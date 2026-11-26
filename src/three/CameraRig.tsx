import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import type { TrainState } from '@/sim/engine';
import { trainWorldPose } from '@/sim/engine';
import { STATION_POINTS } from '@/sim/network';

export type CameraMode = 'overview' | 'follow' | 'station' | 'free';

interface CameraRigProps {
  mode: CameraMode;
  train: TrainState | null;
  stationIdx: number | null;
}

const OVERVIEW_POS = new THREE.Vector3(0, 190, 210);
const SMOOTH = 3.2;

export function CameraRig({ mode, train, stationIdx }: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPos = useRef(new THREE.Vector3());
  const poseTmp = useRef({ pos: new THREE.Vector3(), angle: 0 });

  useEffect(() => {
    if (!controlsRef.current) return;
    if (mode === 'overview') {
      controlsRef.current.object.position.copy(OVERVIEW_POS);
      controlsRef.current.target.set(0, 0, 0);
    } else if (mode === 'station' && stationIdx != null) {
      const p = STATION_POINTS[stationIdx];
      controlsRef.current.target.set(p.x, 2, p.z);
      controlsRef.current.object.position.set(p.x + 30, 22, p.z + 30);
    } else if (mode === 'free') {
      controlsRef.current.object.position.set(60, 60, 60);
      controlsRef.current.target.set(0, 0, 0);
    }
  }, [mode, stationIdx]);

  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (mode === 'follow' && train) {
      trainWorldPose(train, poseTmp.current);
      const p = poseTmp.current.pos;
      const a = poseTmp.current.angle;
      const back = 22;
      desiredPos.current.set(
        p.x - Math.cos(a) * back,
        12,
        p.z - Math.sin(a) * back + 6,
      );
      target.current.lerp(new THREE.Vector3(p.x, 2.5, p.z), Math.min(1, dt * SMOOTH));
      camera.position.lerp(desiredPos.current, Math.min(1, dt * SMOOTH));
      controls.target.copy(target.current);
    } else if (mode === 'station' && stationIdx != null) {
      const p = STATION_POINTS[stationIdx];
      target.current.lerp(new THREE.Vector3(p.x, 2, p.z), Math.min(1, dt * SMOOTH));
      controls.target.copy(target.current);
    }
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={8}
      maxDistance={450}
    />
  );
}
