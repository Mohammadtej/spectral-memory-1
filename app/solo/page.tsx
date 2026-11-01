'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SoloIframeContent() {
  const searchParams = useSearchParams();

  const rawUrl = searchParams.get('url') || '';
  const title = searchParams.get('title') || 'Archival Transmission';
  const source = searchParams.get('source') || 'Historical Wire';
  const category = searchParams.get('category') || 'general';
  const year = searchParams.get('year') || '2004';

  const [scanlinesActive, setScanlinesActive] = useState<boolean>(true);
  const [phosphorMode, setPhosphorMode] = useState<'color' | 'green' | 'amber'>('color');
  const [isDegaussing, setIsDegaussing] = useState<boolean>(false);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [powerOn, setPowerOn] = useState<boolean>(true);

  // Normalize URL with id_ so Wayback Machine displays without its injection header
  const normalizedUrl = React.useMemo(() => {
    if (!rawUrl) return '';
    if (rawUrl.includes('web.archive.org/web/')) {
      return rawUrl.replace(/\/web\/(\d+)(?:\/|id_\/)/, '/web/$1id_/');
    }
    return rawUrl;
  }, [rawUrl]);

  // Vintage monitor degauss effect (screen shake + high-voltage flash)
  const triggerDegauss = () => {
    setIsDegaussing(true);
    setTimeout(() => setIsDegaussing(false), 900);
  };

  const cyclePhosphor = () => {
    if (phosphorMode === 'color') setPhosphorMode('green');
    else if (phosphorMode === 'green') setPhosphorMode('amber');
    else setPhosphorMode('color');
  };

  return (
    <div className="w-full max-w-6xl flex flex-col items-center">
      {/* Dynamic CRT Animation Keyframes */}
      <style jsx global>{`
        @keyframes crt-power-on {
          0% {
            transform: scaleY(0.005) scaleX(0);
            filter: brightness(25) contrast(3);
          }
          40% {
            transform: scaleY(0.005) scaleX(1);
            filter: brightness(15);
          }
          70% {
            transform: scaleY(1.05) scaleX(1);
            filter: brightness(2.5);
          }
          100% {
            transform: scaleY(1) scaleX(1);
            filter: brightness(1);
          }
        }
        @keyframes crt-degauss-shake {
          0% { transform: translate(0, 0) skew(0deg); filter: hue-rotate(0deg) contrast(2.5); }
          15% { transform: translate(-6px, 4px) skew(2.5deg); filter: hue-rotate(90deg) contrast(3); }
          30% { transform: translate(7px, -5px) skew(-2deg); filter: hue-rotate(180deg) contrast(2); }
          45% { transform: translate(-4px, 3px) skew(1deg); filter: hue-rotate(270deg) contrast(1.5); }
          65% { transform: translate(3px, -2px) skew(-0.5deg); filter: hue-rotate(360deg); }
          100% { transform: translate(0, 0) skew(0deg); filter: none; }
        }
        @keyframes scanline-roll {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes phosphor-flicker {
          0% { opacity: 0.98; }
          50% { opacity: 1; }
          55% { opacity: 0.95; }
          60% { opacity: 0.99; }
          100% { opacity: 0.97; }
        }
        .crt-monitor-active {
          animation: crt-power-on 0.65s cubic-bezier(0.23, 1, 0.32, 1) forwards, phosphor-flicker 0.15s infinite;
        }
        .degauss-active {
          animation: crt-degauss-shake 0.85s ease-in-out forwards;
        }
      `}</style>

      {/* Monitor Chassis Bezel */}
      <div className="w-full bg-[#1e1e24] border-8 border-[#141418] rounded-[2.5rem] p-4 md:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.1)] flex flex-col relative">
        
        {/* Top Bezel Branding & Status Strip */}
        <div className="flex justify-between items-center mb-4 px-2 select-none">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="py-1.5 px-3.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 group active:scale-95 shadow-sm"
            >
              <span className="text-amber-500 group-hover:-translate-x-0.5 transition-transform">&larr;</span>
              <span>TUNER DECK</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 bg-black/60 px-3 py-1 rounded-lg border border-stone-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                CARRIER LOCK // {year} MHz
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-widest uppercase text-amber-500 bg-black/80 px-3 py-1 rounded-lg border border-amber-500/30">
              {category.toUpperCase()} SECTOR
            </span>
            <div className="text-right hidden md:block">
              <span className="text-[10px] text-stone-500 font-mono block leading-none">WAYBACK TERMINAL</span>
              <span className="text-[9px] text-stone-600 font-mono">RGB-CRT MK-II</span>
            </div>
          </div>
        </div>

        {/* Cathode Ray Tube Display Assembly */}
        <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-black rounded-3xl overflow-hidden border-4 border-stone-950 shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] flex items-center justify-center">
          
          {powerOn ? (
            <div
              className={`w-full h-full relative flex flex-col crt-monitor-active ${
                isDegaussing ? 'degauss-active' : ''
              }`}
            >
              {/* Phosphor Tint Filter Overlay */}
              {phosphorMode === 'green' && (
                <div className="absolute inset-0 bg-[#00ff41]/15 mix-blend-color pointer-events-none z-20" />
              )}
              {phosphorMode === 'amber' && (
                <div className="absolute inset-0 bg-[#ffb000]/15 mix-blend-color pointer-events-none z-20" />
              )}

              {/* Dynamic Scanline Grid & Tube Curvature Vignette */}
              {scanlinesActive && (
                <div
                  className="absolute inset-0 pointer-events-none z-30 opacity-60"
                  style={{
                    background:
                      'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.45) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.04), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.04))',
                    backgroundSize: '100% 3px, 6px 100%',
                  }}
                />
              )}

              {/* Glass Reflection & Perimeter Curvature Vignette */}
              <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_100px_rgba(0,0,0,0.9),inset_0_0_40px_rgba(0,0,0,0.95)]" />

              {/* In-Screen Archive Metadata Bar */}
              <div className="bg-[#121218] border-b border-stone-800 px-4 py-2 flex justify-between items-center z-10 select-none">
                <div className="flex items-center gap-2 truncate pr-4">
                  <span className="text-[10px] text-amber-500 font-bold uppercase truncate font-mono">
                    [{source}]
                  </span>
                  <span className="text-xs text-stone-200 font-serif font-bold truncate">
                    {title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[10px] font-mono">
                  {iframeLoading && (
                    <span className="text-amber-400 animate-pulse flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      FETCHING BEAM...
                    </span>
                  )}
                  <a
                    href={normalizedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 hover:text-amber-400 underline transition-colors"
                  >
                    Open Raw &nearr;
                  </a>
                </div>
              </div>

              {/* Embedded Wayback Snapshot Iframe */}
              <div className="flex-1 w-full relative bg-stone-900">
                {iframeLoading && (
                  <div className="absolute inset-0 bg-[#07070a] flex flex-col items-center justify-center gap-3 z-10 text-stone-400">
                    <div className="w-10 h-10 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
                    <p className="text-xs font-mono text-amber-400/90 animate-pulse">
                      SYNCHRONIZING ANALOG RASTER // TARGET: {year}
                    </p>
                  </div>
                )}

                {normalizedUrl ? (
                  <iframe
                    src={normalizedUrl}
                    title={title}
                    onLoad={() => setIframeLoading(false)}
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-stone-500 font-mono">
                    <p className="text-sm font-bold text-red-400">[CARRIER DROP]: NO ARCHIVE URL PROVIDED</p>
                    <Link href="/" className="mt-4 py-2 px-4 bg-stone-800 text-stone-200 text-xs rounded-xl">
                      Return to Radio Tuner
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Cold CRT Monitor Power Off State */
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-700 font-mono select-none">
              <div className="w-2 h-2 rounded-full bg-stone-800 mb-2" />
              <p className="text-xs uppercase tracking-widest">MONITOR DE-ENERGIZED</p>
            </div>
          )}
        </div>

        {/* Tactile Hardware Control Deck (Below Screen) */}
        <div className="mt-6 flex flex-wrap justify-between items-center gap-4 bg-[#141418] p-4 rounded-2xl border border-stone-800/80 shadow-inner select-none font-mono">
          
          {/* Bezel Mode & Adjustment Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setScanlinesActive((prev) => !prev)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                scanlinesActive
                  ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${scanlinesActive ? 'bg-amber-400' : 'bg-stone-700'}`} />
              <span>Scanlines: {scanlinesActive ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={cyclePhosphor}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <span>Phosphor:</span>
              <span className="uppercase text-amber-400 font-bold">{phosphorMode}</span>
            </button>

            <button
              onClick={triggerDegauss}
              disabled={!powerOn || isDegaussing}
              className="py-2 px-3 bg-stone-900 hover:bg-stone-800 active:bg-amber-500 active:text-black border border-stone-800 hover:border-stone-700 text-stone-300 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            >
              ⚡ Degauss Tube
            </button>
          </div>

          {/* Master Power Switch & Indicator LED */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-wider text-stone-500 font-bold">ANALOG TUBE POWER</span>
              <span className="text-[10px] text-stone-400 font-mono">{powerOn ? 'HIGH VOLTAGE ACTIVE' : 'COLD RAIL'}</span>
            </div>

            <button
              onClick={() => setPowerOn((prev) => !prev)}
              className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all shadow-md active:scale-95 ${
                powerOn
                  ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-red-950/60 border-red-800/80 text-red-500'
              }`}
            >
              <span className="text-base font-black">⏻</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SoloPage() {
  return (
    <main className="min-h-screen bg-[#07070a] text-stone-200 p-3 md:p-8 flex flex-col items-center justify-center font-mono selection:bg-amber-500 selection:text-black">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 text-stone-400">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs uppercase tracking-widest text-amber-400 animate-pulse">
              INITIALIZING CATHODE BEAM TERMINAL...
            </p>
          </div>
        }
      >
        <SoloIframeContent />
      </Suspense>
    </main>
  );
}