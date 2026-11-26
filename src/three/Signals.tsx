import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SIGNAL_COUNT, loopPose, BLOCK_LENGTH } from '@/sim/network';
import type { WorldState } from '@/sim/engine';

const ASPECT_COLOR = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
} as const;

function SignalPost({
  id,
  pos,
  rotY,
  aspect,
}: {
  id: string;
  pos: THREE.Vector3;
  rotY: number;
  aspect: 'green' | 'yellow' | 'red';
}) {
  const lampRef = useRef<THREE.MeshStandardMaterial>(null);
  const offColor = '#27272a';

  useFrame(({ clock }) => {
    if (lampRef.current) {
      const blink = aspect === 'red' ? (Math.sin(clock.elapsedTime * 4) > 0 ? 1 : 0.4) : 1;
      lampRef.current.emissiveIntensity = 2.2 * blink;
    }
  });

  const side = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY));

  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, rotY, 0]}>
      <group position={[side.x * 0, 0, side.z * 0]}>
        {/* mast */}
        <mesh position={[0, 1.6, -2.2]}>
          <cylinderGeometry args={[0.07, 0.09, 3.2, 8]} />
          <meshStandardMaterial color="#27272a" metalness={0.5} roughness={0.6} />
        </mesh>
        {/* head */}
        <mesh position={[0, 3.3, -2.2]}>
          <boxGeometry args={[0.55, 1.5, 0.35]} />
          <meshStandardMaterial color="#18181b" />
        </mesh>
        {/* lamps: red top, yellow mid, green bottom */}
        <mesh position={[0, 3.75, -2.0]}>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshStandardMaterial
            ref={aspect === 'red' ? lampRef : undefined}
            color={aspect === 'red' ? ASPECT_COLOR.red : offColor}
            emissive={aspect === 'red' ? ASPECT_COLOR.red : '#000000'}
            emissiveIntensity={aspect === 'red' ? 2.2 : 0}
          />
        </mesh>
        <mesh position={[0, 3.3, -2.0]}>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshStandardMaterial
            ref={aspect === 'yellow' ? lampRef : undefined}
            color={aspect === 'yellow' ? ASPECT_COLOR.yellow : offColor}
            emissive={aspect === 'yellow' ? ASPECT_COLOR.yellow : '#000000'}
            emissiveIntensity={aspect === 'yellow' ? 2.2 : 0}
          />
        </mesh>
        <mesh position={[0, 2.85, -2.0]}>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshStandardMaterial
            ref={aspect === 'green' ? lampRef : undefined}
            color={aspect === 'green' ? ASPECT_COLOR.green : offColor}
            emissive={aspect === 'green' ? ASPECT_COLOR.green : '#000000'}
            emissiveIntensity={aspect === 'green' ? 2.2 : 0}
          />
        </mesh>
        {/* id plate */}
        <mesh position={[0, 4.25, -2.1]}>
          <boxGeometry args={[0.5, 0.3, 0.1]} />
          <meshStandardMaterial color="#e4e4e7" />
        </mesh>
      </group>
    </group>
  );
}

export function Signals({ world }: { world: WorldState }) {
  return (
    <group>
      {world.signals.map((sig) => {
        const { pos, tangent } = loopPose(sig.pos);
        const rotY = Math.atan2(tangent.x, tangent.z);
        return (
          <SignalPost key={sig.id} id={sig.id} pos={pos} rotY={rotY} aspect={sig.aspect} />
        );
      })}
    </group>
  );
}
