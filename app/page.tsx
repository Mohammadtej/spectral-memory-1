'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ArticleItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  archiveUrl: string;
}

const CATEGORIES = [
  { id: 'general', label: 'All-Wave', icon: '📡' },
  { id: 'tech', label: 'Silicon/Tech', icon: '💾' },
  { id: 'politics', label: 'State & Policy', icon: '🏛️' },
  { id: 'world', label: 'Global Wire', icon: '🌐' },
  { id: 'finance', label: 'Wall St/Markets', icon: '📈' },
  { id: 'sports', label: 'Stadium Live', icon: '🏆' },
];

// Category-Specific Eras for the Graduation Ticks
const CATEGORY_ERAS: Record<string, { year: number; label: string }[]> = {
  tech: [
    { year: 1996, label: 'Dial-Up & Netscape' },
    { year: 2004, label: 'Web 2.0 & iPod' },
    { year: 2012, label: 'Smartphone Boom' },
    { year: 2020, label: 'Cloud & Silicon' },
    { year: 2025, label: 'Agentic GenAI' },
  ],
  politics: [
    { year: 1996, label: 'Clinton & Dot-Com' },
    { year: 2004, label: 'Post-9/11 Doctrines' },
    { year: 2012, label: 'Grassroots & Social' },
    { year: 2020, label: 'Election & Pandemic' },
    { year: 2025, label: 'Multipolar Order' },
  ],
  world: [
    { year: 1996, label: 'Post-Cold War Thaw' },
    { year: 2004, label: 'Global Coalitions' },
    { year: 2012, label: 'Arab Spring Era' },
    { year: 2020, label: 'Global Lockdowns' },
    { year: 2025, label: 'Geopolitical Realign' },
  ],
  finance: [
    { year: 1996, label: 'Early Dot-Com Bull' },
    { year: 2004, label: 'Subprime Run-Up' },
    { year: 2012, label: 'ZIRP & Tech Valuations' },
    { year: 2020, label: 'Stimulus & Crypto' },
    { year: 2025, label: 'Mega-Cap Dominance' },
  ],
  sports: [
    { year: 1996, label: "Jordan's Bulls Peak" },
    { year: 2004, label: 'Curse of the Bambino' },
    { year: 2012, label: 'London Games & Heat' },
    { year: 2020, label: 'Empty Stadium Bubbles' },
    { year: 2025, label: 'Superteams & NIL Era' },
  ],
  general: [
    { year: 1996, label: 'Dawn of the Web' },
    { year: 2004, label: 'Early Blogosphere' },
    { year: 2012, label: 'Social Media Peak' },
    { year: 2020, label: 'Digital Solitude' },
    { year: 2025, label: 'Algorithmic Feeds' },
  ],
};

const TUNING_MESSAGES = [
  'Demodulating 1.42 GHz spectral carrier wave...',
  'Aligning magnetic tape read-heads to historical sector...',
  'Sweeping vacuum tube bandpass filters across archived packet ether...',
  'Decrypting preserved shortwave dispatches from the digital afterlife...',
  'Synchronizing Gemma-2-27B neural antenna with Wayback time-capsule...',
];

