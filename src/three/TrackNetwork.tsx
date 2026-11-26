import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  LOOP_CURVE,
  MAIN_LOOP_RADIUS,
  SIDING_CURVE,
  STATION_ANGLES,
  STATION_POINTS,
  STATIONS,
  loopPoint,
} from '@/sim/network';

const SLEEPERS = 360;

function TrackCurve({ curve, color = '#52525b' }: { curve: THREE.CatmullRomCurve3; color?: string }) {
  const railGeoL = useMemo(() => {
    const pts = curve.getPoints(400);
    const up = new THREE.Vector3(0, 1, 0);
    const offsets: number[] = [-0.75, 0.75];
    return offsets.map((off) => {
      const positions: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const tan = curve.getTangentAt(i / (pts.length - 1));
        const side = new THREE.Vector3().crossVectors(up, tan).normalize();
        const p = pts[i].clone().addScaledVector(side, off).setY(pts[i].y + 0.05);
        positions.push(p.x, p.y, p.z);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
        positions.reduce<THREE.Vector3[]>((acc, _v, i) => {
          if (i % 3 === 0) acc.push(new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]));
          return acc;
        }, []),
        false, 'catmullrom', 0.1
      ), 200, 0.07, 6, false);
    });
  }, [curve]);

  return (
    <group>
      {railGeoL.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#9ca3af" metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Sleepers({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    // static, set once
    if (!ref.current || ref.current.userData.done) return;
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < SLEEPERS; i++) {
      const t = i / SLEEPERS;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(up, tan).normalize();
      dummy.position.copy(p).setY(p.y);
      dummy.lookAt(p.clone().add(tan));
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      void side;
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.userData.done = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, SLEEPERS]} frustumCulled={false}>
      <boxGeometry args={[0.5, 0.08, 2.2]} />
      <meshStandardMaterial color="#4b3b2a" roughness={0.9} />
    </instancedMesh>
  );
}

function Ballast({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const geo = useMemo(() => {
    const pts = curve.getSpacedPoints(240);
    const up = new THREE.Vector3(0, 1, 0);
    const shape = new THREE.Shape();
    // build a flat ribbon manually via triangle strip
    const positions: number[] = [];
    const indices: number[] = [];
    const halfW = 2.6;
    for (let i = 0; i < pts.length; i++) {
      const tan = curve.getTangentAt(i / (pts.length - 1));
      const side = new THREE.Vector3().crossVectors(up, tan).normalize();
      const l = pts[i].clone().addScaledVector(side, -halfW).setY(pts[i].y - 0.12);
      const r = pts[i].clone().addScaledVector(side, halfW).setY(pts[i].y - 0.12);
      positions.push(l.x, l.y, l.z, r.x, r.y, r.z);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [curve]);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#3f3f46" roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function TrackNetwork() {
  return (
    <group>
      <Ballast curve={LOOP_CURVE} />
      <Sleepers curve={LOOP_CURVE} />
      <TrackCurve curve={LOOP_CURVE} />
      <Ballast curve={SIDING_CURVE} />
      <Sleepers curve={SIDING_CURVE} />
      <TrackCurve curve={SIDING_CURVE} />
      {/* platform edge lines */}
      {STATION_POINTS.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, 0.08, p.z]}
          rotation={[0, -STATION_ANGLES[i] * Math.PI / 180 + Math.PI / 2, 0]}
        >
          <boxGeometry args={[10, 0.04, 1.4]} />
          <meshStandardMaterial color="#e4e4e7" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[MAIN_LOOP_RADIUS - 2.8, MAIN_LOOP_RADIUS + 2.8, 128]} />
        <meshBasicMaterial color="#52525b" transparent opacity={0.25} />
      </mesh>
      <PlatformRing />
    </group>
  );
}

function PlatformRing() {
  // decorative connector marks at station angles
  return (
    <group>
      {STATION_POINTS.map((p, i) => {
        const outer = loopPoint(STATION_ANGLES[i], MAIN_LOOP_RADIUS + 3.4);
        return (
          <mesh key={i} position={[outer.x, 0.06, outer.z]}>
            <boxGeometry args={[2, 0.05, 2]} />
            <meshStandardMaterial color={STATIONS[i]?.color ?? '#666'} />
          </mesh>
        );
      })}
    </group>
  );
}

