'use client';

import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import Model from '@/components/atoms/Model';
import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';

function Scene() {
  const [selectedBone, setSelectedBone] = useState<THREE.Bone | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [boneHelpers, setBoneHelpers] = useState<THREE.Mesh[]>([]);
  const [bones, setBones] = useState<THREE.Bone[]>([]);
  const orbitRef = useRef<any>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { scene, camera, gl } = useThree();

  // Bone 헬퍼 초기화
  useEffect(() => {
    const helpers: THREE.Mesh[] = [];
    const boneList: THREE.Bone[] = [];

    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        const skeletonBones = child.skeleton.bones;

        skeletonBones.forEach((bone) => {
          // 초기 회전값 저장
          bone.userData.initialRotation = bone.rotation.clone();

          // Bone 헬퍼 구체 생성
          const geometry = new THREE.SphereGeometry(0.0084, 16, 16);
          const material = new THREE.MeshBasicMaterial({
            color: 0x10b981, // emerald-500
            transparent: true,
            opacity: 0.9,
            depthTest: false,
          });
          const sphere = new THREE.Mesh(geometry, material);
          sphere.renderOrder = 999;

          // Bone 참조 및 색상 정보 저장
          sphere.userData.bone = bone;
          sphere.userData.defaultColor = 0x10b981; // emerald-500
          sphere.userData.modifiedColor = 0x3b82f6; // blue-500
          sphere.userData.selectedColor = 0xffff00; // yellow
          sphere.name = `bone_helper_${bone.name}`;

          // Scene에 추가
          scene.add(sphere);
          helpers.push(sphere);
          boneList.push(bone);
        });
      }
    });

    setBoneHelpers(helpers);
    setBones(boneList);

    // Cleanup
    return () => {
      helpers.forEach((helper) => {
        scene.remove(helper);
        helper.geometry.dispose();
        (helper.material as THREE.Material).dispose();
      });
    };
  }, [scene]);

  // 스페이스바 입력 감지
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 좌클릭으로 Bone 선택 및 드래그 시작
  useEffect(() => {
    let clickStartTime = 0;
    let hasMoved = false;

    const handleMouseDown = (event: MouseEvent) => {
      // 좌클릭만 처리
      if (event.button !== 0) return;

      clickStartTime = Date.now();
      hasMoved = false;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      // 마우스 좌표 정규화
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      let foundBone: THREE.Bone | null = null;

      if (intersects.length > 0) {
        // 1. Bone 헬퍼 구체를 클릭했는지 확인 (우선순위 1)
        for (const intersect of intersects) {
          const object = intersect.object;

          if (object.name.startsWith('bone_helper_') && object.userData.bone) {
            foundBone = object.userData.bone;
            break;
          }
        }

        // 2. SkinnedMesh를 클릭한 경우 가장 가까운 Bone 찾기
        if (!foundBone) {
          for (const intersect of intersects) {
            const object = intersect.object;

            if (object instanceof THREE.SkinnedMesh && object.skeleton) {
              const clickPoint = intersect.point;
              const bones = object.skeleton.bones;

              let closestBone: THREE.Bone | null = null;
              let minDistance = Infinity;

              bones.forEach((bone) => {
                const boneWorldPos = new THREE.Vector3();
                bone.getWorldPosition(boneWorldPos);
                const distance = clickPoint.distanceTo(boneWorldPos);

                if (distance < minDistance) {
                  minDistance = distance;
                  closestBone = bone;
                }
              });

              if (closestBone) {
                foundBone = closestBone;
                break;
              }
            }
          }
        }
      }

      if (foundBone) {
        setSelectedBone(foundBone);
        setIsDragging(true);
        dragStartPos.current = { x: event.clientX, y: event.clientY };

        // OrbitControls 비활성화
        if (orbitRef.current) {
          orbitRef.current.enabled = false;
        }
      } else {
        // 빈 공간 클릭 시 선택 해제
        setSelectedBone(null);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        hasMoved = true;
      }
    };

    const handleMouseUp = () => {
      // 드래그 중이었으면 종료
      if (isDragging) {
        setIsDragging(false);

        // OrbitControls 다시 활성화
        if (orbitRef.current) {
          orbitRef.current.enabled = true;
        }
      }
    };

    gl.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [scene, camera, gl, isDragging]);

  // 마우스 드래그로 Bone 회전
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!selectedBone || !isDragging) return;

      const deltaX = event.clientX - dragStartPos.current.x;
      const deltaY = event.clientY - dragStartPos.current.y;

      // 마우스 움직임을 회전값으로 변환
      const rotationSpeed = 0.01;
      selectedBone.rotation.y += deltaX * rotationSpeed;
      selectedBone.rotation.x += deltaY * rotationSpeed;

      // 현재 위치를 다음 프레임의 시작 위치로 업데이트
      dragStartPos.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [selectedBone, isDragging]);

  // 매 프레임마다 Bone 헬퍼 위치 업데이트 및 색상 변경
  useFrame(() => {
    // 먼저 모든 Bone의 matrixWorld 업데이트
    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        child.skeleton.update();
      }
    });

    boneHelpers.forEach((helper) => {
      const bone = helper.userData.bone;
      if (!bone || !bone.userData.initialRotation) return;

      // Bone의 matrixWorld 강제 업데이트
      bone.updateMatrixWorld(true);

      // Bone의 월드 위치로 헬퍼 이동
      const worldPos = new THREE.Vector3();
      bone.getWorldPosition(worldPos);
      helper.position.copy(worldPos);

      const material = helper.material as THREE.MeshBasicMaterial;

      // 회전값 변경 확인 (더 정확한 비교)
      const threshold = 0.001; // 아주 작은 차이는 무시
      const rotationChanged =
        Math.abs(bone.rotation.x - bone.userData.initialRotation.x) > threshold ||
        Math.abs(bone.rotation.y - bone.userData.initialRotation.y) > threshold ||
        Math.abs(bone.rotation.z - bone.userData.initialRotation.z) > threshold;

      // 선택된 bone인지 확인
      const isSelected = selectedBone === bone;

      if (isSelected) {
        // 선택된 bone: 노란색, 크기 1.5배 확대
        material.color.setHex(helper.userData.selectedColor);
        material.opacity = 1.0;
        helper.scale.set(1.5, 1.5, 1.5);
      } else if (rotationChanged) {
        // 수정된 bone: blue-500
        material.color.setHex(helper.userData.modifiedColor);
        material.opacity = 0.9;
        helper.scale.set(1, 1, 1);
      } else {
        // 기본 bone: emerald-500
        material.color.setHex(helper.userData.defaultColor);
        material.opacity = 0.9;
        helper.scale.set(1, 1, 1);
      }
    });
  });

  return (
    <>
      {/* 조명 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* 3D 모델 (male.glb) */}
      <Model />

      {/* 우측 상단 방향 표시기 (표시 전용) */}
      <GizmoHelper
        alignment="top-right"
        margin={[80, 80]}
        onUpdate={() => {}} // 클릭 시 카메라 이동 비활성화
        onTarget={() => new THREE.Vector3(0, 1, 0)} // 타겟 고정
      >
        <GizmoViewport
          axisColors={['#ef4444', '#10b981', '#3b82f6']}
          labelColor="white"
          hideNegativeAxes
        />
      </GizmoHelper>

      {/* OrbitControls - 우클릭으로 카메라 회전, 스페이스 + 우클릭으로 카메라 중심 이동 */}
      <OrbitControls
        ref={orbitRef}
        target={[0, 1, 0]}
        enableDamping
        dampingFactor={0.05}
        enablePan={true}
        mouseButtons={{
          LEFT: undefined,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: isSpacePressed ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        }}
      />
    </>
  );
}

export default function ThreeScene() {
  return (
    <div className="h-screen w-full bg-gray-500 relative">
      <Canvas
        camera={{
          position: [5, 5, 5],
          fov: 45,
        }}
      >
        <Scene />
      </Canvas>
      {/* GizmoHelper 클릭 방지 오버레이 */}
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
