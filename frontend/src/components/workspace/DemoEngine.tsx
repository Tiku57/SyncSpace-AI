import React, { useState } from 'react';
import { Play, Loader2, AlertCircle } from 'lucide-react';
import { useSocket } from '../providers/SocketProvider';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

const DEMO_SCRIPT = [
  "Build a premium dual-monitor software engineer workstation using a standing desk.",
  "Upgrade the monitors to LG C3 OLEDs and add an audio system.",
  "Add a 55-inch wall-mounted OLED TV and an ergonomic chair.",
  "Clear everything and build a minimalist Mac Studio setup on an Ikea desk."
];

export const DemoEngine = () => {
  const { sendMessage, isConnected } = useSocket();
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [isFailed, setIsFailed] = useState(false);

  const startDemo = async () => {
    if (!isConnected || isRunning) return;
    setIsRunning(true);
    setIsFailed(false);
    setStep(0);
    setErrorText('');

    for (let i = 0; i < DEMO_SCRIPT.length; i++) {
      setStep(i + 1);
      
      let attempt = 0;
      let success = false;
      
      while (attempt < 3 && !success) {
        attempt++;
        
        // Wait to be fully connected before attempting to send
        if (!isConnected) {
          await new Promise(r => setTimeout(r, 2000));
        }

        sendMessage(DEMO_SCRIPT[i], attempt > 1);
        
        // Short buffer to ensure Zustand captures the isGenerating=true state
        await new Promise(r => setTimeout(r, 500));
        
        // Poll Zustand store until the AI stream finishes
        while (useWorkspaceStore.getState().isGenerating) {
           await new Promise(r => setTimeout(r, 1000));
        }
        
        // Check outcome
        const state = useWorkspaceStore.getState();
        const lastMsg = state.messages[state.messages.length - 1];
        const isFailure = lastMsg?.text?.toLowerCase().includes("failed") || 
                          lastMsg?.text?.toLowerCase().includes("timeout") ||
                          lastMsg?.text?.toLowerCase().includes("unable") ||
                          lastMsg?.text?.toLowerCase().includes("error") ||
                          lastMsg?.text?.toLowerCase().includes("cancelled");
                          
        if (isFailure) {
          if (attempt < 3) {
            setErrorText(`Step ${i + 1} failed. Retrying...`);
            await new Promise(r => setTimeout(r, 3000));
          } else {
            setErrorText("Demo paused due to generation failure.");
            setIsFailed(true);
            setIsRunning(false);
            return; // HALT DEMO completely
          }
        } else {
          success = true;
          setErrorText('');
          // Pause 4 seconds to let the user visually absorb the 3D changes
          await new Promise(r => setTimeout(r, 4000));
        }
      }
    }

    setIsRunning(false);
    setStep(0);
  };

  const getButtonContent = () => {
    if (isFailed) {
      return (
        <>
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-red-400">
            {errorText} (Click to Retry)
          </span>
        </>
      );
    }
    
    if (isRunning) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
          <span className="text-sm font-medium text-indigo-300">
            {errorText ? errorText : `Running Demo (${step}/${DEMO_SCRIPT.length})`}
          </span>
        </>
      );
    }
    
    return (
      <>
        <Play className="w-4 h-4" />
        <span className="text-sm font-medium">Launch Hackathon Demo</span>
      </>
    );
  };

  return (
    <button
      onClick={startDemo}
      disabled={!isConnected || isRunning}
      className={`flex items-center space-x-2 px-4 py-2 rounded-full border shadow-lg transition-all ${
        isRunning 
          ? 'bg-indigo-500/20 border-indigo-500/50 cursor-wait' 
          : isFailed 
            ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
      }`}
    >
      {getButtonContent()}
    </button>
  );
};
