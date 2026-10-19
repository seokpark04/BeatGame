import { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import {
  Clock,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Activity,
  Play,
  CheckCircle2,
} from 'lucide-react';

interface TimeSniperScreenProps {
  onExit: () => void;
}

export default function TimeSniperScreen({ onExit }: TimeSniperScreenProps) {
  const targetDurations = [3.0, 5.0, 7.0, 10.0];
  const [selectedTarget, setSelectedTarget] = useState<number>(5.0);

  const [state, setState] = useState<'idle' | 'countdown' | 'running' | 'result'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [elapsedDisplay, setElapsedDisplay] = useState('0.000');

  const startTimeRef = useRef<number>(0);
  const endTimeRef = useRef<number>(0);

  const [resultData, setResultData] = useState<{
    targetSec: number;
    actualSec: number;
    diffMs: number;
    accuracyScore: number;
    grade: string;
    verdict: string;
  } | null>(null);

  const [records, setRecords] = useState<
    { target: number; actual: number; diffMs: number; score: number }[]
  >([]);

  // Countdown timer
  useEffect(() => {
    if (state !== 'countdown') return;

    let c = 3;
    setCountdown(c);

    const interval = setInterval(() => {
      c--;
      if (c > 0) {
        setCountdown(c);
        audioEngine.playUserTap('GOOD');
      } else {
        clearInterval(interval);
        startRunning();
      }
    }, 750);

    return () => clearInterval(interval);
  }, [state]);

  const startRunning = () => {
    audioEngine.playMetronomeTick(undefined, true);
    startTimeRef.current = performance.now();
    setState('running');
  };

  const handleStopTap = () => {
    if (state !== 'running') return;
    endTimeRef.current = performance.now();
    const actualSec = (endTimeRef.current - startTimeRef.current) / 1000;
    const diffSec = actualSec - selectedTarget;
    const diffMs = Math.round(diffSec * 1000);
    const absDiffMs = Math.abs(diffMs);

    audioEngine.playUserTap(absDiffMs <= 30 ? 'PERFECT' : absDiffMs <= 80 ? 'GREAT' : 'GOOD');

    // Score calculation
    const accuracyScore = Math.max(0, Math.round(100 - absDiffMs * 0.1));

    let grade = 'D';
    let verdict = '오차가 큽니다. 마음속으로 정직하게 초를 세어보세요.';
    if (absDiffMs <= 15) {
      grade = 'SSS';
      verdict = '경이롭습니다! 1/100초 단위까지 맞추는 절대 내부 시계입니다.';
    } else if (absDiffMs <= 40) {
      grade = 'SS';
      verdict = '경이로운 시간 감각! 스위스 크로노미터 수준의 정밀도입니다.';
    } else if (absDiffMs <= 80) {
      grade = 'S';
      verdict = '매우 뛰어난 시간 스나이핑입니다! 프로급 체내 감각입니다.';
    } else if (absDiffMs <= 150) {
      grade = 'A';
      verdict = '안정적인 시간 감각입니다. 약간의 보정으로 S급 달성이 가능합니다.';
    } else if (absDiffMs <= 280) {
      grade = 'B';
      verdict = '양호한 수준입니다. 조금 더 일정한 템포 호흡을 유지하세요.';
    }

    const newResult = {
      targetSec: selectedTarget,
      actualSec: Math.round(actualSec * 1000) / 1000,
      diffMs,
      accuracyScore,
      grade,
      verdict,
    };

    setResultData(newResult);
    setRecords((prev) => [
      {
        target: selectedTarget,
        actual: newResult.actualSec,
        diffMs,
        score: accuracyScore,
      },
      ...prev.slice(0, 4),
    ]);
    setState('result');
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') {
        e.preventDefault();
        if (state === 'idle') {
          setState('countdown');
        } else if (state === 'running') {
          handleStopTap();
        } else if (state === 'result') {
          setState('countdown');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, selectedTarget]);

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>메인 메뉴로</span>
        </button>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs uppercase font-mono tracking-widest text-slate-300 font-bold">
            타임 스나이퍼 (Time Sniper)
          </span>
        </div>

        <div className="w-16" />
      </div>

      {/* Main Play Area */}
      <div className="max-w-2xl mx-auto w-full text-center my-auto py-6">
        {/* Target duration selector */}
        {state === 'idle' && (
          <div className="mb-8">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider block mb-3">
              목표 스나이핑 시간 선택
            </span>
            <div className="flex justify-center gap-3">
              {targetDurations.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedTarget(sec)}
                  className={`px-5 py-3 rounded-xl border font-mono font-bold text-base transition ${
                    selectedTarget === sec
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {sec.toFixed(1)}초
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              시작 버튼을 누르면 시작 신호음 후 화면과 소리가 멈춥니다.<br />
              정확히 <span className="text-cyan-400 font-bold">{selectedTarget.toFixed(3)}초</span>가 흘렀다고 생각될 때 스페이스바 또는 버튼을 누르세요!
            </p>
          </div>
        )}

        {/* Central Display */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto rounded-full bg-slate-900/80 border-2 border-slate-800 flex flex-col items-center justify-center shadow-2xl p-6 overflow-hidden">
          {/* Subtle spinning ring when running */}
          {state === 'running' && (
            <div className="absolute inset-0 border-2 border-dashed border-cyan-400/40 rounded-full animate-spin [animation-duration:8s]" />
          )}

          {state === 'idle' && (
            <div>
              <div className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-1">
                TARGET TIME
              </div>
              <div className="text-5xl font-black font-mono text-cyan-400">
                {selectedTarget.toFixed(3)}
                <span className="text-sm font-normal text-slate-400 ml-1">초</span>
              </div>
            </div>
          )}

          {state === 'countdown' && (
            <div className="animate-pulse">
              <div className="text-7xl font-black font-mono text-cyan-400">
                {countdown}
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-400 mt-2 font-mono">
                준비하세요
              </div>
            </div>
          )}

          {state === 'running' && (
            <div className="space-y-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 mx-auto animate-ping" />
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-slate-400">
                ??.???
              </div>
              <div className="text-xs text-purple-300 font-mono font-bold tracking-wider uppercase">
                시간이 흐르고 있습니다...
              </div>
            </div>
          )}

          {state === 'result' && resultData && (
            <div className="space-y-1">
              <div className="text-xs font-mono uppercase text-slate-400">
                실제 측정 시간
              </div>
              <div className="text-4xl font-black font-mono text-white">
                {resultData.actualSec.toFixed(3)}s
              </div>
              <div
                className={`text-lg font-black font-mono ${
                  resultData.diffMs > 0 ? 'text-cyan-400' : 'text-amber-400'
                }`}
              >
                {resultData.diffMs > 0 ? `+${resultData.diffMs}` : resultData.diffMs}ms
              </div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-widest mt-1">
                {resultData.grade} 등급 · {resultData.accuracyScore}점
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-8">
          {state === 'idle' && (
            <button
              onClick={() => setState('countdown')}
              className="px-10 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-lg tracking-wide shadow-lg shadow-cyan-500/25 transition cursor-pointer"
            >
              스나이핑 시작 (Space)
            </button>
          )}

          {state === 'running' && (
            <button
              onClick={handleStopTap}
              className="w-full max-w-sm py-5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xl tracking-wider shadow-lg shadow-rose-500/40 transition animate-pulse cursor-pointer"
            >
              지금이다! (STOP TAP)
            </button>
          )}

          {state === 'result' && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                {resultData?.verdict}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setState('countdown')}
                  className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-md transition"
                >
                  한 번 더 도전 (Space)
                </button>
                <button
                  onClick={() => setState('idle')}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                >
                  시간 변경
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Records Log */}
        {records.length > 0 && (
          <div className="mt-8 max-w-md mx-auto bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-left">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block mb-2">
              최근 도전 기록
            </span>
            <div className="space-y-1.5 text-xs font-mono">
              {records.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-slate-300 py-0.5 border-b border-slate-800/40 last:border-0"
                >
                  <span>목표 {r.target.toFixed(1)}초</span>
                  <span className="text-white font-bold">{r.actual.toFixed(3)}초</span>
                  <span
                    className={
                      Math.abs(r.diffMs) <= 35 ? 'text-amber-400 font-bold' : 'text-slate-400'
                    }
                  >
                    {r.diffMs > 0 ? `+${r.diffMs}` : r.diffMs}ms
                  </span>
                  <span className="text-cyan-400 font-bold">{r.score}점</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer controls hint */}
      <footer className="text-center text-[11px] text-slate-400 font-mono">
        [Space / J / K] 조작 키로 즉시 발동
      </footer>
    </div>
  );
}
