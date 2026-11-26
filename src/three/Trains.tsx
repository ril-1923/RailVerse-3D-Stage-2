import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { TrainState, WorldState } from '@/sim/engine';
import { trainWorldPose } from '@/sim/engine';
import { loopPose, sidingPose } from '@/sim/network';

function carriageCount(train: TrainState) {
  return train.def.carriages;
}

function Locomotive({ train, headlight }: { train: TrainState; headlight: boolean }) {
  const c = train.def.color;
  const acc = train.def.accent;
  const isFreight = train.def.kind === 'Freight';
  const isHighSpeed = train.def.kind === 'High-Speed';

  return (
    <group>
      {/* body */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4.6, 1.7, 2.4]} />
        <meshStandardMaterial color={c} metalness={0.45} roughness={0.4} />
      </mesh>
      {isHighSpeed ? (
        <mesh position={[0, 1.6, 2.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[1.2, 2.6, 4]} />
          <meshStandardMaterial color={c} metalness={0.5} roughness={0.35} />
        </mesh>
      ) : (
        <mesh position={[0, 2.55, -0.2]} castShadow>
          <boxGeometry args={[2.6, 0.6, 2.0]} />
          <meshStandardMaterial color={c} roughness={0.5} />
        </mesh>
      )}
      {/* stripe */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[4.65, 0.28, 2.45]} />
        <meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={0.25} />
      </mesh>
      {/* windshield */}
      <mesh position={[0, 2.0, isHighSpeed ? 2.35 : 2.25]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[1.9, 0.8, 0.08]} />
        <meshStandardMaterial color="#0c4a6e" metalness={0.7} roughness={0.15} />
      </mesh>
      {/* headlight */}
      <mesh position={[0, 1.35, 2.32]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial
          color="#fef9c3"
          emissive="#fde047"
          emissiveIntensity={headlight ? 2.4 : 0.4}
        />
      </mesh>
      {headlight && (
        <pointLight position={[0, 1.4, 3.4]} intensity={18} distance={26} color="#fef3c7" />
      )}
      {/* roof equipment */}
      <mesh position={[0, 2.62, 0.9]}>
        <boxGeometry args={[1.2, 0.18, 1.4]} />
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
      {/* underframe */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[4.4, 0.5, 2.2]} />
        <meshStandardMaterial color="#27272a" roughness={0.9} />
      </mesh>
      {isFreight && (
        <mesh position={[0, 3.0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 1.6, 8]} />
          <meshStandardMaterial color="#71717a" />
        </mesh>
      )}
    </group>
  );
}

function Carriage({
  color,
  accent,
  kind,
  doorOpen,
}: {
  color: string;
  accent: string;
  kind: string;
  doorOpen: boolean;
}) {
  const isFreight = kind === 'Freight';
  const doorX = 0;
  return (
    <group>
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[isFreight ? 4.2 : 4.3, 1.7, 2.35]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[4.35, 0.22, 2.4]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.2} />
      </mesh>
      {/* windows */}
      {[-1.4, -0.6, 0.6, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 1.85, 1.19]}>
          <boxGeometry args={[0.55, 0.55, 0.03]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.6} roughness={0.2} />
        </mesh>
      ))}
      {/* doors (slide open) */}
      {[-1.05, 1.05].map((x, i) => (
        <mesh key={i} position={[x + (doorOpen ? Math.sign(x) * 0.45 : 0), 1.15, 1.2]}>
          <boxGeometry args={[0.5, 0.95, 0.04]} />
          <meshStandardMaterial
            color={doorOpen ? '#4ade80' : color}
            emissive={doorOpen ? '#22c55e' : '#000000'}
            emissiveIntensity={doorOpen ? 0.5 : 0}
          />
        </mesh>
      ))}
      {/* roof */}
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[4.0, 0.12, 2.2]} />
        <meshStandardMaterial color="#52525b" roughness={0.8} />
      </mesh>
      {/* underframe */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[4.1, 0.45, 2.15]} />
        <meshStandardMaterial color="#27272a" roughness={0.95} />
      </mesh>
      {doorOpen && doorX === 0 && null}
      {isFreight && (
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[3.4, 0.6, 1.9]} />
          <meshStandardMaterial color="#7f1d1d" roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

function WheelSet({ rotation }: { rotation: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = rotation;
  });
  return (
    <group ref={ref}>
      {[-1.5, 1.5].map((x, i) => (
        <mesh key={i} position={[x, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.15, 12]} />
          <meshStandardMaterial color="#18181b" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

interface TrainSpriteProps {
  train: TrainState;
  selected: boolean;
  onSelect: (id: number) => void;
}

function TrainModel({ train, selected, onSelect }: TrainSpriteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const poseRef = useRef({ pos: new THREE.Vector3(), angle: 0 });
  const wheels = useRef(0);

  useFrame(() => {
    trainWorldPose(train, poseRef.current);
    if (groupRef.current) {
      groupRef.current.position.copy(poseRef.current.pos);
      groupRef.current.rotation.y = -poseRef.current.angle + Math.PI / 2;
      if (selected) groupRef.current.visible = true;
    }
    wheels.current = train.wheelRotation;
  });

  const n = carriageCount(train);
  const gap = 4.9;

  return (
    <group ref={groupRef}>
      {/* lead car at +x, trailing behind */}
      <group position={[0, 0, 0]} onClick={(e) => { e.stopPropagation(); onSelect(train.id); }}>
        <Locomotive train={train} headlight={train.speed > 0.5 || train.started} />
        <group position={[0, 0, 0]}>
          <WheelSet rotation={wheels.current} />
          <WheelSet rotation={wheels.current} />
        </group>
      </group>
      {Array.from({ length: n - 1 }).map((_, i) => (
        <group key={i} position={[0, 0, -(i + 1) * gap]}>
          <Carriage
            color={train.def.color}
            accent={train.def.accent}
            kind={train.def.kind}
            doorOpen={train.doorOpen}
          />
          <WheelSet rotation={wheels.current} />
        </group>
      ))}
      {selected && (
        <mesh position={[0, 0.05, -(n - 1) * gap * 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[6, 7, 40]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

export function Trains({
  world,
  selectedTrainId,
  onSelectTrain,
}: {
  world: WorldState;
  selectedTrainId: number | null;
  onSelectTrain: (id: number) => void;
}) {
  return (
    <group>
      {world.trains.map((t) => (
        <TrainModel key={t.id} train={t} selected={t.id === selectedTrainId} onSelect={onSelectTrain} />
      ))}
    </group>
  );
}
