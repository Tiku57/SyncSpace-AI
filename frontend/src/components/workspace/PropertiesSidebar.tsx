import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useSocket } from '../providers/SocketProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Copy, Trash2, Maximize2, RotateCcw } from 'lucide-react';

export const PropertiesSidebar = () => {
  const { items, selectedItemId, updateItem, addItem, removeItem, setSelectedItemId } = useWorkspaceStore();
  const { socket } = useSocket();

  const item = items.find(i => i.id === selectedItemId);

  if (!item) return null;

  const handleUpdate = (updates: Partial<typeof item>) => {
    const updated = { ...item, ...updates };
    updateItem(updated);
    if (socket) socket.emit('item:update', updated);
  };

  const handleDuplicate = () => {
    const newItem = {
      ...item,
      id: `${item.type}-${Date.now()}`,
      position: [item.position[0] + 0.5, item.position[1], item.position[2] + 0.5] as [number, number, number]
    };
    addItem(newItem);
    if (socket) socket.emit('item:add', newItem);
    setSelectedItemId(newItem.id);
  };

  const handleDelete = () => {
    removeItem(item.id);
    if (socket) socket.emit('item:remove', item.id);
    setSelectedItemId(null);
  };

  const currentScale = item.scale ? item.scale[0] : 1;
  const currentRotationY = item.rotation[1] * (180 / Math.PI);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="absolute top-6 right-[440px] w-72 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10"
      >
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Settings2 className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-white">Properties</h3>
          </div>
        </div>

        <div className="space-y-6">
          {/* Item Info */}
          <div>
            <div className="text-xs text-zinc-500 mb-1">Item Name</div>
            <div className="text-sm font-medium text-zinc-200">{item.name}</div>
          </div>

          {/* Scale Control */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center"><Maximize2 className="w-3 h-3 mr-1"/> Scale</span>
              <span>{currentScale.toFixed(2)}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.05" 
              value={currentScale}
              onChange={(e) => {
                const s = parseFloat(e.target.value);
                handleUpdate({ scale: [s, s, s] });
              }}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Rotation Control */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center"><RotateCcw className="w-3 h-3 mr-1"/> Rotation Y</span>
              <span>{Math.round(currentRotationY)}°</span>
            </div>
            <input 
              type="range" 
              min="-180" 
              max="180" 
              step="5" 
              value={currentRotationY}
              onChange={(e) => {
                const r = parseFloat(e.target.value) * (Math.PI / 180);
                handleUpdate({ rotation: [item.rotation[0], r, item.rotation[2]] });
              }}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
            <button 
              onClick={handleDuplicate}
              className="flex items-center justify-center space-x-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>Duplicate</span>
            </button>
            <button 
              onClick={handleDelete}
              className="flex items-center justify-center space-x-2 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
