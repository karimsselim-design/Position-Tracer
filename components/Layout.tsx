import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { NewsItem } from '../services/newsService';

interface LayoutProps {
  children: React.ReactNode;
  openSettings: () => void;
  openContact: () => void;
  priceTickerSpeed: number;
  newsTickerSpeed: number;
  news: NewsItem[];
  theme: 'dark' | 'light';
  onAddNewsClick: () => void;
  onEditNewsClick?: (item: NewsItem) => void;
}

const DubaiClock: React.FC = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const dubaiTime = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Dubai',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setTime(dubaiTime);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md">
      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">DUBAI GST</span>
      <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums tracking-widest">{time}</span>
    </div>
  );
};

const TradingViewTicker: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    container.innerHTML = '';
    isInitialized.current = false;
    
    const timeoutId = setTimeout(() => {
      const scriptId = 'tradingview-ticker-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js';
        script.type = 'module';
        script.async = true;
        document.head.appendChild(script);
      }
      
      const tickerTape = document.createElement('tv-ticker-tape');
      tickerTape.setAttribute('symbols', 'FOREXCOM:SPXUSD,FOREXCOM:NSXUSD,FOREXCOM:DJI,FX:EURUSD,BITSTAMP:BTCUSD,BITSTAMP:ETHUSD,CMCMARKETS:GOLD,TVC:USOIL,CAPITALCOM:SILVER');
      tickerTape.setAttribute('line-chart-type', 'Baseline');
      tickerTape.setAttribute('item-size', 'compact');
      tickerTape.setAttribute('show-hover', 'true');
      tickerTape.setAttribute('color-theme', theme);
      tickerTape.setAttribute('isTransparent', 'true');
      tickerTape.setAttribute('locale', 'en');

      container.appendChild(tickerTape);
      isInitialized.current = true;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      container.innerHTML = '';
    };
  }, [theme]);

  return (
    <div className="ticker-container w-full bg-white dark:bg-[#05070a] border-b border-slate-200 dark:border-white/10 overflow-hidden">
      <div 
        ref={containerRef} 
        className="w-full h-[46px]" 
      />
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  openSettings, 
  openContact, 
  priceTickerSpeed, 
  newsTickerSpeed,
  news,
  theme,
  onAddNewsClick,
  onEditNewsClick
}) => {
  const [localPriceSpeed, setLocalPriceSpeed] = useState(() => {
    const saved = localStorage.getItem('layout_price_speed');
    return saved ? parseInt(saved, 10) : priceTickerSpeed;
  });

  const [localNewsSpeed, setLocalNewsSpeed] = useState(() => {
    const saved = localStorage.getItem('layout_news_speed');
    return saved ? parseInt(saved, 10) : newsTickerSpeed;
  });

  useEffect(() => {
    setLocalNewsSpeed(newsTickerSpeed);
  }, [newsTickerSpeed]);

  useEffect(() => {
    setLocalPriceSpeed(priceTickerSpeed);
  }, [priceTickerSpeed]);

  useEffect(() => {
    localStorage.setItem('layout_price_speed', localPriceSpeed.toString());
  }, [localPriceSpeed]);

  useEffect(() => {
    localStorage.setItem('layout_news_speed', localNewsSpeed.toString());
  }, [localNewsSpeed]);

  const newsDuration = `${localNewsSpeed}s`;
  const doubledNews = [...news, ...news];

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-600 dark:text-slate-300 bg-background-light dark:bg-background-dark transition-colors duration-300">
      
      {/* Top Price Ticker */}
      <TradingViewTicker theme={theme} />
      
      {/* Accent Top Bar */}
      <div className="h-[1px] w-full bg-primary/20 z-[60]"></div>

      {/* Institutional Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-0 bg-white dark:bg-[#0d1117] border-b border-slate-200 dark:border-white/5 relative z-50 shrink-0 h-[60px] transition-colors duration-300 shadow-sm dark:shadow-none gap-4">
        <div className="flex items-center gap-4 sm:gap-10 h-full">
          {/* Logo Section */}
          <div className="flex items-center gap-3 group shrink-0">
            <div className="size-5 rounded-sm bg-primary flex items-center justify-center relative shadow-lg shadow-primary/20">
               <span className="material-symbols-outlined text-[14px] text-white">monitoring</span>
            </div>
            <span className="text-[13px] font-[900] tracking-tighter text-slate-900 dark:text-white uppercase font-display hidden sm:block">WHITEROCK <span className="text-primary">INTELLIGENCE LAB</span></span>
          </div>
        </div>

        {/* Search / Command Bar */}
        <div className="flex items-center flex-1 max-w-md relative">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">search</span>
          <input 
            type="text" 
            placeholder="Search assets..." 
            onChange={(e) => {
              const term = e.target.value;
              console.log('Searching for financial assets:', term);
            }}
            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full py-1.5 pl-10 pr-4 text-[11px] font-medium outline-none focus:border-primary/50 focus:bg-white dark:focus:bg-black transition-all text-slate-900 dark:text-white"
          />
        </div>

        {/* Status and Utilities Section */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden xl:block">
            <DubaiClock />
          </div>
          
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md">
            <span className="text-[8px] font-black text-slate-400 uppercase">Ticker Speed</span>
            <button onClick={() => setLocalPriceSpeed(s => Math.max(5, s - 5))} className="text-slate-400 hover:text-primary flex items-center"><span className="material-symbols-outlined text-[12px]">remove</span></button>
            <span className="text-[9px] font-black text-slate-500 w-4 text-center">{localPriceSpeed}</span>
            <button onClick={() => setLocalPriceSpeed(s => s + 5)} className="text-slate-400 hover:text-primary flex items-center"><span className="material-symbols-outlined text-[12px]">add</span></button>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-success/5 border border-success/10 rounded-md">
            <span className="size-1.5 rounded-full bg-success animate-pulse"></span>
            <span className="text-[9px] font-black text-success uppercase tracking-widest tabular-nums">12MS</span>
          </div>

          <div className="hidden md:block h-4 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/" className="size-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-primary transition-all" title="Traders Lite">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </Link>
            <button onClick={openContact} className="size-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-primary transition-all">
              <span className="material-symbols-outlined text-[18px]">headset_mic</span>
            </button>
            <button onClick={openSettings} className="size-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-primary transition-all">
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3 border-l border-slate-200 dark:border-white/10 pl-3 sm:pl-5 ml-1 sm:ml-0">
             <div className="text-right hidden sm:flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-none">SENIOR TRADER</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">WRC-LDN-01</p>
             </div>
             <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=48&h=48&q=80" alt="Trader" className="w-full h-full object-cover" />
             </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-[#080a0e] transition-colors duration-300">
        {children}
      </div>

      {/* Footer Ticker */}
      <footer className="shrink-0 h-9 bg-white dark:bg-[#0d1117] border-t border-slate-200 dark:border-white/5 overflow-hidden flex items-center relative z-20">
        <div className="hidden sm:flex px-4 md:px-6 border-r border-slate-200 dark:border-white/5 h-full items-center bg-slate-50 dark:bg-black/20 z-10 shrink-0">
           <span className="text-[9px] font-black text-primary uppercase tracking-widest whitespace-nowrap">MARKET INTELLIGENCE WIRE</span>
        </div>
        <div className="flex-1 overflow-hidden relative h-full flex items-center" style={{ maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)' }}>
          <div 
            className="animate-ticker flex items-center gap-16 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:[animation-play-state:paused] pr-16"
            style={{ animationDuration: newsDuration }}
          >
               {doubledNews.length > 0 ? (
                 doubledNews.map((item, idx) => (
                   <div 
                     key={idx} 
                     className={`flex items-center gap-3 whitespace-nowrap ${onEditNewsClick ? 'cursor-pointer hover:opacity-80' : ''}`}
                     onClick={() => onEditNewsClick?.(item)}
                   >
                     <span className="text-primary font-black uppercase">{item.source}:</span>
                     <span className="text-slate-800 dark:text-slate-200">{item.title}</span>
                     <span className="text-slate-300 dark:text-white font-black opacity-20 px-2">//</span>
                   </div>
                 ))
               ) : (
                 <div className="flex items-center gap-3">
                   <span className="text-primary">SYNCING...</span>
                 </div>
               )}
          </div>
        </div>
        <div className="hidden sm:flex px-4 items-center gap-2 border-l border-slate-200 dark:border-white/5 z-10 bg-white dark:bg-[#0d1117] h-full shrink-0">
          <button onClick={onAddNewsClick} className="text-slate-400 hover:text-primary flex items-center mr-2" title="Add News Manually">
            <span className="material-symbols-outlined text-[14px]">add_circle</span>
          </button>
          <span className="text-[8px] font-black text-slate-400 uppercase">Speed</span>
          <button onClick={() => setLocalNewsSpeed(s => Math.max(10, s - 5))} className="text-slate-400 hover:text-primary flex items-center"><span className="material-symbols-outlined text-[14px]">remove</span></button>
          <span className="text-[9px] font-black text-slate-500 w-4 text-center">{localNewsSpeed}</span>
          <button onClick={() => setLocalNewsSpeed(s => s + 5)} className="text-slate-400 hover:text-primary flex items-center"><span className="material-symbols-outlined text-[14px]">add</span></button>
        </div>
      </footer>
    </div>
  );
};

export default Layout;