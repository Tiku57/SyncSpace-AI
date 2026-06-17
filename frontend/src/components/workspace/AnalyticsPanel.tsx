import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export const AnalyticsPanel = () => {
  const { analytics } = useWorkspaceStore();

  const metrics = [
    { label: 'Productivity', value: analytics.productivity, color: 'bg-blue-500' },
    { label: 'Ergonomics', value: analytics.ergonomics, color: 'bg-emerald-500' },
    { label: 'Design', value: analytics.design, color: 'bg-purple-500' },
    { label: 'Value Score', value: analytics.value, color: 'bg-yellow-500' },
    { label: 'Est. ROI', value: analytics.roi, color: 'bg-green-400' },
    { label: 'Cable Mgmt', value: analytics.cableManagement, color: 'bg-zinc-400' },
    { label: 'Future-Proof', value: analytics.futureProofing, color: 'bg-cyan-500' },
    { label: 'Focus Score', value: analytics.focus, color: 'bg-orange-500' },
  ];

  return (
    <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="flex items-center space-x-3 mb-4 border-b border-white/10 pb-4">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Activity className="w-5 h-5 text-indigo-400" />
        </div>
        <h3 className="font-semibold text-white">Setup Analytics</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex justify-between text-[10px] mb-1 space-x-1">
              <span className="text-zinc-400 font-medium uppercase tracking-wider truncate pr-1">{metric.label}</span>
              <span className="text-zinc-200 font-bold shrink-0">{Math.round(metric.value)}</span>
            </div>
            <div className="w-full bg-zinc-800/80 rounded-full h-1 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full ${metric.color} rounded-full`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
