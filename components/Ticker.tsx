
import React from 'react';

interface TickerProps {
  items: { label: string; value: string; colorClass?: string }[];
  speed?: string;
}

const Ticker: React.FC<TickerProps> = ({ items, speed = '35s' }) => {
  // We double the items so that we can animate from 0 to -50% for a seamless loop
  const doubledItems = [...items, ...items];

  return (
    <div className="w-full bg-slate-900 border-b border-white/10 py-1 overflow-hidden h-8 flex items-center relative">
      <div 
        className="animate-ticker flex items-center gap-12 text-[11px] font-bold uppercase"
        style={{ animationDuration: speed }}
      >
        {doubledItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-slate-500">{item.label}</span>
            <span className={item.colorClass || 'text-white'}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ticker;
