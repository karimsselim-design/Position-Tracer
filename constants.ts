import { Trade, TradeDirection, Account, EconomicEvent, TerminalSettings } from './types';

export interface MarketAsset {
  id: string;
  name: string;
  category: 'FOREX' | 'CRYPTO' | 'COMMODITIES' | 'INDICES';
  description: string;
}

export const MARKET_ASSETS: MarketAsset[] = [
  // Forex Majors
  { id: 'EURUSD.pro', name: 'EUR/USD', category: 'FOREX', description: 'Euro / US Dollar' },
  { id: 'GBPUSD.pro', name: 'GBP/USD', category: 'FOREX', description: 'British Pound / US Dollar' },
  { id: 'USDJPY.pro', name: 'USD/JPY', category: 'FOREX', description: 'US Dollar / Japanese Yen' },
  { id: 'AUDUSD.pro', name: 'AUD/USD', category: 'FOREX', description: 'Australian Dollar / US Dollar' },
  { id: 'USDCAD.pro', name: 'USD/CAD', category: 'FOREX', description: 'US Dollar / Canadian Dollar' },
  { id: 'USDCHF.pro', name: 'USD/CHF', category: 'FOREX', description: 'US Dollar / Swiss Franc' },
  { id: 'NZDUSD.pro', name: 'NZD/USD', category: 'FOREX', description: 'New Zealand Dollar / US Dollar' },
  
  // Forex Minors & Crosses
  { id: 'EURGBP.pro', name: 'EUR/GBP', category: 'FOREX', description: 'Euro / British Pound' },
  { id: 'EURJPY.pro', name: 'EUR/JPY', category: 'FOREX', description: 'Euro / Japanese Yen' },
  { id: 'GBPJPY.pro', name: 'GBP/JPY', category: 'FOREX', description: 'British Pound / Japanese Yen' },
  { id: 'EURCHF.pro', name: 'EUR/CHF', category: 'FOREX', description: 'Euro / Swiss Franc' },
  { id: 'EURAUD.pro', name: 'EUR/AUD', category: 'FOREX', description: 'Euro / Australian Dollar' },
  { id: 'GBPAUD.pro', name: 'GBP/AUD', category: 'FOREX', description: 'British Pound / Australian Dollar' },
  { id: 'CADJPY.pro', name: 'CAD/JPY', category: 'FOREX', description: 'Canadian Dollar / Japanese Yen' },

  // Crypto - Main Cluster
  { id: 'BTCUSD.pro', name: 'BTC/USD', category: 'CRYPTO', description: 'Bitcoin / US Dollar' },
  { id: 'ETHUSD.pro', name: 'ETH/USD', category: 'CRYPTO', description: 'Ethereum / US Dollar' },
  { id: 'SOLUSD.pro', name: 'SOL/USD', category: 'CRYPTO', description: 'Solana / US Dollar' },
  { id: 'XRPUSD.pro', name: 'XRP/USD', category: 'CRYPTO', description: 'Ripple / US Dollar' },
  { id: 'ADAUSD.pro', name: 'ADA/USD', category: 'CRYPTO', description: 'Cardano / US Dollar' },
  { id: 'DOGEUSD.pro', name: 'DOGE/USD', category: 'CRYPTO', description: 'Dogecoin / US Dollar' },
  { id: 'DOTUSD.pro', name: 'DOT/USD', category: 'CRYPTO', description: 'Polkadot / US Dollar' },
  { id: 'LINKUSD.pro', name: 'LINK/USD', category: 'CRYPTO', description: 'Chainlink / US Dollar' },
  { id: 'LTCUSD.pro', name: 'LTC/USD', category: 'CRYPTO', description: 'Litecoin / US Dollar' },
  { id: 'AVAXUSD.pro', name: 'AVAX/USD', category: 'CRYPTO', description: 'Avalanche / US Dollar' },
  
  // Commodities - Metals & Energy
  { id: 'XAUUSD.pro', name: 'XAU/USD', category: 'COMMODITIES', description: 'Gold / US Dollar' },
  { id: 'XAGUSD.pro', name: 'XAG/USD', category: 'COMMODITIES', description: 'Silver / US Dollar' },
  { id: 'WTI.pro', name: 'WTI Oil', category: 'COMMODITIES', description: 'US Crude Oil' },
  { id: 'BRENT.pro', name: 'Brent Oil', category: 'COMMODITIES', description: 'UK Brent Oil' },
  { id: 'SPX500.pro', name: 'S&P 500', category: 'INDICES', description: 'US 500 Stock Index' },
  { id: 'NAS100.pro', name: 'Nasdaq 100', category: 'INDICES', description: 'US Tech 100 Index' },
  { id: 'US30.pro', name: 'US30', category: 'INDICES', description: 'Dow Jones Industrial Average' },
];

