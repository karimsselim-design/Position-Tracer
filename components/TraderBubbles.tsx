import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface AggregatedTrader {
  traderName: string;
  totalPnL: number;
  avgGrowth: number;
  totalLots: number;
  tradeCount: number;
}

interface TraderBubblesProps {
  data: AggregatedTrader[];
}

const TraderBubbles: React.FC<TraderBubblesProps> = ({ data }) => {
  const traderStats = data.map(t => ({
    name: t.traderName,
    totalPnl: t.totalPnL,
    avgGrowth: t.avgGrowth,
    totalLot: t.totalLots,
    tradeCount: t.tradeCount
  }));

  // Safe scaling logic to prevent UI overflow
  const maxLot = Math.max(...traderStats.map(t => t.totalLot), 1);

  const getBubbleSize = (lot: number) => {
    const minSize = 160;
    const maxSize = 300;
    return minSize + ((lot / maxLot) * (maxSize - minSize));
  };

  const getHeatmapColor = (growth: number) => {
    if (growth >= 50) return 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/50 border-emerald-400';
    if (growth > 0) return 'bg-emerald-800 hover:bg-emerald-700 text-emerald-50 shadow-emerald-800/50 border-emerald-600';
    if (growth === 0) return 'bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-slate-700/50 border-slate-500';
    if (growth < 0 && growth >= -50) return 'bg-rose-800 hover:bg-rose-700 text-rose-50 shadow-rose-800/50 border-rose-600';
    return 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/50 border-rose-400';
  };

  return (
    <div className="relative flex flex-wrap justify-center items-center gap-8 p-10 min-h-[600px] rounded-[2rem] bg-[#0B1120] border border-slate-800 shadow-2xl overflow-hidden w-full">
      
      {/* Institutional Dot Matrix Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', 
          backgroundSize: '28px 28px' 
        }}
      ></div>
      
      {/* Depth Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B1120]/50 to-[#0B1120] pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-rose-500/5 pointer-events-none"></div>

      {traderStats.map((trader, idx) => {
        const size = getBubbleSize(trader.totalLot);
        const colorClasses = getHeatmapColor(trader.avgGrowth); 
        const animClass = `bubble-anim-${idx % 3}`;
        
        return (
          <div
            key={trader.name}
            className={`relative z-10 rounded-full shadow-2xl flex flex-col justify-center items-center p-4 cursor-pointer transition-colors duration-300 border backdrop-blur-sm ${colorClasses} ${animClass}`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
            }}
          >
            <h3 className="text-xl font-black tracking-wider uppercase opacity-90 text-center mb-1 drop-shadow-sm">
              {trader.name}
            </h3>
            
            <p className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight text-center my-2 drop-shadow-md">
              {trader.totalPnl > 0 ? '+' : ''}${new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(trader.totalPnl)}
            </p>

            <div className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full mt-2 border border-white/10">
              {trader.avgGrowth >= 0 ? (
                <ArrowUp className="w-4 h-4 opacity-90 text-emerald-400" />
              ) : (
                <ArrowDown className="w-4 h-4 opacity-90 text-rose-400" />
              )}
              <span className="font-bold text-sm tabular-nums text-white">
                {Math.abs(trader.avgGrowth).toFixed(1)}% GROWTH
              </span>
            </div>
            
            <div className="text-xs font-bold opacity-75 mt-3 uppercase tracking-wider text-white">
              {trader.totalLot} LOTS
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TraderBubbles;
