import React, { useState, useEffect } from 'react';

interface ExchangeData {
  name: string;
  symbol: string;
  timezone: string;
  location: string;
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
}

const EXCHANGES: ExchangeData[] = [
  { name: "New York Stock Exchange", symbol: "NYSE", timezone: "America/New_York", location: "New York", openTime: "09:30", closeTime: "16:00" },
  { name: "London Stock Exchange", symbol: "LSE", timezone: "Europe/London", location: "London", openTime: "08:00", closeTime: "16:30" },
  { name: "Japan Exchange Group", symbol: "JPX", timezone: "Asia/Tokyo", location: "Tokyo", openTime: "09:00", closeTime: "15:00" },
  { name: "Australian Securities Exchange", symbol: "ASX", timezone: "Australia/Sydney", location: "Sydney", openTime: "10:00", closeTime: "16:00" },
  { name: "Hong Kong Stock Exchange", symbol: "HKEX", timezone: "Asia/Hong_Kong", location: "Hong Kong", openTime: "09:30", closeTime: "16:00" },
  { name: "Toronto Stock Exchange", symbol: "TSX", timezone: "America/Toronto", location: "Toronto", openTime: "09:30", closeTime: "16:00" },
  { name: "Johannesburg Stock Exchange", symbol: "JSE", timezone: "Africa/Johannesburg", location: "Johannesburg", openTime: "09:00", closeTime: "17:00" },
  { name: "Singapore Exchange", symbol: "SGX", timezone: "Asia/Singapore", location: "Singapore", openTime: "09:00", closeTime: "17:00" },
];

/**
 * Helper to get an absolute Date object for a specific hour:minute in a target timezone
 */
function getExchangeTimeInAbsolute(date: Date, timezone: string, timeStr: string, dayOffset = 0): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  
  const parts = formatter.formatToParts(date);
  const map: any = {};
  parts.forEach(p => map[p.type] = p.value);
  
  const targetStr = `${map.year}-${map.month.padStart(2, '0')}-${map.day.padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  
  const temp = new Date(targetStr);
  const diff = new Date(temp.toLocaleString('en-US', { timeZone: timezone })).getTime() - temp.getTime();
  const finalDate = new Date(temp.getTime() - diff);
  
  if (dayOffset !== 0) {
    finalDate.setDate(finalDate.getDate() + dayOffset);
  }
  
  return finalDate;
}

const SessionCard: React.FC<{ exchange: ExchangeData; theme: 'dark' | 'light' }> = ({ exchange, theme }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusInfo = () => {
    // Current Dubai time for main display
    const dubaiTimeDisplay = now.toLocaleTimeString('en-GB', { 
      timeZone: 'Asia/Dubai', 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const exDate = new Date(now.toLocaleString('en-US', { timeZone: exchange.timezone }));
    const day = exDate.getDay(); 
    const isWeekend = day === 0 || day === 6;

    const absOpen = getExchangeTimeInAbsolute(now, exchange.timezone, exchange.openTime);
    const absClose = getExchangeTimeInAbsolute(now, exchange.timezone, exchange.closeTime);

    let status = 'CLOSED';
    let targetTime = absOpen;
    let label = 'Opens in:';
    let eventPrefix = 'Opens';

    if (!isWeekend && now >= absOpen && now < absClose) {
      status = 'OPEN';
      targetTime = absClose;
      label = 'Closes in:';
      eventPrefix = 'Closes';
    } else {
      status = 'CLOSED';
      label = 'Opens in:';
      eventPrefix = 'Opens';
      if (now >= absClose || isWeekend) {
        let offset = 1;
        if (day === 5 && now >= absClose) offset = 3;
        else if (day === 6) offset = 2;
        else if (day === 0) offset = 1;
        else if (now >= absClose) offset = 1;
        else offset = 0; 

        targetTime = getExchangeTimeInAbsolute(now, exchange.timezone, exchange.openTime, offset);
      } else {
        targetTime = absOpen;
      }
    }

    const diffMs = targetTime.getTime() - now.getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const countdown = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    // Convert the target event time to Dubai (GST) time
    const dubaiEventTime = targetTime.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Dubai',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      status,
      countdown,
      label,
      dubaiTime: dubaiTimeDisplay,
      sessionType: status === 'OPEN' ? 'Regular Trading' : 'Closed',
      nextEvent: `${eventPrefix} @ ${dubaiEventTime} GST`
    };
  };

  const info = getStatusInfo();
  const isOpen = info.status === 'OPEN';

  return (
    <div className={`bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col gap-5 shadow-lg dark:shadow-2xl relative overflow-hidden group transition-all hover:border-primary/30`}>
      <div className={`absolute -top-12 -right-12 size-24 blur-[40px] opacity-20 rounded-full transition-colors ${isOpen ? 'bg-success' : 'bg-danger'}`}></div>

      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-[13px] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{exchange.name}</h4>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{exchange.symbol}</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 ${isOpen ? 'bg-success/10 text-success border-success/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-danger/10 text-danger border-danger/30 shadow-[0_0_15px_rgba(242,13,13,0.2)]'}`}>
          <span className={`size-1.5 rounded-full ${isOpen ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
          {info.status}
        </div>
      </div>

      <div className="flex flex-col gap-1 z-10">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{info.label}</span>
        <span className={`text-[42px] font-black ${theme === 'dark' ? 'text-[#4da6ff]' : 'text-[#0066cc]'} tabular-nums tracking-tighter drop-shadow-[0_0_12px_rgba(77,166,255,0.4)] font-display`}>
          {info.countdown}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-5 border-t border-slate-100 dark:border-white/5 z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">Local Time (GST)</span>
          <span className="text-[13px] font-black text-slate-800 dark:text-white font-mono tabular-nums tracking-wider">{info.dubaiTime}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">Trading Session</span>
          <span className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{info.sessionType}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">Timezone</span>
          <span className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{exchange.location}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">Next Event</span>
          <span className="text-[10px] font-black text-slate-800 dark:text-white leading-tight uppercase">
            {info.nextEvent}
          </span>
        </div>
      </div>
    </div>
  );
};

const MarketSessions: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  return (
    <div className={`w-full h-full p-6 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-[#05070a] transition-colors duration-300`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1600px] mx-auto pb-10">
        {EXCHANGES.map((ex) => (
          <SessionCard key={ex.symbol} exchange={ex} theme={theme} />
        ))}
      </div>
    </div>
  );
};

export default MarketSessions;