import React, { useState, useRef } from 'react';
import { TerminalSettings } from '../types';

interface ControlPanelProps {
  onClose: () => void;
  settings: TerminalSettings;
  updateSettings: (updates: Partial<TerminalSettings>) => void;
}

type SettingsTab = 'interface' | 'market_streams' | 'vision_core' | 'alert_logic';

const TabButton = ({ id, activeTab, onSelect, icon, label }: { id: SettingsTab, activeTab: SettingsTab, onSelect: (id: SettingsTab) => void, icon: string, label: string }) => (
  <button 
    onClick={() => onSelect(id)}
    className={`w-full flex items-center gap-4 px-8 py-4 transition-all border-r-4 ${activeTab === id ? 'bg-white/5 border-primary text-white' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}
  >
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
  </button>
);

const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
  <button 
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onToggle();
    }}
    className={`w-11 h-5 rounded-full relative transition-all duration-300 ${active ? 'bg-primary' : 'bg-[#1e2329]'}`}
  >
    <div className={`absolute top-1 size-3 rounded-full bg-white transition-all duration-300 ${active ? 'left-7' : 'left-1'}`}></div>
  </button>
);

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onClose, 
  settings, 
  updateSettings 
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('interface');
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const SOUND_LIBRARY = [
    { id: 'default', label: 'Default Ping' },
    { id: 'sonar', label: 'Deep Sonar' },
    { id: 'digital', label: 'Digital Blip' },
    { id: 'alert', label: 'High Alert' },
    { id: 'chime', label: 'Crystal Chime' },
    { id: 'pulse', label: 'Neural Pulse' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingFor) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateSettings({
          notifications: {
            ...settings.notifications,
            [`${uploadingFor}Sound`]: dataUrl
          }
        });
      };
      reader.readAsDataURL(file);
    }
    setUploadingFor(null);
  };

  const toggleTheme = (mode: 'dark' | 'light') => {
    updateSettings({ theme: mode });
    document.documentElement.classList.toggle('dark', mode === 'dark');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="w-full max-w-[1000px] h-[720px] rounded-[2.5rem] overflow-hidden flex shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 bg-[#0d1117]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <aside className="w-[280px] border-r border-white/5 bg-[#080a0e] flex flex-col">
          <div className="p-10">
            <h1 className="text-[14px] font-black text-white uppercase tracking-[0.3em] mb-1 font-display">Terminal</h1>
            <p className="text-[9px] text-primary font-black uppercase tracking-widest">v4.5.0-STABLE</p>
          </div>
          
          <nav className="flex-1 py-4">
            <TabButton id="interface" activeTab={activeTab} onSelect={setActiveTab} icon="dashboard_customize" label="Interface" />
            <TabButton id="market_streams" activeTab={activeTab} onSelect={setActiveTab} icon="insights" label="Market Streams" />
            <TabButton id="vision_core" activeTab={activeTab} onSelect={setActiveTab} icon="psychology" label="Vision Core" />
            <TabButton id="alert_logic" activeTab={activeTab} onSelect={setActiveTab} icon="notifications" label="Alert Logic" />
          </nav>
          
          <div className="p-10">
            <button 
              onClick={onClose}
              className="w-full py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Close Menu
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col relative bg-[#0d1117]">
          <header className="px-12 py-10 flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight font-display">
                {activeTab.replace('_', ' ')} Preferences
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Configure institutional node parameters</p>
            </div>
            <div className="flex flex-col text-right">
               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Liquidity Cluster</span>
               <span className="text-[11px] font-black text-slate-400 uppercase">WR-NODE-07</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-12 pb-12 no-scrollbar space-y-12">
            {activeTab === 'interface' && (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                <section className="space-y-5">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Visual Atmosphere</h3>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { id: 'dark', label: 'Dark Mood', icon: 'dark_mode' },
                      { id: 'light', label: 'Light Mood', icon: 'light_mode' }
                    ].map((m) => (
                      <button 
                        key={m.id}
                        onClick={() => toggleTheme(m.id as any)}
                        className={`p-8 rounded-2xl border-2 flex items-center gap-5 transition-all group ${settings.theme === m.id ? 'border-primary/50 bg-primary/5 text-white' : 'border-white/5 bg-white/[0.03] text-slate-500 hover:border-white/20'}`}
                      >
                        <span className={`material-symbols-outlined text-2xl ${settings.theme === m.id ? 'text-primary' : 'text-slate-600 group-hover:text-slate-400'}`}>{m.icon}</span>
                        <span className="text-[11px] font-black uppercase tracking-widest">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-5">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Terminal Density</h3>
                  <div className="flex bg-black/40 rounded-2xl border border-white/5 p-1 h-[60px]">
                    {['compact', 'standard', 'relaxed'].map((d) => (
                      <button 
                        key={d}
                        onClick={() => updateSettings({ layoutDensity: d as any })}
                        className={`flex-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${settings.layoutDensity === d ? 'bg-primary text-white shadow-[0_0_20px_rgba(242,13,13,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="flex items-center justify-between p-8 bg-white/[0.03] rounded-2xl border border-white/5">
                  <div className="space-y-1">
                    <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Micro-Animations</h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Enable fluid UI transitions</p>
                  </div>
                  <Toggle active={settings.animationsEnabled} onToggle={() => updateSettings({ animationsEnabled: !settings.animationsEnabled })} />
                </div>
              </div>
            )}

            {activeTab === 'market_streams' && (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                <section className="space-y-8">
                  <div className="space-y-5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Price Feed Velocity</label>
                      <span className="text-[11px] font-mono text-primary font-black uppercase tracking-widest">{settings.priceTickerSpeed}s Cycle</span>
                    </div>
                    <input 
                      type="range" min="10" max="120" step="5"
                      value={settings.priceTickerSpeed}
                      onChange={(e) => updateSettings({ priceTickerSpeed: Number(e.target.value) })}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-primary cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Intelligence Stream Speed</label>
                      <span className="text-[11px] font-mono text-primary font-black uppercase tracking-widest">{settings.intelligenceStreamSpeed || 85}s Cycle</span>
                    </div>
                    <input 
                      type="range" min="30" max="300" step="5"
                      value={settings.intelligenceStreamSpeed || 85}
                      onChange={(e) => updateSettings({ intelligenceStreamSpeed: Number(e.target.value) })}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-primary cursor-pointer"
                    />
                  </div>
                </section>

                <div className="p-8 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-between">
                   <div className="space-y-1">
                     <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Terminal Auto-Save</h4>
                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Persist all trade data to local storage automatically</p>
                   </div>
                   <Toggle active={settings.autoSaveEnabled} onToggle={() => updateSettings({ autoSaveEnabled: !settings.autoSaveEnabled })} />
                </div>

                <section className="space-y-5">
                   <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Chart Synchronization</h3>
                   <div className="grid grid-cols-4 gap-2 bg-black/40 rounded-2xl border border-white/5 p-1 h-[60px]">
                     {[5, 10, 30, 60].map((s) => (
                       <button 
                         key={s}
                         onClick={() => updateSettings({ chartRefreshRate: s })}
                         className={`text-[10px] font-black uppercase rounded-xl transition-all ${settings.chartRefreshRate === s ? 'bg-white/10 text-white border border-white/20' : 'text-slate-600 hover:text-slate-400'}`}
                       >
                         {s}s
                       </button>
                     ))}
                   </div>
                </section>
              </div>
            )}

            {activeTab === 'vision_core' && (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                <section className="space-y-5">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Reasoning Capacity (Thinking)</h3>
                  <div className="bg-white/[0.03] p-8 rounded-2xl border border-white/5 space-y-6">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Higher budget increases AI analysis depth for complex chart patterns but increases response latency.</p>
                    <div className="relative">
                      <select 
                        value={settings.aiThinkingBudget}
                        onChange={(e) => updateSettings({ aiThinkingBudget: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-[11px] font-black text-white uppercase tracking-widest outline-none focus:border-primary appearance-none cursor-pointer"
                      >
                        <option value={0} className="bg-[#0d1117]">Standard Execution (0 Tokens)</option>
                        <option value={8192} className="bg-[#0d1117]">Deep Scan (8,192 Tokens)</option>
                        <option value={16384} className="bg-[#0d1117]">Institutional Pro (16,384 Tokens)</option>
                        <option value={32768} className="bg-[#0d1117]">Maximum Reasoning (32,768 Tokens)</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </section>

                <section className="space-y-5">
                   <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Assistant Personality</h3>
                   <div className="grid grid-cols-2 gap-4">
                      {['ZEPHYR', 'KORE', 'PUCK', 'CHARON'].map((name) => (
                        <button 
                          key={name}
                          onClick={() => updateSettings({ voiceName: name as any })}
                          className={`p-8 rounded-2xl border-2 flex justify-between items-center transition-all ${settings.voiceName === name ? 'border-primary/50 bg-primary/5 text-white' : 'border-white/5 bg-white/[0.03] text-slate-500 hover:border-white/20'}`}
                        >
                           <span className="text-[11px] font-black uppercase tracking-[0.2em]">{name}</span>
                           {settings.voiceName === name && (
                             <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                           )}
                        </button>
                      ))}
                   </div>
                </section>
              </div>
            )}

            {activeTab === 'alert_logic' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="audio/*" 
                   onChange={handleFileUpload}
                 />
                 {[
                   { id: 'volatilityAlerts', label: 'Volatility Threshold Alerts', desc: 'Triggered by rapid price movements' },
                   { id: 'newsAlerts', label: 'High-Impact Economic News', desc: 'Real-time global macro events' },
                   { id: 'executionFeedback', label: 'Order Execution Feedback', desc: 'Confirmation of node transactions' },
                   { id: 'audioFeedback', label: 'Institutional Sound Pack', desc: 'Master toggle for all audio cues' }
                 ].map((item) => (
                   <div key={item.id} className="space-y-4">
                     <div className={`p-8 bg-white/[0.03] rounded-2xl border flex items-center justify-between transition-all ${item.id === 'audioFeedback' ? 'border-primary/20' : 'border-white/5'}`}>
                        <div className="space-y-1">
                          <h4 className={`text-[12px] font-black uppercase tracking-widest ${item.id === 'audioFeedback' ? 'text-primary' : 'text-white'}`}>{item.label}</h4>
                          {item.desc && <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{item.desc}</p>}
                        </div>
                        <Toggle 
                          active={item.id === 'audioFeedback' ? settings.audioFeedback : (settings.notifications as any)[item.id]} 
                          onToggle={() => {
                            if (item.id === 'audioFeedback') {
                              updateSettings({ audioFeedback: !settings.audioFeedback });
                            } else {
                              updateSettings({ notifications: { ...settings.notifications, [item.id]: !(settings.notifications as any)[item.id] } });
                            }
                          }} 
                        />
                     </div>

                     {item.id !== 'audioFeedback' && (settings.notifications as any)[item.id] && (
                       <div className="px-8 py-6 bg-black/40 rounded-2xl border border-white/5 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                         <div className="flex items-center justify-between">
                            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Notification Sound</h5>
                            <button 
                              onClick={() => {
                                setUploadingFor(item.id.replace('Alerts', ''));
                                fileInputRef.current?.click();
                              }}
                              className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">upload_file</span>
                              Upload Custom
                            </button>
                         </div>
                         
                         <div className="grid grid-cols-3 gap-2">
                           {SOUND_LIBRARY.map((sound) => {
                             const currentSound = (settings.notifications as any)[`${item.id.replace('Alerts', '')}Sound`];
                             const isSelected = currentSound === sound.id;
                             return (
                               <button 
                                 key={sound.id}
                                 onClick={() => updateSettings({
                                   notifications: {
                                     ...settings.notifications,
                                     [`${item.id.replace('Alerts', '')}Sound`]: sound.id
                                   }
                                 })}
                                 className={`py-3 px-4 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}
                               >
                                 {sound.label}
                               </button>
                             );
                           })}
                           {/* Show custom sound indicator if active */}
                           {(() => {
                             const currentSound = (settings.notifications as any)[`${item.id.replace('Alerts', '')}Sound`];
                             const isCustom = currentSound && currentSound.startsWith('data:');
                             if (isCustom) {
                               return (
                                 <button 
                                   className="py-3 px-4 rounded-xl border bg-primary/10 border-primary/40 text-primary text-[9px] font-black uppercase tracking-widest"
                                 >
                                   Custom File
                                 </button>
                               );
                             }
                             return null;
                           })()}
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
              </div>
            )}
          </main>

          <footer className="px-12 py-10 border-t border-white/5 bg-black/20 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] font-mono">Session ID: WR-{Math.random().toString(36).substr(2, 10).toUpperCase()}</p>
            <button 
              onClick={onClose}
              className="px-12 py-4 bg-primary hover:bg-red-700 text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(242,13,13,0.4)] transition-all active:scale-95"
            >
              Commit Configuration
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;