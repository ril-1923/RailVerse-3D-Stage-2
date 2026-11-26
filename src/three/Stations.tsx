import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STATION_POINTS, STATIONS } from '@/sim/network';
import type { WorldState } from '@/sim/engine';

const HOUSE_COLORS = ['#71717a', '#6b7280', '#57534e', '#746a63'];

function SceneryTree({ pos, scale }: { pos: [number, number, number]; scale: number }) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 6]} />
        <meshStandardMaterial color="#5b4636" roughness={1} />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <coneGeometry args={[0.9, 2.2, 7]} />
        <meshStandardMaterial color="#2f6b3f" roughness={0.9} />
      </mesh>
    </group>
  );
}

function GroundBuilding({
  pos,
  rot,
  w,
  d,
  h,
  color,
}: {
  pos: [number, number, number];
  rot: number;
  w: number;
  d: number;
  h: number;
  color: string;
}) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w * 1.1, 0.3, d * 1.1]} />
        <meshStandardMaterial color="#3f3f46" roughness={1} />
      </mesh>
      {Array.from({ length: Math.max(1, Math.floor(h / 3)) }).map((_, row) =>
        Array.from({ length: 3 }).map((_, col) => (
          <mesh
            key={`${row}-${col}`}
            position={[-w / 3 + (col * w) / 3, 1 + row * 3, d / 2 + 0.02]}
          >
            <planeGeometry args={[0.9, 1.2]} />
            <meshStandardMaterial
              color="#bae6fd"
              emissive="#7dd3fc"
              emissiveIntensity={0.35}
              side={THREE.FrontSide}
            />
          </mesh>
        )),
      )}
    </group>
  );
}

export function Terrain() {
  const trees = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number }[] = [];
    let s = 42;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI * 2;
      const r = 20 + rand() * 150;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // keep trees off the track ring
      const ringDist = Math.abs(Math.hypot(x, z) - 130);
      if (ringDist < 6) continue;
      arr.push({ pos: [x, 0, z], scale: 0.8 + rand() * 1.2 });
    }
    return arr;
  }, []);

  return (
    <group>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
      >
        <circleGeometry args={[260, 96]} />
        <meshStandardMaterial color="#3a5a40" roughness={1} />
      </mesh>
      {trees.map((t, i) => (
        <SceneryTree key={i} pos={t.pos} scale={t.scale} />
      ))}
      {/* distant buildings cluster */}
      <GroundBuilding pos={[-160, 0, -120]} rot={0.4} w={14} d={10} h={18} color={HOUSE_COLORS[0]} />
      <GroundBuilding pos={[-175, 0, -95]} rot={-0.2} w={10} d={8} h={12} color={HOUSE_COLORS[1]} />
      <GroundBuilding pos={[150, 0, -150]} rot={1.1} w={12} d={12} h={24} color={HOUSE_COLORS[2]} />
      <GroundBuilding pos={[170, 0, -120]} rot={0.7} w={9} d={9} h={10} color={HOUSE_COLORS[3]} />
      <GroundBuilding pos={[60, 0, 170]} rot={-0.5} w={16} d={10} h={14} color={HOUSE_COLORS[1]} />
      <GroundBuilding pos={[-70, 0, 165]} rot={0.9} w={12} d={10} h={20} color={HOUSE_COLORS[0]} />
    </group>
  );
}

function WaitingPassengers({
  stationIdx,
  world,
}: {
  stationIdx: number;
  world: WorldState;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [tickState, setTickState] = useState(0);
  useFrame(() => {
    setTickState((t) => t + 1);
  });

  const p = STATION_POINTS[stationIdx];
  const station = STATIONS[stationIdx];

  // position waiting passengers along the platform
  const list = world.passengers.filter(
    (x) =>
      (x.state === 'waiting' || x.state === 'toPlatform' || x.state === 'arrived') &&
      x.originIndex === stationIdx,
  );

  // Instance matrices set in render phase via ref callback pattern:
  if (ref.current) {
    let n = 0;
    for (const pas of list) {
      if (n >= 40) break;
      const lane = (pas.seed % 10) / 10;
      const along = -6 + ((pas.seed * 7.3) % 12);
      const jitter = Math.sin(pas.seed * 2.1 + tickState * 0.02) * 0.4;
      const side = station.platformSide;
      dummy.position.set(
        p.x + side * (4.2 + lane * 1.4) + jitter * 0.4,
        0,
        p.z + along * 0.8 * Math.cos(stationIdx * 1.3) + jitter,
      );
      dummy.rotation.set(0, pas.seed, 0);
      dummy.scale.setScalar(0.9);
      dummy.updateMatrix();
      ref.current.setMatrixAt(n, dummy.matrix);
      n++;
    }
    for (let i = n; i < 40; i++) {
      dummy.position.set(0, -100, 0);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 40]} frustumCulled={false}>
      <capsuleGeometry args={[0.16, 0.5, 3, 8]} />
      <meshStandardMaterial color="#fca5a5" roughness={0.8} />
    </instancedMesh>
  );
}

