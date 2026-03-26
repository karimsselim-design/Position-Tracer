
export enum MarketStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  LOCKED = 'LOCKED'
}

export enum TradeDirection {
  BUY = 'BUY',
  SELL = 'SELL'
}

export interface Trade {
  id: string;
  accountId: string;
  symbol: string;
  livePrice: number;
  entry: number;
  timeOpen: string;
  timeClosed?: string; // Added for history
  direction: TradeDirection;
  lotSize: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  pnlUsd: number;
  growthPct: number;
  status: 'ACTIVE' | 'PENDING' | 'CLOSED'; // Added CLOSED
  dayTarget: number;
  traderName: string;
  traderCompanyId: string;
  tickDirection?: 'up' | 'down' | 'none';
}

export interface Goal {
  id: string;
  symbol: string;
  target: number;
  margin: number;
  lot: number;
  entry: number;
  trader: string;
  type: 'BUY' | 'SELL' | null;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  profit: number;
  status: 'CONNECTED' | 'IDLE' | 'DISCONNECTED';
  lastUpdated?: number;
}

export interface TerminalSettings {
  theme: 'dark' | 'light';
  layoutDensity: 'compact' | 'standard' | 'relaxed';
  animationsEnabled: boolean;
  priceTickerSpeed: number;
  intelligenceStreamSpeed: number;
  chartRefreshRate: number;
  aiThinkingBudget: number;
  voiceName: 'ZEPHYR' | 'KORE' | 'PUCK' | 'CHARON';
  notifications: {
    volatilityAlerts: boolean;
    volatilityAlertSound: string;
    newsAlerts: boolean;
    newsAlertSound: string;
    executionFeedback: boolean;
    executionFeedbackSound: string;
  };
  audioFeedback: boolean;
  autoSaveEnabled: boolean;
}

export interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  event: string;
  actual?: string;
  forecast: string;
  previous: string;
}