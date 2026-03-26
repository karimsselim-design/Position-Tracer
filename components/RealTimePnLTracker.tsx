import React, { useState, useEffect, useRef } from 'react';

interface RealTimePnLTrackerProps {
  totalPnL?: number;
}

const RealTimePnLTracker: React.FC<RealTimePnLTrackerProps> = ({ totalPnL = 0 }) => {
  const [dailyPnL, setDailyPnL] = useState(24120.80);
  const [isUp, setIsUp] = useState(true);
  const [tickColor, setTickColor] = useState('text-success');
  
  const prevPnL = useRef(totalPnL);

  useEffect(() => {
    const delta = totalPnL - prevPnL.current;
    
    if (Math.abs(delta) > 0.01) {
      setTickColor(delta > 0 ? 'text-success' : 'text-danger');
      setIsUp(delta > 0);
    }
    
    prevPnL.current = totalPnL;
    // Simulate a baseline daily profit + current session movement
    setDailyPnL(24120.80 + totalPnL);
  }, [totalPnL]);

  // For the progress bar, we assume a target of $50k across the cluster
  const quotaProgress = Math.min(100, Math.max(0, (totalPnL / 50000) * 100)).toFixed(1);
  const growthPct = totalPnL === 0 ? "0.00" : ((totalPnL / 1244500) * 100).toFixed(2);

  return (
    <div className="glass-panel p-4 border-t-2 border-primary flex flex-col gap-2 bg-white dark:bg-black/40 min-w-[240px] relative overflow-hidden group shadow-md dark:shadow-2xl transition-all duration-300 rounded-xl">
      <div className={`absolute -top-4 -right-4 transition-all duration-700 transform ${isUp ? 'rotate-0' : 'rotate-180'} opacity-5 dark:opacity-20`}>
        <span className={`material-symbols-outlined text-7xl ${isUp ? 'text-success' : 'text-danger'} blur-[1px]`}>
          trending_up
        </span>
      </div>

      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Live Signal Node</span>
          <span className="text-[7px] font-mono text-slate-500 dark:text-slate-500 uppercase tracking-widest">Aggregate Matrix P/L</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-black/20 rounded-full border border-slate-200 dark:border-white/5">
          <span className="size-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_#10b981]"></span>
          <span className="text-[8px] font-mono text-slate-500 font-black uppercase tracking-widest">Active</span>
        </div>
      </div>

      <div className="space-y-1 z-10 mt-1">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Unrealized Cluster P/L</span>
          <div className="flex items-baseline gap-2">
            <div className={`inline-flex items-center justify-end px-3 py-1.5 rounded-xl border font-black font-mono tracking-tighter tabular-nums transition-all duration-300 ${totalPnL >= 0 ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
              <span className="text-3xl">
                {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono font-bold">USD</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex flex-col">
            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1">Session</span>
            <span className="text-[15px] font-black text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
              ${dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1">Matrix Yield</span>
            <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md border font-black font-mono tracking-tight tabular-nums ${totalPnL >= 0 ? 'bg-success/20 border-success/30 text-success' : 'bg-danger/20 border-danger/30 text-danger'}`}>
              <span className="text-[15px]">
                {totalPnL >= 0 ? '+' : ''}{growthPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 z-10">
        <div className="flex justify-between text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          <span>Cluster Goal Progress</span>
          <span className="text-slate-900 dark:text-white font-mono">{quotaProgress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 shadow-inner">
          <div 
            className="h-full bg-primary shadow-[0_0_15px_rgba(242,13,13,0.4)] transition-all duration-1000 ease-out" 
            style={{ width: `${quotaProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default RealTimePnLTracker;