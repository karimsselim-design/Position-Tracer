import React, { useState, useRef, useEffect } from 'react';

interface TraderDropdownProps {
  traders: string[];
  selectedTrader: string;
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
  onAddNew: () => void;
  theme?: 'light' | 'dark';
}

const TraderDropdown: React.FC<TraderDropdownProps> = ({ 
  traders, 
  selectedTrader, 
  onSelect, 
  onDelete, 
  onAddNew,
  theme = 'light'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl py-2 px-4 text-sm font-mono transition-all outline-none border ${
          theme === 'dark' 
            ? 'bg-black/60 border-white/10 text-white focus:border-primary' 
            : 'bg-slate-100 border-slate-200 text-slate-900 focus:border-primary'
        }`}
      >
        <span>{selectedTrader || 'Select Trader'}</span>
        <span className={`material-symbols-outlined transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-2 w-full rounded-xl shadow-xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${
          theme === 'dark'
            ? 'bg-slate-900 border-white/10'
            : 'bg-white border-slate-200'
        }`}>
          <div className="max-h-60 overflow-y-auto py-1">
            {traders.map((name) => (
              <div
                key={name}
                className={`group flex items-center justify-between px-4 py-2 text-sm font-mono cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-white/5 text-slate-300'
                    : 'hover:bg-slate-50 text-slate-700'
                } ${selectedTrader === name ? (theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary') : ''}`}
                onClick={() => {
                  onSelect(name);
                  setIsOpen(false);
                }}
              >
                <span className="truncate">{name}</span>
                {traders.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(name);
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ${
                      theme === 'dark'
                        ? 'hover:bg-danger/20 text-danger/60 hover:text-danger'
                        : 'hover:bg-danger/10 text-danger/60 hover:text-danger'
                    }`}
                    title="Remove Trader"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={`w-full flex items-center px-4 py-3 text-sm font-mono cursor-pointer border-t transition-colors ${
                theme === 'dark'
                  ? 'border-white/5 hover:bg-white/10 text-primary'
                  : 'border-slate-100 hover:bg-slate-50 text-primary'
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddNew();
                setIsOpen(false);
              }}
            >
              <span className="material-symbols-outlined text-[18px] mr-2">add_circle</span>
              <span className="font-bold">Add New Trader...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TraderDropdown;
