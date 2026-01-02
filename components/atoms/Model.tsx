'use client';

import { useGLTF } from '@react-three/drei';

export default function Model() {
  // GLB 모델 로드
  const { scene } = useGLTF('/male.glb');

  return (
    <primitive
      object={scene}
      scale={1}
      position={[0, 0, 0]}
    />
  );
}

// GLB 파일 미리 로드 (성능 최적화)
useGLTF.preload('/male.glb');
