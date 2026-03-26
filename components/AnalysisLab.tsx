import React, { useState, useEffect, useRef } from 'react';
import { getMarketAnalysisFromImages, AnalysisResult } from '../services/geminiService';
import { GoogleGenAI, Modality, LiveServerMessage, Blob as GenAIBlob } from '@google/genai';

interface AnalysisLabProps {
  thinkingBudget?: number;
  voiceName?: string;
  theme: 'dark' | 'light';
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const TradingViewChart: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    container.innerHTML = '';
    
    const timeoutId = setTimeout(() => {
      const widgetContainer = document.createElement("div");
      widgetContainer.className = "tradingview-widget-container";
      widgetContainer.style.height = "100%";
      widgetContainer.style.width = "100%";

      const widgetDiv = document.createElement("div");
      widgetDiv.className = "tradingview-widget-container__widget";
      widgetDiv.style.height = "100%";
      widgetDiv.style.width = "100%";
      widgetContainer.appendChild(widgetDiv);

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "allow_symbol_change": true,
        "calendar": false,
        "details": false,
        "hide_side_toolbar": false,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "60",
        "locale": "en",
        "save_image": true,
        "style": "1",
        "symbol": "OANDA:XAUUSD",
        "theme": theme,
        "timezone": "Asia/Dubai",
        "backgroundColor": theme === 'dark' ? "#05070a" : "#ffffff",
        "gridColor": theme === 'dark' ? "rgba(242, 242, 242, 0.03)" : "rgba(0, 0, 0, 0.05)",
        "watchlist": [],
        "withdateranges": false,
        "compareSymbols": [],
        "studies": [
          "STD;Bollinger_Bands",
          "STD;RSI"
        ],
        "autosize": true
      });
      
      widgetContainer.appendChild(script);
      container.appendChild(widgetContainer);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      container.innerHTML = '';
    };
  }, [theme]);

  return (
    <div className="w-full h-full bg-white dark:bg-[#05070a]" ref={containerRef} />
  );
};