export const MOCK_TRADES: Trade[] = [
  // High-Priority Gold Position at First Row
  {
    id: '#TR-77712',
    accountId: 'LIVE-ALPHA-01',
    symbol: 'XAUUSD.pro',
    livePrice: 2682.40,
    entry: 2665.20,
    timeOpen: '2024-05-12 09:15:00',
    direction: TradeDirection.BUY,
    lotSize: 10.0,
    sl: 2650.00,
    tp1: 2700.00,
    tp2: 2720.00,
    tp3: 2750.00,
    pnlUsd: 17200.00,
    growthPct: 0.65,
    status: 'ACTIVE',
    dayTarget: 15000,
    traderName: 'Karam',
    traderCompanyId: 'WRC-LDN-01',
  },
  // Subsequent Automated Trades
  ...MARKET_ASSETS.slice(0, 15).map((asset, i) => {
    let price = 1.0;
    if (asset.id.includes('BTC')) price = 96500;
    else if (asset.id.includes('ETH')) price = 3450;
    else if (asset.id.includes('XAU')) price = 2682;
    else if (asset.id.includes('EUR')) price = 1.054;
    else if (asset.id.includes('NAS')) price = 21120;
    else if (asset.id.includes('US30')) price = 39450;
    
    return {
      id: `#TR-${88120 + i}`,
      accountId: `LIVE-ALPHA-0${(i % 5) + 1}`,
      symbol: asset.id,
      livePrice: price,
      entry: price * 0.995,
      timeOpen: '2024-05-12 14:02:11',
      direction: i % 2 === 0 ? TradeDirection.BUY : TradeDirection.SELL,
      lotSize: asset.category === 'CRYPTO' ? 0.5 : 2.50,
      sl: price * 0.98,
      tp1: price * 1.02,
      tp2: price * 1.03,
      tp3: price * 1.05,
      pnlUsd: (Math.random() * 5000) - 1000,
      growthPct: (Math.random() * 3),
      status: 'ACTIVE' as const,
      dayTarget: 5000,
      traderName: ['Karam', 'Abdullah', 'Mohamed', 'Hagar', 'Hanan'][i % 5],
      traderCompanyId: 'WRC-LDN-01',
    };
  })
];

export const MOCK_ACCOUNTS: Account[] = [
  { id: '1000492', name: 'LIVE-ALPHA-01', balance: 500000, equity: 508420.21, margin: 12400, freeMargin: 496020.21, profit: 8420.21, status: 'CONNECTED' },
  { id: '1000882', name: 'LIVE-BETA-02', balance: 250000, equity: 254110.00, margin: 8500, freeMargin: 245610, profit: 4110, status: 'CONNECTED' },
  { id: '2000155', name: 'LIVE-PRO-05', balance: 250000, equity: 256450.00, margin: 10200, freeMargin: 246250, profit: 6450, status: 'CONNECTED' },
];

export const ECONOMIC_EVENTS: EconomicEvent[] = [
  { id: '1', time: '08:30 EST', currency: 'USD', impact: 'HIGH', event: 'Core CPI m/m', actual: '0.4%', forecast: '0.3%', previous: '0.3%' },
  { id: '2', time: '08:30 EST', currency: 'USD', impact: 'HIGH', event: 'CPI y/y', actual: '3.2%', forecast: '3.1%', previous: '3.1%' },
  { id: '3', time: '10:00 EST', currency: 'CAD', impact: 'MEDIUM', event: 'BoC Rate Statement', actual: '5.00%', forecast: '5.00%', previous: '5.00%' },
  { id: '4', time: '11:00 CET', currency: 'EUR', impact: 'MEDIUM', event: 'ECB President Lagarde Speaks', actual: '-', forecast: 'N/A', previous: 'N/A' },
  { id: '5', time: '14:00 EST', currency: 'USD', impact: 'HIGH', event: 'FOMC Meeting Minutes', actual: '-', forecast: 'N/A', previous: 'N/A' },
  { id: '11', time: '21:15 CNY', currency: 'CNY', impact: 'HIGH', event: 'PBoC Loan Prime Rate', actual: '3.45%', forecast: '3.45%', previous: '3.45%' },
];

export const WATCHLIST = [
  { symbol: 'EURUSD', price: '1.0542', change: '-0.12%', isUp: false },
  { symbol: 'XAUUSD', price: '2,682.40', change: '+0.82%', isUp: true },
  { symbol: 'BTCUSD', price: '96,421.10', change: '+2.15%', isUp: true },
  { symbol: 'USDJPY', price: '154.42', change: '-0.31%', isUp: false },
];

export const DEFAULT_SETTINGS: TerminalSettings = {
  theme: 'dark',
  layoutDensity: 'standard',
  animationsEnabled: true,
  priceTickerSpeed: 35,
  intelligenceStreamSpeed: 85,
  chartRefreshRate: 10,
  aiThinkingBudget: 32768,
  voiceName: 'ZEPHYR',
  notifications: {
    volatilityAlerts: true,
    volatilityAlertSound: 'default',
    newsAlerts: true,
    newsAlertSound: 'default',
    executionFeedback: false,
    executionFeedbackSound: 'default',
  },
  audioFeedback: true,
  autoSaveEnabled: true,
};