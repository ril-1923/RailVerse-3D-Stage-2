import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SimSettings } from '@/sim/useSimulation';

function Rain({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 900;

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      let y = pos.getY(i) - dt * 30;
      if (y < 0) y = 40;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    ref.current.visible = active;
  });

  return (
    <points ref={ref} geometry={geometry} visible={active}>
      <pointsMaterial color="#93c5fd" size={0.14} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function CloudLayer({ cloudy }: { cloudy: boolean }) {
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const arr: { pos: [number, number, number]; r: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      arr.push({
        pos: [Math.cos(a) * 90, 34 + Math.sin(i * 3) * 5, Math.sin(a) * 90],
        r: 9 + (i % 4) * 3,
      });
    }
    return arr;
  }, []);

  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh key={i} position={p.pos} visible={cloudy}>
          <sphereGeometry args={[p.r, 10, 10]} />
          <meshStandardMaterial color="#9ca3af" transparent opacity={0.55} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export function Weather({ settings }: { settings: SimSettings }) {
  const fogColor = settings.weather === 'fog' ? '#cbd5e1' : settings.weather === 'rain' ? '#64748b' : settings.weather === 'cloudy' ? '#94a3b8' : '#bfdbfe';
  const fogFar = settings.weather === 'fog' ? 90 : settings.weather === 'rain' ? 220 : 500;

  return (
    <>
      <fog attach="fog" args={[fogColor, 60, fogFar]} />
      <ambientLight intensity={settings.weather === 'clear' ? 0.7 : 0.5} />
      <hemisphereLight args={['#dbeafe', '#3a5a40', 0.6]} />
      <directionalLight
        position={[80, 90, 40]}
        intensity={settings.weather === 'clear' ? 1.6 : settings.weather === 'cloudy' ? 0.7 : 0.9}
        color={settings.weather === 'clear' ? '#fff7e0' : '#e2e8f0'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
        shadow-camera-far={400}
      />
      <Rain active={settings.weather === 'rain'} />
      <CloudLayer cloudy={settings.weather !== 'clear'} />
      {/* sky tint */}
      <color attach="background" args={[fogColor === '#bfdbfe' ? '#87ceeb' : fogColor]} />
    </>
  );
}
