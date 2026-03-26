import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for the MT5 Bridge
let mt5AccountData: any = null;
let mt5Positions: any[] = [];
let pendingTrades: any[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "MT5 Bridge" });
  });

  // ==========================================
  // FRONTEND ENDPOINTS (Called by React App)
  // ==========================================
  
  app.get("/api/mt5/account", (req, res) => {
    if (!mt5AccountData) {
      return res.json({ 
        id: "MT5-PENDING",
        name: "Waiting for MT5 EA...",
        balance: 0,
        equity: 0,
        margin: 0,
        freeMargin: 0,
        status: "DISCONNECTED",
        platform: "MetaTrader 5"
      });
    }
    res.json(mt5AccountData);
  });

  app.get("/api/mt5/positions", (req, res) => {
    res.json(mt5Positions);
  });

  // Market Data Proxy (Yahoo Finance)
  app.get("/api/market/price", async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: "Symbol required" });

    const yahooMapping: Record<string, string> = {
      'US30': '^DJI',
      'SPX500': '^GSPC',
      'NAS100': '^NDX',
      'GER40': '^GDAXI',
      'UK100': '^FTSE',
      'XAUUSD': 'GC=F',
      'XAGUSD': 'SI=F',
      'WTI': 'CL=F',
      'EURUSD': 'EURUSD=X',
      'GBPUSD': 'GBPUSD=X',
      'USDJPY': 'JPY=X',
      'AUDUSD': 'AUDUSD=X',
      'USDCAD': 'CAD=X',
      'GBPJPY': 'GBPJPY=X',
      'EURJPY': 'EURJPY=X'
    };

    const yahooSym = yahooMapping[symbol as string] || symbol as string;
    
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?interval=1m&range=1d`);
      if (response.ok) {
        const data: any = await response.json();
        const result = data.chart.result[0];
        const price = result.meta.regularMarketPrice;
        const prevClose = result.meta.previousClose;
        const changePercent = ((price - prevClose) / prevClose) * 100;

        return res.json({
          symbol,
          price,
          changePercent: changePercent.toFixed(2),
          timestamp: Date.now()
        });
      }
      res.status(500).json({ error: "Yahoo Finance API error" });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  app.post("/api/mt5/trade", (req, res) => {
    const { symbol, action, volume, price, sl, tp } = req.body;
    
    const tradeId = `ORD-${Date.now()}`;
    const newTrade = {
      id: tradeId,
      symbol,
      action,
      volume,
      price,
      sl,
      tp,
      status: "PENDING",
      timestamp: Date.now()
    };
    
    pendingTrades.push(newTrade);
    console.log(`Queued trade for MT5: ${action} ${volume} ${symbol}`);
    
    res.json({
      success: true,
      orderId: tradeId,
      message: "Trade queued for MT5 execution"
    });
  });

  // ==========================================
  // EA ENDPOINTS (Called by MT5 Expert Advisor)
  // ==========================================

  // The EA polls this endpoint every second
  app.post("/api/mt5/sync", (req, res) => {
    const { account, positions } = req.body;
    
    if (account) mt5AccountData = account;
    if (positions) mt5Positions = positions;

    // Send pending trades back to the EA to execute
    const tradesToExecute = [...pendingTrades];
    pendingTrades = []; // Clear the queue

    res.json({
      success: true,
      pendingTrades: tradesToExecute
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    
    // SPA Fallback
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
