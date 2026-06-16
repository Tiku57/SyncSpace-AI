import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Download, Image as ImageIcon } from 'lucide-react';

export const ExportSystem = () => {
  const { items } = useWorkspaceStore();

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "syncspace_workspace.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportImage = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataUrl);
    downloadAnchorNode.setAttribute("download", "syncspace_render.png");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex space-x-2">
      <button 
        onClick={exportJSON}
        className="flex items-center space-x-2 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg text-xs font-medium text-white transition-colors"
      >
        <Download className="w-3 h-3" />
        <span>Export JSON</span>
      </button>
      <button 
        onClick={exportImage}
        className="flex items-center space-x-2 bg-indigo-600/90 hover:bg-indigo-500 backdrop-blur-md px-4 py-2 rounded-xl border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.3)] text-xs font-medium text-white transition-colors"
      >
        <ImageIcon className="w-3 h-3" />
        <span>Save Render</span>
      </button>
    </div>
  );
};
