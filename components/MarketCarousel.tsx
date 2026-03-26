
import React, { useState, useEffect } from 'react';

const SLIDES = [
  {
    title: 'Gold Breakout Analysis',
    description: 'Technical levels for XAUUSD as it challenges historical resistance.',
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&q=80&w=800&h=450',
    tag: 'COMMODITIES',
    url: 'https://www.tradingview.com/symbols/XAUUSD/'
  },
  {
    title: 'Q2 Macro Outlook',
    description: 'Institutional analysis on global rate cuts and inflationary pressures.',
    image: 'https://images.unsplash.com/photo-1611974717482-48242518993c?auto=format&fit=crop&q=80&w=800&h=450',
    tag: 'ANALYST PICK',
    url: 'https://www.investing.com/economic-calendar/'
  },
  {
    title: 'Crypto Liquidity Update',
    description: 'Monitoring institutional inflows into spot BTC and ETH ETFs.',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=800&h=450',
    tag: 'DIGITAL ASSETS',
    url: 'https://www.tradingview.com/symbols/BTCUSD/'
  }
];

const MarketCarousel: React.FC = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[200px] rounded-2xl overflow-hidden bg-[#0a0c10] border border-white/5 group shadow-2xl">
      {SLIDES.map((slide, index) => (
        <a
          key={index}
          href={slide.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`absolute inset-0 transition-all duration-1000 ease-out block hover:bg-white/[0.02] ${
            index === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          }`}
        >
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 bg-[#0a0c10]">
             <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover opacity-40 mix-blend-luminosity transition-all duration-700 group-hover:scale-105 group-hover:opacity-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
          </div>
          
          {/* Gradients for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c10]/60 to-transparent"></div>

          {/* Content */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="inline-block bg-primary px-2.5 py-1 rounded-[4px] mb-3 shadow-[0_4px_10px_rgba(242,13,13,0.3)]">
              <span className="text-[9px] font-[900] text-white uppercase tracking-[0.15em] leading-none">
                {slide.tag}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-[17px] font-[800] text-white leading-tight tracking-tight uppercase font-display group-hover:text-primary transition-colors">
                {slide.title}
              </h3>
              <span className="material-symbols-outlined text-white/20 text-sm group-hover:text-primary group-hover:translate-x-1 transition-all">north_east</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-[90%]">
              {slide.description}
            </p>
          </div>
        </a>
      ))}
      
      {/* Institutional Indicators (Matching Screenshot) */}
      <div className="absolute bottom-6 right-6 flex items-center gap-1.5 z-10">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrent(index);
            }}
            className={`transition-all duration-300 ${
              index === current 
                ? 'w-4 h-1.5 bg-primary rounded-full' 
                : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40 rounded-full'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default MarketCarousel;