export function StationView({
  stationIdx,
  world,
  onSelect,
  selected,
}: {
  stationIdx: number;
  world: WorldState;
  onSelect: (i: number) => void;
  selected: boolean;
}) {
  const p = STATION_POINTS[stationIdx];
  const station = STATIONS[stationIdx];
  const angle = (stationIdx / STATION_POINTS.length) * Math.PI * 2;
  const side = station.platformSide;

  const [hovered, setHovered] = useState(false);

  const lampRefs = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (lampRefs.current) {
      const t = clock.elapsedTime;
      lampRefs.current.children.forEach((c, i) => {
        const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (m && m.emissiveIntensity !== undefined) {
          m.emissiveIntensity = 1.2 + Math.sin(t * 2 + i) * 0.15;
        }
      });
    }
  });

  return (
    <group position={[p.x, 0, p.z]} rotation={[0, -angle + Math.PI / 2, 0]}>
      {/* Platform slab */}
      <mesh
        position={[side * 3.2, 0.25, 0]}
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect(stationIdx);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[16, 0.5, 5]} />
        <meshStandardMaterial
          color={selected || hovered ? '#cbd5e1' : '#94a3b8'}
          roughness={0.7}
        />
      </mesh>

      {/* Platform tactile edge stripe */}
      <mesh position={[side * 1.2, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 0.35]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} />
      </mesh>

      {/* Station building */}
      <group position={[side * 7.5, 0.5, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[5, 3.2, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
        </mesh>
        <mesh position={[0, 3.4, 0]}>
          <boxGeometry args={[5.6, 0.4, 8.6]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
        {/* glass front */}
        <mesh position={[(-side * 2.51), 1.6, 0]} rotation={[0, side * Math.PI / 2, 0]}>
          <planeGeometry args={[6.5, 2]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.4} />
        </mesh>
        {/* entrance canopy */}
        <mesh position={[-side * 3.4, 3.0, 0]} rotation={[0, 0, side * 0.18]}>
          <boxGeometry args={[2.4, 0.15, 7]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[-side * 3.3, 1.2, 2.6]}>
          <cylinderGeometry args={[0.07, 0.07, 2.4]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[-side * 3.3, 1.2, -2.6]}>
          <cylinderGeometry args={[0.07, 0.07, 2.4]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      </group>

      {/* Signage */}
      <mesh position={[side * 3.2, 3.4, 0]}>
        <boxGeometry args={[0.15, 1.0, 6]} />
        <meshStandardMaterial color={station.color} emissive={station.color} emissiveIntensity={0.5} />
      </mesh>

      {/* Benches */}
      {[-3, 0, 3].map((z, i) => (
        <group key={i} position={[side * 5.2, 0.5, z]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[1.6, 0.12, 0.5]} />
            <meshStandardMaterial color="#8b5e3c" />
          </mesh>
          <mesh position={[0, 0.6, -0.22]}>
            <boxGeometry args={[1.6, 0.5, 0.1]} />
            <meshStandardMaterial color="#8b5e3c" />
          </mesh>
        </group>
      ))}

      {/* Lamps */}
      <group ref={lampRefs}>
        {[-5, 0, 5].map((z, i) => (
          <group key={i} position={[side * 4.6, 0.5, z]}>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.06, 0.09, 3.2]} />
              <meshStandardMaterial color="#27272a" />
            </mesh>
            <mesh position={[0, 3.3, 0]}>
              <sphereGeometry args={[0.22, 10, 10]} />
              <meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={1.2} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Digital departure board */}
      <group position={[side * 2.2, 3.2, -5.4]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.2, 1.3, 3.0]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[-side * 0.12, 0, 0]} rotation={[0, -side * Math.PI / 2, 0]}>
          <planeGeometry args={[2.7, 1.0]} />
          <meshStandardMaterial color="#052e16" emissive="#22c55e" emissiveIntensity={0.9} />
        </mesh>
      </group>

      {/* Waiting passengers */}
      <WaitingPassengers stationIdx={stationIdx} world={world} />

      {/* Selection ring */}
      {selected && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[9, 10.5, 48]} />
          <meshBasicMaterial color={station.color} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}
