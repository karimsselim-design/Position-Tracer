import React, { useState } from 'react';

interface ContactModalProps {
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setTimeout(() => {
      setStatus('success');
    }, 1500);
  };

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 dark:bg-black/80 backdrop-blur-md p-6">
        <div className="glass-panel max-w-md w-full p-8 rounded-3xl text-center border-t-4 border-t-success bg-white dark:bg-[#0d1117] shadow-2xl">
          <span className="material-symbols-outlined text-success text-5xl mb-4">check_circle</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 uppercase">Message Transmitted</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 font-medium">Your request has been routed to our global desk. An analyst will contact you shortly.</p>
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 dark:bg-black/80 backdrop-blur-md p-6">
      <div className="glass-panel max-w-lg w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl bg-white dark:bg-[#0d1117]">
        <header className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Direct Desk Line</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Priority Support Request</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
              <input required className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-4 text-xs font-mono focus:border-primary outline-none transition-all text-slate-900 dark:text-white" placeholder="Enter name..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Desk Extension</label>
              <input required className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-4 text-xs font-mono focus:border-primary outline-none transition-all text-slate-900 dark:text-white" placeholder="+44 20..." />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inquiry Type</label>
            <select className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-4 text-xs font-mono focus:border-primary outline-none transition-all appearance-none cursor-pointer text-slate-900 dark:text-white">
              <option className="bg-white dark:bg-slate-900">Trading Execution Issue</option>
              <option className="bg-white dark:bg-slate-900">Account Funding / Liquidity</option>
              <option className="bg-white dark:bg-slate-900">Technical Terminal Support</option>
              <option className="bg-white dark:bg-slate-900">Institutional Onboarding</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Message Payload</label>
            <textarea required rows={4} className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg py-3 px-4 text-xs font-mono focus:border-primary outline-none transition-all resize-none text-slate-900 dark:text-white" placeholder="Describe your request in detail..."></textarea>
          </div>
          
          <button 
            type="submit"
            disabled={status === 'sending'}
            className="w-full bg-primary hover:brightness-110 text-white font-black py-4 rounded-xl text-xs uppercase tracking-[0.3em] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
          >
            {status === 'sending' ? (
              <span className="material-symbols-outlined animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-lg">send</span>
            )}
            {status === 'sending' ? 'TRANSMITTING...' : 'SEND MESSAGE'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;