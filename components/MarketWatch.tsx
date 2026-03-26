import React, { useEffect, useRef, useState } from 'react';

interface MarketWatchProps {
  theme?: 'dark' | 'light';
}

const MarketWatch: React.FC<MarketWatchProps> = ({ theme = 'dark' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';
    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget-container';
      widgetContainer.style.height = '100%';
      widgetContainer.style.width = '100%';

      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      widgetDiv.style.height = '100%';
      widgetDiv.style.width = '100%';
      widgetContainer.appendChild(widgetDiv);

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js';
      script.async = true;
      script.onload = () => setIsLoading(false);
      script.onerror = () => setIsLoading(false); // Handle error case
      script.innerHTML = JSON.stringify({
        "colorTheme": theme,
        "locale": "en",
        "largeChartUrl": "",
        "isTransparent": false,
        "showSymbolLogo": true,
        "backgroundColor": theme === 'dark' ? "#0F0F0F" : "#FFFFFF",
        "support_host": "https://www.tradingview.com",
        "width": "100%",
        "height": "100%",
        "symbolsGroups": [
          {
            "name": "Indices",
            "symbols": [
              { "name": "FOREXCOM:SPXUSD", "displayName": "S&P 500 Index" },
              { "name": "FOREXCOM:NSXUSD", "displayName": "US 100 Cash CFD" },
              { "name": "FOREXCOM:DJI", "displayName": "Dow Jones Industrial Average Index" },
              { "name": "INDEX:NKY", "displayName": "Japan 225" },
              { "name": "INDEX:DEU40", "displayName": "DAX Index" },
              { "name": "FOREXCOM:UKXGBP", "displayName": "FTSE 100 Index" }
            ]
          },
          {
            "name": "Futures",
            "symbols": [
              { "name": "BMFBOVESPA:ISP1!", "displayName": "S&P 500" },
              { "name": "BMFBOVESPA:EUR1!", "displayName": "Euro" },
              { "name": "CMCMARKETS:GOLD", "displayName": "Gold" },
              { "name": "TVC:USOIL", "displayName": "WTI Crude Oil" },
              { "name": "BMFBOVESPA:CCM1!", "displayName": "Corn" }
            ]
          },
          {
            "name": "Bonds",
            "symbols": [
              { "name": "EUREX:FGBL1!", "displayName": "Euro Bund" },
              { "name": "EUREX:FBTP1!", "displayName": "Euro BTP" },
              { "name": "EUREX:FGBM1!", "displayName": "Euro BOBL" }
            ]
          },
          {
            "name": "Forex",
            "symbols": [
              { "name": "FX:EURUSD", "displayName": "EUR to USD" },
              { "name": "FX:GBPUSD", "displayName": "GBP to USD" },
              { "name": "FX:USDJPY", "displayName": "USD to JPY" },
              { "name": "FX:USDCHF", "displayName": "USD to CHF" },
              { "name": "FX:AUDUSD", "displayName": "AUD to USD" },
              { "name": "FX:USDCAD", "displayName": "USD to CAD" }
            ]
          },
          {
            "name": "Crypto",
            "symbols": [
              { "name": "BINANCE:BTCUSD", "displayName": "BTC" },
              { "name": "BINANCE:ETHUSD", "displayName": "ETH" },
              { "name": "BINANCE:SOLUSD", "displayName": "SOL" }
            ]
          }
        ]
      });

      widgetContainer.appendChild(script);
      container.appendChild(widgetContainer);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      container.innerHTML = '';
    };
  }, [theme]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black/20 rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-xl min-h-[550px] relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-[#0F0F0F]/80 z-10 backdrop-blur-sm">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl mb-2">sync</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading Market Data...</span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default MarketWatch;