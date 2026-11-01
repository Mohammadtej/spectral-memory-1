'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
    { year: 2012, label: 'ZIRP & Valuations' },
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
  'Synchronizing Gemma neural antenna with Wayback time-capsule...',
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
  const [tubeSurge, setTubeSurge] = useState<boolean>(false);
  const [phosphorColor, setPhosphorColor] = useState<'green' | 'amber'>('amber');
  const [signalStrength, setSignalStrength] = useState<number>(15);

  // Voice Selection State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  // Modals
  const [inspectArticle, setInspectArticle] = useState<ArticleItem | null>(null);
  const [showCassetteModal, setShowCassetteModal] = useState<boolean>(false);
  const [isExportingTape, setIsExportingTape] = useState<boolean>(false);

  // Audio Context & Graph
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const isDraggingKnobRef = useRef<boolean>(false);
  const prevYearRef = useRef<number>(selectedYear);

  // Discover and prioritize natural female voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
      const femalePriority = [
        'Jenny', 'Aria', 'Google UK English Female', 'Google US English',
        'Samantha', 'Victoria', 'Karen', 'Zira', 'Ava', 'Emma', 'Sonia'
      ];

      const sorted = [...englishVoices].sort((a, b) => {
        const aRank = femalePriority.findIndex((name) => a.name.includes(name));
        const bRank = femalePriority.findIndex((name) => b.name.includes(name));
        if (aRank !== -1 && bRank !== -1) return aRank - bRank;
        if (aRank !== -1) return -1;
        if (bRank !== -1) return 1;
        return 0;
      });

      setAvailableVoices(sorted);
      if (!selectedVoiceName && sorted.length > 0 && sorted[0]) {
        setSelectedVoiceName(sorted[0].name);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceName]);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // 60Hz Transformer Hum & High Voltage Tube Surge Sound
  const triggerTubeWarmupSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.008, ctx.currentTime + 2.5);

      osc.connect(gain);
      subOsc.connect(gain);
      if (analyserRef.current) {
        gain.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } else {
        gain.connect(ctx.destination);
      }

      osc.start();
      subOsc.start();
      setTimeout(() => {
        try {
          osc.stop();
          subOsc.stop();
        } catch {}
      }, 2800);
    } catch {}
  }, [getAudioContext]);

  // Synthetic AM Radio Static Loop
  const startRadioStatic = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.015;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1800;
      bandpass.Q.value = 3.5;

      whiteNoise.connect(bandpass);
      if (analyserRef.current) {
        bandpass.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } else {
        bandpass.connect(ctx.destination);
      }

      whiteNoise.start();
      noiseSourceRef.current = whiteNoise;
    } catch {}
  }, [getAudioContext]);

  const stopRadioStatic = useCallback(() => {
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch {}
      noiseSourceRef.current = null;
    }
  }, []);

  // Web Speech Synthesis
  const streamSpeech = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    startRadioStatic();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.12;
    utterance.pitch = 1.06;

    const chosenVoice = availableVoices.find((v) => v.name === selectedVoiceName);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onstart = () => {
      setIsBroadcasting(true);
      setSignalStrength(88);
    };
    utterance.onend = () => {
      setIsBroadcasting(false);
      setSignalStrength(22);
      stopRadioStatic();
    };
    utterance.onerror = () => {
      setIsBroadcasting(false);
      setSignalStrength(15);
      stopRadioStatic();
    };

    window.speechSynthesis.speak(utterance);
  }, [availableVoices, selectedVoiceName, startRadioStatic, stopRadioStatic]);

  const handleMute = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsBroadcasting(false);
      setSignalStrength(15);
      stopRadioStatic();
    }
  }, [stopRadioStatic]);

  // Execute Archival Interception
  const tuneReceiver = useCallback(async () => {
    handleMute();
    setTubeSurge(true);
    triggerTubeWarmupSound();
    setLoading(true);
    setBroadcastScript('');
    setArticles([]);
    setSignalStrength(50);

    setTimeout(() => setTubeSurge(false), 3000);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, category }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to capture archive transmission.');

      setBroadcastScript(data.broadcastScript || '');
      setArticles(data.articles || []);
      setAnchorDate(data.anchorDate || '');
      setSignalStrength(94);
      if (data.broadcastScript) {
        streamSpeech(data.broadcastScript);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown carrier error';
      setBroadcastScript(`[SIGNAL CARRIER REJECTED]: ${msg}`);
      setSignalStrength(10);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, category, handleMute, streamSpeech, triggerTubeWarmupSound]);

  // Rotary Knob Dragging
  const handleKnobMove = useCallback((clientX: number, clientY: number) => {
    if (!knobRef.current) return;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - centerY, clientX - centerX);
    let deg = rad * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    const clampedDeg = Math.min(300, Math.max(0, deg));
    const calculatedYear = Math.round(1996 + (clampedDeg / 300) * (2025 - 1996));

    if (calculatedYear !== prevYearRef.current) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(12);
        } catch {}
      }
      prevYearRef.current = calculatedYear;
      setSelectedYear(calculatedYear);
    }
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingKnobRef.current) handleKnobMove(e.clientX, e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (isDraggingKnobRef.current && touch) {
        handleKnobMove(touch.clientX, touch.clientY);
      }
    };
    const onStop = () => {
      isDraggingKnobRef.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onStop);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onStop);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onStop);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onStop);
    };
  }, [handleKnobMove]);

  // Keyboard Deck Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedYear((y) => Math.max(1996, y - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedYear((y) => Math.min(2025, y + 1));
      } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault();
        const catIdx = parseInt(e.key, 10) - 1;
        const targetCategory = CATEGORIES[catIdx];
        if (targetCategory) setCategory(targetCategory.id);
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (isBroadcasting) handleMute();
        else if (broadcastScript) streamSpeech(broadcastScript);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        tuneReceiver();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBroadcasting, broadcastScript, tuneReceiver, handleMute, streamSpeech]);

  // Loading Status Cycler
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (loading) {
      interval = setInterval(() => {
        setTuningStatusIndex((prev) => (prev + 1) % TUNING_MESSAGES.length);
      }, 1600);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  // Cathode Oscilloscope Animation
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(128);

    const renderScope = () => {
      animId = requestAnimationFrame(renderScope);
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = 'rgba(6, 10, 8, 0.28)';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 20) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (analyserRef.current && (isBroadcasting || loading)) {
        analyserRef.current.getByteTimeDomainData(dataArray);
      } else {
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = 128 + Math.round((Math.random() - 0.5) * 3);
        }
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = phosphorColor === 'green' ? '#39ff14' : '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.shadowColor = phosphorColor === 'green' ? '#22c55e' : '#d97706';

      ctx.beginPath();
      const sliceWidth = width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i];
        const v = typeof value === 'number' ? value / 128.0 : 1.0;
        const y = (v * height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    renderScope();
    return () => cancelAnimationFrame(animId);
  }, [isBroadcasting, loading, phosphorColor]);

  // Convert AudioBuffer to 16-bit PCM WAV Blob
  const audioBufferToWavBlob = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    const setUint16 = (d: number) => {
      out.setUint16(pos, d, true);
      pos += 2;
    };
    const setUint32 = (d: number) => {
      out.setUint32(pos, d, true);
      pos += 4;
    };

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        const channelData = channels[i];
        const sampleVal = channelData && typeof channelData[offset] === 'number' ? channelData[offset] : 0;
        const clamped = Math.max(-1, Math.min(1, sampleVal));
        const sample = (0.5 + clamped < 0 ? clamped * 32768 : clamped * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
    return new Blob([out.buffer], { type: 'audio/wav' });
  };

  // Cassette Export Audio Engine
  const exportCassetteMixtape = async () => {
    setIsExportingTape(true);
    try {
      const OfflineAudioClass = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
      if (!OfflineAudioClass) {
        throw new Error('OfflineAudioContext is not supported on this browser.');
      }

      const sampleRate = 44100;
      const durationSeconds = 12;
      const actx = new OfflineAudioClass(1, sampleRate * durationSeconds, sampleRate);

      const noiseBuffer = actx.createBuffer(1, sampleRate * durationSeconds, sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.035;
      }
      const noiseSource = actx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bandpass = actx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1400, 0);
      bandpass.Q.setValueAtTime(2.2, 0);

      const hum = actx.createOscillator();
      hum.frequency.setValueAtTime(60, 0);
      const humGain = actx.createGain();
      humGain.gain.setValueAtTime(0.015, 0);

      noiseSource.connect(bandpass);
      bandpass.connect(actx.destination);
      hum.connect(humGain);
      humGain.connect(actx.destination);

      noiseSource.start();
      hum.start();

      const renderedBuffer = await actx.startRendering();
      const wavBlob = audioBufferToWavBlob(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TCR_${selectedYear}_${category.toUpperCase()}_DISPATCH.wav`;
      a.click();
      URL.revokeObjectURL(url);
      setShowCassetteModal(true);
    } catch {
      alert('Unable to process tape buffer offline.');
    } finally {
      setIsExportingTape(false);
    }
  };

  const eras = CATEGORY_ERAS[category] || CATEGORY_ERAS.general || [];
  const knobAngle = ((selectedYear - 1996) / (2025 - 1996)) * 300 - 150;

  return (
    <main className="min-h-screen bg-[#07070a] text-stone-200 p-3 md:p-8 flex flex-col items-center justify-center font-mono selection:bg-amber-500 selection:text-black">
      {/* Retro Animation Stylesheet */}
      <style jsx global>{`
        @keyframes tube-flicker-surge {
          0% { opacity: 0.2; filter: drop-shadow(0 0 2px #dc2626); }
          15% { opacity: 1; filter: drop-shadow(0 0 25px #fbbf24) drop-shadow(0 0 10px #38bdf8); }
          25% { opacity: 0.3; filter: drop-shadow(0 0 4px #ea580c); }
          40% { opacity: 0.95; filter: drop-shadow(0 0 28px #f59e0b) drop-shadow(0 0 15px #38bdf8); }
          55% { opacity: 0.4; filter: drop-shadow(0 0 6px #ea580c); }
          75% { opacity: 1; filter: drop-shadow(0 0 32px #f59e0b); }
          100% { opacity: 0.85; filter: drop-shadow(0 0 18px #f59e0b); }
        }
        @keyframes filament-idle-breath {
          0%, 100% { opacity: 0.75; filter: drop-shadow(0 0 6px #f59e0b); }
          50% { opacity: 0.9; filter: drop-shadow(0 0 12px #d97706); }
        }
        @keyframes vu-twitch {
          0% { transform: rotate(var(--angle, 0deg)); }
          50% { transform: rotate(calc(var(--angle, 0deg) + 2deg)); }
          100% { transform: rotate(var(--angle, 0deg)); }
        }
        .tube-surge-active {
          animation: tube-flicker-surge 0.45s infinite alternate ease-in-out;
        }
        .filament-breath {
          animation: filament-idle-breath 3.5s infinite ease-in-out;
        }
      `}</style>

      {/* Outer Bakelite & Steel Chassis */}
      <div className="w-full max-w-5xl bg-[#121216] border-4 border-stone-800 rounded-3xl shadow-[0_35px_80px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col">
        
        {/* Chassis Top: 60Hz Vacuum Rail, VU Meter & Master Status */}
        <div className="bg-gradient-to-b from-[#1c1c24] to-[#121216] px-6 py-4 border-b border-stone-800 flex flex-wrap justify-between items-center gap-4 relative">
          
          <div className="flex items-center gap-4">
            {/* Glowing Vacuum Tubes Array */}
            <div className="flex items-end gap-3.5 bg-black/60 px-4 py-2.5 rounded-xl border border-stone-800 shadow-inner">
              {[1, 2, 3].map((tubeId) => (
                <div key={tubeId} className="flex flex-col items-center group">
                  <div className="w-8 h-14 rounded-t-full bg-gradient-to-b from-stone-400/20 via-transparent to-stone-900 border border-stone-700/60 relative flex items-center justify-center overflow-hidden">
                    <div
                      className={`w-1.5 h-8 rounded-full transition-all duration-300 ${
                        tubeSurge
                          ? 'tube-surge-active bg-amber-200'
                          : isBroadcasting
                          ? 'bg-amber-400 shadow-[0_0_18px_#f59e0b,0_0_35px_#ea580c] opacity-95 filament-breath'
                          : 'bg-red-950 opacity-40 shadow-none'
                      }`}
                    />
                    <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${tubeSurge ? 'opacity-80 bg-cyan-500/10' : 'opacity-0'}`} />
                  </div>
                  <div className="w-10 h-2.5 bg-stone-700 border-t border-stone-600 rounded-b shadow-sm" />
                </div>
              ))}
              <div className="ml-1 flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-amber-500 font-bold">
                  {tubeSurge ? '⚡ VOLTAGE SURGE 60Hz' : '60Hz VACUUM RAIL'}
                </span>
                <span className="text-[8px] text-stone-500 font-mono">3x TRIODE RECTIFIERS</span>
              </div>
            </div>

            {/* Skeuomorphic Analog Signal VU Meter */}
            <div className="hidden sm:flex flex-col bg-black/80 px-3 py-2 rounded-xl border border-stone-800/90 w-28 select-none">
              <div className="flex justify-between text-[8px] text-stone-500 font-mono leading-none mb-1">
                <span>0</span>
                <span>VU</span>
                <span>+3</span>
              </div>
              <div className="h-6 w-full relative overflow-hidden bg-stone-950 rounded border border-stone-900 flex items-end justify-center">
                {/* Dial Arc Background */}
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent" />
                {/* Analog Needle */}
                <div
                  className="w-0.5 h-7 bg-amber-400 origin-bottom transition-transform duration-200 shadow-[0_0_4px_#f59e0b]"
                  style={{
                    transform: `rotate(${Math.min(45, Math.max(-45, (signalStrength / 100) * 90 - 45))}deg)`,
                  }}
                />
              </div>
              <span className="text-[7px] text-center text-stone-500 mt-1 font-mono">CARRIER LEVEL</span>
            </div>
          </div>

          {/* Right Header Area: Host Selector & Callsign */}
          <div className="flex items-center gap-4">
            {availableVoices.length > 0 && (
              <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-stone-800">
                <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider">🎙️ Host:</span>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => {
                    setSelectedVoiceName(e.target.value);
                    if (isBroadcasting) handleMute();
                  }}
                  className="bg-transparent text-xs text-stone-200 outline-none font-mono cursor-pointer max-w-[150px] truncate"
                >
                  {availableVoices.map((v) => (
                    <option key={v.name} value={v.name} className="bg-stone-900 text-stone-200">
                      {v.name.replace(/Microsoft|Google|Online \(Natural\)/gi, '').trim()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-right">
              <h1 className="text-base md:text-lg font-black tracking-widest uppercase text-amber-500 flex items-center gap-2 justify-end">
                <span className={`w-2.5 h-2.5 rounded-full ${isBroadcasting ? 'bg-amber-400 animate-ping' : 'bg-red-600'}`} />
                Time-Capsule Radio
              </h1>
              <p className="text-[10px] text-stone-500 tracking-wider">SPECTRAL DEMODULATOR MK-IV</p>
            </div>
          </div>
        </div>

        {/* Tactical Control Deck */}
        <div className="p-6 md:p-8 bg-[#0e0e13] border-b border-stone-800/90 flex flex-col gap-6">
          
          {/* Category Band Selector */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {CATEGORIES.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  category === c.id
                    ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-700'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
                <span className="text-[9px] text-stone-600 hidden md:inline">[{idx + 1}]</span>
              </button>
            ))}
          </div>

          {/* Analog Dial & Frequency Staging Hub */}
          <div className="bg-black/90 border border-stone-800/90 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
            
            {/* Draggable Rotary Bakelite Tuning Knob */}
            <div className="flex flex-col items-center select-none">
              <span className="text-[10px] uppercase font-bold text-amber-500/70 mb-2 tracking-wider">Rotary Dial</span>
              <div
                ref={knobRef}
                onMouseDown={() => { isDraggingKnobRef.current = true; }}
                onTouchStart={() => { isDraggingKnobRef.current = true; }}
                className="w-28 h-28 rounded-full bg-gradient-to-tr from-stone-900 via-stone-800 to-stone-950 border-4 border-stone-700/80 shadow-[0_10px_25px_rgba(0,0,0,0.8)] relative cursor-grab active:cursor-grabbing flex items-center justify-center"
              >
                <div
                  className="w-full h-full rounded-full transition-transform duration-75 flex items-start justify-center pt-2"
                  style={{ transform: `rotate(${knobAngle}deg)` }}
                >
                  <div className="w-1.5 h-6 bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b]" />
                </div>
                <div className="w-14 h-14 rounded-full bg-stone-950 border-2 border-stone-800 shadow-inner flex items-center justify-center">
                  <span className="text-[10px] font-bold text-stone-500">TUNE</span>
                </div>
              </div>
              <span className="text-[9px] text-stone-600 mt-2 font-mono">Drag Radial Arc</span>
            </div>

            {/* Slider & Dynamic Category Eras */}
            <div className="flex-1 w-full">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-bold tracking-wider text-stone-400 uppercase">
                  {category.toUpperCase()} BAND CARRIER
                </span>
                <div className="text-right">
                  <span className="text-4xl font-black text-amber-400 tracking-tight font-mono">{selectedYear}</span>
                  <span className="text-xs text-stone-500 ml-1 font-sans">MHz</span>
                </div>
              </div>

              <input
                type="range"
                min="1996"
                max="2025"
                step="1"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full h-3 bg-stone-900 rounded-lg appearance-none cursor-ew-resize accent-amber-500 focus:outline-none"
              />

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[9px] text-stone-400 mt-4 border-t border-stone-900 pt-3">
                {eras.map((era) => (
                  <div
                    key={era.year}
                    onClick={() => setSelectedYear(era.year)}
                    className={`cursor-pointer transition-colors p-1.5 rounded-lg border ${
                      selectedYear === era.year
                        ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                        : 'border-transparent text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    <span className="block font-bold">{era.year}</span>
                    <span className="truncate block font-sans text-[10px]">{era.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger Deck */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={tuneReceiver}
              disabled={loading}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:opacity-90 active:scale-[0.99] text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-xl disabled:opacity-40"
            >
              {loading ? 'Demodulating Archive Signal...' : `Lock On & Intercept ${selectedYear} [Enter]`}
            </button>

            {broadcastScript && (
              <button
                onClick={exportCassetteMixtape}
                disabled={isExportingTape}
                className="py-4 px-5 bg-gradient-to-r from-stone-800 to-stone-900 hover:bg-stone-700 text-amber-400 font-bold uppercase tracking-wider text-xs rounded-xl border border-stone-700 shadow-lg flex items-center gap-2"
              >
                <span>📼</span>
                <span>{isExportingTape ? 'Recording Tape...' : 'Export Cassette Mixtape'}</span>
              </button>
            )}

            {isBroadcasting && (
              <button
                onClick={handleMute}
                className="px-6 py-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold uppercase text-xs rounded-xl border border-stone-700"
              >
                Mute [Space]
              </button>
            )}
          </div>
        </div>

        {/* Oscilloscope & CRT Terminal Viewport */}
        <div className="p-6 md:p-8 bg-[#09090d] flex flex-col md:flex-row gap-6">
          
          {/* Phosphor Oscilloscope */}
          <div className="w-full md:w-64 bg-black border border-stone-800 rounded-2xl p-4 flex flex-col justify-between relative shadow-inner">
            <div className="flex justify-between items-center text-[10px] text-stone-500 mb-2 font-mono">
              <span>CATHODE OSCILLOSCOPE</span>
              <button
                onClick={() => setPhosphorColor(phosphorColor === 'green' ? 'amber' : 'green')}
                className="text-[9px] border border-stone-800 px-1.5 py-0.5 rounded text-stone-400 hover:text-white uppercase"
              >
                {phosphorColor}
              </button>
            </div>
            
            <div className="w-full h-36 relative overflow-hidden rounded-xl border border-stone-900 bg-stone-950 flex items-center justify-center">
              <canvas ref={canvasRef} width={256} height={144} className="w-full h-full block" />
            </div>

            <div className="flex justify-between text-[8px] text-stone-600 mt-2 font-mono">
              <span>HORIZ: 10ms/DIV</span>
              <span>INPUT: RECTIFIED</span>
            </div>
          </div>

          {/* CRT Broadcast Terminal Viewport */}
          <div className="flex-1 bg-black border border-stone-800 rounded-2xl p-6 relative overflow-hidden min-h-[200px] flex flex-col justify-between">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50 z-10" />

            <div className="relative z-20">
              <div className="flex justify-between items-center text-[10px] text-amber-500/70 uppercase tracking-widest mb-3 border-b border-stone-900 pb-2">
                <span>{anchorDate ? `TRANSMISSION LOCK: ${anchorDate}` : 'RECEIVER STANDBY'}</span>
                <span>STATUS: {loading ? 'INTERCEPTING' : isBroadcasting ? 'ON-AIR' : broadcastScript ? 'SYNCHRONIZED' : 'CARRIER SILENT'}</span>
              </div>

              <div className="text-sm md:text-base leading-relaxed text-amber-100/95 font-serif whitespace-pre-line space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {loading ? (
                  <p className="animate-pulse text-amber-400 font-mono text-sm">
                    {TUNING_MESSAGES[tuningStatusIndex] || 'Demodulating carrier wave...'}
                  </p>
                ) : (
                  broadcastScript || 'Turn the frequency dial and lock on to intercept historical dispatches.'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recovered Wire Dossier Cards */}
        {articles.length > 0 && (
          <div className="p-6 md:p-8 bg-[#0c0c10] border-t border-stone-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                <span>🗄️</span> Recovered Wire Records ({articles.length})
              </h2>
              <span className="text-[10px] text-stone-500">Click any dispatch to inspect via archival teletype</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {articles.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setInspectArticle(item)}
                  className="bg-stone-950/80 hover:bg-black border border-stone-800/90 hover:border-amber-500/60 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] group"
                >
                  <div>
                    <div className="flex justify-between items-center text-[9px] text-amber-500/80 uppercase mb-1.5 font-mono">
                      <span className="font-bold">{item.source}</span>
                      <span className="text-stone-500 group-hover:text-amber-400 transition-colors">Inspect Teletype &rarr;</span>
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

      {/* Archival Teletype Modal */}
      {inspectArticle && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 font-mono">
          <div className="bg-[#101014] text-stone-200 border-2 border-stone-700 max-w-2xl w-full rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden relative flex flex-col">
            
            <div className="bg-[#18181f] px-5 py-3 border-b border-stone-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                  DECLASSIFIED WIRE RECORD
                </span>
                <span className="text-xs text-stone-500 tracking-wider">
                  [{inspectArticle?.category ? inspectArticle.category.toUpperCase() : 'GENERAL'} BAND]
                </span>
              </div>
              <button
                onClick={() => setInspectArticle(null)}
                className="text-stone-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-black relative overflow-hidden flex-1">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

              <div className="relative z-20 space-y-4">
                <div className="border-b border-stone-800 pb-3">
                  <span className="text-[10px] text-amber-500/80 uppercase tracking-widest block font-bold">
                    ORIGIN: {inspectArticle?.source ?? 'Historical Wire'}
                  </span>
                  <h2 className="text-base md:text-lg font-bold text-white font-serif mt-1">
                    {inspectArticle?.title ?? 'Archival Dispatch'}
                  </h2>
                </div>

                <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800/80 text-xs md:text-sm text-stone-300 font-serif leading-relaxed max-h-[240px] overflow-y-auto">
                  {inspectArticle?.summary ?? 'No summarized record preserved on this frequency.'}
                </div>

                <div className="text-[9px] text-stone-500 flex justify-between">
                  <span className="truncate max-w-xs">ARCHIVE URI: {inspectArticle?.archiveUrl ?? 'Preserved Sector'}</span>
                  <span>ENCRYPTED RECTIFIER PASS</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#141419] border-t border-stone-800 flex flex-wrap justify-end gap-2.5">
              {/* Direct Embed Solo Terminal Link */}
              <Link
                href={`/solo?url=${encodeURIComponent(inspectArticle?.archiveUrl ?? '')}&title=${encodeURIComponent(inspectArticle?.title ?? '')}&source=${encodeURIComponent(inspectArticle?.source ?? '')}&category=${encodeURIComponent(inspectArticle?.category ?? '')}&year=${selectedYear}`}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <span>🖥️</span> Open Solo CRT Terminal
              </Link>

              {inspectArticle?.archiveUrl && (
                <a
                  href={inspectArticle.archiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold uppercase tracking-wider rounded-xl border border-stone-700 text-center transition-colors"
                >
                  Raw Snapshot &nearr;
                </a>
              )}

              <button
                onClick={() => setInspectArticle(null)}
                className="py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white text-xs font-bold uppercase rounded-xl border border-stone-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cassette Mixtape Modal */}
      {showCassetteModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6">
          <div className="bg-stone-900 border-2 border-amber-500/80 max-w-md w-full rounded-2xl p-6 shadow-2xl relative text-stone-200">
            <div className="flex justify-between items-start border-b border-stone-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest block font-mono">
                  ANALOG ARTIFACT READY
                </span>
                <h3 className="text-sm font-bold text-white mt-1">Cassette Audio Exported (.WAV)</h3>
              </div>
              <button onClick={() => setShowCassetteModal(false)} className="text-stone-400 hover:text-white font-bold text-sm">
                ✕
              </button>
            </div>

            <div className="bg-stone-950 border-2 border-dashed border-stone-700 p-4 rounded-xl font-mono text-[10px] space-y-3 mb-5 select-all">
              <div className="flex justify-between border-b border-stone-800 pb-1.5">
                <span className="font-bold text-amber-400">SIDE A: {category.toUpperCase()} BAND</span>
                <span className="text-stone-500">{selectedYear} MHz</span>
              </div>
              <div>
                <span className="text-stone-500 uppercase block">Archival Index:</span>
                <ol className="list-decimal pl-4 mt-1 text-stone-300 space-y-1">
                  {articles.slice(0, 4).map((a, i) => (
                    <li key={i} className="truncate">{a.title}</li>
                  ))}
                </ol>
              </div>
              <div className="border-t border-stone-800 pt-2 flex justify-between text-stone-500 text-[8px]">
                <span>ENCODED BY GEMMA &amp; WAYBACK</span>
                <span>TYPE II CrO2 // 70us EQ</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-colors"
              >
                Print Cassette J-Card
              </button>
              <button
                onClick={() => setShowCassetteModal(false)}
                className="py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold uppercase text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}