import React, { useState, useEffect, useRef } from 'react';
import { MOCK_TRADES, MOCK_ACCOUNTS, MARKET_ASSETS } from '../constants';
import { TradeDirection, Trade, Account, Goal } from '../types';
import RealTimePnLTracker from './RealTimePnLTracker';
import { fetchLivePrice } from '../services/priceService';
import { fetchLiveAccountData, subscribeToAccountPulse } from '../services/accountService';
import { NewsItem } from '../services/newsService';
import AssetIcon from './AssetIcon';
import TraderDropdown from './TraderDropdown';
import MarketWatch from './MarketWatch';
import MarketSessions from './MarketSessions';
import TraderBubbles from './TraderBubbles';
import TraderHeatmapGrid from './TraderHeatmapGrid';

interface DashboardProps {
  news: NewsItem[];
  onRefreshNews: () => void;
  density?: 'compact' | 'standard' | 'relaxed';
  theme: 'dark' | 'light';
}

interface PriceMeta {
  price: number;
  direction: 'up' | 'down' | 'neutral';
  lastTick: number;
}

type DashboardSubTab = 'trades' | 'accounts' | 'history' | 'bridge';
type CalendarSubTab = 'calendar' | 'sessions';

const STORAGE_KEY_TRADES = 'wrc_active_trades_v5';
const STORAGE_KEY_HISTORY = 'wrc_trade_history_v5';
const STORAGE_KEY_AUTOSAVE = 'wrc_autosave_enabled_v5';

const TradingViewCalendar: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    container.innerHTML = '';
    
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
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "colorTheme": theme,
        "isTransparent": false,
        "locale": "en",
        "countryFilter": "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
        "importanceFilter": "-1,0,1",
        "width": "100%",
        "height": "100%",
        "timezone": "Asia/Dubai"
      });
      
      widgetContainer.appendChild(script);
      container.appendChild(widgetContainer);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      container.innerHTML = '';
    };
  }, [theme]);

  return <div ref={containerRef} className="w-full h-full" />;
};

