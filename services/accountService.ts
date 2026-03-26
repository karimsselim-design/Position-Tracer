import { Account } from '../types';
import { MOCK_ACCOUNTS } from '../constants';

/**
 * Institutional Account Service
 * Simulates real-time synchronization with a broker backend.
 */

export interface AccountSyncResponse {
  accounts: Account[];
  timestamp: number;
  serverNode: string;
}

// Internal state to simulate server-side persistence
let serverAccounts: Account[] = [...MOCK_ACCOUNTS];

export async function fetchLiveAccountData(): Promise<AccountSyncResponse> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 600));

  // Simulate minor fluctuations in cash balance or interest (simulating rollover/dividends)
  serverAccounts = serverAccounts.map(acc => ({
    ...acc,
    balance: acc.balance + (Math.random() - 0.45) * 0.05, // Slight positive drift
    status: Math.random() > 0.98 ? 'IDLE' : 'CONNECTED', // Occasional connection blips
  }));

  return {
    accounts: JSON.parse(JSON.stringify(serverAccounts)),
    timestamp: Date.now(),
    serverNode: `WR-NODE-0${Math.floor(Math.random() * 9) + 1}`
  };
}

/**
 * Simulates a WebSocket subscription for high-frequency account updates.
 * In a real app, this would use the browser's WebSocket API.
 */
export function subscribeToAccountPulse(callback: (data: Partial<Account>[]) => void) {
  const interval = setInterval(() => {
    const updates = serverAccounts.map(acc => ({
      id: acc.id,
      margin: acc.margin + (Math.random() - 0.5) * 2, // Jittering margin reqs
    }));
    callback(updates);
  }, 2000);

  return () => clearInterval(interval);
}
