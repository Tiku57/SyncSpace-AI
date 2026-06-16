'use client';

import { WorkspaceCanvas } from '@/components/canvas/WorkspaceCanvas';
import { AIChat } from '@/components/chat/AIChat';
import { PricingTable } from '@/components/workspace/PricingTable';
import { AnalyticsPanel } from '@/components/workspace/AnalyticsPanel';
import { PropertiesSidebar } from '@/components/workspace/PropertiesSidebar';
import { ExportSystem } from '@/components/workspace/ExportSystem';
import { CameraToolbar } from '@/components/workspace/CameraToolbar';
import { DemoEngine } from '@/components/workspace/DemoEngine';
import { LiveValidationHUD } from '@/components/workspace/LiveValidationHUD';

function Header() {
  return (
    <header className="sticky top-0 w-full flex justify-between items-center px-6 py-4 bg-zinc-950/80 border-b border-white/10 z-[9999] flex-shrink-0 backdrop-blur-md">
      <div className="flex items-center space-x-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter">
          SyncSpace <span className="font-light text-white/50">AI</span>
        </h1>
        <DemoEngine />
        <ExportSystem />
      </div>
      <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-sm font-medium text-white/80">Live Engine</span>
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <div className="w-[340px] xl:w-[380px] flex-shrink-0 border-r border-white/10 bg-zinc-950/50 p-6 overflow-y-auto z-10 flex flex-col gap-8 relative">
      <AnalyticsPanel />
      <PricingTable />
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-col h-screen w-full overflow-hidden bg-black text-white selection:bg-indigo-500/30">
      
      <Header />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        
        {/* Workspace */}
        <div className="flex-1 relative cursor-grab active:cursor-grabbing z-[1]">
          <WorkspaceCanvas />
          <LiveValidationHUD />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/80 pointer-events-none" />
          <PropertiesSidebar />
          <CameraToolbar />
        </div>
        
        {/* Chat */}
        <div className="w-[340px] lg:w-[420px] border-l border-white/10 bg-zinc-950/50 flex-shrink-0 relative flex flex-col z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
          <AIChat />
        </div>
      </div>

    </main>
  );
}
