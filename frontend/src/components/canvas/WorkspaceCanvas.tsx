import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows, Bounds, useBounds } from '@react-three/drei';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { WorkspaceItemMesh } from './WorkspaceItemMesh';
import gsap from 'gsap';
import * as THREE from 'three';

const SceneUpdater = () => {
  const { invalidate } = useThree();
  const items = useWorkspaceStore((state) => state.items);

  useEffect(() => {
    invalidate();
  }, [items, invalidate]);

  return null;
};

const CameraRig = () => {
  const { cameraPosition, cameraTarget, setCamera } = useWorkspaceStore();
  const { camera, controls } = useThree();

  useEffect(() => {
    if (cameraPosition && cameraTarget && controls) {
      // @ts-ignore
      const target = controls.target as THREE.Vector3;
      
      gsap.to(camera.position, {
        x: cameraPosition[0],
        y: cameraPosition[1],
        z: cameraPosition[2],
        duration: 1.2,
        ease: 'power3.inOut'
      });

      gsap.to(target, {
        x: cameraTarget[0],
        y: cameraTarget[1],
        z: cameraTarget[2],
        duration: 1.2,
        ease: 'power3.inOut',
        onUpdate: () => {
          // @ts-ignore
          controls.update();
        },
        onComplete: () => {
          // @ts-ignore
          setCamera(null, null); // Clear state so user can trigger same preset again if needed
        }
      });
    }
  }, [cameraPosition, cameraTarget, camera, controls, setCamera]);

  return null;
};

// BoundsFitter removed to prevent any automatic zooming.

export const WorkspaceCanvas = () => {
  const items = useWorkspaceStore((state) => state.items);

  return (
    <Canvas
      camera={{ position: [0, 4, 6], fov: 45 }}
      className="w-full h-full"
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <SceneUpdater />
      <color attach="background" args={['#09090b']} /> {/* Zinc-950 equivalent */}
      
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
      
      <CameraRig />
      <Bounds margin={1.2}>
        {/* Render all 3D items driven by our real-time state */}
        {items.map((item) => (
          <WorkspaceItemMesh key={item.id} item={item} />
        ))}
      </Bounds>

      {/* Futuristic Floor Grid */}
      <Grid 
        renderOrder={-1} 
        position={[0, -0.01, 0]} 
        infiniteGrid 
        fadeDistance={20} 
        fadeStrength={5}
        cellSize={0.5} 
        cellThickness={0.5} 
        cellColor="#ffffff" 
        sectionSize={2} 
        sectionThickness={1} 
        sectionColor="#6366f1" // Indigo-500
      />

      <Environment preset="apartment" environmentIntensity={1.2} />

      <ContactShadows 
        position={[0, -0.01, 0]} 
        opacity={0.8} 
        scale={20} 
        blur={1.5} 
        far={10} 
        resolution={1024} 
        color="#000000"
      />
      
      <OrbitControls 
        makeDefault 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI - 0.1} // Allow looking from bottom, but prevent gimbal lock
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
};
