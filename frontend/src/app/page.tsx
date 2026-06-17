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
import { BarChart2, MessageSquare, Monitor, Menu, X } from 'lucide-react';

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

function Sidebar() {
  return (
    <div className="w-[340px] xl:w-[380px] flex-shrink-0 border-r border-white/10 bg-zinc-950/50 p-6 overflow-y-auto z-10 flex flex-col gap-8 relative hidden lg:flex">
      <AnalyticsPanel />
      <PricingTable />
    </div>
  );
}

export default function Home() {
  const [mobileTab, setMobileTab] = useState<'canvas' | 'analytics' | 'chat'>('canvas');

  return (
    <main className="flex flex-col h-[100dvh] w-full overflow-hidden bg-black text-white selection:bg-indigo-500/30 relative">
      
      <Header />
      
      <div className="flex flex-1 overflow-hidden relative pb-16 lg:pb-0">
        <Sidebar />
        
        {/* Workspace */}
        <div className="flex-1 relative cursor-grab active:cursor-grabbing z-[1]">
          <WorkspaceCanvas />
          <LiveValidationHUD />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/80 pointer-events-none" />
          <div className="hidden lg:block">
            <PropertiesSidebar />
          </div>
          <CameraToolbar />
        </div>
        
        {/* Desktop Chat */}
        <div className="w-[340px] lg:w-[420px] border-l border-white/10 bg-zinc-950/50 flex-shrink-0 relative flex-col z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] hidden lg:flex">
          <AIChat />
        </div>
      </div>

      {/* Mobile Drawers (AnimatePresence) */}
      <AnimatePresence>
        {mobileTab === 'analytics' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-[60px] md:top-[70px] z-[90] bg-zinc-950 lg:hidden overflow-y-auto pb-20 p-4 flex flex-col gap-6"
          >
            <h2 className="text-xl font-bold text-white mb-2">Analytics & Pricing</h2>
            <AnalyticsPanel />
            <PricingTable />
          </motion.div>
        )}

        {mobileTab === 'chat' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-[60px] md:top-[70px] z-[90] bg-zinc-950 lg:hidden pb-16"
          >
            <AIChat />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 z-[100] flex items-center justify-around lg:hidden px-4">
        <button 
          onClick={() => setMobileTab('analytics')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${mobileTab === 'analytics' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Analytics</span>
        </button>
        <button 
          onClick={() => setMobileTab('canvas')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${mobileTab === 'canvas' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Monitor className="w-5 h-5" />
          <span className="text-[10px] font-medium">Canvas</span>
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
