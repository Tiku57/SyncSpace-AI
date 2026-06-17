import React from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Box, View } from 'lucide-react';

export const CameraToolbar = () => {
  const { setCamera } = useWorkspaceStore();

  const handlePreset = (position: [number, number, number]) => {
    setCamera(position, [0, 1, 0]);
  };

  return (
    <div className="absolute bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-zinc-950/80 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-x-auto whitespace-nowrap max-w-[95vw] scrollbar-thin scrollbar-thumb-white/10">
      <div className="text-xs font-semibold text-zinc-400 mr-2 flex items-center space-x-1">
        <View className="w-4 h-4" />
        <span>CAMERA</span>
      </div>
      
      <div className="h-6 w-px bg-white/10 mx-1"></div>

      <button onClick={() => handlePreset([0, 4, 6])} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition-colors" title="Front View">
        Front
      </button>
      <button onClick={() => handlePreset([-6, 4, 0])} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition-colors" title="Left View">
        Left
      </button>
      <button onClick={() => handlePreset([6, 4, 0])} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition-colors" title="Right View">
        Right
      </button>
      <button onClick={() => handlePreset([0, 4, -6])} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition-colors" title="Back View">
        Back
      </button>
      <button onClick={() => handlePreset([0, 8, 0.1])} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition-colors" title="Top View">
        Top
      </button>
      
      <div className="h-6 w-px bg-white/10 mx-1"></div>

      <button onClick={() => handlePreset([5, 5, 5])} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white transition-colors border border-indigo-500/30" title="Isometric View">
        <Box className="w-3 h-3" />
        <span>Isometric</span>
      </button>
    </div>
  );
};