const Dashboard: React.FC<DashboardProps> = ({ news, onRefreshNews, density = 'standard', theme }) => {
  const [activeSubTab, setActiveTab] = useState<DashboardSubTab>('trades');
  const [activeCalendarTab, setActiveCalendarTab] = useState<CalendarSubTab>('calendar');
  const [livePrices, setLivePrices] = useState<Record<string, PriceMeta>>({});
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [tradeSearchTerm, setTradeSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'bubbles'>('table');
  
  const [trades, setTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [isAutoSave, setIsAutoSave] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');

  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [lastAccountSync, setLastAccountSync] = useState<number>(Date.now());
  const [isSyncingAccounts, setIsLoadingPriceSync] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [activeServerNode, setActiveServerNode] = useState('WR-NODE-07');

  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [executeOnMT5, setExecuteOnMT5] = useState(false);
  const [mt5TradeStatus, setMt5TradeStatus] = useState<'IDLE' | 'EXECUTING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const [tradersList, setTradersList] = useState<string[]>(() => {
    const saved = localStorage.getItem('wrc_traders_list');
    if (saved) return JSON.parse(saved);
    const oldCustom = localStorage.getItem('wrc_custom_traders');
    const oldCustomParsed = oldCustom ? JSON.parse(oldCustom) : [];
    return ['Karam', 'Abdullah', 'Mohamed', 'Hagar', 'Hanan', ...oldCustomParsed];
  });

  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('wrc_traders_list');
      if (saved) setTradersList(JSON.parse(saved));
    };
    window.addEventListener('wrc-traders-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('wrc-traders-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const updateTradersList = (newList: string[]) => {
    setTradersList(newList);
    localStorage.setItem('wrc_traders_list', JSON.stringify(newList));
    window.dispatchEvent(new CustomEvent('wrc-traders-updated'));
  };
  const [isAddingNewTrader, setIsAddingNewTrader] = useState(false);
  const [newTraderNameInput, setNewTraderNameInput] = useState('');

  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    symbol: MARKET_ASSETS[0].id,
    entry: 1.0850,
    direction: TradeDirection.BUY,
    lotSize: 1.0,
    sl: 1.0700,
    tp1: 1.1000,
    tp2: 1.1200,
    tp3: 1.1500,
    dayTarget: 5000,
    traderName: 'Karam',
  });

  const [isMT5Active, setIsMT5Active] = useState(false);
  const [mt5Positions, setMt5Positions] = useState<Trade[]>([]);
  const [mt5Account, setMt5Account] = useState<Account | null>(null);

  const [goals, setGoals] = useState<Goal[]>([
    { id: 'g1', symbol: 'XAUUSD', target: 200, margin: 0, lot: 0.25, entry: 0, trader: 'KARAM', type: null },
    { id: 'g2', symbol: 'US30', target: 200, margin: 0, lot: 1, entry: 0, trader: 'ABDULLAH', type: null },
    { id: 'g3', symbol: 'GBPJPY', target: 200, margin: 0, lot: 0.25, entry: 0, trader: 'HAGAR', type: null },
    { id: 'g4', symbol: 'WTI', target: 200, margin: 0, lot: 0.25, entry: 0, trader: 'MOHAMMED', type: null },
    { id: 'g5', symbol: 'USDCAD', target: 200, margin: 0, lot: 0.25, entry: 0, trader: 'HANAN', type: null },
  ]);

  const handleRandomizeGoals = () => {
    const traders = ['KARAM', 'ABDULLAH', 'HAGAR', 'MOHAMMED', 'HANAN'];
    const symbols = ['XAUUSD', 'US30', 'GBPJPY', 'WTI', 'USDCAD'];
    
    // Shuffle traders array to ensure no repetitions
    const shuffledTraders = [...traders].sort(() => Math.random() - 0.5);
    
    setGoals(prev => prev.map((goal, idx) => {
      const symbol = symbols[idx % symbols.length];
      const priceKey = resolveSymbolKey(symbol);
      const currentPrice = livePrices[priceKey]?.price || 0;
      let defaultLot = 0.25;
      if (symbol === 'US30') defaultLot = 1;
      
      return {
        ...goal,
        symbol: symbol,
        trader: shuffledTraders[idx % shuffledTraders.length],
        target: goal.target,
        lot: defaultLot,
        entry: currentPrice,
        type: Math.random() > 0.5 ? 'BUY' : 'SELL'
      };
    }));
  };

  const updateGoalField = (id: string, field: keyof Goal, value: any) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  // MT5 SYNC ENGINE
  useEffect(() => {
    if (!isMT5Active) return;

    const syncMT5 = async () => {
      try {
        const { fetchMT5AccountData, fetchMT5Positions } = await import('../services/mt5Service');
        const [accountData, positionsData] = await Promise.all([
          fetchMT5AccountData(),
          fetchMT5Positions()
        ]);

        setMt5Account({
          id: accountData.id,
          name: accountData.name,
          balance: accountData.balance,
          equity: accountData.equity,
          margin: accountData.margin,
          freeMargin: accountData.freeMargin,
          profit: accountData.equity - accountData.balance,
          status: accountData.status || 'CONNECTED',
          lastUpdated: Date.now()
        });

        const mappedPositions: Trade[] = positionsData.map(p => ({
          id: p.id,
          accountId: 'MT5-BRIDGE',
          symbol: p.symbol,
          livePrice: p.currentPrice,
          entry: p.openPrice,
          timeOpen: p.time,
          direction: p.type === 'BUY' ? TradeDirection.BUY : TradeDirection.SELL,
          lotSize: p.volume,
          sl: p.sl,
          tp1: p.tp,
          tp2: 0,
          tp3: 0,
          pnlUsd: p.profit,
          growthPct: ((p.currentPrice - p.openPrice) / p.openPrice) * 100 * (p.type === 'BUY' ? 1 : -1),
          status: 'ACTIVE',
          dayTarget: 5000,
          traderName: 'MT5 Bridge',
          traderCompanyId: 'MT5'
        }));

        setMt5Positions(mappedPositions);
      } catch (e) {
        console.error("MT5 Sync Error:", e);
        setAccountError("MT5 Bridge Disconnected");
      }
    };

    syncMT5();
    const interval = setInterval(syncMT5, 5000);
    return () => clearInterval(interval);
  }, [isMT5Active]);

  // INITIAL LOAD & RECOVERY
  useEffect(() => {
    const savedTrades = localStorage.getItem(STORAGE_KEY_TRADES);
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    const savedAutoSave = localStorage.getItem(STORAGE_KEY_AUTOSAVE);

    if (savedTrades && typeof savedTrades === 'string') {
      try {
        const parsed = JSON.parse(savedTrades);
        if (Array.isArray(parsed)) {
          const validNames = ['Karam', 'Abdullah', 'Mohamed', 'Hagar', 'Hanan'];
          const updatedTrades = parsed.map((t, i) => {
            if (!validNames.includes(t.traderName) && t.traderName !== 'MT5 Bridge') {
              return { ...t, traderName: validNames[i % validNames.length] };
            }
            return t;
          });
          setTrades(updatedTrades);
        } else {
          setTrades(MOCK_TRADES);
        }
      } catch (e) {
        setTrades(MOCK_TRADES);
      }
    } else {
      setTrades(MOCK_TRADES);
    }

    if (savedHistory && typeof savedHistory === 'string') {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) setClosedTrades(parsed);
      } catch (e) {}
    }

    if (savedAutoSave && typeof savedAutoSave === 'string') {
      try {
        setIsAutoSave(JSON.parse(savedAutoSave));
      } catch (e) {}
    }
  }, []);

  // AUTO SAVE ENGINE
  useEffect(() => {
    if (isAutoSave && (trades.length > 0 || closedTrades.length > 0)) {
      localStorage.setItem(STORAGE_KEY_TRADES, JSON.stringify(trades));
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(closedTrades));
      localStorage.setItem(STORAGE_KEY_AUTOSAVE, JSON.stringify(isAutoSave));
    }
  }, [trades, closedTrades, isAutoSave]);

  // ACCOUNT SYNC MECHANISM
  const syncAccounts = async () => {
    if (isSyncingAccounts) return;
    setIsLoadingPriceSync(true);
    setAccountError(null);
    try {
      const response = await fetchLiveAccountData();
      setAccounts(prev => {
        return response.accounts.map(acc => {
          const existing = prev.find(p => p.id === acc.id);
          return existing ? { ...existing, balance: acc.balance, status: acc.status } : acc;
        });
      });
      setLastAccountSync(response.timestamp);
    } catch (e) {
      console.error("Account synchronization failure.");
      setAccountError("Account sync failed");
    } finally {
      setIsLoadingPriceSync(false);
    }
  };

  useEffect(() => {
    syncAccounts();
    const pollInterval = setInterval(syncAccounts, 10000); 
    const unsubscribe = subscribeToAccountPulse((updates) => {
      setAccounts(prev => prev.map(acc => {
        const update = updates.find(u => u.id === acc.id);
        return update ? { ...acc, ...update } : acc;
      }));
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, []);

  const saveTerminalState = () => {
    setSaveStatus('SAVING');
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY_TRADES, JSON.stringify(trades));
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(closedTrades));
      localStorage.setItem(STORAGE_KEY_AUTOSAVE, JSON.stringify(isAutoSave));
      setSaveStatus('SUCCESS');
      setTimeout(() => setSaveStatus('IDLE'), 2000);
    }, 400);
  };

  const resolveSymbolKey = (sym: string) => sym.split('.')[0].replace('/', '').toUpperCase();

  const getTradeLivePrice = (symbol: string, fallback: number) => {
    const key = resolveSymbolKey(symbol);
    return livePrices[key]?.price || fallback;
  };

  const calculateDynamicPnL = (trade: Trade) => {
    const currentPrice = trade.status === 'CLOSED' ? (trade.livePrice || trade.entry) : getTradeLivePrice(trade.symbol, trade.entry);
    const entryPrice = trade.entry || currentPrice;
    const diff = trade.direction === TradeDirection.BUY 
      ? (currentPrice - entryPrice) 
      : (entryPrice - currentPrice);
    
    const sym = trade.symbol.toUpperCase();
    let multiplier = 1;
    if (sym.includes('XAU')) multiplier = 100;
    else if (sym.includes('EUR') || sym.includes('GBP') || sym.includes('JPY')) multiplier = 100000;
    else if (sym.includes('BTC') || sym.includes('ETH')) multiplier = 1;
    else if (sym.includes('WTI') || sym.includes('BRENT')) multiplier = 100;
    else multiplier = 50;
                       
    return diff * trade.lotSize * multiplier;
  };

  const calculateDynamicGrowth = (trade: Trade) => {
    const currentPrice = trade.status === 'CLOSED' ? (trade.livePrice || trade.entry) : getTradeLivePrice(trade.symbol, trade.entry);
    const entryPrice = trade.entry || currentPrice;
    if (entryPrice === 0) return 0;
    const growth = ((currentPrice - entryPrice) / entryPrice) * 100;
    return trade.direction === TradeDirection.BUY ? growth : -growth;
  };

  const aggregatedTraderData = React.useMemo(() => {
    const traderMap: Record<string, {
      traderName: string;
      totalPnL: number;
      totalLots: number;
      tradeCount: number;
      growthSum: number;
    }> = {};

    trades.forEach(trade => {
      const name = trade.traderName || 'Unknown';
      const pnl = calculateDynamicPnL(trade);
      const growth = calculateDynamicGrowth(trade);

      if (!traderMap[name]) {
        traderMap[name] = {
          traderName: name,
          totalPnL: 0,
          totalLots: 0,
          tradeCount: 0,
          growthSum: 0
        };
      }

      traderMap[name].totalPnL += pnl;
      traderMap[name].totalLots += trade.lotSize;
      traderMap[name].tradeCount += 1;
      traderMap[name].growthSum += growth;
    });

    return Object.values(traderMap).map(t => ({
      traderName: t.traderName,
      totalPnL: t.totalPnL,
      avgGrowth: t.tradeCount > 0 ? t.growthSum / t.tradeCount : 0,
      totalLots: t.totalLots,
      tradeCount: t.tradeCount
    }));
  }, [trades, livePrices]);

  const syncAccountMetrics = () => {
    setAccounts(prevAccounts => prevAccounts.map(acc => {
      const accountTrades = trades.filter(t => t.accountId === acc.name || t.accountId === acc.id);
      const totalProfit = accountTrades.reduce((sum, t) => sum + calculateDynamicPnL(t), 0);
      return {
        ...acc,
        profit: totalProfit,
        equity: acc.balance + totalProfit,
        freeMargin: acc.balance + totalProfit - acc.margin
      };
    }));
  };

  const activeSymbolsRef = useRef<string[]>([]);

  useEffect(() => {
    activeSymbolsRef.current = Array.from(new Set([
      ...trades.map((t) => t.symbol), 
      ...mt5Positions.map((t) => t.symbol),
      ...goals.map((g) => g.symbol)
    ]));
  }, [trades, mt5Positions, goals]);

  // HIGH VELOCITY PRICE POLLING
  useEffect(() => {
    let isFetching = false;
    const updatePrices = async () => {
      if (isFetching) return;
      isFetching = true;
      setPriceError(null);
      const majors = ["WTI.pro", "ETHUSD.pro", "XAUUSD.pro", "EURUSD.pro", "GBPUSD.pro", "SPX500.pro"];
      const targets: string[] = Array.from(new Set([...activeSymbolsRef.current, ...majors]));

      try {
        const results = await Promise.all(targets.map((sym) => fetchLivePrice(sym)));
        setLivePrices(prev => {
          const next = { ...prev };
          results.forEach((data, idx) => {
            if (data) {
              const baseSym = resolveSymbolKey(targets[idx]);
              const prevPrice = prev[baseSym]?.price || 0;
              const direction = data.price > prevPrice ? 'up' : data.price < prevPrice ? 'down' : (prev[baseSym]?.direction || 'neutral');
              
              next[baseSym] = {
                price: data.price,
                direction,
                lastTick: direction !== 'neutral' ? Date.now() : (prev[baseSym]?.lastTick || 0)
              };
            }
          });
          return next;
        });
      } catch (e) {
        setPriceError("Price feed disconnected");
      } finally {
        isFetching = false;
      }
    };

    updatePrices();
    const interval = setInterval(updatePrices, 1000); 
    return () => clearInterval(interval);
  }, []);

  // JITTER ENGINE
  useEffect(() => {
    const jitter = setInterval(() => {
      setLivePrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (!next[key]) return;
          const movement = (next[key].price || 0) * (Math.random() - 0.5) * 0.00008;
          next[key] = {
            ...next[key],
            price: (next[key].price || 0) + movement
          };
        });
        return next;
      });
      syncAccountMetrics();
    }, 150);
    return () => clearInterval(jitter);
  }, [trades]);

  const handleUpdateTrade = (id: string, updates: Partial<Trade>) => {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleAddTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrade) {
      handleUpdateTrade(editingTrade.id, newTrade);
      setEditingTrade(null);
    } else {
      if (executeOnMT5) {
        setMt5TradeStatus('EXECUTING');
        try {
          const { executeMT5Trade } = await import('../services/mt5Service');
          await executeMT5Trade({
            symbol: newTrade.symbol || MARKET_ASSETS[0].id,
            action: newTrade.direction || TradeDirection.BUY,
            volume: newTrade.lotSize || 1.0,
            price: newTrade.entry || 0,
            sl: newTrade.sl,
            tp: newTrade.tp1
          });
          setMt5TradeStatus('SUCCESS');
        } catch (error) {
          setMt5TradeStatus('ERROR');
          return; // Do not add to local state if MT5 execution fails
        }
      }

      const id = `#TR-${Math.floor(88000 + Math.random() * 1000)}`;
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      
      const tradeToAdd: Trade = {
        id,
        accountId: 'LIVE-ALPHA-01',
        symbol: newTrade.symbol || MARKET_ASSETS[0].id,
        livePrice: newTrade.entry || 0,
        entry: newTrade.entry || 0,
        timeOpen: timeStr,
        direction: newTrade.direction || TradeDirection.BUY,
        lotSize: newTrade.lotSize || 1.0,
        sl: newTrade.sl || 0,
        tp1: newTrade.tp1 || 0,
        tp2: newTrade.tp2 || 0,
        tp3: newTrade.tp3 || 0,
        pnlUsd: 0,
        growthPct: 0,
        status: 'ACTIVE',
        dayTarget: newTrade.dayTarget || 5000,
        traderName: newTrade.traderName || 'Karam',
        traderCompanyId: 'WRC-LDN-01',
      };
      setTrades(prev => [tradeToAdd, ...prev]);
      setIsAddingTrade(false);
      setMt5TradeStatus('IDLE');
    }
  };

  const handleCloseTrade = (tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;
    const closed = { ...trade, status: 'CLOSED' as const, timeClosed: new Date().toISOString().replace('T', ' ').substring(0, 19) };
    setTrades(prev => prev.filter(t => t.id !== tradeId));
    setClosedTrades(prev => [closed, ...prev]);
  };

  const handleOpenEditModal = (trade: Trade) => {
    setNewTrade({ ...trade });
    setEditingTrade(trade);
  };

  const tableCellPadding = density === 'compact' ? 'px-3 py-2' : density === 'relaxed' ? 'px-6 py-5' : 'px-4 py-3.5';
  const isHistoryMode = activeSubTab === 'history';

  const renderAccountsTable = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#05070a] border-t border-slate-200 dark:border-white/5 relative">
      <div className="flex-1 overflow-y-auto overflow-x-auto scroll-smooth no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
          <thead className="bg-slate-50 dark:bg-[#0b0e14] border-b border-slate-200 dark:border-white/10 sticky top-0 z-20">
            <tr className="text-[9px] font-bold text-muted dark:text-slate-500 uppercase tracking-widest">
              <th className={tableCellPadding + " w-12 text-center"}>SEL</th>
              <th className={tableCellPadding + " w-48"}>ACCOUNT NAME</th>
              <th className={tableCellPadding + " w-32"}>ACCOUNT ID</th>
              <th className={tableCellPadding + " w-40"}>BALANCE (CASH)</th>
              <th className={tableCellPadding + " w-40"}>EQUITY (LIVE)</th>
              <th className={tableCellPadding + " w-32"}>MARGIN</th>
              <th className={tableCellPadding + " w-32"}>FREE MARGIN</th>
              <th className={tableCellPadding + " w-32"}>FLOATING P/L</th>
              <th className={tableCellPadding + " w-32 text-center"}>CONNECTIVITY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono text-[12px] font-bold">
            {[...accounts, ...(mt5Account ? [mt5Account] : [])].map((acc) => (
              <tr key={acc.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.04] even:bg-slate-50/30 dark:even:bg-white/[0.01] transition-colors group/row h-14">
                <td className={tableCellPadding + " text-center"}>
                  <input type="checkbox" className="size-3 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 accent-primary cursor-pointer" />
                </td>
                <td className={tableCellPadding}>
                  <div className="flex flex-col">
                    <span className="text-slate-900 dark:text-white font-black uppercase text-[10px]">{acc.name}</span>
                    <span className="text-[7px] text-slate-500 dark:text-slate-600 font-black uppercase tracking-widest mt-0.5">
                      {acc.lastUpdated ? `Last Sync: ${new Date(acc.lastUpdated).toLocaleTimeString()}` : 'Primary Cluster'}
                    </span>
                  </div>
                </td>
                <td className={tableCellPadding}>
                  <span className="text-slate-400 dark:text-slate-400 font-bold">{acc.id}</span>
                </td>
                <td className={tableCellPadding + " tabular-nums text-slate-600 dark:text-slate-300"}>
                  ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={tableCellPadding + " tabular-nums text-slate-900 dark:text-white font-extrabold text-[13px]"}>
                  ${acc.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={tableCellPadding + " tabular-nums text-slate-500 dark:text-slate-400"}>
                  ${acc.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={tableCellPadding + " tabular-nums text-slate-600 dark:text-slate-300"}>
                  ${acc.freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={tableCellPadding}>
                  <div className={`inline-flex items-center justify-end px-2 py-1 rounded-md border font-bold tabular-nums min-w-[100px] text-[13px] ${acc.profit >= 0 ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                    {acc.profit >= 0 ? '+' : '-'}${Math.abs(acc.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </td>
                <td className={tableCellPadding + " text-center"}>
                  <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold inline-block border uppercase tracking-wider ${acc.status === 'CONNECTED' ? 'bg-success/20 text-success border-success/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'}`}>
                    {acc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-2 bg-slate-50 dark:bg-black/40 border-t border-slate-200 dark:border-white/5 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-4">
            <span className="text-[7px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">Last Server Sync: {new Date(lastAccountSync).toLocaleTimeString()}</span>
            <div className="h-2 w-px bg-slate-200 dark:bg-white/5"></div>
            <span className="text-[7px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">Active Node: {activeServerNode}</span>
            {isSyncingAccounts && (
              <>
                <div className="h-2 w-px bg-slate-200 dark:bg-white/5"></div>
                <span className="text-[7px] font-black text-primary uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[10px] animate-spin">sync</span> Syncing...</span>
              </>
            )}
            {accountError && (
              <>
                <div className="h-2 w-px bg-slate-200 dark:bg-white/5"></div>
                <span className="text-[7px] font-black text-danger uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">error</span> {accountError}</span>
              </>
            )}
         </div>
         <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${mt5Status.bg} ${mt5Status.border} ${mt5Status.color}`}>
              <span className={`material-symbols-outlined text-[16px] ${mt5Status.animate || ''}`}>{mt5Status.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">Bridge Status: {mt5Status.label}</span>
            </div>
            <button 
              onClick={() => setIsMT5Active(!isMT5Active)}
              className={`px-4 py-1.5 ${isMT5Active ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-slate-900 dark:bg-white text-white dark:text-black'} text-[9px] font-black uppercase tracking-widest rounded shadow hover:brightness-110 flex items-center gap-2 transition-all active:scale-95`}
            >
              <span className="material-symbols-outlined text-[12px]">{isMT5Active ? 'link_off' : 'cable'}</span> 
              {isMT5Active ? 'Disconnect Bridge' : 'Connect MT5 Bridge'}
            </button>
         </div>
      </div>
    </div>
  );

  const getArabicSymbolName = (symbol: string) => {
    const names: Record<string, string> = {
      'XAUUSD': 'ذهب',
      'US30': 'داو',
      'GBPJPY': 'جنيه/ين',
      'WTI': 'نفط خام',
      'USDCAD': 'دولار/دولار كندي',
      'EURUSD': 'يورو/دولار',
      'GBPUSD': 'جنيه/دولار',
      'NAS100': 'ناسداك'
    };
    return names[symbol] || symbol;
  };

  const renderGoalsSection = () => {
    const totalTarget = goals.reduce((sum, g) => sum + g.target, 0);
    const totalMargin = goals.reduce((sum, g) => sum + g.margin, 0);
    
    return (
      <div className="glass-panel rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#05070a] flex flex-col overflow-hidden shadow-2xl relative transition-all duration-500 mb-6">
        <header className="px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#05070a] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[18px]">target</span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Targets</h2>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-[10px] font-black text-success uppercase tracking-widest flex items-center gap-1 bg-success/10 px-2 py-1 rounded-md">
                <span className="size-1.5 rounded-full bg-success animate-pulse"></span>
                LIVE
              </span>
              <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-2"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} | {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleRandomizeGoals}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[12px] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg"
          >
            <span className="material-symbols-outlined text-[18px]">shuffle</span>
            Randomize
          </button>
        </header>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-center border-collapse min-w-[1100px]">
            <thead className="bg-slate-50 dark:bg-[#0d1117] text-slate-500 dark:text-white border-b border-slate-200 dark:border-white/10">
              <tr className="text-[11px] font-black uppercase tracking-widest">
                <th className="px-4 py-5">Market</th>
                <th className="px-4 py-5">Target $</th>
                <th className="px-4 py-5">Margin</th>
                <th className="px-4 py-5">Lot</th>
                <th className="px-4 py-5">Current Price</th>
                <th className="px-4 py-5">Open Price</th>
                <th className="px-4 py-5">PnL</th>
                <th className="px-4 py-4">Trader</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono text-[12px]">
              {goals.map((goal) => {
                const priceKey = resolveSymbolKey(goal.symbol);
                const meta = livePrices[priceKey];
                const livePrice = getTradeLivePrice(goal.symbol, goal.entry || 0);
                const pnl = goal.entry > 0 ? (goal.type === 'BUY' ? (livePrice - goal.entry) : (goal.entry - livePrice)) * goal.lot * 100000 : 0;
                
                return (
                  <tr key={goal.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors h-16">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3 justify-start pl-4">
                        <div className="size-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10">
                          <AssetIcon symbol={goal.symbol} className="size-5" />
                        </div>
                        <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5">
                          <span className="text-slate-900 dark:text-white font-black text-[11px] uppercase tracking-tighter">
                            {goal.symbol.replace('.pro', '')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 inline-block">
                        <input 
                          type="number" 
                          value={goal.target} 
                          onChange={(e) => updateGoalField(goal.id, 'target', parseFloat(e.target.value))}
                          className="w-20 bg-transparent text-center font-black text-blue-600 dark:text-blue-400 outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 inline-block min-w-[60px]">
                        <span className="text-slate-400 font-black">---</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 inline-block">
                        <input 
                          type="number" 
                          value={goal.lot} 
                          onChange={(e) => updateGoalField(goal.id, 'lot', parseFloat(e.target.value))}
                          className="w-12 bg-transparent text-center font-black text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 inline-block">
                        <span className={`font-black tabular-nums transition-colors duration-300 ${meta?.direction === 'up' ? 'text-success' : meta?.direction === 'down' ? 'text-danger' : 'text-slate-900 dark:text-white'}`}>
                          ${livePrice.toLocaleString(undefined, { 
                            minimumFractionDigits: (goal.symbol.includes('US30') || goal.symbol.includes('XAU') || goal.symbol.includes('BTC')) ? 2 : 4, 
                            maximumFractionDigits: (goal.symbol.includes('US30') || goal.symbol.includes('XAU') || goal.symbol.includes('BTC')) ? 2 : 4 
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 inline-block min-w-[60px]">
                        <span className="text-slate-400 font-black">---</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg border font-black tabular-nums min-w-[80px] ${pnl >= 0 ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                        {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg px-4 py-1.5 inline-block">
                        <span className="text-purple-600 dark:text-purple-400 font-black text-[11px] uppercase tracking-widest">{goal.trader}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white border-t border-slate-200 dark:border-white/10">
              <tr className="text-[11px] font-black uppercase tracking-widest h-14">
                <td className="px-4 py-2">
                  <div className="bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2 inline-block">
                    Total ({goals.length} Markets)
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-6 py-2 inline-block">
                    ${totalTarget.toFixed(2)}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-6 py-2 inline-block">
                    ${totalMargin.toFixed(2)}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2 inline-block w-12">-</div>
                </td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2">
                  <button className="px-6 py-2 bg-success text-white rounded-lg font-black text-[10px] hover:brightness-110 transition-all shadow-lg shadow-success/20">
                    LIVE TRADING
                  </button>
                </td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2">
                  <div className="bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-4 py-2 inline-block">
                    {goals.length} Traders
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const renderCalendarSection = () => (
    <div className="glass-panel rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#05070a] flex flex-col h-[600px] xl:h-[520px] overflow-hidden shadow-2xl relative transition-all duration-500">
      <header className="px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0d1117] flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200 dark:bg-black/40 p-1.5 rounded-xl border border-slate-300 dark:border-white/5">
            <button 
              onClick={() => setActiveCalendarTab('calendar')} 
              className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeCalendarTab === 'calendar' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              Economic Pulse
            </button>
            <button 
              onClick={() => setActiveCalendarTab('sessions')} 
              className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeCalendarTab === 'sessions' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              Market Sessions
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">WRC-NODE-ALPHA: SYNC_OK</span>
           <div className="h-4 w-px bg-slate-200 dark:bg-white/10"></div>
           <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5"><span className="size-1.5 bg-primary rounded-full animate-pulse"></span> Institutional Live (GST)</span>
        </div>
      </header>
      <div className="flex-1 w-full relative overflow-hidden bg-[#0a0c10]">
        <div className={`w-full h-full ${activeCalendarTab === 'calendar' ? 'block' : 'hidden'}`}>
          <TradingViewCalendar theme={theme} />
        </div>
        <div className={`w-full h-full ${activeCalendarTab === 'sessions' ? 'block' : 'hidden'}`}>
          <MarketSessions theme={theme} />
        </div>
      </div>
    </div>
  );

  const EditableNumeric = ({ 
    value, 
    onChange, 
    className = "", 
    step = "any" 
  }: { 
    value: number, 
    onChange: (val: number) => void, 
    className?: string, 
    step?: string 
  }) => {
    const [localValue, setLocalValue] = useState(value.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (document.activeElement !== inputRef.current) {
        setLocalValue(value.toString());
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "" || /^-?[0-9]*\.?[0-9]*$/.test(val)) {
        setLocalValue(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
          onChange(num);
        }
      }
    };

    const handleBlur = () => {
      setLocalValue(value.toString());
    };

    return (
      <input 
        ref={inputRef}
        type="text" 
        inputMode="decimal"
        value={localValue} 
        onChange={handleChange}
        onBlur={handleBlur}
        className={`bg-white dark:bg-white/5 border border-transparent hover:border-slate-300 dark:hover:border-white/10 focus:border-primary focus:bg-white dark:focus:bg-black/80 rounded px-1 w-full text-center font-mono tabular-nums transition-all outline-none ${className}`}
      />
    );
  };

  const EditableText = ({ 
    value, 
    onChange, 
    className = "" 
  }: { 
    value: string, 
    onChange: (val: string) => void, 
    className?: string 
  }) => (
    <input 
      type="text" 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={`bg-white dark:bg-white/5 border border-transparent hover:border-slate-300 dark:hover:border-white/10 focus:border-primary focus:bg-white dark:focus:bg-black/80 rounded px-1 w-full text-center font-mono transition-all outline-none ${className}`}
    />
  );

  const SearchableAsset: React.FC<{ 
    symbol: string, 
    onChange: (sym: string) => void,
    tradeId: string
  }> = ({ symbol, onChange, tradeId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen]);

    const filteredAssets = MARKET_ASSETS.filter(a => 
      a.name.toLowerCase().includes(search.toLowerCase()) || 
      a.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="relative" ref={dropdownRef}>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 min-w-0 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-all group/asset"
        >
          <AssetIcon symbol={symbol} size={16} />
          <div className="flex flex-col min-w-0">
            <span className="font-black text-slate-800 dark:text-slate-100 uppercase text-[13px] truncate group-hover/asset:text-primary transition-colors">{symbol.split('.')[0]}</span>
            <span className="text-[5px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-tight truncate">{tradeId}</span>
          </div>
        </div>

        {isOpen && (
          <div className="absolute left-0 top-full mt-1 z-[100] w-48 bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-white/10 rounded-lg shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 border-b border-slate-200 dark:border-white/5">
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search instrument..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded py-1 px-2 text-[8px] font-bold outline-none text-slate-900 dark:text-white"
              />
            </div>
            <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
              {filteredAssets.map(asset => (
                <div 
                  key={asset.id}
                  onClick={() => { onChange(asset.id); setIsOpen(false); }}
                  className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <AssetIcon symbol={asset.id} size={10} />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-800 dark:text-slate-100 uppercase">{asset.name}</span>
                    <span className="text-[6px] text-slate-400 dark:text-slate-600 uppercase font-black">{asset.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredTrades = [...(isHistoryMode ? closedTrades : trades), ...(isHistoryMode ? [] : mt5Positions)].filter(t => 
    t.symbol.toLowerCase().includes(tradeSearchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(tradeSearchTerm.toLowerCase()) ||
    t.traderName.toLowerCase().includes(tradeSearchTerm.toLowerCase())
  );

  const totalFloatingPnL = [...trades, ...mt5Positions].reduce((acc, t) => acc + calculateDynamicPnL(t), 0);

  const baseBalance = 1244500;
  const mt5Balance = mt5Account ? mt5Account.balance : 0;
  const totalBalance = baseBalance + mt5Balance;
  const totalEquity = totalBalance + totalFloatingPnL;
  const totalMargin = accounts.reduce((sum, a) => sum + a.margin, 0) + (mt5Account ? mt5Account.margin : 0);
  const marginUtilization = totalEquity > 0 ? (totalMargin / totalEquity) * 100 : 0;

  const getMT5Status = () => {
    if (!isMT5Active) return { label: 'Disconnected', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', icon: 'link_off' };
    if (!mt5Account || mt5Account.status === 'DISCONNECTED') return { label: 'Connecting', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: 'sync', animate: 'animate-spin' };
    return { label: 'Connected', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: 'link' };
  };

  const mt5Status = getMT5Status();

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-[#080a0e] flex flex-col overflow-y-auto scroll-smooth p-4 gap-6 no-scrollbar">
      
      {/* GLOBAL STATS */}
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-6 gap-4 shrink-0">
        {[
          { label: 'AGGREGATE BALANCE', val: `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
          { label: 'TOTAL NET EQUITY', val: `$${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
          { label: 'MARGIN UTILIZATION', val: `${marginUtilization.toFixed(2)}%` },
          { label: 'LIQUIDITY CLUSTER', val: activeServerNode },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-4 flex flex-col gap-1 border border-slate-200 dark:border-white/5 bg-white dark:bg-black/20 rounded-xl shadow-sm hover:border-primary/30 transition-colors">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-500 font-bold">{stat.label}</span>
            <span className="text-xl font-black text-slate-900 dark:text-white font-display tabular-nums tracking-tighter">{stat.val}</span>
          </div>
        ))}
        
        {/* MT5 SPECIFIC QUICK STAT */}
        <div className={`glass-panel p-4 flex flex-col gap-1 border-l-4 ${isMT5Active ? 'border-success' : 'border-slate-300'} bg-white dark:bg-black/20 rounded-xl shadow-sm transition-all`}>
          <div className="flex justify-between items-center">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-500 font-bold">MT5 BRIDGE EQUITY</span>
            <span className={`size-2 rounded-full ${mt5Status.label === 'Connected' ? 'bg-success animate-pulse' : 'bg-slate-300'}`}></span>
          </div>
          <span className={`text-xl font-black font-display tabular-nums tracking-tighter ${isMT5Active ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {isMT5Active && mt5Account ? `$${mt5Account.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'OFFLINE'}
          </span>
        </div>

        <RealTimePnLTracker totalPnL={totalFloatingPnL} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch flex-1 min-h-[600px]">
        {/* SIDEBAR: MARKET WATCH */}
        <aside className="col-span-12 xl:col-span-3 flex flex-col h-full">
          <MarketWatch theme={theme} />
        </aside>

        {/* MAIN TERMINAL CONTAINER */}
        <div className="col-span-12 xl:col-span-9 flex flex-col gap-6">
          
          {/* SEPARATE CALENDAR SECTION ON TOP */}
          {renderCalendarSection()}

          {/* GOALS SECTION (NEW FEATURE) */}
          {renderGoalsSection()}

          {/* MAIN TERMINAL SCHEDULE (LIVE MATRIX) */}
          <div className="glass-panel rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#05070a] flex flex-col flex-1 overflow-hidden shadow-2xl relative transition-all duration-500">
            
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 bg-slate-50 dark:bg-[#0d1117]">
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-200 dark:bg-black/40 p-1 rounded-lg">
                  {[
                    { id: 'trades', label: 'Live Matrix' },
                    { id: 'history', label: 'History' },
                    { id: 'accounts', label: 'Accounts' },
                    { id: 'bridge', label: 'MT5 Bridge' }
                  ].map((t) => (
                    <button 
                      key={t.id}
                      onClick={() => setActiveTab(t.id as DashboardSubTab)} 
                      className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${activeSubTab === t.id ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {activeSubTab === 'trades' && (
                  <div className="flex bg-slate-200 dark:bg-black/40 p-1 rounded-lg">
                    {[
                      { id: 'table', icon: 'table_rows', label: 'Table' },
                      { id: 'grid', icon: 'grid_view', label: 'Grid' },
                      { id: 'bubbles', icon: 'bubble_chart', label: 'Bubbles' }
                    ].map((v) => (
                      <button 
                        key={v.id}
                        onClick={() => setViewMode(v.id as any)} 
                        className={`flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${viewMode === v.id ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">{v.icon}</span>
                        <span className="hidden sm:inline">{v.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* LOCAL TABLE SEARCH */}
              {(activeSubTab === 'trades' || activeSubTab === 'history') && (
                <div className="relative flex-1 max-w-[240px]">
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">search</span>
                  <input 
                    type="text" 
                    placeholder="Search Asset, ID or Trader..."
                    value={tradeSearchTerm}
                    onChange={(e) => setTradeSearchTerm(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-[9px] font-bold outline-none focus:border-primary/40 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${mt5Status.bg} ${mt5Status.border} ${mt5Status.color}`}>
                  <span className={`material-symbols-outlined text-[14px] ${mt5Status.animate || ''}`}>{mt5Status.icon}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest">MT5: {mt5Status.label}</span>
                </div>
                {priceError && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-danger/10 border border-danger/20 rounded text-danger">
                    <span className="material-symbols-outlined text-[12px]">error</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">{priceError}</span>
                  </div>
                )}
                {isLoadingPrice && !priceError && (
                  <div className="flex items-center gap-1.5 px-2 py-1 text-slate-400">
                    <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Fetching Prices...</span>
                  </div>
                )}
                <button onClick={saveTerminalState} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                  <span className={`material-symbols-outlined text-sm ${saveStatus === 'SAVING' ? 'animate-spin' : ''}`}>{saveStatus === 'SUCCESS' ? 'check_circle' : 'save'}</span>
                  {saveStatus === 'SAVING' ? 'Synchronizing' : 'Commit Data'}
                </button>
                {activeSubTab === 'trades' && (
                  <button onClick={() => { setIsAddingTrade(true); setEditingTrade(null); setNewTrade({ ...newTrade, entry: 1.0850 }); }} className="px-5 py-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded shadow-lg shadow-primary/20 hover:brightness-110 flex items-center gap-2 transition-all active:scale-95">
                    <span className="material-symbols-outlined text-[14px]">add_box</span> New Deployment
                  </button>
                )}
              </div>
            </div>

            {activeSubTab === 'bridge' ? (
              <div className="flex-1 flex flex-col p-8 bg-white dark:bg-[#05070a] border-t border-slate-200 dark:border-white/5 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[
                    { label: 'MT5 BALANCE', value: mt5Account ? `$${mt5Account.balance.toLocaleString()}` : 'N/A', icon: 'account_balance' },
                    { label: 'MT5 EQUITY', value: mt5Account ? `$${mt5Account.equity.toLocaleString()}` : 'N/A', icon: 'account_balance_wallet' },
                    { label: 'MT5 MARGIN', value: mt5Account ? `$${mt5Account.margin.toLocaleString()}` : 'N/A', icon: 'layers' },
                    { label: 'FREE MARGIN', value: mt5Account ? `$${mt5Account.freeMargin.toLocaleString()}` : 'N/A', icon: 'lock_open' },
                  ].map((stat, i) => (
                    <div key={i} className="p-6 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">{stat.icon}</span>
                      </div>
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stat.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 bg-slate-50 dark:bg-black/20 rounded-3xl border border-slate-200 dark:border-white/5 p-8 flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Bridge Intelligence Stream</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Real-time synchronization logs from MetaTrader 5</p>
                        {mt5Account?.lastUpdated && (
                          <>
                            <div className="h-1 w-1 rounded-full bg-slate-400"></div>
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Last Sync: {new Date(mt5Account.lastUpdated).toLocaleTimeString()}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${mt5Status.bg} ${mt5Status.border} ${mt5Status.color}`}>
                      <span className={`material-symbols-outlined text-[14px] ${mt5Status.animate || ''}`}>{mt5Status.icon}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">{mt5Status.label}</span>
                    </div>
                  </div>

                  <div className="flex-1 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/10 p-6 font-mono text-[11px] overflow-y-auto no-scrollbar">
                    {!isMT5Active ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                        <span className="material-symbols-outlined text-4xl">link_off</span>
                        <p className="uppercase font-black tracking-widest">Bridge Offline - Connection Required</p>
                        <button 
                          onClick={() => setIsMT5Active(true)}
                          className="px-6 py-2 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                        >
                          Initialize Connection
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-4 text-success">
                          <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                          <span className="font-black uppercase tracking-widest">SYSTEM: Bridge initialized on WR-NODE-ALPHA</span>
                        </div>
                        <div className="flex gap-4 text-slate-400">
                          <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                          <span className="uppercase tracking-widest">POLL: Fetching account metrics...</span>
                        </div>
                        {mt5Account && (
                          <div className="flex gap-4 text-white">
                            <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                            <span className="uppercase tracking-widest">DATA: Account {mt5Account.id} synced successfully</span>
                          </div>
                        )}
                        <div className="flex gap-4 text-slate-400">
                          <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                          <span className="uppercase tracking-widest">POLL: Scanning {mt5Positions.length} active positions...</span>
                        </div>
                        {mt5Positions.length > 0 && (
                          <div className="flex gap-4 text-primary">
                            <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                            <span className="uppercase tracking-widest">ALERT: {mt5Positions.length} positions detected in MT5 terminal</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeSubTab === 'accounts' ? renderAccountsTable() : (
              <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#05070a] border-t border-slate-200 dark:border-white/5 relative">
                {viewMode === 'table' ? (
                  <div className="flex-1 overflow-y-auto overflow-x-auto scroll-smooth no-scrollbar relative">
                    <table className="w-full text-left border-collapse min-w-[1300px] table-fixed">
                    <thead className="bg-slate-50 dark:bg-[#0b0e14] border-b border-slate-200 dark:border-white/10 sticky top-0 z-20">
                      <tr className="text-[9px] font-bold text-muted dark:text-slate-500 uppercase tracking-widest">
                        <th className={tableCellPadding + " w-[120px] text-center"}>ASSET</th>
                        <th className={tableCellPadding + " w-[110px] text-right"}>LIVE FEED</th>
                        <th className={tableCellPadding + " w-[90px] text-center"}>ENTRY</th>
                        <th className={tableCellPadding + " w-[75px] text-center"}>BIAS</th>
                        <th className={tableCellPadding + " w-[70px] text-center"}>LOT</th>
                        <th className={tableCellPadding + " w-[85px] text-center"}>SL</th>
                        <th className={tableCellPadding + " w-[85px] text-center"}>TP 1</th>
                        <th className={tableCellPadding + " w-[85px] text-center"}>TARGET</th>
                        <th className={tableCellPadding + " w-[110px] text-right"}>PNL (USD)</th>
                        <th className={tableCellPadding + " w-[85px] text-center"}>GROWTH</th>
                        <th className={tableCellPadding + " w-[90px] text-center"}>progress</th>
                        <th className={tableCellPadding + " w-[110px] text-center"}>T. name</th>
                        <th className={tableCellPadding + " w-[80px] text-center"}>ACT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono text-[12px] font-bold">
                      {filteredTrades.map((trade) => {
                        const priceKey = resolveSymbolKey(trade.symbol);
                        const meta = livePrices[priceKey];
                        const currentLivePrice = isHistoryMode ? (trade.livePrice || trade.entry) : (meta?.price || trade.entry);
                        const dynamicPnL = isHistoryMode ? trade.pnlUsd : calculateDynamicPnL(trade);
                        const dynamicGrowth = isHistoryMode ? trade.growthPct : calculateDynamicGrowth(trade);
                        const isProfitable = dynamicPnL >= 0;
                        const progressValue = Math.min(100, Math.max(0, (dynamicPnL / (trade.dayTarget || 5000)) * 100));

                        return (
                          <tr key={trade.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.04] even:bg-slate-50/30 dark:even:bg-white/[0.01] transition-all duration-300 group/row">
                            <td className="px-5 py-3">
                              {/* Colors and shadow are strictly forced. No dark mode variants. */}
                              <div className="inline-flex items-center gap-2 bg-[#f2f5f9] border border-[#dce2e8] rounded-full p-1 pr-4 w-[110.787px] h-[43.6px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-default">
                                <div className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden shrink-0 bg-white shadow-sm">
                                  <AssetIcon symbol={trade.symbol} size={18} />
                                </div>
                                <span className="text-[15px] leading-[19px] font-['Courier_New'] font-bold tracking-wider uppercase ml-0.5 text-[#243041]">
                                  {trade.symbol.replace('.pro', '')}
                                </span>
                              </div>
                            </td>
                            <td className={tableCellPadding}>
                              <div className="flex items-center justify-end gap-1">
                                 <span className={`text-[12px] font-bold tabular-nums ${!isHistoryMode && meta?.direction === 'up' ? 'text-success' : !isHistoryMode && meta?.direction === 'down' ? 'text-danger' : 'text-slate-900 dark:text-white'}`}>
                                   {currentLivePrice.toLocaleString(undefined, { 
                                     minimumFractionDigits: trade.symbol.includes('EUR') || trade.symbol.includes('GBP') ? 4 : 2,
                                     maximumFractionDigits: trade.symbol.includes('EUR') || trade.symbol.includes('GBP') ? 4 : 2 
                                   })}
                                 </span>
                              </div>
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              <EditableNumeric 
                                value={trade.entry || currentLivePrice} 
                                onChange={(val) => handleUpdateTrade(trade.id, { entry: val })}
                                className={`font-bold text-[12px] leading-[18px] transition-colors duration-300 ${!trade.entry ? (meta?.direction === 'up' ? 'text-success' : meta?.direction === 'down' ? 'text-danger' : 'text-slate-500 dark:text-slate-400') : 'text-slate-500 dark:text-slate-400'}`} 
                                step="0.0001"
                              />
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              <button 
                                onClick={() => !isHistoryMode && handleUpdateTrade(trade.id, { direction: trade.direction === TradeDirection.BUY ? TradeDirection.SELL : TradeDirection.BUY })}
                                className={`px-2 py-1 rounded-md text-[12px] leading-[16.5px] font-bold tracking-wider block w-full text-center border truncate transition-colors ${trade.direction === TradeDirection.BUY ? 'bg-success/20 text-success border-success/30 hover:bg-success/30' : 'bg-danger/20 text-danger border-danger/30 hover:bg-danger/30'}`}
                              >
                                {trade.direction}
                              </button>
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              <EditableNumeric 
                                value={trade.lotSize} 
                                onChange={(val) => handleUpdateTrade(trade.id, { lotSize: val })}
                                className="font-bold text-slate-700 dark:text-slate-300 text-[12px] leading-[18px]" 
                                step="0.01"
                              />
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              <EditableNumeric 
                                value={trade.sl} 
                                onChange={(val) => handleUpdateTrade(trade.id, { sl: val })}
                                className="text-danger font-bold text-[12px] leading-[18px]" 
                                step="0.0001"
                              />
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              <EditableNumeric 
                                value={trade.tp1} 
                                onChange={(val) => handleUpdateTrade(trade.id, { tp1: val })}
                                className="text-success font-bold text-[12px] leading-[18px]" 
                                step="0.0001"
                              />
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              <EditableNumeric 
                                value={trade.dayTarget} 
                                onChange={(val) => handleUpdateTrade(trade.id, { dayTarget: val })}
                                className="font-bold text-slate-700 dark:text-slate-300 text-[12px] leading-[18px]" 
                                step="100"
                              />
                            </td>
                            <td className={`${tableCellPadding} text-right`}>
                               <div className={`inline-flex items-center justify-end px-2 py-1 rounded-md border font-bold tabular-nums min-w-[100px] text-[12px] ${isProfitable ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                                  {isProfitable ? '+' : '-'}${Math.abs(dynamicPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </div>
                            </td>
                            <td className={tableCellPadding}>
                              <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md border tabular-nums font-bold w-[60px] ${dynamicGrowth >= 0 ? 'bg-success/20 border-success/30 text-success' : 'bg-danger/20 border-danger/30 text-danger'}`}>
                                 <span className="text-[12px] leading-[18px]">{isProfitable ? '+' : ''}{dynamicGrowth.toFixed(2)}%</span>
                              </div>
                            </td>
                            <td className={tableCellPadding}>
                              <div className="flex flex-col gap-0.5 w-full max-w-[90px] mx-auto">
                                <div className="h-1 w-full bg-slate-200 dark:bg-black/60 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-1000 ${isProfitable ? 'bg-success' : 'bg-danger'}`} style={{ width: `${progressValue}%` }} />
                                </div>
                                <span className="text-[11px] text-slate-400 dark:text-slate-600 uppercase font-black text-center">{progressValue.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              <EditableText 
                                value={trade.traderName} 
                                onChange={(val) => handleUpdateTrade(trade.id, { traderName: val })}
                                className="text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase truncate" 
                              />
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              {!isHistoryMode && (
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => handleOpenEditModal(trade)} className="size-5 flex items-center justify-center rounded bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all">
                                    <span className="material-symbols-outlined text-[12px]">mode_edit</span>
                                  </button>
                                  <button onClick={() => handleCloseTrade(trade.id)} className="size-5 flex items-center justify-center rounded bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-danger hover:bg-danger/10 transition-all">
                                    <span className="material-symbols-outlined text-[12px]">cancel</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredTrades.length === 0 && (
                        <tr>
                          <td colSpan={13} className="py-20 text-center opacity-30 italic text-[10px] uppercase tracking-widest font-black">
                            No Deployments matching cluster criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                ) : viewMode === 'bubbles' ? (
                  <TraderBubbles data={aggregatedTraderData} />
                ) : (
                  <TraderHeatmapGrid data={aggregatedTraderData} />
                )}
                
                {/* SCHEDULE FOOTER */}
                <div className="px-6 py-2 bg-slate-50 dark:bg-black/40 border-t border-slate-200 dark:border-white/5 flex justify-between items-center shrink-0">
                  <span className="text-[7px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                    Matrix Verified // Secure Institutional Link
                  </span>
                  <div className="flex items-center gap-6">
                      <span className="text-[7px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><span className="size-1 bg-success rounded-full shadow-[0_0_8px_#10b981]"></span> Active</span>
                      <span className="text-[7px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><span className="size-1 bg-primary rounded-full animate-pulse"></span> Pulse</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TRADE MODAL (NEW OR EDIT) */}
      {(isAddingTrade || editingTrade) && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-900/40 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-[700px] glass-panel rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl bg-white dark:bg-[#05070a]">
            <header className="px-10 py-8 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-between items-center rounded-t-[2.5rem]">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                  {editingTrade ? 'Modify Deployment' : 'Cluster Order Deployment'}
                </h2>
              </div>
              <button onClick={() => { setIsAddingTrade(false); setEditingTrade(null); }} className="size-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-300 dark:border-white/5">
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>
            <form onSubmit={handleAddTradeSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Asset Token</label>
                  <select 
                    value={newTrade.symbol} 
                    onChange={e => {
                      const newSym = e.target.value;
                      const currentPrice = getTradeLivePrice(newSym, 0);
                      setNewTrade({...newTrade, symbol: newSym, entry: currentPrice || newTrade.entry});
                      import('../services/priceService').then(({ fetchLivePrice }) => {
                        fetchLivePrice(newSym).then(data => {
                          if (data && data.price) {
                            setNewTrade(prev => prev.symbol === newSym ? { ...prev, entry: data.price } : prev);
                          }
                        }).catch(() => {});
                      });
                    }} 
                    className="w-full bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 dark:text-white focus:border-primary outline-none"
                  >
                    {MARKET_ASSETS.map(asset => <option key={asset.id} value={asset.id} className="bg-white dark:bg-slate-900">{asset.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Bias Direction</label>
                  <div className="flex bg-slate-100 dark:bg-black/60 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                    <button type="button" onClick={() => setNewTrade({...newTrade, direction: TradeDirection.BUY})} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${newTrade.direction === TradeDirection.BUY ? 'bg-success text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Buy</button>
                    <button type="button" onClick={() => setNewTrade({...newTrade, direction: TradeDirection.SELL})} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${newTrade.direction === TradeDirection.SELL ? 'bg-danger text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Sell</button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Entry Price</label>
                  <input type="number" step="any" value={newTrade.entry} onChange={e => setNewTrade({...newTrade, entry: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 dark:text-white focus:border-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Lot Size</label>
                  <input type="number" step="0.01" value={newTrade.lotSize} onChange={e => setNewTrade({...newTrade, lotSize: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 dark:text-white focus:border-primary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Stop Loss</label>
                  <input type="number" step="any" value={newTrade.sl} onChange={e => setNewTrade({...newTrade, sl: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 dark:text-white focus:border-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Take Profit</label>
                  <input type="number" step="any" value={newTrade.tp1} onChange={e => setNewTrade({...newTrade, tp1: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 dark:text-white focus:border-primary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Daily Target</label>
                  <input type="number" value={newTrade.dayTarget} onChange={e => setNewTrade({...newTrade, dayTarget: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 dark:text-white focus:border-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Trader Name</label>
                  {!isAddingNewTrader ? (
                    <TraderDropdown
                      traders={tradersList}
                      selectedTrader={newTrade.traderName || ''}
                      theme="dark"
                      onSelect={(name) => setNewTrade({...newTrade, traderName: name})}
                      onDelete={(name) => {
                        const updatedList = tradersList.filter(t => t !== name);
                        updateTradersList(updatedList);
                        if (newTrade.traderName === name) {
                          setNewTrade({...newTrade, traderName: updatedList[0] || ''});
                        }
                      }}
                      onAddNew={() => {
                        setIsAddingNewTrader(true);
                        setNewTraderNameInput('');
                      }}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newTraderNameInput} 
                        onChange={e => setNewTraderNameInput(e.target.value)} 
                        placeholder="Enter new name"
                        className="w-full bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 dark:text-white focus:border-primary outline-none"
                        autoFocus
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          if (newTraderNameInput.trim()) {
                            const newName = newTraderNameInput.trim();
                            if (!tradersList.includes(newName)) {
                              const updatedList = [...tradersList, newName];
                              updateTradersList(updatedList);
                            }
                            setNewTrade({...newTrade, traderName: newName});
                          }
                          setIsAddingNewTrader(false);
                        }}
                        className="px-3 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all"
                      >
                        Add
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingNewTrader(false)}
                        className="px-3 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!editingTrade && (
                <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                  <input 
                    type="checkbox" 
                    id="executeOnMT5" 
                    checked={executeOnMT5} 
                    onChange={(e) => setExecuteOnMT5(e.target.checked)}
                    className="size-4 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 accent-primary cursor-pointer" 
                  />
                  <label htmlFor="executeOnMT5" className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest cursor-pointer flex-1">
                    Execute on MT5 Bridge
                  </label>
                  {mt5TradeStatus === 'EXECUTING' && <span className="material-symbols-outlined text-primary animate-spin text-[16px]">sync</span>}
                  {mt5TradeStatus === 'ERROR' && <span className="text-danger text-[10px] font-black uppercase tracking-widest">Failed</span>}
                </div>
              )}

              <button type="submit" disabled={mt5TradeStatus === 'EXECUTING'} className="w-full bg-primary hover:bg-red-700 text-white font-black py-4 rounded-[2rem] text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
                {editingTrade ? 'Update Deployment' : (mt5TradeStatus === 'EXECUTING' ? 'Executing...' : 'Commit Order Deployment')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;