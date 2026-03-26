import axios from 'axios';

export interface MT5Account {
  id: string;
  name: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  status: string;
  platform: string;
}

export interface MT5Position {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  profit: number;
  time: string;
}

export async function fetchMT5AccountData(): Promise<MT5Account> {
  try {
    const response = await axios.get('/api/mt5/account');
    return response.data;
  } catch (error) {
    console.error("Error fetching MT5 account data:", error);
    throw error;
  }
}

export async function fetchMT5Positions(): Promise<MT5Position[]> {
  try {
    const response = await axios.get('/api/mt5/positions');
    return response.data;
  } catch (error) {
    console.error("Error fetching MT5 positions:", error);
    throw error;
  }
}

export async function executeMT5Trade(tradeParams: {
  symbol: string;
  action: 'BUY' | 'SELL';
  volume: number;
  price: number;
  sl?: number;
  tp?: number;
}): Promise<any> {
  try {
    const response = await axios.post('/api/mt5/trade', tradeParams);
    return response.data;
  } catch (error) {
    console.error("Error executing MT5 trade:", error);
    throw error;
  }
}