const AnalysisLab: React.FC<AnalysisLabProps> = ({ thinkingBudget = 32768, voiceName = 'ZEPHYR', theme }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [activeResultTab, setActiveResultTab] = useState<'alpha' | 'levels'>('alpha');
  const [transcripts, setTranscripts] = useState<string[]>([]);
  
  const [voiceContextImage, setVoiceContextImage] = useState<string | null>(null);
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  const currentOutputTranscriptionRef = useRef<string>("");

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const startVoiceSession = async () => {
    if (isVoiceActive) { stopVoiceSession(); return; }
    try {
      setIsVoiceActive(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioCtxRef.current = new AudioCtx({ sampleRate: 16000 });
      outputAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
      await inputAudioCtxRef.current.resume();
      await outputAudioCtxRef.current.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Ensure personality name is correctly cased for the model
      const formattedVoice = voiceName?.charAt(0).toUpperCase() + voiceName?.slice(1).toLowerCase();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputAudioCtxRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob: GenAIBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtxRef.current!.destination);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.outputTranscription) {
              const text = m.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              setTranscripts(prev => [...prev.slice(0, transcripts.length > 0 ? -1 : 0), currentOutputTranscriptionRef.current]);
            }
            if (m.serverContent?.turnComplete) currentOutputTranscriptionRef.current = "";
            const audio = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio && outputAudioCtxRef.current) {
              const ctx = outputAudioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buf = await decodeAudioData(decode(audio), ctx, 24000, 1);
              const src = ctx.createBufferSource();
              src.buffer = buf;
              src.connect(ctx.destination);
              src.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buf.duration;
              sourcesRef.current.add(src);
              src.onended = () => sourcesRef.current.delete(src);
            }
            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              currentOutputTranscriptionRef.current = "";
            }
          },
          onerror: stopVoiceSession,
          onclose: () => setIsVoiceActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: formattedVoice as any } } }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setIsVoiceActive(false); }
  };

  const stopVoiceSession = () => {
    setIsVoiceActive(false);
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (inputAudioCtxRef.current) { try { inputAudioCtxRef.current.close(); } catch(e) {} inputAudioCtxRef.current = null; }
    if (outputAudioCtxRef.current) { try { outputAudioCtxRef.current.close(); } catch(e) {} outputAudioCtxRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    sourcesRef.current.clear();
    currentOutputTranscriptionRef.current = "";
  };

  const triggerAnalysis = async () => {
    if (uploadedImages.length === 0) return;
    setIsAnalyzing(true);
    setProcessLogs(["Initializing Neural Scan Cluster...", "Scanning Frame Data for Order Blocks...", "Synthesizing Market Structure..."]);
    // Switched to 'alpha' as the default display instead of the hidden logs/neural output tab
    setActiveResultTab('alpha');
    try {
      const res = await getMarketAnalysisFromImages(uploadedImages, "Vision Lab Technical Analysis", thinkingBudget);
      if (res.data) {
        setAnalysis(res.data);
        setProcessLogs(p => [...p, "Alpha Payload Received Successfully.", "Generating Execution Plan..."]);
      }
    } catch (e) { setProcessLogs(p => [...p, "Diagnostic Error: Check AI Node connectivity."]); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="h-full w-full flex bg-slate-50 dark:bg-[#05070a] text-slate-600 dark:text-slate-300 overflow-hidden font-sans transition-all duration-300">
      
      <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">Neural Vision Cluster</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] opacity-60">High-Density Diagnostic Interface</p>
          </div>
          <div className="flex gap-4">
             <div className="px-5 py-2 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col shadow-sm dark:shadow-xl">
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Reasoning Capacity</span>
                <span className="text-[11px] font-mono font-bold text-primary">{thinkingBudget.toLocaleString()} TOKENS</span>
             </div>
             <div className="px-5 py-2 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col shadow-sm dark:shadow-xl">
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Model</span>
                <span className="text-[11px] font-mono font-bold text-success">GEMINI-3.1-PRO</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 h-[500px] shrink-0">
          <div className="col-span-12 xl:col-span-8 glass-panel rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-black/60 shadow-2xl">
             <TradingViewChart theme={theme} />
          </div>
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
             <div className="flex-1 glass-panel rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-black/60 flex flex-col shadow-xl overflow-hidden">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Live Transcription</h3>
                  <div className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${isVoiceActive ? 'bg-success animate-pulse shadow-[0_0_5px_#10b981]' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">AI REPLIES</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 font-mono text-[10px] pr-2">
                   {transcripts.length > 0 ? transcripts.map((text, i) => (
                     <div key={i} className="p-3 rounded-xl border border-primary/10 bg-primary/5 dark:bg-primary/5 text-slate-800 dark:text-white animate-in fade-in slide-in-from-bottom-2 duration-300">
                       <span className="font-black text-primary uppercase text-[7px] block mb-1">Neural Output:</span>
                       <span>{text}</span>
                     </div>
                   )) : (
                     <div className="h-full flex items-center justify-center opacity-20 flex-col gap-3">
                       <span className="material-symbols-outlined text-4xl text-slate-400">keyboard_voice</span>
                       <p className="text-[9px] uppercase tracking-widest text-slate-500">Awaiting Neural Link...</p>
                     </div>
                   )}
                   <div ref={transcriptEndRef} />
                </div>
             </div>
          </div>
        </div>

        <div className="flex-1 min-h-[400px] glass-panel rounded-[2rem] flex flex-col border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-black/40 overflow-hidden">
           <div className="flex items-center px-8 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/60 shrink-0">
              <button onClick={() => setActiveResultTab('alpha')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeResultTab === 'alpha' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Alpha Insight</button>
              <button onClick={() => setActiveResultTab('levels')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeResultTab === 'levels' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Liquidity Map</button>
           </div>
           
           <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
              {activeResultTab === 'alpha' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {analysis ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-primary text-2xl">insights</span>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Signal Reasoning</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 font-medium italic p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-inner">
                          "{analysis.scenario}"
                        </p>
                      </div>
                      <div className="bg-slate-100 dark:bg-black/60 rounded-3xl p-8 border border-slate-200 dark:border-white/5 shadow-2xl">
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6 border-b border-primary/20 pb-2">Execution Protocol</h3>
                        <div className="grid grid-cols-1 gap-6">
                          <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Entry Vector</p>
                            <p className="text-3xl font-mono font-black text-slate-900 dark:text-white">{analysis.signal.entry}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-danger/5 p-4 rounded-2xl border border-danger/10">
                              <p className="text-[8px] text-danger uppercase font-black mb-1">Hard Stop</p>
                              <p className="text-xl font-mono font-black text-danger">{analysis.signal.sl}</p>
                            </div>
                            <div className="bg-success/5 p-4 rounded-2xl border border-success/10">
                              <p className="text-[8px] text-success uppercase font-black mb-1">Take Profit</p>
                              <p className="text-xl font-mono font-black text-success">{analysis.signal.tp}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4 py-20">
                      <span className="material-symbols-outlined text-6xl animate-pulse text-slate-400">monitoring</span>
                      <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500">Awaiting Analysis Payload</p>
                    </div>
                  )}
                </div>
              )}

              {activeResultTab === 'levels' && (
                <div className="animate-in fade-in duration-500">
                  {analysis ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-6">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-success border-l-4 border-success pl-4 bg-success/5 py-2">Institutional Support</h4>
                          <div className="space-y-3">
                             {analysis.support.map((level, i) => (
                               <div key={i} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-success/10 transition-all">
                                  <span className="text-2xl font-mono font-black text-slate-900 dark:text-white">{level}</span>
                                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Demand</span>
                               </div>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-6">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-danger border-l-4 border-danger pl-4 bg-danger/5 py-2">Liquidity Supply</h4>
                          <div className="space-y-3">
                             {analysis.resistance.map((level, i) => (
                               <div key={i} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-danger/10 transition-all">
                                  <span className="text-2xl font-mono font-black text-slate-900 dark:text-white">{level}</span>
                                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Resistance</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4 py-20">
                      <span className="material-symbols-outlined text-6xl text-slate-400">grid_view</span>
                    </div>
                  )}
                </div>
              )}
           </div>
        </div>

        <div className="shrink-0 glass-panel rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-black/60 p-8 shadow-2xl overflow-hidden flex flex-col items-center mb-12 transition-all">
           <div className="w-full mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-primary">calculate</span>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Tactical Fibonacci Module</h3>
              </div>
           </div>
           
           <div className={`p-4 rounded-[2.5rem] border shadow-2xl w-full max-w-[800px] flex justify-center transition-all duration-500 bg-slate-50 dark:bg-[#0d1117] border-slate-200 dark:border-white/5 shadow-inner`}>
              <div className="relative w-full aspect-[4/3] max-h-[600px] overflow-hidden rounded-2xl">
                <iframe 
                  title="Fibonacci Calculator"
                  frameBorder="0" 
                  scrolling="auto" 
                  width="100%"
                  height="100%"
                  allowTransparency={true} 
                  marginWidth={0} 
                  marginHeight={0} 
                  src="https://ssltools.investing.com/fibonacci-calculator/index.php?force_lang=1"
                  className="rounded-2xl"
                  style={{ 
                    filter: theme === 'dark' ? 'invert(0.92) hue-rotate(180deg) brightness(1.2) contrast(0.95)' : 'none',
                    transformOrigin: 'top center',
                  }}
                />
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2">
             <span className="text-[9px] text-slate-400 uppercase tracking-widest">Market Logic via Investing.com</span>
           </div>
        </div>
      </div>

      <aside className="w-[440px] bg-white dark:bg-black/60 border-l border-slate-200 dark:border-white/5 flex flex-col shadow-2xl z-20 overflow-y-auto no-scrollbar transition-all">
        <div className="p-10 space-y-12">
           <section className="space-y-6">
              <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] px-2">Voice Interface</h2>
              <div className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-6 ${isVoiceActive ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40'}`}>
                 <span className={`material-symbols-outlined text-4xl ${isVoiceActive ? 'text-primary animate-pulse' : 'text-slate-300 dark:text-slate-700'}`}>
                   {isVoiceActive ? 'mic' : 'mic_off'}
                 </span>

                 {voiceContextImage && (
                   <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative group shadow-2xl animate-in zoom-in duration-300">
                      <img src={voiceContextImage} alt="Context" className="w-full h-full object-cover opacity-80" />
                      <button 
                        onClick={() => setVoiceContextImage(null)} 
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                      >
                        <span className="material-symbols-outlined text-white">close</span>
                      </button>
                   </div>
                 )}

                 <div className="flex w-full gap-3">
                    <button 
                      onClick={startVoiceSession}
                      className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl ${isVoiceActive ? 'bg-slate-900 dark:bg-black text-white' : 'bg-primary text-white hover:brightness-110'}`}
                    >
                      {isVoiceActive ? 'Disconnect' : `Initialize Node`}
                    </button>
                    <button 
                      onClick={() => voiceFileInputRef.current?.click()}
                      className="px-5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center bg-white dark:bg-transparent"
                    >
                      <span className="material-symbols-outlined">add_a_photo</span>
                    </button>
                    <input type="file" ref={voiceFileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => setVoiceContextImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }} />
                 </div>
              </div>
           </section>

           <section className="space-y-6">
              <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] px-2">Frame Buffer</h2>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] p-12 text-center cursor-pointer hover:border-primary transition-all bg-slate-50 dark:bg-black/40 hover:bg-primary/5 shadow-inner"
              >
                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const files = e.target.files; if (!files) return;
                  Array.from(files).forEach(f => {
                    const r = new FileReader(); r.onloadend = () => setUploadedImages(p => [...p, r.result as string]); r.readAsDataURL(f as any);
                  });
                }} />
                <div className="flex flex-col items-center gap-4">
                  <span className="material-symbols-outlined text-3xl text-slate-400 dark:text-slate-500 group-hover:text-primary transition-all">add_photo_alternate</span>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Upload Charts</p>
                    <p className="text-[8px] text-slate-500 uppercase font-black opacity-60">PNG, JPG, SVG supported</p>
                  </div>
                </div>
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black relative group">
                      <img src={img} alt="payload" className="w-full h-full object-cover opacity-80" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setUploadedImages(p => p.filter((_, idx) => idx !== i)); }}
                        className="absolute inset-0 bg-primary/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={triggerAnalysis}
                disabled={isAnalyzing || uploadedImages.length === 0}
                className="w-full bg-slate-900 dark:bg-[#1e3a8a] text-white py-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all disabled:opacity-20 flex items-center justify-center gap-3"
              >
                {isAnalyzing ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : 'Confirm Diagnostics'}
              </button>
           </section>
        </div>
      </aside>
    </div>
  );
};

export default AnalysisLab;