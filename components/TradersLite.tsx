import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchFinancialNews, NewsItem } from '../services/newsService';
import { fetchLivePrice } from '../services/priceService';
import { fetchLiveAccountData, subscribeToAccountPulse } from '../services/accountService';
import { MOCK_TRADES, MOCK_ACCOUNTS, MARKET_ASSETS, DEFAULT_SETTINGS } from '../constants';
import { TradeDirection, Trade, Account, TerminalSettings } from '../types';
import AssetIcon from './AssetIcon';
import TraderDropdown from './TraderDropdown';
import ControlPanel from './ControlPanel';
import AddNewsModal from './AddNewsModal';

interface PriceMeta {
  price: number;
  direction: 'up' | 'down' | 'neutral';
  lastTick: number;
}

type DashboardSubTab = 'trades' | 'accounts' | 'history' | 'bridge';

const STORAGE_KEY_TRADES = 'wrc_active_trades_v5';
const STORAGE_KEY_HISTORY = 'wrc_trade_history_v5';
const STORAGE_KEY_AUTOSAVE = 'wrc_autosave_enabled_v5';

const TradersLite: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  const [splashStage, setSplashStage] = useState<'idle' | 'animate'>('idle');

  useEffect(() => {
    // Start explosion animation after 1.2 seconds
    const timer1 = setTimeout(() => setSplashStage('animate'), 1200);
    // Remove splash screen from DOM completely after 2.2 seconds
    const timer2 = setTimeout(() => setShowSplash(false), 2200);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  const [activeSubTab, setActiveTab] = useState<DashboardSubTab>('trades');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'bubbles'>('table');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [showAddNews, setShowAddNews] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);
  const [localNewsSpeed, setLocalNewsSpeed] = useState(() => {
    const saved = localStorage.getItem('lite_news_speed');
    return saved ? parseInt(saved, 10) : 60;
  });
  const [settings, setSettings] = useState<TerminalSettings>(() => {
    const saved = localStorage.getItem('wrc_terminal_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...(parsed.notifications || {})
          }
        };
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [showSettings, setShowSettings] = useState(false);

  const updateSettings = (newSettings: Partial<TerminalSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('wrc_terminal_settings', JSON.stringify(updated));
    if (newSettings.theme) {
      document.documentElement.classList.toggle('dark', newSettings.theme === 'dark');
    }
  };

  useEffect(() => {
    localStorage.setItem('wrc_terminal_settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings]);

  useEffect(() => {
    setLocalNewsSpeed(settings.intelligenceStreamSpeed);
  }, [settings.intelligenceStreamSpeed]);

  useEffect(() => {
    localStorage.setItem('lite_news_speed', localNewsSpeed.toString());
  }, [localNewsSpeed]);

  const [livePrices, setLivePrices] = useState<Record<string, PriceMeta>>({});
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [tradeSearchTerm, setTradeSearchTerm] = useState('');
  
  const [trades, setTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [isAutoSave, setIsAutoSave] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [lastAccountSync, setLastAccountSync] = useState<number>(Date.now());
  const [isSyncingAccounts, setIsSyncingAccounts] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isMT5Active, setIsMT5Active] = useState(false);
  const [mt5Positions, setMt5Positions] = useState<Trade[]>([]);
  const [mt5Account, setMt5Account] = useState<Account | null>(null);
  const [activeServerNode] = useState('WR-NODE-LITE');
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');
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

  useEffect(() => {
    const savedTrades = localStorage.getItem(STORAGE_KEY_TRADES);
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    const savedAutoSave = localStorage.getItem(STORAGE_KEY_AUTOSAVE);

    if (savedTrades) {
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
        }
      } catch (e) {}
    } else {
      setTrades(MOCK_TRADES);
    }
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) setClosedTrades(parsed);
      } catch (e) {}
    }
    if (savedAutoSave) {
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

  useEffect(() => {
    const updateNews = async () => {
      try {
        const newsItems = await fetchFinancialNews();
        setNews(newsItems.slice(0, 15));
      } catch (e) {}
    };
    updateNews();
    const interval = setInterval(updateNews, 300000);
    return () => clearInterval(interval);
  }, []);

  const activeSymbolsRef = useRef<string[]>([]);

  useEffect(() => {
    activeSymbolsRef.current = Array.from(new Set([
      ...trades.map((t) => t.symbol), 
      ...mt5Positions.map((t) => t.symbol)
    ]));
  }, [trades, mt5Positions]);

  useEffect(() => {
    let isFetching = false;
    const updatePrices = async () => {
      if (isFetching) return;
      isFetching = true;
      setPriceError(null);
      const majors = ["XAUUSD.pro", "EURUSD.pro", "GBPUSD.pro", "SPX500.pro"];
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
    const interval = setInterval(updatePrices, 2000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const jitter = setInterval(() => {
      setLivePrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (!next[key]) return;
          const movement = (next[key].price || 0) * (Math.random() - 0.5) * 0.00008;
          next[key] = { ...next[key], price: (next[key].price || 0) + movement };
        });
        return next;
      });
      syncAccountMetrics();
    }, 200);
    return () => clearInterval(jitter);
  }, [trades]);

  const syncAccounts = async () => {
    if (isSyncingAccounts) return;
    setIsSyncingAccounts(true);
    setAccountError(null);
    try {
      const response = await fetchLiveAccountData();
      setAccounts(prev => response.accounts.map(acc => {
        const existing = prev.find(p => p.id === acc.id);
        return existing ? { ...existing, balance: acc.balance, status: acc.status } : acc;
      }));
      setLastAccountSync(response.timestamp);
    } catch (e) {
      setAccountError("Account sync failed");
    } finally {
      setIsSyncingAccounts(false);
    }
  };

  useEffect(() => {
    syncAccounts();
    const pollInterval = setInterval(syncAccounts, 15000); 
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
          return;
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

  // --- CSV EXPORT LOGIC ONLY ---
  const handleExportCSV = () => {
    try {
      if (trades.length === 0) {
        alert("No trades available to export.");
        return;
      }
      const headers = "ID,Asset,Direction,Entry Price,Lot Size,SL,TP1,Target,Trader Name,Date\n";
      const csvRows = trades.map(trade => {
        return `${trade.id},${trade.symbol},${trade.direction},${trade.entry || 0},${trade.lotSize || 0},${trade.sl || 0},${trade.tp1 || 0},${trade.dayTarget || 0},${trade.traderName || 'Karam'},${trade.timeOpen || ''}`;
      });
      const csvContent = headers + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Position_Tracer_Trades.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed", error);
      alert("Export failed due to an unexpected error.");
    }
  };
  // -----------------------------

  const getMT5Status = () => {
    if (!isMT5Active) return { label: 'Disconnected', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', icon: 'link_off' };
    if (!mt5Account || mt5Account.status === 'DISCONNECTED') return { label: 'Connecting', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: 'sync', animate: 'animate-spin' };
    return { label: 'Connected', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: 'link' };
  };

  const mt5Status = getMT5Status();
  const isHistoryMode = activeSubTab === 'history';
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

  const tableCellPadding = settings.layoutDensity === 'compact' ? "px-3 py-2" : settings.layoutDensity === 'relaxed' ? "px-6 py-5" : "px-4 py-3.5";

  const renderAccountsTable = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-t border-slate-200 relative">
      <div className="flex-1 overflow-y-auto overflow-x-auto scroll-smooth no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
            <tr className="text-[9px] font-bold text-muted uppercase tracking-widest">
              <th className={tableCellPadding + " w-12 text-center whitespace-nowrap"}>SEL</th>
              <th className={tableCellPadding + " w-48 text-center whitespace-nowrap"}>ACCOUNT NAME</th>
              <th className={tableCellPadding + " w-32 text-center whitespace-nowrap"}>ACCOUNT ID</th>
              <th className={tableCellPadding + " w-40 text-center whitespace-nowrap"}>BALANCE (CASH)</th>
              <th className={tableCellPadding + " w-40 text-center whitespace-nowrap"}>EQUITY (LIVE)</th>
              <th className={tableCellPadding + " w-32 text-center whitespace-nowrap"}>MARGIN</th>
              <th className={tableCellPadding + " w-32 text-center whitespace-nowrap"}>FREE MARGIN</th>
              <th className={tableCellPadding + " w-32 text-center whitespace-nowrap"}>FLOATING P/L</th>
              <th className={tableCellPadding + " w-32 text-center whitespace-nowrap"}>CONNECTIVITY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono text-[12px] font-bold">
            {[...accounts, ...(mt5Account ? [mt5Account] : [])].map((acc) => (
              <tr key={acc.id} className="hover:bg-slate-100/50 even:bg-slate-50/30 transition-colors group/row h-14">
                <td className={tableCellPadding + " text-center"}>
                  <input type="checkbox" className="size-3 rounded border-slate-300 bg-white accent-primary cursor-pointer" />
                </td>
                <td className={tableCellPadding + " text-center"}>
                  <div className="flex flex-col items-center">
                    <span className="text-slate-900 font-black uppercase text-[10px]">{acc.name}</span>
                    <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                      {acc.lastUpdated ? `Last Sync: ${new Date(acc.lastUpdated).toLocaleTimeString()}` : 'Primary Cluster'}
                    </span>
                  </div>
                </td>
                <td className={tableCellPadding + " text-center"}>
                  <span className="text-slate-400 font-bold">{acc.id}</span>
                </td>
                <td className={tableCellPadding + " tabular-nums text-center text-slate-600"}>
                  ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={tableCellPadding + " tabular-nums text-center text-slate-900 font-extrabold text-[13px]"}>
                  ${acc.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={tableCellPadding + " tabular-nums text-center text-slate-500"}>
                  ${acc.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={tableCellPadding + " tabular-nums text-center text-slate-600"}>
                  ${acc.freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={tableCellPadding + " text-center tabular-nums"}>
                  <div className={`inline-flex items-center justify-center px-2 py-1 rounded-md border font-extrabold text-[13px] min-w-[100px] ${acc.profit >= 0 ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                    {acc.profit >= 0 ? '+' : '-'}${Math.abs(acc.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </td>
                <td className={tableCellPadding + " text-center"}>
                  <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold inline-block border uppercase tracking-wider ${acc.status === 'CONNECTED' ? 'bg-success/20 text-success border-success/30' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {acc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-4">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Last Server Sync: {new Date(lastAccountSync).toLocaleTimeString()}</span>
            <div className="h-2 w-px bg-slate-200"></div>
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Active Node: {activeServerNode}</span>
         </div>
      </div>
    </div>
  );

  // --- WSOD BULLETPROOF FIX HERE ---
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
    // SAFE FALLBACK: If value is undefined/null, default to 0 to prevent .toString() crash.
    const safeValue = value ?? 0;
    const [localValue, setLocalValue] = useState(safeValue.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (document.activeElement !== inputRef.current) {
        setLocalValue((value ?? 0).toString());
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
      setLocalValue((value ?? 0).toString());
    };

    return (
      <input 
        ref={inputRef}
        type="text" 
        inputMode="decimal"
        value={localValue} 
        onChange={handleChange}
        onBlur={handleBlur}
        className={`bg-white border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded px-1 w-full text-center font-mono tabular-nums transition-all outline-none ${className}`}
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
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      className={`bg-white border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded px-1 w-full text-center font-mono transition-all outline-none ${className}`}
    />
  );
  // --------------------------------

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
          className="flex items-center gap-1 min-w-0 cursor-pointer p-1 rounded hover:bg-slate-100 transition-all group/asset"
        >
          <AssetIcon symbol={symbol} size={16} />
          <div className="flex flex-col min-w-0">
            <span className="font-black text-slate-800 uppercase text-[13px] truncate group-hover/asset:text-primary transition-colors">{symbol.split('.')[0]}</span>
            <span className="text-[5px] text-slate-400 font-black uppercase tracking-tight truncate">{tradeId}</span>
          </div>
        </div>

        {isOpen && (
          <div className="absolute left-0 top-full mt-1 z-[100] w-
