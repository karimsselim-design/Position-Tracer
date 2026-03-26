import React, { useState, useEffect, useRef } from 'react';
import { fetchLivePrice } from '../services/priceService';
import { MARKET_ASSETS } from '../constants';
import AssetIcon from './AssetIcon';

interface CorrelationMatrixProps {
  refreshRate?: number;
  theme: 'dark' | 'light';
}

const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ refreshRate = 10, theme }) => {
  const [selectedAsset, setSelectedAsset] = useState(MARKET_ASSETS[0]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);
  const [volumeData, setVolumeData] = useState<number[]>([]);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  const economicMapRef = useRef<HTMLDivElement>(null);
  const screenerContainerRef = useRef<HTMLDivElement>(null);
  const crossRatesContainerRef = useRef<HTMLDivElement>(null);
  const cryptoScreenerContainerRef = useRef<HTMLDivElement>(null);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const cryptoHeatmapContainerRef = useRef<HTMLDivElement>(null);

  // Helper for cleanup and script injection
  const injectWidget = (container: HTMLDivElement | null, type: string, config: any) => {
    if (!container) return () => {};
    container.innerHTML = '';
    
    const timeoutId = setTimeout(() => {
      const scriptId = `tv-script-${type}-${Math.random().toString(36).substr(2, 9)}`;
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.src = type.startsWith('tv-') 
        ? `https://widgets.tradingview-widget.com/w/en/${type}.js`
        : 'https://s3.tradingview.com/external-embedding/embed-widget-' + type + '.js';
      script.async = true;
      
      if (type.startsWith('tv-')) {
        script.type = 'module';
        const el = document.createElement(type);
        Object.keys(config).forEach(key => el.setAttribute(key, config[key]));
        el.style.width = '100%';
        el.style.height = '100%';
        container.appendChild(script);
        container.appendChild(el);
      } else {
        script.innerHTML = JSON.stringify(config);
        container.appendChild(script);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (container) container.innerHTML = '';
    };
  };

  // Widget 1: Institutional Economic Map
  useEffect(() => {
    return injectWidget(economicMapRef.current, 'tv-economic-map', {
      metric: 'iryy',
      'color-theme': theme
    });
  }, [theme]);

  // Widget 2: Global Forex Screener
  useEffect(() => {
    return injectWidget(screenerContainerRef.current, 'screener', {
      "market": "forex", 
      "showToolbar": true, 
      "defaultColumn": "overview", 
      "defaultScreen": "general", 
      "isTransparent": false, 
      "locale": "en", 
      "colorTheme": theme, 
      "backgroundColor": theme === 'dark' ? "#0d1117" : "#ffffff", 
      "width": "100%", 
      "height": "100%"
    });
  }, [theme]);

  // Widget 3: Institutional Cross Rates
  useEffect(() => {
    return injectWidget(crossRatesContainerRef.current, 'forex-cross-rates', {
      "width": "100%", 
      "height": "100%", 
      "currencies": ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"], 
      "isTransparent": false, 
      "colorTheme": theme, 
      "locale": "en"
    });
  }, [theme]);

  // Widget 4: Crypto Screener
  useEffect(() => {
    return injectWidget(cryptoScreenerContainerRef.current, 'screener', {
      "market": "crypto", 
      "showToolbar": true, 
      "defaultColumn": "overview", 
      "defaultScreen": "general", 
      "isTransparent": false, 
      "locale": "en", 
      "colorTheme": theme, 
      "backgroundColor": theme === 'dark' ? "#0d1117" : "#ffffff", 
      "width": "100%", 
      "height": "100%"
    });
  }, [theme]);

  // Widget 5: Stock Heatmap
  useEffect(() => {
    return injectWidget(heatmapContainerRef.current, 'stock-heatmap', {
      "exchanges": [], 
      "dataSource": "AllWorld", 
      "grouping": "sector", 
      "blockSize": "market_cap_basic", 
      "blockColor": "change", 
      "locale": "en", 
      "symbolUrl": "", 
      "colorTheme": theme, 
      "hasTopBar": true, 
      "isTransparent": false, 
      "hasSymbolTooltip": true, 
      "width": "100%", 
      "height": "100%"
    });
  }, [theme]);

  // Widget 6: Crypto Heatmap
  useEffect(() => {
    return injectWidget(cryptoHeatmapContainerRef.current, 'crypto-coins-heatmap', {
      "dataSource": "Crypto",
      "blockSize": "market_cap_calc",
      "blockColor": "change",
      "locale": "en",
      "symbolUrl": "",
      "colorTheme": theme,
      "hasTopBar": true,
      "isTransparent": false,
      "hasSymbolTooltip": true,
      "width": "100%", 
      "height": "100%"
    });
  }, [theme]);

  useEffect(() => {
    const updateFeed = async () => {
      setIsLoadingPrice(true);
      setPriceError(null);
      try {
        const data = await fetchLivePrice(selectedAsset.id);
        if (data) {
          setLivePrice(data.price);
          const base = data.price;
          setChartData(Array.from({ length: 24 }, () => base + (Math.random() - 0.5) * (base * 0.005)));
          setVolumeData(Array.from({ length: 24 }, () => Math.floor(Math.random() * 800000) + 200000));
        }
      } catch (e) {
        setPriceError("Feed disconnected");
      } finally {
        setIsLoadingPrice(false);
      }
    };
    updateFeed();
    const interval = setInterval(updateFeed, refreshRate * 1000);
    return () => clearInterval(interval);
  }, [selectedAsset, refreshRate]);

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-[#05070a] overflow-y-auto flex flex-col font-display no-scrollbar transition-all duration-500 pb-20">
      <div className="p-6 flex flex-col gap-6">
        {/* COMMAND BAR */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <h1 className="text-primary text-2xl font-black uppercase tracking-tight drop-shadow-[0_0_15px_rgba(242,13,13,0.3)]">MARKET INTELLIGENCE LAB</h1>
            <span className="text-[8px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.4em] ml-0.5">GLOBAL CLUSTER ANALYTICS</span>
          </div>
        </div>

        {/* PRIMARY ANALYTICS ROW */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative shrink-0 items-start">
          
          {/* TOP FULL-WIDTH: Economic Map */}
          <div className="xl:col-span-12 glass-panel rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0d1117] h-[450px] overflow-hidden shadow-2xl">
             <div ref={economicMapRef} className="w-full h-full" />
          </div>

          {/* MAIN LEFT COLUMN: STACKED (8/12) */}
          <div className="xl:col-span-8 flex flex-col gap-6 items-stretch">
            {/* Forex Primary Screener (Market Monitor) */}
            <div className="glass-panel p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0d1117] flex flex-col gap-4 overflow-hidden h-[500px] shadow-2xl w-full">
               <div className="flex justify-between items-center px-2">
                 <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">FOREX MARKET MONITOR</h3>
                 <span className="text-[7px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">STATUS: LIVE SYNC</span>
               </div>
               <div className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5" ref={screenerContainerRef} />
            </div>

            {/* Institutional Cross Rates */}
            <div className="glass-panel p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0d1117] flex flex-col gap-4 overflow-hidden h-[500px] shadow-2xl w-full">
               <div className="flex justify-between items-center px-2">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">INSTITUTIONAL CROSS RATES</h3>
                 <span className="text-[7px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">MODULE: CROSS MATRIX</span>
               </div>
               <div className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5" ref={crossRatesContainerRef} />
            </div>
          </div>

          {/* SIDE COLUMN: (4/12) */}
          <div className="xl:col-span-4 flex flex-col gap-6 items-stretch">
            {/* Liquidity Frequency Delta */}
            <div className="h-[238px] glass-panel p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/40 flex flex-col gap-4 shadow-xl overflow-hidden w-full">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">LIQUIDITY FREQUENCY DELTA</h3>
              <div className="flex-1 flex items-end gap-1.5 pb-2">
                {chartData.length > 0 && chartData.map((val, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-gradient-to-t from-primary/20 to-primary/80 rounded-t-sm transition-all duration-500" 
                    style={{ height: `${((val - Math.min(...chartData)) / (Math.max(...chartData) - Math.min(...chartData)) * 100) + 15}%` }} 
                  />
                ))}
              </div>
              <div className="flex justify-between items-center text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
                 <span>FREQUENCY SCAN</span>
                 <span>DELTA PULSE</span>
              </div>
            </div>

            {/* ACTIVE NODE COMMAND BOX - Moved above Volume per request */}
            <div className="glass-panel p-6 rounded-[2rem] border-2 border-primary/20 bg-white dark:bg-black flex flex-col gap-5 shadow-2xl relative overflow-hidden transition-all hover:border-primary/40 group">
              <div className="absolute top-0 right-0 p-1 bg-primary/10 rounded-bl-xl">
                 <span className="material-symbols-outlined text-[10px] text-primary animate-pulse">radar</span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">ACTIVE NODE:</h3>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#0d1117] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 transition-all focus-within:border-primary/50">
                  <AssetIcon symbol={selectedAsset.id} size={20} />
                  <select 
                    value={selectedAsset.id}
                    onChange={(e) => setSelectedAsset(MARKET_ASSETS.find(a => a.id === e.target.value) || MARKET_ASSETS[0])}
                    className="flex-1 bg-transparent text-slate-900 dark:text-white text-[13px] font-black outline-none border-none transition-all cursor-pointer uppercase font-mono"
                  >
                    {MARKET_ASSETS.map(asset => <option key={asset.id} value={asset.id} className="bg-white dark:bg-slate-900 text-[12px]">{asset.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">REAL-TIME QUOTE:</span>
                  {isLoadingPrice && !priceError && <span className="material-symbols-outlined text-[10px] text-slate-400 animate-spin">sync</span>}
                  {priceError && <span className="text-[8px] font-black text-danger uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">error</span> {priceError}</span>}
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-2xl font-black text-success font-mono tabular-nums tracking-tighter">
                     {livePrice?.toLocaleString(undefined, { 
                       minimumFractionDigits: selectedAsset.category === 'FOREX' ? 4 : 2,
                       maximumFractionDigits: selectedAsset.category === 'FOREX' ? 4 : 2 
                     })}
                   </span>
                   <span className="text-[10px] font-black text-success/60 uppercase">USD</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                 <div className="flex-1 h-1 bg-success/20 rounded-full overflow-hidden">
                    <div className="h-full bg-success w-[65%] animate-pulse"></div>
                 </div>
                 <span className="text-[7px] font-black text-success uppercase tracking-widest">SIGNAL_SYNC_OK</span>
              </div>
            </div>

            {/* Neural Frequency Cluster Volume */}
            <div className="h-[238px] glass-panel p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/40 flex flex-col gap-4 shadow-xl overflow-hidden w-full">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">NEURAL CLUSTER VOLUME</h3>
              <div className="flex-1 flex items-end gap-1.5 pt-2">
                {volumeData.length > 0 && volumeData.map((val, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-slate-400 dark:bg-slate-500/30 hover:bg-slate-300 dark:hover:bg-slate-400/50 rounded-t-sm transition-all duration-300" 
                    style={{ height: `${(val / Math.max(...volumeData)) * 100}%` }} 
                  />
                ))}
              </div>
              <div className="flex justify-between items-center text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
                 <span>INSTITUTIONAL FLOW</span>
                 <span>CLUSTER INTENSITY</span>
              </div>
            </div>
          </div>

          {/* DIGITAL ASSET CLUSTER */}
          <div className="xl:col-span-12">
            <div className="glass-panel p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0d1117] h-[450px] flex flex-col gap-4 shadow-xl overflow-hidden">
               <h3 className="text-[10px] font-black text-primary uppercase tracking-widest px-2 tracking-widest">DIGITAL ASSET CLUSTER ANALYTICS</h3>
               <div ref={cryptoScreenerContainerRef} className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5" />
            </div>
          </div>

          {/* GLOBAL HEATMAPS SECTION */}
          <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* STOCKS HEATMAP */}
            <div className="glass-panel p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0d1117] h-[600px] flex flex-col gap-4 shadow-xl overflow-hidden">
               <div className="flex justify-between items-center px-2">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">GLOBAL MARKET LIQUIDITY HEATMAP</h3>
                 <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_red]"></span>
                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">LIVE MATRIX</span>
                 </div>
               </div>
               <div ref={heatmapContainerRef} className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5" />
            </div>

            {/* CRYPTO HEATMAP */}
            <div className="glass-panel p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0d1117] h-[600px] flex flex-col gap-4 shadow-xl overflow-hidden">
               <div className="flex justify-between items-center px-2">
                 <h3 className="text-[10px] font-black text-primary uppercase tracking-widest tracking-widest">CRYPTO CURRENCY HEAT MAP</h3>
                 <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-success animate-pulse shadow-[0_0_5px_#10b981]"></span>
                    <span className="text-[8px] font-black text-success uppercase tracking-widest">LIVE DATA</span>
                 </div>
               </div>
               <div ref={cryptoHeatmapContainerRef} className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CorrelationMatrix;