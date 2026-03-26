import React from 'react';

interface AssetIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

const AssetIcon: React.FC<AssetIconProps> = ({ symbol, size = 20, className = "" }) => {
  const cleanSymbol = symbol.split('.')[0].replace('/', '').toUpperCase();
  
  // Expanded recognition list for high-fidelity crypto icons
  const cryptoSymbols = [
    'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LINK', 'LTC', 'AVAX', 'TRX',
    'PEPE', 'SHIB', 'TON', 'NEAR', 'UNI', 'BCH', 'ATOM', 'XMR', 'XLM', 'ETC', 'HBAR', 'FIL',
    'APT', 'INJ', 'OP', 'ARB', 'RNDR', 'KAS', 'FTM', 'SUI', 'TIA', 'SEI', 'BONK', 'WIF',
    'FLOKI', 'JASMY', 'FET', 'GRT', 'MKR', 'LDO', 'ICP', 'STX', 'IMX', 'VET', 'THETA', 'BEAM'
  ];
  
  const isCrypto = cryptoSymbols.some(s => cleanSymbol.includes(s));
  const isForex = cleanSymbol.length === 6 && !isCrypto;

  // Crypto Icon URL (High quality color icons)
  const cryptoIconUrl = (sym: string) => `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${sym.toLowerCase()}.png`;
  
  // Forex Flag URL (Country flags)
  const getFlagUrl = (currency: string) => {
    const map: Record<string, string> = {
      'USD': 'us', 'EUR': 'eu', 'GBP': 'gb', 'JPY': 'jp', 'AUD': 'au', 
      'CAD': 'ca', 'CHF': 'ch', 'NZD': 'nz', 'CNY': 'cn', 'AED': 'ae'
    };
    return `https://flagcdn.com/w80/${map[currency] || 'un'}.png`;
  };

  const isGold = cleanSymbol.includes('XAU') || cleanSymbol.includes('GOLD');

  if (isGold) {
    return (
      <div className={`flex items-center justify-center overflow-hidden ${className}`} style={{ width: size, height: size }}>
        <img 
          src="https://img.icons8.com/color/96/gold-bars.png" 
          alt="Gold"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (isCrypto) {
    const cryptoSym = cryptoSymbols.find(s => cleanSymbol.includes(s)) || 'BTC';
    return (
      <div className={`relative flex items-center justify-center rounded-full overflow-hidden bg-white/5 border border-white/10 ${className}`} style={{ width: size, height: size }}>
        <img 
          src={cryptoIconUrl(cryptoSym)} 
          alt={symbol}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  if (isForex) {
    const base = cleanSymbol.substring(0, 3);
    const quote = cleanSymbol.substring(3, 6);
    return (
      <div className={`relative flex items-center ${className}`} style={{ width: size * 1.6, height: size }}>
        <img src={getFlagUrl(base)} alt={base} className="absolute left-0 top-0 rounded-sm border border-black/20" style={{ width: size, height: size * 0.7, zIndex: 2 }} />
        <img src={getFlagUrl(quote)} alt={quote} className="absolute right-0 bottom-0 rounded-sm border border-black/20" style={{ width: size, height: size * 0.7, zIndex: 1 }} />
      </div>
    );
  }

  // Commodities & Indices Expanded Mapping
  const getIconName = () => {
    if (cleanSymbol.includes('XAU') || cleanSymbol.includes('GOLD')) return 'monetization_on';
    if (cleanSymbol.includes('XAG') || cleanSymbol.includes('SILVER')) return 'blur_on';
    if (cleanSymbol.includes('SPX') || cleanSymbol.includes('NDX') || cleanSymbol.includes('NAS')) return 'leaderboard';
    if (cleanSymbol.includes('OIL') || cleanSymbol.includes('WTI') || cleanSymbol.includes('BRENT')) return 'oil_barrel';
    if (cleanSymbol.includes('NG') || cleanSymbol.includes('GAS')) return 'mode_fan';
    if (cleanSymbol.includes('XPT') || cleanSymbol.includes('XPD')) return 'brightness_7';
    if (cleanSymbol.includes('KC') || cleanSymbol.includes('COFFEE')) return 'coffee';
    if (cleanSymbol.includes('SB') || cleanSymbol.includes('SUGAR')) return 'icecream';
    if (cleanSymbol.includes('CC') || cleanSymbol.includes('COCOA')) return 'bakery_dining';
    if (cleanSymbol.includes('CT') || cleanSymbol.includes('COTTON')) return 'checkroom';
    if (cleanSymbol.includes('ZC') || cleanSymbol.includes('ZW') || cleanSymbol.includes('ZS')) return 'grass';
    return 'token';
  };

  return (
    <div className={`flex items-center justify-center rounded-sm border bg-primary/10 text-primary border-primary/20 ${className}`} style={{ width: size, height: size }}>
      <span className="material-symbols-outlined" style={{ fontSize: size * 0.7 }}>{getIconName()}</span>
    </div>
  );
};

export default AssetIcon;