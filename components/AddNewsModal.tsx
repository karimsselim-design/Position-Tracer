import React, { useState, useEffect } from 'react';
import { NewsItem } from '../services/newsService';

interface AddNewsModalProps {
  onClose: () => void;
  onAdd: (item: NewsItem) => void;
  onEdit?: (item: NewsItem) => void;
  initialData?: NewsItem | null;
}

const AddNewsModal: React.FC<AddNewsModalProps> = ({ onClose, onAdd, onEdit, initialData }) => {
  const [source, setSource] = useState(initialData?.source || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [url, setUrl] = useState(initialData?.url || '');

  useEffect(() => {
    if (initialData) {
      setSource(initialData.source);
      setTitle(initialData.title);
      setUrl(initialData.url);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !title) return;

    if (initialData && onEdit) {
      onEdit({
        ...initialData,
        title,
        source,
        url: url || '#'
      });
    } else {
      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        title,
        source,
        url: url || '#',
        time: new Date().toISOString(),
        impact: 'HIGH'
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#0d1117] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{initialData ? 'Edit News Item' : 'Add News Item'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source</label>
            <input 
              type="text" 
              value={source} 
              onChange={e => setSource(e.target.value)}
              placeholder="e.g., REUTERS, BLOOMBERG"
              className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm font-medium outline-none focus:border-primary transition-colors text-slate-900 dark:text-white uppercase"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Headline</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter news headline..."
              className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm font-medium outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">URL (Optional)</label>
            <input 
              type="url" 
              value={url} 
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm font-medium outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-primary text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              {initialData ? 'Update Stream' : 'Add to Stream'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewsModal;
