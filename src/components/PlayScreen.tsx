import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DifficultyConfig,
  TapRecord,
  Judgment,
  AudioSettings,
} from '../types/game';
import { audioEngine } from '../services/audioEngine';
import GameCanvas from './GameCanvas';
import {
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  Flame,
  ArrowLeft,
} from 'lucide-react';

interface PlayScreenProps {
  difficulty: DifficultyConfig;
  targetBpm: number;
  audioSettings: AudioSettings;
  onFinishGame: (taps: TapRecord[], targetBpm: number, totalBeats: number) => void;
  onExit: () => void;
}

export default function PlayScreen({
  difficulty,
  targetBpm,
  audioSettings,
  onFinishGame,
  onExit,
}: PlayScreenProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(audioSettings.isMuted);

  // Game state
  const [phase, setPhase] = useState<'ready' | 'playing' | 'completed'>('ready');
  const [readyCountdown, setReadyCountdown] = useState(3);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [currentBeatProgress, setCurrentBeatProgress] = useState(0);
  const [isSilent, setIsSilent] = useState(false);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);

  const [lastJudgment, setLastJudgment] = useState<{
    text: string;
    offsetMs: number;
    judgment: Judgment;
    id: number;
  } | null>(null);

  // Timing references
  const startTimeRef = useRef<number>(0);
  const beatIntervalMs = (60 / targetBpm) * 1000;
  const totalBeats = difficulty.cueBeats + difficulty.silentBeats;

  const tapsRef = useRef<TapRecord[]>([]);
  const tappedBeatsSet = useRef<Set<number>>(new Set());
  const scheduledBeatsRef = useRef<Set<number>>(new Set());
  const judgmentCounterRef = useRef<number>(0);

  // Start Ready Countdown
  useEffect(() => {
    if (phase !== 'ready') return;
    let count = 3;
    setReadyCountdown(count);

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setReadyCountdown(count);
        // Play small countdown blip
        audioEngine.playUserTap('GOOD');
      } else {
        clearInterval(timer);
        // Start game session
        startGameSession();
      }
    }, 800);

    return () => clearInterval(timer);
  }, [phase]);

  const startGameSession = () => {
    tapsRef.current = [];
    tappedBeatsSet.current.clear();
    scheduledBeatsRef.current.clear();
    setStreak(0);
    setScore(0);
    setCurrentBeatIndex(0);
    setIsSilent(false);

    // Synchronize zero-timestamp
    const now = performance.now() + 100; // Small prep buffer
    startTimeRef.current = now;
    setPhase('playing');
  };

  // Process user tap action
  const handleUserTap = useCallback(() => {
    if (phase !== 'playing' || isPaused) return;

    const tapTime = performance.now() - audioSettings.calibrationOffsetMs;
    const elapsedSinceStart = tapTime - startTimeRef.current;

    if (elapsedSinceStart < -50) return; // Before game starts

    // Find closest expected beat
    const floatBeat = elapsedSinceStart / beatIntervalMs;
    const closestBeat = Math.round(floatBeat);

    // Limit within playable range
    if (closestBeat < 0 || closestBeat >= totalBeats) return;

    // Avoid double tap registering for the exact same beat
    if (tappedBeatsSet.current.has(closestBeat)) {
      return;
    }
    tappedBeatsSet.current.add(closestBeat);

    const expectedTime = startTimeRef.current + closestBeat * beatIntervalMs;
    const offsetMs = tapTime - expectedTime;
    const absOffset = Math.abs(offsetMs);

    // Determine judgment
    let judgment: Judgment = 'MISS';
    let text = 'MISS';

    if (absOffset <= difficulty.perfectWindow) {
      judgment = 'PERFECT';
      text = 'PERFECT';
      setStreak((s) => s + 1);
      setScore((sc) => sc + 1000 + Math.max(0, 500 - Math.round(absOffset * 10)));
    } else if (absOffset <= difficulty.greatWindow) {
      judgment = 'GREAT';
      text = offsetMs < 0 ? 'EARLY (GREAT)' : 'LATE (GREAT)';
      setStreak((s) => s + 1);
      setScore((sc) => sc + 600);
    } else if (absOffset <= difficulty.goodWindow) {
      judgment = 'GOOD';
      text = offsetMs < 0 ? 'EARLY (GOOD)' : 'LATE (GOOD)';
      setStreak(0);
      setScore((sc) => sc + 250);
    } else {
      judgment = 'MISS';
      text = offsetMs < 0 ? 'TOO EARLY' : 'TOO LATE';
      setStreak(0);
    }

    // Play feedback sound
    audioEngine.playUserTap(judgment);

    judgmentCounterRef.current++;
    setLastJudgment({
      text,
      offsetMs,
      judgment,
      id: judgmentCounterRef.current,
    });

    const isSilentPhase = closestBeat >= difficulty.cueBeats;
    tapsRef.current.push({
      beatIndex: closestBeat,
      expectedTimeMs: expectedTime,
      actualTimeMs: tapTime,
      offsetMs: Math.round(offsetMs * 10) / 10,
      judgment,
      isSilentPhase,
    });
  }, [phase, isPaused, audioSettings, beatIntervalMs, totalBeats, difficulty]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') {
        e.preventDefault();
        handleUserTap();
      } else if (e.code === 'Escape') {
        setIsPaused((p) => !p);
      } else if (e.code === 'KeyM') {
        setIsMuted((m) => {
          const next = !m;
          audioEngine.setMuted(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUserTap]);

  // Main High-Precision Metronome & State Loop
  useEffect(() => {
    if (phase !== 'playing' || isPaused) return;

    let animId: number;

    const loop = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      if (elapsed >= 0) {
        const floatBeat = elapsed / beatIntervalMs;
        const currentBeat = Math.floor(floatBeat);
        const beatProgress = floatBeat - currentBeat;

        setCurrentBeatIndex(currentBeat);
        setCurrentBeatProgress(beatProgress);

        const inSilent = currentBeat >= difficulty.cueBeats;
        setIsSilent(inSilent);

        // Schedule metronome audio clicks for Cue Beats
        if (!inSilent && currentBeat < totalBeats) {
          if (!scheduledBeatsRef.current.has(currentBeat)) {
            scheduledBeatsRef.current.add(currentBeat);
            const isDownbeat = currentBeat === 0;
            audioEngine.playMetronomeTick(undefined, isDownbeat);
          }
        }

        // Check for missed beats in silent phase (if beat passed by more than goodWindow)
        const checkBeat = currentBeat - 1;
        if (checkBeat >= 0 && checkBeat < totalBeats) {
          if (!tappedBeatsSet.current.has(checkBeat)) {
            const beatExpectedTime = startTimeRef.current + checkBeat * beatIntervalMs;
            if (now - beatExpectedTime > difficulty.goodWindow + 50) {
              tappedBeatsSet.current.add(checkBeat);
              tapsRef.current.push({
                beatIndex: checkBeat,
                expectedTimeMs: beatExpectedTime,
                actualTimeMs: beatExpectedTime + difficulty.goodWindow + 60,
                offsetMs: difficulty.goodWindow + 60,
                judgment: 'MISS',
                isSilentPhase: checkBeat >= difficulty.cueBeats,
              });
            }
          }
        }

        // Check session completion: When last beat + margin has elapsed
        if (currentBeat >= totalBeats) {
          setPhase('completed');
          audioEngine.playVictoryFanfare();
          setTimeout(() => {
            onFinishGame(tapsRef.current, targetBpm, totalBeats);
          }, 600);
          return;
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, isPaused, beatIntervalMs, totalBeats, difficulty, targetBpm, onFinishGame]);

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 text-white flex flex-col justify-between select-none overflow-hidden">
      {/* Top HUD: Perimeter Status Clusters */}
      <div className="relative z-20 flex items-center justify-between p-4 md:p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">나가기</span>
          </button>
          <div className="text-left">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
              {difficulty.name}
            </span>
            <div className="text-sm font-black text-cyan-400 font-mono">
              {targetBpm} BPM
            </div>
          </div>
        </div>

        {/* Phase Indicator Pill */}
        <div className="text-center">
          {phase === 'playing' ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 shadow-md">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSilent ? 'bg-purple-500 animate-ping' : 'bg-cyan-400 animate-pulse'
                }`}
              />
              <span className="text-xs font-bold font-mono">
                {isSilent
                  ? `무음 구간 ${Math.min(
                      difficulty.silentBeats,
                      Math.max(1, currentBeatIndex - difficulty.cueBeats + 1)
                    )} / ${difficulty.silentBeats}`
                  : `가이드 비트 ${Math.min(
                      difficulty.cueBeats,
                      currentBeatIndex + 1
                    )} / ${difficulty.cueBeats}`}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono">준비 중...</div>
          )}
        </div>

        {/* Score & Streak Readout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
              SCORE
            </div>
            <div className="text-base font-black text-amber-400 tabular-nums font-mono">
              {score.toLocaleString()}
            </div>
          </div>

          {streak > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black font-mono">
              <Flame className="w-3.5 h-3.5 fill-current" />
              {streak} COMBO
            </div>
          )}

          <button
            onClick={() => {
              setIsMuted((m) => {
                const next = !m;
                audioEngine.setMuted(next);
                return next;
              });
            }}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Centerpiece: Canvas Viewport */}
      <div className="relative flex-1 w-full max-w-4xl mx-auto flex items-center justify-center p-2">
        {/* Isolated Canvas Container */}
        <div className="relative w-full h-[360px] sm:h-[440px] md:h-[500px]">
          <GameCanvas
            currentBeatProgress={currentBeatProgress}
            totalBeats={totalBeats}
            currentBeatIndex={currentBeatIndex}
            cueBeats={difficulty.cueBeats}
            isSilent={isSilent}
            showVisualGuide={difficulty.showVisualCueDuringSilence}
            lastJudgment={lastJudgment}
            streak={streak}
            bpm={targetBpm}
            isPlaying={phase === 'playing'}
          />

          {/* Center Countdown Overlay during 'ready' */}
          {phase === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-6xl sm:text-8xl font-black text-cyan-400 drop-shadow-[0_0_30px_rgba(56,189,248,0.6)] animate-pulse font-mono">
                {readyCountdown}
              </div>
              <div className="text-sm font-bold text-slate-300 uppercase tracking-widest mt-2">
                리듬에 귀를 기울이세요
              </div>
            </div>
          )}

          {/* Blind Zone Alert Banner */}
          {phase === 'playing' && isSilent && (
            <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
              <div className="px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/60 text-purple-200 text-xs font-bold tracking-wider uppercase animate-pulse shadow-lg shadow-purple-900/40">
                침묵 구간 진입 · 내면의 박자를 탭하세요!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Big Responsive Tactile Tap Button & Controls */}
      <div className="relative z-20 max-w-xl mx-auto w-full p-4 pb-6 flex flex-col items-center gap-3">
        <button
          onClick={handleUserTap}
          className="w-full max-w-md h-20 sm:h-24 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xl tracking-wider shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-transform flex flex-col items-center justify-center cursor-pointer border border-cyan-400/30"
        >
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 animate-pulse" />
            <span>BEAT TAP</span>
          </div>
          <span className="text-[11px] font-normal font-mono opacity-80 mt-1">
            스페이스바(Space) 또는 J / K 키를 누르세요
          </span>
        </button>

        <div className="text-xs text-slate-400 font-mono">
          판정 허용치: PERFECT ±{difficulty.perfectWindow}ms · GREAT ±{difficulty.greatWindow}ms
        </div>
      </div>

      {/* Pause Modal */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center text-white">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center mx-auto mb-3">
              <Pause className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-1">게임 일시정지</h3>
            <p className="text-xs text-slate-400 mb-6">
              호흡을 가다듬고 내면의 리듬을 다시 정렬하세요.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition"
              >
                계속하기 (Esc)
              </button>
              <button
                onClick={() => {
                  setIsPaused(false);
                  startGameSession();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                처음부터 다시 시작
              </button>
              <button
                onClick={onExit}
                className="w-full py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs transition"
              >
                메인 메뉴로 나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