export default function TimeCapsuleRadio() {
  const [selectedYear, setSelectedYear] = useState<number>(2004);
  const [category, setCategory] = useState<string>('tech');
  const [loading, setLoading] = useState<boolean>(false);
  const [tuningStatusIndex, setTuningStatusIndex] = useState<number>(0);
  const [broadcastScript, setBroadcastScript] = useState<string>('');
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [anchorDate, setAnchorDate] = useState<string>('');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [activeArticleModal, setActiveArticleModal] = useState<ArticleItem | null>(null);

  // Web Audio Context & Synthesized AM Noise Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Cycle through atmospheric status messages during tuning
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setTuningStatusIndex((prev) => (prev + 1) % TUNING_MESSAGES.length);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Audio: Synthetic AM Radio Static Loop
  const startRadioAtmosphere = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.012; // Gentle vinyl/AM crackle
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1750;
      bandpass.Q.value = 3.2;

      whiteNoise.connect(bandpass);
      bandpass.connect(ctx.destination);
      whiteNoise.start();
      noiseSourceRef.current = whiteNoise;
    } catch {}
  };

  const stopRadioAtmosphere = () => {
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch {}
      noiseSourceRef.current = null;
    }
  };

  // Browser Speech Synthesis
  const streamSpeech = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    startRadioAtmosphere();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = 0.8;

    const voices = window.speechSynthesis.getVoices();
    const radioVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('David') || v.name.includes('George'))
    );
    if (radioVoice) utterance.voice = radioVoice;

    utterance.onstart = () => setIsBroadcasting(true);
    utterance.onend = () => {
      setIsBroadcasting(false);
      stopRadioAtmosphere();
    };
    utterance.onerror = () => {
      setIsBroadcasting(false);
      stopRadioAtmosphere();
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleMute = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsBroadcasting(false);
      stopRadioAtmosphere();
    }
  };

  const tuneReceiver = async () => {
    handleMute();
    setLoading(true);
    setBroadcastScript('');
    setArticles([]);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, category }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to capture archive transmission.');

      setBroadcastScript(data.broadcastScript);
      setArticles(data.articles || []);
      setAnchorDate(data.anchorDate);
      streamSpeech(data.broadcastScript);
    } catch (err: any) {
      setBroadcastScript(`[SIGNAL CARRIER REJECTED]: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const eras = CATEGORY_ERAS[category] || CATEGORY_ERAS.general;

  return (
    <main className="min-h-screen bg-[#070709] text-stone-200 p-3 md:p-8 flex flex-col items-center justify-center font-mono selection:bg-amber-500 selection:text-black">
      {/* Radio Enclosure Chassis */}
      <div className="w-full max-w-5xl bg-[#121217] border-2 border-stone-800 rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col">
        
        {/* Vintage Radio Bezel Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 px-6 py-4 border-b border-stone-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${isBroadcasting ? 'bg-amber-400 shadow-[0_0_14px_#f59e0b] animate-ping' : 'bg-red-600 shadow-[0_0_8px_#dc2626]'}`} />
            <div>
              <h1 className="text-sm md:text-base font-black tracking-widest uppercase text-stone-100 flex items-center gap-2">
                Time-Capsule Radio <span className="text-[10px] text-amber-500 font-normal border border-amber-500/40 px-1.5 py-0.5 rounded">TCR-G4</span>
              </h1>
              <p className="text-[10px] text-stone-500 tracking-wider">CHRONOLOGICAL SUBSCRIBER MATRIX // GHOST IN THE MACHINE</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-400 bg-black/60 px-3 py-1.5 rounded-lg border border-stone-800">
            <span className="text-amber-400 font-bold">{2026 - selectedYear}</span>
            <span className="text-[10px] text-stone-500 uppercase">Years into past</span>
          </div>
        </div>

        {/* Hardware Tuner Deck */}
        <div className="p-6 md:p-8 bg-[#0f0f13] border-b border-stone-800/80">
          
          {/* Category Bands */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  category === c.id
                    ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-700'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Analog Tuning Indicator with Dynamic Subheaders */}
          <div className="bg-black/90 border border-stone-800/90 rounded-2xl p-6 relative">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[11px] font-bold tracking-wider text-amber-500/80 uppercase">
                {category.toUpperCase()} BAND FREQUENCY
              </span>
              <div className="text-right">
                <span className="text-3xl font-black text-amber-400 font-mono tracking-tight">{selectedYear}</span>
                <span className="text-xs text-stone-500 ml-1.5 font-sans">MHz</span>
              </div>
            </div>

            {/* Continuous Year Scrubber */}
            <input
              type="range"
              min="1996"
              max="2025"
              step="1"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="w-full h-3 bg-stone-900 rounded-lg appearance-none cursor-ew-resize accent-amber-500 focus:outline-none"
            />

            {/* Category-Specific Era Milestones */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[9px] text-stone-400 mt-4 font-mono border-t border-stone-900 pt-3">
              {eras.map((era) => (
                <div 
                  key={era.year} 
                  onClick={() => setSelectedYear(era.year)}
                  className={`cursor-pointer transition-colors p-1 rounded ${selectedYear === era.year ? 'text-amber-400 font-bold bg-amber-500/10' : 'hover:text-stone-200'}`}
                >
                  <span className="text-stone-600 block">{era.year}</span>
                  <span className="truncate block font-sans text-[10px]">{era.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={tuneReceiver}
              disabled={loading}
              className="flex-1 py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:opacity-90 active:scale-[0.99] text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-xl disabled:opacity-40"
            >
              {loading ? 'Demodulating Carrier Wave...' : `Lock On & Broadcast ${selectedYear}`}
            </button>

            {isBroadcasting && (
              <button
                onClick={handleMute}
                className="px-6 py-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold uppercase text-xs rounded-xl border border-stone-700"
              >
                Mute Carrier
              </button>
            )}
          </div>
        </div>

        {/* Display Stage */}
        <div className="p-6 md:p-8 flex-1 flex flex-col gap-6 bg-[#0a0a0d]">
          
          {/* CRT Monitor Viewport */}
          <div className="bg-black border border-stone-800 rounded-2xl p-6 relative overflow-hidden min-h-[200px] flex flex-col justify-between">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50 z-10" />

            <div className="relative z-20">
              <div className="flex justify-between items-center text-[10px] text-amber-500/70 uppercase tracking-widest mb-3 border-b border-stone-900 pb-2">
                <span>{anchorDate ? `TRANSMISSION LOCK: ${anchorDate}` : 'RECEIVER STANDBY'}</span>
                <span>STATUS: {loading ? 'INTERCEPTING' : isBroadcasting ? 'SPEECH ON-AIR' : broadcastScript ? 'SYNCHRONIZED' : 'CARRIER SILENT'}</span>
              </div>

              <div className="text-sm md:text-base leading-relaxed text-amber-100/95 font-serif whitespace-pre-line space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {loading ? (
                  <p className="animate-pulse text-amber-400 font-mono text-sm">
                    {TUNING_MESSAGES[tuningStatusIndex]}
                  </p>
                ) : (
                  broadcastScript || 'Turn the frequency dial above and press Lock On to summon the transmission.'
                )}
              </div>
            </div>
          </div>

          {/* Clickable Archival Wire Dossier */}
          {articles.length > 0 && (
            <div className="bg-stone-900/30 border border-stone-800/80 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                  <span>🗄️</span> Recovered Wire Records ({articles.length})
                </h2>
                <span className="text-[10px] text-stone-500 font-sans italic">Click any card to inspect original wire snapshot</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {articles.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveArticleModal(item)}
                    className="bg-black/60 hover:bg-black/90 border border-stone-800/80 hover:border-amber-500/50 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] group"
                  >
                    <div>
                      <div className="flex justify-between items-center text-[9px] text-amber-500/80 uppercase font-mono mb-1.5">
                        <span className="font-bold">{item.source}</span>
                        <span className="text-stone-500 group-hover:text-amber-400 transition-colors">Inspect Record &rarr;</span>
                      </div>
                      <h3 className="text-xs font-bold text-stone-200 group-hover:text-white line-clamp-2">{item.title}</h3>
                      {item.summary && <p className="text-[11px] text-stone-400 mt-1.5 line-clamp-2 font-sans">{item.summary}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Interactive Article Inspector Modal */}
      {activeArticleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-stone-700 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-start mb-3 border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block font-mono">
                  {activeArticleModal.source} // {activeArticleModal.category.toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{activeArticleModal.title}</h3>
              </div>
              <button
                onClick={() => setActiveArticleModal(null)}
                className="text-stone-400 hover:text-white text-lg font-bold ml-4"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed font-sans mb-6 bg-black/40 p-4 rounded-xl border border-stone-800/70">
              {activeArticleModal.summary}
            </p>

            <div className="flex gap-3">
              <a
                href={activeArticleModal.archiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold uppercase tracking-wider rounded-xl border border-stone-700 text-center transition-colors"
              >
                Inspect on Wayback Archive &nearr;
              </a>
              <button
                onClick={() => {
                  streamSpeech(`Special bulletin. Recovered story: ${activeArticleModal.title}. ${activeArticleModal.summary}`);
                  setActiveArticleModal(null);
                }}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-colors"
              >
                🎙️ Broadcast Story Solo
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}