import React from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { CheckCircle2, XCircle } from 'lucide-react';

export const LiveValidationHUD = () => {
  const { analytics, subtotal, items } = useWorkspaceStore();
  
  const isErgonomic = analytics.ergonomics >= 40 && items.length > 0;
  const isCollisionFree = items.length > 0; 
  const isBudgetCompliant = subtotal <= 10000 && items.length > 0;

  return (
    <div className="absolute top-24 left-6 z-[9999] pointer-events-none animate-in slide-in-from-left duration-500">
      <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl flex flex-col space-y-2">
        
        <div className="flex items-center space-x-2">
          {isErgonomic ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-zinc-600" />
          )}
          <span className={`text-xs font-semibold ${isErgonomic ? 'text-white' : 'text-zinc-500'}`}>Ergonomic</span>
        </div>

        <div className="flex items-center space-x-2">
          {isCollisionFree ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-zinc-600" />
          )}
          <span className={`text-xs font-semibold ${isCollisionFree ? 'text-white' : 'text-zinc-500'}`}>Collision Free</span>
        </div>

        <div className="flex items-center space-x-2">
          {isBudgetCompliant ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-xs font-semibold ${isBudgetCompliant ? 'text-white' : 'text-red-400'}`}>Budget Compliant</span>
        </div>

      </div>
    </div>
  );
};
