import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function CloudParticles() {
  const points = useRef<THREE.Points>(null!);
  const count = 1500;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (pseudoRandom(i * 3 + 1) - 0.5) * 15;
      pos[i * 3 + 1] = (pseudoRandom(i * 3 + 2) - 0.5) * 15;
      pos[i * 3 + 2] = (pseudoRandom(i * 3 + 3) - 0.5) * 15;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y += 0.001;
      points.current.rotation.x += 0.0005;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#ff7900"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

function Grid() {
  return (
    <gridHelper 
      args={[40, 40, 0xff7900, 0xeeeeee]} 
      rotation={[Math.PI / 4, 0, 0]} 
      position={[0, -2, 0]}
    />
  );
}

const HeroScene = () => {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none opacity-40">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <CloudParticles />
        <Grid />
      </Canvas>
    </div>
  );
};

export default HeroScene;
