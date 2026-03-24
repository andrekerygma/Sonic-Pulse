import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  Library, 
  Mic2, 
  Settings2, 
  Search, 
  Bell, 
  HelpCircle, 
  MoreVertical, 
  Play, 
  Pause, 
  Sparkles, 
  FileUp, 
  Download, 
  ChevronDown, 
  SkipBack, 
  SkipForward, 
  Volume2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { AudioClip, VoicePersona, AppState } from './types';
import { VOICES, INITIAL_HISTORY } from './constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [state, setState] = useState<AppState>({
    script: '',
    pitch: 5,
    rate: 1.2,
    selectedVoice: VOICES[0],
    history: INITIAL_HISTORY,
    isGenerating: false,
  });

  const [isPolishing, setIsPolishing] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePolish = async () => {
    if (!state.script.trim()) return;
    setIsPolishing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Polish the following text to sound more natural and professional for a text-to-speech voiceover. Keep the same language. Text: "${state.script}"`,
      });
      const polishedText = response.text || state.script;
      setState(prev => ({ ...prev, script: polishedText }));
    } catch (error) {
      console.error("Failed to polish text:", error);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleGenerate = () => {
    if (!state.script.trim()) return;
    setState(prev => ({ ...prev, isGenerating: true }));
    
    // Simulate generation
    setTimeout(() => {
      const newClip: AudioClip = {
        id: Math.random().toString(36).substr(2, 9),
        title: state.script.substring(0, 40) + '...',
        timestamp: 'JUST NOW',
        duration: '0:30',
        progress: 0,
        isPlaying: false,
      };
      setState(prev => ({
        ...prev,
        isGenerating: false,
        history: [newClip, ...prev.history],
      }));
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-surface text-on-surface overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col py-8 px-4 border-r border-white/5">
        <div className="mb-10 px-2">
          <h1 className="text-xl font-extrabold tracking-tight text-primary-container font-headline">Sonic Pulse</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">Synthetic Auditor</p>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarLink icon={<PlusCircle size={20} />} label="Create" active />
          <SidebarLink icon={<Library size={20} />} label="Library" />
          <SidebarLink icon={<Mic2 size={20} />} label="Voices" />
          <SidebarLink icon={<Settings2 size={20} />} label="API Settings" />
        </nav>

        <div className="mt-auto pt-6">
          <button 
            onClick={handleGenerate}
            disabled={state.isGenerating || !state.script.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-br from-primary-container to-primary text-white font-bold shadow-lg shadow-primary-container/20 hover:shadow-primary-container/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {state.isGenerating ? <Loader2 className="animate-spin" size={20} /> : "Generate Audio"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-surface/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-on-surface-variant">Project /</span>
            <span className="font-medium">Untilted Generation</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input 
                type="text" 
                placeholder="Search library..." 
                className="bg-surface-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary-container w-64 transition-all"
              />
            </div>
            <div className="flex items-center gap-4 text-on-surface-variant">
              <button className="hover:text-primary transition-colors"><Bell size={20} /></button>
              <button className="hover:text-primary transition-colors"><HelpCircle size={20} /></button>
              <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10">
                <img 
                  src="https://picsum.photos/seed/sonic/100/100" 
                  alt="User" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content Grid */}
        <main className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* History Column */}
          <section className="col-span-3 p-6 overflow-y-auto border-r border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline text-lg font-bold">Recent History</h3>
              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-high px-2 py-1 rounded uppercase tracking-wider">
                {state.history.length} Clips
              </span>
            </div>

            <div className="space-y-4">
              {state.history.map((clip) => (
                <HistoryItem key={clip.id} clip={clip} />
              ))}
            </div>
          </section>

          {/* Editor Column */}
          <section className="col-span-6 p-10 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-extrabold tracking-tight">Compose Script</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handlePolish}
                  disabled={isPolishing || !state.script.trim()}
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isPolishing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  <span>AI Polish</span>
                </button>
                <button className="text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
                  <FileUp size={18} />
                  <span>Import</span>
                </button>
              </div>
            </div>

            <div className="flex-1 relative">
              <textarea 
                ref={textareaRef}
                value={state.script}
                onChange={(e) => setState(prev => ({ ...prev, script: e.target.value }))}
                placeholder="Enter or paste your text here to begin the synthetic audit..."
                className="w-full h-full bg-surface-low p-8 rounded-2xl border-none focus:ring-1 focus:ring-primary-container/30 text-lg leading-relaxed text-on-surface placeholder:text-on-surface-variant/20 resize-none font-sans transition-all"
              />
              <div className="absolute bottom-6 right-8">
                <div className="text-[10px] font-bold text-on-surface-variant bg-surface/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                  <span className={state.script.length > 4500 ? "text-red-400" : "text-secondary-container"}>
                    {state.script.length.toLocaleString()}
                  </span> / 5,000 CHARACTERS
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button className="px-8 py-4 rounded-xl bg-surface-highest text-secondary border border-secondary/20 hover:bg-secondary/10 transition-all font-bold flex items-center gap-3 active:scale-95">
                <Download size={20} />
                Export as MP3
              </button>
            </div>
          </section>

          {/* Settings Column */}
          <section className="col-span-3 p-8 overflow-y-auto">
            <div className="mb-10">
              <h3 className="font-headline text-lg font-bold mb-6">Voice Persona</h3>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-3 block">Selected Voice</label>
              
              <div className="relative">
                <button 
                  onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                  className="w-full bg-surface-high p-4 rounded-xl flex items-center justify-between hover:bg-surface-highest transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{state.selectedVoice.flag}</span>
                    <div className="text-left">
                      <p className="text-sm font-bold group-hover:text-primary transition-colors">{state.selectedVoice.name}</p>
                      <p className="text-[10px] text-on-surface-variant">{state.selectedVoice.code}</p>
                    </div>
                  </div>
                  <ChevronDown size={20} className={`text-on-surface-variant transition-transform ${showVoiceDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showVoiceDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-surface-high border border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl"
                    >
                      {VOICES.map(voice => (
                        <button 
                          key={voice.id}
                          onClick={() => {
                            setState(prev => ({ ...prev, selectedVoice: voice }));
                            setShowVoiceDropdown(false);
                          }}
                          className="w-full p-4 flex items-center gap-3 hover:bg-surface-highest transition-colors text-left border-b border-white/5 last:border-none"
                        >
                          <span className="text-xl">{voice.flag}</span>
                          <div>
                            <p className="text-sm font-bold">{voice.name}</p>
                            <p className="text-[10px] text-on-surface-variant">{voice.code}</p>
                          </div>
                          {state.selectedVoice.id === voice.id && <CheckCircle2 size={16} className="ml-auto text-primary" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-12">
              <Slider 
                label="Pitch" 
                value={state.pitch} 
                onChange={(v) => setState(prev => ({ ...prev, pitch: v }))} 
                min={-20} 
                max={20} 
                unit="%" 
              />
              <Slider 
                label="Rate" 
                value={state.rate} 
                onChange={(v) => setState(prev => ({ ...prev, rate: v }))} 
                min={0.5} 
                max={2.0} 
                step={0.1}
                unit="x" 
              />

              <div className="pt-6">
                <div className="p-6 rounded-2xl bg-surface-low border border-white/5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                  <h4 className="text-sm font-bold mb-2">Technical Insight</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {state.selectedVoice.name} is optimized for storytelling and long-form narration. High pitch settings may impact natural cadence.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Player Bar */}
        <footer className="h-20 px-8 bg-surface-low border-t border-primary-container/10 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4 w-1/4">
            <div className="h-10 w-10 bg-surface-high rounded-lg flex items-center justify-center">
              <div className="flex items-end gap-0.5 h-4">
                <motion.div animate={{ height: [4, 12, 6, 14, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 bg-primary rounded-full" />
                <motion.div animate={{ height: [8, 4, 14, 6, 8] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1 bg-primary rounded-full" />
                <motion.div animate={{ height: [12, 6, 4, 10, 12] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-primary rounded-full" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold">Untilted Generation</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Ready to render</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <button className="text-on-surface-variant hover:text-on-surface transition-colors"><SkipBack size={20} /></button>
            <button className="h-12 w-12 flex items-center justify-center rounded-full bg-primary-container text-white shadow-lg shadow-primary-container/30 hover:scale-105 transition-transform active:scale-95">
              <Play size={24} fill="currentColor" />
            </button>
            <button className="text-on-surface-variant hover:text-on-surface transition-colors"><SkipForward size={20} /></button>
          </div>

          <div className="flex items-center gap-6 w-1/4 justify-end">
            <button className="flex items-center gap-2 px-4 py-2 text-secondary-container hover:bg-white/5 rounded-lg transition-all font-bold text-xs uppercase tracking-widest">
              <Play size={14} />
              Preview
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-on-surface-variant hover:bg-white/5 rounded-lg transition-all font-bold text-xs uppercase tracking-widest">
              <Download size={14} />
              Download
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SidebarLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active ? 'text-primary-container font-bold bg-surface-high/50 border-r-2 border-primary-container' : 'text-on-surface-variant/60 hover:bg-surface-high'}`}>
      <span className={`${active ? 'text-primary-container' : 'group-hover:text-on-surface'}`}>{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function HistoryItem({ clip }: { clip: AudioClip }) {
  return (
    <div className="p-4 bg-surface-low rounded-xl group hover:bg-surface-high transition-all cursor-pointer border border-transparent hover:border-white/5">
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${clip.isPlaying ? 'text-primary' : 'text-on-surface-variant'}`}>
          {clip.timestamp}
        </span>
        <button className="text-on-surface-variant hover:text-on-surface transition-colors"><MoreVertical size={14} /></button>
      </div>
      <p className="text-sm font-medium mb-3 line-clamp-1 group-hover:text-primary transition-colors">{clip.title}</p>
      <div className="flex items-center gap-3">
        <button className={`h-8 w-8 flex items-center justify-center rounded-full transition-all active:scale-90 ${clip.isPlaying ? 'bg-secondary-container text-surface shadow-lg' : 'bg-surface-highest text-on-surface'}`}>
          {clip.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <div className="flex-1 h-1 bg-surface-highest rounded-full overflow-hidden">
          <div className="h-full bg-secondary-container transition-all" style={{ width: `${clip.progress}%` }} />
        </div>
        <span className="text-[10px] font-bold text-on-surface-variant">{clip.duration}</span>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step = 1, unit }: { label: string, value: number, onChange: (v: number) => void, min: number, max: number, step?: number, unit: string }) {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{label}</label>
        <span className="text-xs font-bold text-secondary-container">{value > 0 ? '+' : ''}{value}{unit}</span>
      </div>
      <div className="relative w-full h-1.5 bg-surface-highest rounded-full group cursor-pointer">
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step}
          value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-secondary/50 to-secondary-container rounded-full" style={{ width: `${percentage}%` }} />
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-secondary-container rounded-full shadow-[0_0_10px_rgba(0,218,243,0.4)] transition-transform group-hover:scale-110" 
          style={{ left: `calc(${percentage}% - 8px)` }} 
        />
      </div>
      <div className="flex justify-between text-[10px] font-bold text-on-surface-variant/30">
        <span>{min}{unit}</span>
        <span>{min + (max-min)/2}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
