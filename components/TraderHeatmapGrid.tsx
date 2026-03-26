import React from 'react';

interface AggregatedTrader {
  traderName: string;
  totalPnL: number;
  avgGrowth: number;
  totalLots: number;
  tradeCount: number;
}

interface TraderHeatmapGridProps {
  data: AggregatedTrader[];
}

const TraderHeatmapGrid: React.FC<TraderHeatmapGridProps> = ({ data }) => {
  return (
    <div className="flex-1 p-8 bg-slate-50 dark:bg-[#05070a] overflow-y-auto no-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {data.map((trader) => {
          // Color logic based on growth
          let bgColor = 'bg-slate-100 dark:bg-white/[0.02]';
          let borderColor = 'border-slate-200 dark:border-white/5';
          let textColor = 'text-slate-900 dark:text-white';
          let accentColor = 'bg-slate-500';

          if (trader.avgGrowth > 5) {
            bgColor = 'bg-emerald-600';
            borderColor = 'border-emerald-400';
            textColor = 'text-white';
            accentColor = 'bg-emerald-300';
          } else if (trader.avgGrowth > 0) {
            bgColor = 'bg-emerald-900';
            borderColor = 'border-emerald-700';
            textColor = 'text-white';
            accentColor = 'bg-emerald-500';
          } else if (trader.avgGrowth < -5) {
            bgColor = 'bg-red-600';
            borderColor = 'border-red-400';
            textColor = 'text-white';
            accentColor = 'bg-red-300';
          } else if (trader.avgGrowth < 0) {
            bgColor = 'bg-red-900';
            borderColor = 'border-red-700';
            textColor = 'text-white';
            accentColor = 'bg-red-500';
          }

          return (
            <div 
              key={trader.traderName}
              className={`p-6 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col gap-4 ${bgColor} ${borderColor} ${textColor}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Intelligence Grid</span>
                  <h3 className="text-xl font-black">{trader.traderName}</h3>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${accentColor} text-white`}>
                  {trader.tradeCount} Trades
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total PNL</span>
                <span className="text-2xl font-black font-mono">
                  {trader.totalPnL >= 0 ? '+' : ''}${Math.abs(trader.totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Avg Growth</span>
                  <span className="text-sm font-black">{trader.avgGrowth.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Total Lots</span>
                  <span className="text-sm font-black">{trader.totalLots.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 h-1.5 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${accentColor}`}
                  style={{ width: `${Math.min(Math.max(trader.avgGrowth + 50, 0), 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TraderHeatmapGrid;
