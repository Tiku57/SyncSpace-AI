'use client';

import { useState } from 'react';
import { WorkspaceCanvas } from '@/components/canvas/WorkspaceCanvas';
import { AIChat } from '@/components/chat/AIChat';
import { PricingTable } from '@/components/workspace/PricingTable';
import { AnalyticsPanel } from '@/components/workspace/AnalyticsPanel';
import { PropertiesSidebar } from '@/components/workspace/PropertiesSidebar';
import { ExportSystem } from '@/components/workspace/ExportSystem';
import { CameraToolbar } from '@/components/workspace/CameraToolbar';
import { DemoEngine } from '@/components/workspace/DemoEngine';
import { LiveValidationHUD } from '@/components/workspace/LiveValidationHUD';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, MessageSquare, Monitor, Menu, X, ShoppingCart } from 'lucide-react';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 w-full flex flex-wrap justify-between items-center px-4 md:px-6 py-3 md:py-4 bg-zinc-950/80 border-b border-white/10 z-[9999] flex-shrink-0 backdrop-blur-md">
      <div className="flex items-center space-x-3 md:space-x-6">
        <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter shrink-0">
          SyncSpace <span className="font-light text-white/50 hidden sm:inline">AI</span>
        </h1>
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-2">
          <DemoEngine />
          <ExportSystem />
        </div>
      </div>
      
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/10 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
          <span className="text-xs md:text-sm font-medium text-white/80 whitespace-nowrap">Live Engine</span>
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/10 shrink-0"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Actions Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full md:hidden mt-3 pt-3 border-t border-white/10 flex flex-col gap-3 overflow-hidden"
          >
            <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
              <DemoEngine />
            </div>
            <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
              <ExportSystem />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default function Home() {
  const [mobileTab, setMobileTab] = useState<'canvas' | 'analytics' | 'pricing' | 'chat'>('canvas');

  return (
    <main className="flex flex-col h-[100dvh] w-full max-w-full overflow-hidden bg-black text-white selection:bg-indigo-500/30 relative">
      
      <Header />
      
      <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden relative pb-16 lg:pb-0">
        
        {/* Desktop Left Sidebar (Hidden on mobile) */}
        <div className="hidden lg:flex w-[280px] xl:w-[340px] flex-shrink-0 border-r border-white/10 bg-zinc-950/50 p-6 overflow-y-auto z-10 flex-col gap-8 relative min-w-0">
          <AnalyticsPanel />
          <PricingTable />
        </div>
        
        {/* Workspace Canvas (Center Desktop, Tab 1 Mobile) */}
        <div className={`flex-1 relative cursor-grab active:cursor-grabbing z-[1] min-w-0 ${mobileTab === 'canvas' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
          <WorkspaceCanvas />
          <LiveValidationHUD />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/80 pointer-events-none" />
          <div className="hidden lg:block">
            <PropertiesSidebar />
          </div>
          <CameraToolbar />
        </div>

        {/* Mobile Analytics Tab */}
        <div className={`flex-1 overflow-y-auto p-4 z-10 min-w-0 bg-zinc-950 ${mobileTab === 'analytics' ? 'block lg:hidden' : 'hidden'}`}>
          <AnalyticsPanel />
        </div>

        {/* Mobile Pricing Tab */}
        <div className={`flex-1 overflow-y-auto p-4 z-10 min-w-0 bg-zinc-950 ${mobileTab === 'pricing' ? 'block lg:hidden' : 'hidden'}`}>
          <PricingTable />
        </div>
        
        {/* Chat (Right Desktop, Tab 4 Mobile) */}
        <div className={`w-full lg:w-[340px] xl:w-[420px] border-l border-white/10 bg-zinc-950/50 flex-shrink-0 relative flex-col z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] min-w-0 ${mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
          <AIChat />
        </div>

      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 z-[100] flex items-center justify-around lg:hidden px-2 max-w-full">
        <button 
          onClick={() => setMobileTab('canvas')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${mobileTab === 'canvas' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Monitor className="w-5 h-5" />
          <span className="text-[10px] font-medium">Canvas</span>
        </button>
        <button 
          onClick={() => setMobileTab('analytics')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${mobileTab === 'analytics' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Analytics</span>
        </button>
        <button 
          onClick={() => setMobileTab('pricing')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${mobileTab === 'pricing' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] font-medium">Pricing</span>
        </button>
        <button 
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${mobileTab === 'chat' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium">Co-Pilot</span>
        </button>
      </div>
    </main>
  );
}
