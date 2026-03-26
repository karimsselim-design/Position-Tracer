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
  const [activeSubTab, setActiveTab] = useState<DashboardSubTab>('trades');
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
          <div className="absolute left-0 top-full mt-1 z-[100] w-48 bg-white border border-slate-200 rounded-lg shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 border-b border-slate-200">
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search instrument..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 text-[8px] font-bold outline-none text-slate-900"
              />
            </div>
            <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
              {filteredAssets.map(asset => (
                <div 
                  key={asset.id}
                  onClick={() => { onChange(asset.id); setIsOpen(false); }}
                  className="px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <AssetIcon symbol={asset.id} size={10} />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-800 uppercase">{asset.name}</span>
                    <span className="text-[6px] text-slate-400 uppercase font-black">{asset.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const doubledNews = [...news, ...news];

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-[#05070a] text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
      <div className={`flex-1 overflow-y-auto flex flex-col no-scrollbar ${settings.layoutDensity === 'compact' ? 'p-2 gap-3' : settings.layoutDensity === 'relaxed' ? 'p-8 gap-10' : 'p-4 gap-6'}`}>
        <div className="flex-1 flex flex-col min-h-[500px]">
          <div className={`glass-panel rounded-[2rem] border flex flex-col flex-1 overflow-hidden shadow-2xl relative transition-all duration-500 ${settings.theme === 'dark' ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-white'}`}>
            <div className={`${settings.layoutDensity === 'compact' ? 'px-4 py-2' : settings.layoutDensity === 'relaxed' ? 'px-10 py-8' : 'px-6 py-4'} border-b flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 ${settings.theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`flex p-1 rounded-lg ${settings.theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}>
                  {[
                    { id: 'trades', label: 'Live Matrix' },
                    { id: 'history', label: 'History' },
                    { id: 'accounts', label: 'Accounts' },
                    { id: 'bridge', label: 'MT5 Bridge' }
                  ].map((t) => (
                    <button 
                      key={t.id}
                      onClick={() => setActiveTab(t.id as DashboardSubTab)} 
                      className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${activeSubTab === t.id ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {(activeSubTab === 'trades' || activeSubTab === 'history') && (
                <div className="relative flex-1 max-w-[240px]">
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">search</span>
                  <input 
                    type="text" 
                    placeholder="Search Asset, ID or Trader..."
                    value={tradeSearchTerm}
                    onChange={(e) => setTradeSearchTerm(e.target.value)}
                    className={`w-full border rounded-lg py-1.5 pl-8 pr-3 text-[9px] font-bold outline-none focus:border-primary/40 transition-all ${settings.theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`}
                  />
                </div>
              )}
              
              <div className="flex items-center gap-4">
                {(activeSubTab === 'trades') && (
                  <div className="flex items-center gap-2 mr-2">
                    <button onClick={handleExportCSV} className="bg-slate-800 text-white px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Export Data
                    </button>
                  </div>
                )}

                <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-primary transition-all flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                </button>
                <Link to="/dashboard" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-all bg-primary/10 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px]">dashboard</span>
                  Full Terminal
                </Link>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${mt5Status.bg} ${mt5Status.border} ${mt5Status.color}`}>
                  <span className={`material-symbols-outlined text-[14px] ${mt5Status.animate || ''}`}>{mt5Status.icon}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest">MT5: {mt5Status.label}</span>
                </div>
                <button onClick={saveTerminalState} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all">
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
              <div className="flex-1 flex flex-col p-8 bg-white border-t border-slate-200 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[
                    { label: 'MT5 BALANCE', value: mt5Account ? `$${mt5Account.balance.toLocaleString()}` : 'N/A', icon: 'account_balance' },
                    { label: 'MT5 EQUITY', value: mt5Account ? `$${mt5Account.equity.toLocaleString()}` : 'N/A', icon: 'account_balance_wallet' },
                    { label: 'MT5 MARGIN', value: mt5Account ? `$${mt5Account.margin.toLocaleString()}` : 'N/A', icon: 'layers' },
                    { label: 'FREE MARGIN', value: mt5Account ? `$${mt5Account.freeMargin.toLocaleString()}` : 'N/A', icon: 'lock_open' },
                  ].map((stat, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">{stat.icon}</span>
                      </div>
                      <span className="text-2xl font-black text-slate-900 font-mono">{stat.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 p-8 flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Bridge Intelligence Stream</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Real-time synchronization logs from MetaTrader 5</p>
                    </div>
                    <button onClick={() => setIsMT5Active(!isMT5Active)} className="px-6 py-2 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">
                      {isMT5Active ? 'Disconnect Bridge' : 'Initialize Connection'}
                    </button>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 font-mono text-[11px] overflow-y-auto no-scrollbar">
                    {!isMT5Active ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                        <span className="material-symbols-outlined text-4xl">link_off</span>
                        <p className="uppercase font-black tracking-widest">Bridge Offline</p>
                      </div>
                    ) : (
                      <div className="space-y-3 text-slate-400">
                        <div className="flex gap-4 text-success">
                          <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                          <span className="font-black uppercase tracking-widest">SYSTEM: Bridge initialized</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                          <span className="uppercase tracking-widest">POLL: Fetching account metrics...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeSubTab === 'accounts' ? renderAccountsTable() : (
              <div className="flex-1 flex flex-col min-h-0 bg-white border-t border-slate-200 relative">
                <div className="flex-1 overflow-y-auto overflow-x-auto scroll-smooth no-scrollbar relative">
                  <table className="w-full text-left border-collapse min-w-[1300px] table-fixed">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                      <tr className="text-[9px] font-bold text-muted uppercase tracking-widest">
                        <th className={tableCellPadding + " w-[120px] text-center whitespace-nowrap"}>ASSET</th>
                        <th className={tableCellPadding + " w-[110px] text-center whitespace-nowrap"}>LIVE FEED</th>
                        <th className={tableCellPadding + " w-[90px] text-center whitespace-nowrap"}>ENTRY</th>
                        <th className={tableCellPadding + " w-[75px] text-center whitespace-nowrap"}>BIAS</th>
                        <th className={tableCellPadding + " w-[70px] text-center whitespace-nowrap"}>LOT</th>
                        <th className={tableCellPadding + " w-[85px] text-center whitespace-nowrap"}>SL</th>
                        <th className={tableCellPadding + " w-[85px] text-center whitespace-nowrap"}>TP 1</th>
                        <th className={tableCellPadding + " w-[85px] text-center whitespace-nowrap"}>TARGET</th>
                        <th className={tableCellPadding + " w-[110px] text-center whitespace-nowrap"}>PNL (USD)</th>
                        <th className={tableCellPadding + " w-[85px] text-center whitespace-nowrap"}>GROWTH</th>
                        <th className={tableCellPadding + " w-[90px] text-center whitespace-nowrap"}>progress</th>
                        <th className={tableCellPadding + " w-[110px] text-center whitespace-nowrap"}>T. name</th>
                        <th className={tableCellPadding + " w-[80px] text-center whitespace-nowrap"}>ACT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[12px] font-bold">
                      {filteredTrades.map((trade) => {
                        const priceKey = resolveSymbolKey(trade.symbol);
                        const meta = livePrices[priceKey];
                        const currentLivePrice = isHistoryMode ? (trade.livePrice || trade.entry) : (meta?.price || trade.entry);
                        const dynamicPnL = isHistoryMode ? trade.pnlUsd : calculateDynamicPnL(trade);
                        const dynamicGrowth = isHistoryMode ? trade.growthPct : calculateDynamicGrowth(trade);
                        const isProfitable = dynamicPnL >= 0;
                        const progressValue = Math.min(100, Math.max(0, (dynamicPnL / (trade.dayTarget || 5000)) * 100));

                        return (
                          <tr key={trade.id} className="hover:bg-slate-100/50 even:bg-slate-50/30 transition-all duration-300 group/row">
                            <td className={tableCellPadding + " text-center"}>
                              <div className="inline-flex items-center justify-center gap-2 bg-[#f2f5f9] border border-[#dce2e8] rounded-full p-1 pr-4 w-[110.787px] h-[43.6px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-default mx-auto">
                                <div className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden shrink-0 bg-white shadow-sm">
                                  <AssetIcon symbol={trade.symbol} size={18} />
                                </div>
                                <span className="text-[15px] leading-[19px] font-['Courier_New'] font-bold tracking-wider uppercase ml-0.5 text-[#243041]">
                                  {trade.symbol.replace('.pro', '')}
                                </span>
                              </div>
                            </td>
                            <td className={tableCellPadding + " text-center tabular-nums"}>
                              <div className="flex items-center justify-center gap-1">
                                 <span className={`text-[12px] font-bold tabular-nums ${!isHistoryMode && meta?.direction === 'up' ? 'text-success' : !isHistoryMode && meta?.direction === 'down' ? 'text-danger' : 'text-slate-900'}`}>
                                   {currentLivePrice.toLocaleString(undefined, { 
                                     minimumFractionDigits: trade.symbol.includes('EUR') || trade.symbol.includes('GBP') ? 4 : 2,
                                     maximumFractionDigits: trade.symbol.includes('EUR') || trade.symbol.includes('GBP') ? 4 : 2 
                                   })}
                                 </span>
                              </div>
                            </td>
                            <td className={tableCellPadding + " text-center tabular-nums"}>
                              <EditableNumeric 
                                value={trade.entry || currentLivePrice} 
                                onChange={(val) => handleUpdateTrade(trade.id, { entry: val })}
                                className={`font-bold text-[12px] leading-[18px] text-center transition-colors duration-300 ${!trade.entry ? (meta?.direction === 'up' ? 'text-success' : meta?.direction === 'down' ? 'text-danger' : 'text-slate-500') : 'text-slate-500'}`} 
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
                                className="font-bold text-slate-700 text-[12px] leading-[18px] text-center" 
                                step="0.01"
                              />
                            </td>
                            <td className={tableCellPadding + " text-center tabular-nums"}>
                              <div className="flex justify-center">
                                <EditableNumeric 
                                  value={trade.sl || 0} 
                                  onChange={(val) => handleUpdateTrade(trade.id, { sl: val })}
                                  className="text-danger font-bold text-[12px] leading-[18px] text-center" 
                                  step="0.0001"
                                />
                              </div>
                            </td>
                            <td className={tableCellPadding + " text-center tabular-nums"}>
                              <div className="flex justify-center">
                                <EditableNumeric 
                                  value={trade.tp1 || 0} 
                                  onChange={(val) => handleUpdateTrade(trade.id, { tp1: val })}
                                  className="text-success font-bold text-[12px] leading-[18px] text-center" 
                                  step="0.0001"
                                />
                              </div>
                            </td>
                            <td className={tableCellPadding + " text-center tabular-nums"}>
                              <div className="flex justify-center">
                                <EditableNumeric 
                                  value={trade.dayTarget || 5000} 
                                  onChange={(val) => handleUpdateTrade(trade.id, { dayTarget: val })}
                                  className="text-slate-400 font-bold text-[12px] leading-[18px] text-center" 
                                  step="100"
                                />
                              </div>
                            </td>
                            <td className={tableCellPadding + " text-center tabular-nums"}>
                               <div className={`inline-flex items-center justify-center px-2 py-1 rounded-md border tabular-nums font-bold min-w-[100px] ${isProfitable ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                                 {isProfitable ? '+' : '-'}${Math.abs(dynamicPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               </div>
                            </td>
                            <td className={tableCellPadding + " text-center tabular-nums"}>
                              <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md border tabular-nums font-bold w-[60px] mx-auto ${dynamicGrowth >= 0 ? 'bg-success/20 border-success/30 text-success' : 'bg-danger/20 border-danger/30 text-danger'}`}>
                                 <span className="text-[12px] leading-[18px]">{isProfitable ? '+' : ''}{dynamicGrowth.toFixed(2)}%</span>
                              </div>
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              <div className="flex flex-col items-center gap-0.5 w-full max-w-[90px] mx-auto">
                                <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-1000 ${isProfitable ? 'bg-success' : 'bg-danger'}`} style={{ width: `${progressValue}%` }} />
                                </div>
                                <span className="text-[11px] text-slate-400 uppercase font-black text-center">{progressValue.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              <EditableText 
                                value={trade.traderName} 
                                onChange={(val) => handleUpdateTrade(trade.id, { traderName: val })}
                                className="text-slate-700 font-bold text-[10px] uppercase truncate text-center" 
                              />
                            </td>
                            <td className={tableCellPadding + " text-center"}>
                              {!isHistoryMode && (
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => handleOpenEditModal(trade)} className="size-5 flex items-center justify-center rounded bg-slate-100 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all">
                                    <span className="material-symbols-outlined text-[12px]">mode_edit</span>
                                  </button>
                                  <button onClick={() => handleCloseTrade(trade.id)} className="size-5 flex items-center justify-center rounded bg-slate-100 text-slate-400 hover:text-danger hover:bg-danger/10 transition-all">
                                    <span className="material-symbols-outlined text-[12px]">cancel</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="shrink-0 h-9 bg-white border-t border-slate-200 overflow-hidden flex items-center relative z-20">
        <div className="hidden sm:flex px-6 border-r border-slate-200 h-full items-center bg-slate-50 z-10 shrink-0">
           <span className="text-[9px] font-black text-primary uppercase tracking-widest whitespace-nowrap">MARKET INTELLIGENCE WIRE</span>
        </div>
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className="animate-ticker flex items-center gap-16 text-[10px] font-bold uppercase tracking-widest text-slate-400 pr-16 hover:[animation-play-state:paused]" style={{ animationDuration: `${localNewsSpeed}s` }}>
               {doubledNews.length > 0 ? (
                 doubledNews.map((item, idx) => (
                   <div 
                     key={idx} 
                     className="flex items-center gap-3 whitespace-nowrap cursor-pointer hover:opacity-80"
                     onClick={() => {
                       setEditingNewsItem(item);
                       setShowAddNews(true);
                     }}
                   >
                     <span className="text-primary font-black uppercase">{item.source}:</span>
                     <span className="text-slate-800">{item.title}</span>
                     <span className="text-slate-300 font-black opacity-20 px-2">//</span>
                   </div>
                 ))
               ) : (
                 <div className="flex items-center gap-3">
                   <span className="text-primary">SYNCING...</span>
                 </div>
               )}
          </div>
        </div>
        <div className="hidden sm:flex px-4 items-center gap-2 border-l border-slate-200 z-10 bg-white h-full shrink-0">
          <button onClick={() => {
            setEditingNewsItem(null);
            setShowAddNews(true);
          }} className="text-slate-400 hover:text-primary flex items-center mr-2" title="Add News Manually">
            <span className="material-symbols-outlined text-[14px]">add_circle</span>
          </button>
          <span className="text-[8px] font-black text-slate-400 uppercase">Speed</span>
          <button onClick={() => setLocalNewsSpeed(s => Math.max(10, s - 5))} className="text-slate-400 hover:text-primary flex items-center"><span className="material-symbols-outlined text-[14px]">remove</span></button>
          <span className="text-[9px] font-black text-slate-500 w-4 text-center">{localNewsSpeed}</span>
          <button onClick={() => setLocalNewsSpeed(s => s + 5)} className="text-slate-400 hover:text-primary flex items-center"><span className="material-symbols-outlined text-[14px]">add</span></button>
        </div>
      </footer>

      {(isAddingTrade || editingTrade) && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-[700px] glass-panel rounded-[2.5rem] border border-slate-200 shadow-2xl bg-white">
            <header className="px-10 py-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-[2.5rem]">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {editingTrade ? 'Modify Deployment' : 'Cluster Order Deployment'}
                </h2>
              </div>
              <button onClick={() => { setIsAddingTrade(false); setEditingTrade(null); }} className="size-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:text-slate-900 transition-all border border-slate-300">
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>
            <form onSubmit={handleAddTradeSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Token</label>
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
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 focus:border-primary outline-none"
                  >
                    {MARKET_ASSETS.map(asset => <option key={asset.id} value={asset.id} className="bg-white">{asset.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bias Direction</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button type="button" onClick={() => setNewTrade({...newTrade, direction: TradeDirection.BUY})} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${newTrade.direction === TradeDirection.BUY ? 'bg-success text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>Buy</button>
                    <button type="button" onClick={() => setNewTrade({...newTrade, direction: TradeDirection.SELL})} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${newTrade.direction === TradeDirection.SELL ? 'bg-danger text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>Sell</button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Entry Price</label>
                  <input type="number" step="any" value={newTrade.entry} onChange={e => setNewTrade({...newTrade, entry: Number(e.target.value)})} className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 focus:border-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lot Size</label>
                  <input type="number" step="0.01" value={newTrade.lotSize} onChange={e => setNewTrade({...newTrade, lotSize: Number(e.target.value)})} className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 focus:border-primary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Stop Loss</label>
                  <input type="number" step="any" value={newTrade.sl} onChange={e => setNewTrade({...newTrade, sl: Number(e.target.value)})} className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 focus:border-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Take Profit</label>
                  <input type="number" step="any" value={newTrade.tp1} onChange={e => setNewTrade({...newTrade, tp1: Number(e.target.value)})} className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 focus:border-primary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Target</label>
                  <input type="number" value={newTrade.dayTarget} onChange={e => setNewTrade({...newTrade, dayTarget: Number(e.target.value)})} className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 focus:border-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Trader Name</label>
                  {!isAddingNewTrader ? (
                    <TraderDropdown
                      traders={tradersList}
                      selectedTrader={newTrade.traderName || ''}
                      theme={settings.theme}
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
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 text-sm font-mono text-slate-900 focus:border-primary outline-none"
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
                        className="px-3 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!editingTrade && (
                <div className="flex items-center gap-3 p-4 bg-slate-100 border border-slate-200 rounded-xl">
                  <input 
                    type="checkbox" 
                    id="executeOnMT5" 
                    checked={executeOnMT5} 
                    onChange={(e) => setExecuteOnMT5(e.target.checked)}
                    className="size-4 rounded border-slate-300 bg-white accent-primary cursor-pointer" 
                  />
                  <label htmlFor="executeOnMT5" className="text-[10px] font-black text-slate-700 uppercase tracking-widest cursor-pointer flex-1">
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

      {showAddNews && (
        <AddNewsModal 
          onClose={() => {
            setShowAddNews(false);
            setEditingNewsItem(null);
          }} 
          onAdd={(newItem) => setNews(prev => [newItem, ...prev])} 
          onEdit={(updatedItem) => setNews(prev => prev.map(n => n.id === updatedItem.id ? updatedItem : n))}
          initialData={editingNewsItem}
        />
      )}
      {showSettings && (
        <ControlPanel 
          onClose={() => setShowSettings(false)} 
          settings={settings}
          updateSettings={updateSettings}
        />
      )}
    </div>
  );
};

export default TradersLite;
