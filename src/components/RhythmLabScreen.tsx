import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import {
  Zap,
  ArrowLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Square,
  Activity,
  Sliders,
} from 'lucide-react';

interface RhythmLabScreenProps {
  onExit: () => void;
}

interface LiveTapData {
  timeMs: number;
  expectedMs: number;
  offsetMs: number;
  judgment: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';
}

export default function RhythmLabScreen({ onExit }: RhythmLabScreenProps) {
  const [bpm, setBpm] = useState<number>(120);
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(true);
  const [subdivision, setSubdivision] = useState<number>(1); // 1 = Quarter, 2 = 8th, 3 = Triplet, 4 = 16th

  const [taps, setTaps] = useState<LiveTapData[]>([]);
  const [lastOffset, setLastOffset] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(0);

  const isMetronomeActiveRef = useRef(isMetronomeActive);
  isMetronomeActiveRef.current = isMetronomeActive;

  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const subdivisionRef = useRef(subdivision);
  subdivisionRef.current = subdivision;

  // Metronome scheduler via Web Audio
  const nextNoteTimeRef = useRef<number>(0);
  const timerIdRef = useRef<number | null>(null);

  // High precision scheduler loop
  useEffect(() => {
    nextNoteTimeRef.current = audioEngine.getCurrentTime() + 0.05;

    const schedule = () => {
      const currentTime = audioEngine.getCurrentTime();
      const intervalSec = 60 / bpmRef.current / subdivisionRef.current;

      while (nextNoteTimeRef.current < currentTime + 0.1) {
        if (isMetronomeActiveRef.current) {
          audioEngine.playMetronomeTick(nextNoteTimeRef.current, false);
        }
        nextNoteTimeRef.current += intervalSec;
      }
      timerIdRef.current = window.setTimeout(schedule, 25);
    };

    schedule();

    return () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
    };
  }, []);

  // Handle free user tap
  const handleTap = useCallback(() => {
    const tapAudioTime = audioEngine.getCurrentTime();
    const intervalSec = 60 / bpmRef.current / subdivisionRef.current;

    // Nearest beat in Web Audio timeline
    const timeSincePrev = (tapAudioTime - nextNoteTimeRef.current) % intervalSec;
    // Normalize to closest tick
    let offsetSec = timeSincePrev;
    if (offsetSec < -intervalSec / 2) offsetSec += intervalSec;
    if (offsetSec > intervalSec / 2) offsetSec -= intervalSec;

    const offsetMs = Math.round(offsetSec * 1000);
    const absOffset = Math.abs(offsetMs);

    let judgment: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' = 'MISS';
    if (absOffset <= 20) judgment = 'PERFECT';
    else if (absOffset <= 45) judgment = 'GREAT';
    else if (absOffset <= 80) judgment = 'GOOD';

    audioEngine.playUserTap(judgment);

    setLastOffset(offsetMs);
    if (judgment === 'PERFECT' || judgment === 'GREAT') {
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    setTaps((prev) => [
      ...prev.slice(-49), // Keep last 50 taps for real-time running stats
      {
        timeMs: performance.now(),
        expectedMs: performance.now() - offsetMs,
        offsetMs,
        judgment,
      },
    ]);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTap]);

  // Real-time calculations
  const offsets = taps.map((t) => t.offsetMs);
  const avgOffset =
    offsets.length > 0
      ? Math.round((offsets.reduce((a, b) => a + b, 0) / offsets.length) * 10) / 10
      : 0;
  const absOffsets = offsets.map((o) => Math.abs(o));
  const mae =
    absOffsets.length > 0
      ? Math.round((absOffsets.reduce((a, b) => a + b, 0) / absOffsets.length) * 10) / 10
      : 0;

  const variance =
    offsets.length > 1
      ? offsets.reduce((acc, val) => acc + Math.pow(val - avgOffset, 2), 0) /
        (offsets.length - 1)
      : 0;
  const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

  const handleReset = () => {
    setTaps([]);
    setLastOffset(null);
    setStreak(0);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>메인 메뉴로</span>
        </button>

        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-xs uppercase font-mono tracking-widest text-slate-300 font-bold">
            프리 리듬 분석 연구소 (Endless Rhythm Lab)
          </span>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>기록 초기화</span>
        </button>
      </div>

      {/* Main Analysis Body */}
      <div className="max-w-4xl mx-auto w-full my-auto py-4 space-y-4">
        {/* Metronome & BPM Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMetronomeActive((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                isMetronomeActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {isMetronomeActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{isMetronomeActive ? '메트로놈 클릭 ON' : '무음 탭 모드 (클릭 OFF)'}</span>
            </button>

            {/* Subdivision Buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { label: '4분음표', sub: 1 },
                { label: '8분음표', sub: 2 },
                { label: '3연음', sub: 3 },
                { label: '16분음표', sub: 4 },
              ].map((s) => (
                <button
                  key={s.sub}
                  onClick={() => setSubdivision(s.sub)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    subdivision === s.sub
                      ? 'bg-slate-800 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* BPM Slider */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-mono">TEMPO:</span>
            <span className="text-lg font-black font-mono text-cyan-400 w-16 text-right">
              {bpm}
            </span>
            <input
              type="range"
              min="50"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value, 10))}
              className="accent-cyan-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg w-32"
            />
          </div>
        </div>

        {/* Real-Time Early / Late Analog Gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <div className="flex justify-between text-xs text-slate-400 font-mono mb-2">
            <span className="text-amber-400 font-bold">← RUSH (빠름 -50ms)</span>
            <span className="text-emerald-400 font-bold">PERFECT 0ms</span>
            <span className="text-cyan-400 font-bold">DRAG (느림 +50ms) →</span>
          </div>

          {/* Horizontal Gauge Bar */}
          <div className="relative w-full h-8 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center px-2">
            {/* Center target indicator */}
            <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-1 bg-emerald-500 z-10" />
            <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-8 bg-emerald-500/10 pointer-events-none" />

            {/* Needle pointer */}
            {lastOffset !== null && (
              <div
                className="absolute top-1 bottom-1 w-2 rounded-full transition-all duration-100 -translate-x-1/2 z-20 shadow-lg"
                style={{
                  left: `${Math.max(5, Math.min(95, 50 + (lastOffset / 50) * 45))}%`,
                  backgroundColor:
                    Math.abs(lastOffset) <= 20
                      ? '#fbbf24'
                      : lastOffset < 0
                      ? '#fb923c'
                      : '#38bdf8',
                }}
              />
            )}
          </div>

          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="text-xs text-slate-400 font-mono">방금 탭 타이밍:</span>
            <span
              className={`text-2xl font-black font-mono tabular-nums ${
                lastOffset === null
                  ? 'text-slate-600'
                  : Math.abs(lastOffset) <= 20
                  ? 'text-amber-400'
                  : lastOffset < 0
                  ? 'text-amber-300'
                  : 'text-cyan-300'
              }`}
            >
              {lastOffset === null
                ? '--'
                : `${lastOffset > 0 ? '+' : ''}${lastOffset} ms`}
            </span>
            {streak > 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold font-mono">
                {streak} COMBO
              </span>
            )}
          </div>
        </div>

        {/* 3 Real-time Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">
              누적 평균 오차 (MAE)
            </span>
            <div className="text-2xl font-black font-mono text-cyan-400">
              ±{mae} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              최근 {taps.length}회 탭 기준
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">
              지터 / 표준편차 (Jitter)
            </span>
            <div className="text-2xl font-black font-mono text-amber-400">
              ±{stdDev} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              타격 간격 일관성 지표
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">
              평균 편향 (Bias)
            </span>
            <div
              className={`text-2xl font-black font-mono ${
                avgOffset > 0 ? 'text-cyan-300' : 'text-amber-300'
              }`}
            >
              {avgOffset > 0 ? `+${avgOffset}` : avgOffset}{' '}
              <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {avgOffset < -5
                ? '성급함(Rush) 경향'
                : avgOffset > 5
                ? '지연(Drag) 경향'
                : '중립적 균형'}
            </p>
          </div>
        </div>

        {/* Big Tap Button */}
        <button
          onClick={handleTap}
          className="w-full h-24 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xl tracking-wider shadow-lg transition flex flex-col items-center justify-center cursor-pointer border border-cyan-400/30"
        >
          <span>TAP HERE</span>
          <span className="text-xs font-normal font-mono opacity-80 mt-1">
            Spacebar / J / K 키로도 탭할 수 있습니다
          </span>
        </button>
      </div>

      <footer className="text-center text-[11px] text-slate-400 font-mono">
        무제한 자유 리듬 트레이닝 모드
      </footer>
    </div>
  );
}
