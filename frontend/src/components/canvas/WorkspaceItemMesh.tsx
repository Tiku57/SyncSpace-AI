import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Box, RoundedBox, Cylinder, Text, DragControls, Html } from '@react-three/drei';
import { WorkspaceItem } from '@/types';
import { useSocket } from '../providers/SocketProvider';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Trash2 } from 'lucide-react';



interface Props {
  item: WorkspaceItem;
}

export const WorkspaceItemMesh = ({ item }: Props) => {
  const [hovered, setHovered] = useState(false);
  const { socket } = useSocket();
  const { selectedItemId, setSelectedItemId, removeItem, setCamera } = useWorkspaceStore();
  const selected = selectedItemId === item.id;
  const groupRef = useRef<THREE.Group>(null);

  // GSAP Entrance Animation (Scale only to preserve strict physics Y bounds)
  useGSAP(() => {
    if (groupRef.current) {
      groupRef.current.scale.set(0, 0, 0);

      gsap.to(groupRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.6,
        ease: 'back.out(1.5)',
      });
    }
  }, []);

  const handleDragEnd = () => {
    if (socket && groupRef.current) {
      const pos = groupRef.current.position;
      socket.emit('item:update', {
        ...item,
        position: [pos.x, pos.y, pos.z]
      });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Move camera in front and slightly above the object, while targeting it
    setCamera(
      [item.position[0], item.position[1] + 1.5, item.position[2] + 2],
      [item.position[0], item.position[1], item.position[2]]
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeItem(item.id);
    if (socket) {
      socket.emit('item:remove', item.id);
    }
  };

  const renderGeometry = () => {
    // Premium PBR Materials
    const screenMat = <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.9} envMapIntensity={2} />;
    const bezelMat = <meshStandardMaterial color={hovered || selected ? "#6366f1" : "#1a1a1a"} roughness={0.4} metalness={0.6} />;
    const aluminumMat = <meshStandardMaterial color={hovered || selected ? "#818cf8" : "#d1d5db"} roughness={0.3} metalness={0.8} />;
    const woodMat = <meshStandardMaterial color={hovered || selected ? "#6366f1" : "#2d241c"} roughness={0.7} metalness={0.1} />;
    const darkMetalMat = <meshStandardMaterial color="#111" roughness={0.6} metalness={0.8} />;
    const whitePlasticMat = <meshStandardMaterial color={hovered || selected ? "#6366f1" : "#f3f4f6"} roughness={0.3} metalness={0.1} />;
    const blackPlasticMat = <meshStandardMaterial color={hovered || selected ? "#6366f1" : "#111827"} roughness={0.8} metalness={0.2} />;

    const primitive = (
      <group>
        {(() => {
          switch (item.type) {
            case 'monitor':
              return (
                <group>
                  {/* Monitor Panel */}
                  <RoundedBox args={[1.6, 0.9, 0.05]} radius={0.02} smoothness={4} position={[0, 0.625, 0]}>
                    {bezelMat}
                  </RoundedBox>
                  {/* Screen Glass */}
                  <Box args={[1.56, 0.86, 0.01]} position={[0, 0.625, 0.026]}>
                    {screenMat}
                  </Box>
                  {/* Stand Neck */}
                  <Cylinder args={[0.04, 0.04, 0.4, 16]} position={[0, 0.325, -0.05]}>
                    {aluminumMat}
                  </Cylinder>
                  {/* Stand Base */}
                  <RoundedBox args={[0.5, 0.02, 0.3]} radius={0.01} smoothness={4} position={[0, 0.01, -0.05]}>
                    {darkMetalMat}
                  </RoundedBox>
                </group>
              );
            case 'stand':
              return (
                <RoundedBox args={[1.2, 0.05, 0.6]} radius={0.02} smoothness={4} position={[0, 0.025, 0]}>
                   {aluminumMat}
                </RoundedBox>
              );
            case 'desk':
              return (
                <group>
                  {/* Table top */}
                  <RoundedBox args={[3.2, 0.1, 1.6]} radius={0.02} smoothness={4} position={[0, 0.95, 0]}>
                    {woodMat}
                  </RoundedBox>
                  {/* Legs */}
                  <Cylinder args={[0.04, 0.04, 0.9, 16]} position={[-1.4, 0.45, -0.6]}>
                     {darkMetalMat}
                  </Cylinder>
                  <Cylinder args={[0.04, 0.04, 0.9, 16]} position={[1.4, 0.45, -0.6]}>
                     {darkMetalMat}
                  </Cylinder>
                  <Cylinder args={[0.04, 0.04, 0.9, 16]} position={[-1.4, 0.45, 0.6]}>
                     {darkMetalMat}
                  </Cylinder>
                  <Cylinder args={[0.04, 0.04, 0.9, 16]} position={[1.4, 0.45, 0.6]}>
                     {darkMetalMat}
                  </Cylinder>
                </group>
              );
            case 'chair':
              return (
                <group>
                  {/* Seat */}
                  <RoundedBox args={[0.5, 0.08, 0.5]} radius={0.04} smoothness={4} position={[0, 0.45, 0]}>
                    {blackPlasticMat}
                  </RoundedBox>
                  {/* Backrest */}
                  <RoundedBox args={[0.48, 0.5, 0.06]} radius={0.03} smoothness={4} position={[0, 0.7, -0.22]}>
                    {blackPlasticMat}
                  </RoundedBox>
                  {/* Stem */}
                  <Cylinder args={[0.03, 0.03, 0.4, 16]} position={[0, 0.2, 0]}>
                    {aluminumMat}
                  </Cylinder>
                  {/* Base */}
                  <Cylinder args={[0.3, 0.3, 0.05, 5]} position={[0, 0.025, 0]}>
                    {darkMetalMat}
                  </Cylinder>
                </group>
              );
            case 'laptop':
              return (
                <group>
                  {/* Base */}
                  <RoundedBox args={[0.4, 0.015, 0.3]} radius={0.005} smoothness={4} position={[0, 0.0075, 0]}>
                    {aluminumMat}
                  </RoundedBox>
                  {/* Screen */}
                  <group position={[0, 0.015, -0.15]} rotation={[-0.2, 0, 0]}>
                    <RoundedBox args={[0.4, 0.25, 0.01]} radius={0.005} smoothness={4} position={[0, 0.125, 0]}>
                       {aluminumMat}
                    </RoundedBox>
                    <Box args={[0.38, 0.23, 0.01]} position={[0, 0.125, 0.006]}>
                       {screenMat}
                    </Box>
                  </group>
                </group>
              );
            case 'tablet':
              return (
                <group rotation={[-Math.PI / 2 + 0.1, 0, 0]} position={[0, 0.005, 0]}>
                  {/* Body */}
                  <RoundedBox args={[0.25, 0.35, 0.01]} radius={0.01} smoothness={4} position={[0, 0, 0]}>
                    {aluminumMat}
                  </RoundedBox>
                  {/* Screen */}
                  <Box args={[0.23, 0.33, 0.01]} position={[0, 0, 0.006]}>
                     {screenMat}
                  </Box>
                </group>
              );
            case 'keyboard':
              return (
                <RoundedBox args={[0.4, 0.015, 0.15]} radius={0.005} smoothness={4} position={[0, 0.0075, 0]} rotation={[0.05, 0, 0]}>
                   {whitePlasticMat}
                </RoundedBox>
              );
            case 'mouse':
              return (
                <RoundedBox args={[0.06, 0.03, 0.1]} radius={0.02} smoothness={4} position={[0, 0.015, 0]}>
                   {whitePlasticMat}
                </RoundedBox>
              );
            case 'tv':
              return (
                <group>
                  {/* Large TV Screen */}
                  <RoundedBox args={[2.4, 1.3, 0.04]} radius={0.02} smoothness={4} position={[0, 0.65, 0]}>
                    {bezelMat}
                  </RoundedBox>
                  <Box args={[2.36, 1.26, 0.01]} position={[0, 0.65, 0.021]}>
                     {screenMat}
                  </Box>
                </group>
              );
            case 'speakers':
              return (
                <group>
                  {/* Speaker box */}
                  <RoundedBox args={[0.2, 0.4, 0.3]} radius={0.02} smoothness={4} position={[0, 0.2, 0]}>
                    {woodMat}
                  </RoundedBox>
                  {/* Speaker cones */}
                  <Cylinder args={[0.06, 0.06, 0.02, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.28, 0.16]}>
                    {darkMetalMat}
                  </Cylinder>
                  <Cylinder args={[0.04, 0.04, 0.02, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0.16]}>
                    {darkMetalMat}
                  </Cylinder>
                </group>
              );
            case 'box':
              return (
                <group>
                  <RoundedBox args={[0.25, 0.5, 0.45]} radius={0.02} smoothness={4} position={[0, 0.25, 0]}>
                    {aluminumMat}
                  </RoundedBox>
                  {/* Glass Side Panel */}
                  <Box args={[0.24, 0.48, 0.43]} position={[0.01, 0.25, 0]}>
                    <meshStandardMaterial color="#000" transparent opacity={0.8} metalness={0.9} roughness={0.1} />
                  </Box>
                </group>
              );
            case 'webcam':
              return (
                <group position={[0, 0.015, 0]}>
                  {/* Sleek Body */}
                  <RoundedBox args={[0.05, 0.015, 0.015]} radius={0.005} smoothness={4} position={[0, 0, 0]}>
                    {blackPlasticMat}
                  </RoundedBox>
                  {/* Lens */}
                  <Cylinder args={[0.006, 0.006, 0.003, 16]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.008]}>
                    {screenMat}
                  </Cylinder>
                  {/* Mount base */}
                  <Box args={[0.02, 0.01, 0.02]} position={[0, -0.01, 0]}>
                    {darkMetalMat}
                  </Box>
                </group>
              );
            default:
              return (
                <RoundedBox args={[0.5, 0.5, 0.5]} radius={0.05} smoothness={4} position={[0, 0.25, 0]}>
                  <meshStandardMaterial color={hovered || selected ? "#6366f1" : "#e5e7eb"} roughness={0.3} metalness={0.1} />
                </RoundedBox>
              );
          }
        })()}
      </group>
    );

    return primitive;
  };

  return (
    <DragControls axisLock="y" onDragEnd={handleDragEnd} onDragStart={() => setSelectedItemId(item.id)}>
      <group 
        ref={groupRef}
        position={item.position} 
        rotation={item.rotation}
        scale={item.scale || [1, 1, 1]}
        onClick={(e) => { e.stopPropagation(); setSelectedItemId(selected ? null : item.id); }}
        onDoubleClick={(e) => handleDoubleClick(e as any)}
        onPointerMissed={(e) => { if (e.type === 'click') setSelectedItemId(null); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'grab'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        {renderGeometry()}

        {/* Floating Label */}
        {hovered && !selected && (
          <Text
            position={[0, 1.8, 0]}
            fontSize={0.15}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {item.name} (${item.price})
          </Text>
        )}

        {/* Selected Overlay UI */}
        {selected && (
          <Html position={[0, 1.8, 0]} center zIndexRange={[100, 0]}>
            <div className="flex items-center space-x-2 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
              <span className="text-xs font-semibold text-white whitespace-nowrap">{item.name}</span>
              <div className="w-px h-4 bg-white/20 mx-1" />
              <button 
                onClick={handleDelete}
                className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                title="Remove Item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </Html>
        )}
      </group>
    </DragControls>
  );
};
