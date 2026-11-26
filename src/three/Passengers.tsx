import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { WorldState } from '@/sim/engine';
import { STATION_POINTS, STATIONS } from '@/sim/network';

const MAX_PASSENGERS = 200;

/**
 * Renders all station-area passengers (waiting / walking / arrived) using a
 * single instanced mesh. Positions are recomputed each frame from sim state.
 */
export function Passengers({ world }: { world: WorldState }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorRef = useRef<THREE.InstancedMesh>(null);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    let n = 0;

    for (const p of world.passengers) {
      if (n >= MAX_PASSENGERS) break;
      if (p.state === 'onTrain') continue;
      const st = STATION_POINTS[p.originIndex];
      const station = STATIONS[p.originIndex];
      const side = station.platformSide;

      let x: number, z: number;
      if (p.state === 'waiting') {
        const lane = 4.5 + ((p.seed * 13.7) % 10) / 10 * 2.2;
        const along = -7 + ((p.seed * 7.3) % 14);
        // gentle idle sway
        const sway = Math.sin(t * 0.8 + p.seed) * 0.25;
        x = st.x + side * lane + sway * 0.3;
        z = st.z + along + sway;
      } else if (p.state === 'toPlatform') {
        // walk from entrance area to waiting lane
        const lane = 4.5 + ((p.seed * 13.7) % 10) / 10 * 2.2;
        const along = -7 + ((p.seed * 7.3) % 14);
        const ex = st.x + side * 12;
        const ez = st.z + (along > 0 ? 12 : -12);
        x = ex + (st.x + side * lane - ex) * p.walkT;
        z = ez + (st.z + along - ez) * p.walkT;
      } else {
        // arrived: walk away toward exit
        const ex = st.x + side * 13;
        const ez = st.z + (((p.seed * 7.3) % 14) > 0 ? 13 : -13);
        x = st.x + side * 5 + (ex - (st.x + side * 5)) * p.walkT;
        z = st.z + (ez - st.z) * p.walkT;
      }

      dummy.position.set(x, 0.55, z);
      dummy.rotation.set(0, Math.sin(t * 0.5 + p.seed) * 0.4, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);

      // tint by state
      const color = new THREE.Color(
        p.state === 'waiting' ? '#fbbf24' : p.state === 'toPlatform' ? '#38bdf8' : '#4ade80',
      );
      mesh.setColorAt(n, color);
      n++;
    }

    for (let i = n; i < MAX_PASSENGERS; i++) {
      dummy.position.set(0, -50, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    void colorRef;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_PASSENGERS]} frustumCulled={false} castShadow={false}>
      <capsuleGeometry args={[0.17, 0.55, 3, 8]} />
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  );
}
