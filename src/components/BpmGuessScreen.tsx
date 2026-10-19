import { useState, useRef, useEffect, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import {
  Flame,
  ArrowLeft,
  Volume2,
  Play,
  RotateCcw,
  CheckCircle2,
  Radio,
} from 'lucide-react';

interface BpmGuessScreenProps {
  onExit: () => void;
}

export default function BpmGuessScreen({ onExit }: BpmGuessScreenProps) {
  const [secretBpm, setSecretBpm] = useState<number>(120);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [hasHeardPreview, setHasHeardPreview] = useState<boolean>(false);

  // User input modes
  const [guessedBpm, setGuessedBpm] = useState<number>(120);
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<boolean>(false);

  // Initialize random secret BPM between 70 and 165
  const generateNewSecret = useCallback(() => {
    // Generate natural musical tempos
    const randomBpm = Math.floor(Math.random() * (160 - 72) + 72);
    setSecretBpm(randomBpm);
    setGuessedBpm(120);
    setTapTimestamps([]);
    setRevealed(false);
    setHasHeardPreview(false);
  }, []);

  useEffect(() => {
    generateNewSecret();
  }, [generateNewSecret]);

  // Play 4 secret beats
  const playPreviewBeats = () => {
    if (isPlayingPreview) return;
    setIsPlayingPreview(true);
    setHasHeardPreview(true);

    const intervalSec = 60 / secretBpm;
    const now = audioEngine.getCurrentTime() + 0.05;

    for (let i = 0; i < 4; i++) {
      audioEngine.playMetronomeTick(now + i * intervalSec, i === 0);
    }

    setTimeout(() => {
      setIsPlayingPreview(false);
    }, (4 * intervalSec + 0.2) * 1000);
  };

  // Handle tap input to calculate BPM
  const handleTap = () => {
    audioEngine.playUserTap('PERFECT');
    const now = performance.now();
    setTapTimestamps((prev) => {
      const updated = [...prev, now];
      // Keep last 8 taps
      const sliced = updated.slice(-8);

      if (sliced.length >= 2) {
        // Compute average interval
        const intervals: number[] = [];
        for (let i = 1; i < sliced.length; i++) {
          intervals.push(sliced[i] - sliced[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (avgInterval > 150 && avgInterval < 2000) {
          const calcBpm = Math.round(60000 / avgInterval);
          setGuessedBpm(calcBpm);
        }
      }
      return sliced;
    });
  };

  // Check result
  const handleReveal = () => {
    setRevealed(true);
    const diff = Math.abs(guessedBpm - secretBpm);
    if (diff <= 3) {
      audioEngine.playVictoryFanfare();
    } else {
      audioEngine.playUserTap('GOOD');
    }
  };

  const diff = Math.abs(guessedBpm - secretBpm);
  const accuracy = Math.max(0, Math.round(100 - diff * 2.2));

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
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-xs uppercase font-mono tracking-widest text-slate-300 font-bold">
            절대 BPM 청음 추정 (Ear BPM Challenge)
          </span>
        </div>

        <div className="w-16" />
      </div>

      {/* Center Body */}
      <div className="max-w-2xl mx-auto w-full text-center my-auto py-6">
        {/* Step 1: Listen to secret beats */}
        <div className="mb-6">
          <button
            onClick={playPreviewBeats}
            disabled={isPlayingPreview}
            className={`px-8 py-4 rounded-2xl font-black text-base md:text-lg flex items-center justify-center gap-3 mx-auto shadow-xl transition cursor-pointer ${
              isPlayingPreview
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-slate-600'
            }`}
          >
            <Volume2 className="w-5 h-5 text-amber-400" />
            <span>
              {isPlayingPreview ? '비밀 4박자 재생 중...' : '1단계: 비밀 박자 듣기 (4비트)'}
            </span>
          </button>
          <p className="text-xs text-slate-400 mt-2">
            버튼을 누르면 미지의 템포로 4박자가 연주됩니다. 그 박자의 정확한 BPM을 맞춰보세요!
          </p>
        </div>

        {/* Step 2: Guessing Display */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
            내가 추측한 템포
          </div>

          <div className="text-6xl font-black font-mono text-cyan-400 my-2">
            {guessedBpm}
            <span className="text-lg font-normal text-slate-400 ml-2">BPM</span>
          </div>

          {/* Tap input to match BPM */}
          <div className="my-6">
            <button
              onClick={handleTap}
              className="w-full max-w-sm py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-bold text-sm tracking-wide shadow-md transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>여기를 연속으로 탭해서 BPM 맞추기</span>
              <span className="text-xs opacity-75 font-mono">
                ({tapTimestamps.length}회 탭)
              </span>
            </button>
          </div>

          {/* Fine Tuning Slider */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-xs text-slate-400 font-mono mb-1">
              <span>60 BPM</span>
              <span>슬라이더 미세 조정</span>
              <span>180 BPM</span>
            </div>
            <input
              type="range"
              min="60"
              max="180"
              value={guessedBpm}
              onChange={(e) => setGuessedBpm(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
            />
          </div>
        </div>

        {/* Action: Reveal or Next */}
        {!revealed ? (
          <button
            onClick={handleReveal}
            disabled={!hasHeardPreview}
            className={`px-10 py-3.5 rounded-xl font-black text-base tracking-wide transition shadow-lg ${
              hasHeardPreview
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            정답 확인하기
          </button>
        ) : (
          <div className="bg-slate-900 border border-amber-400/50 rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-1">
              SECRET TEMPO RESULT
            </div>
            <div className="flex items-center justify-center gap-8 my-3">
              <div>
                <div className="text-xs text-slate-400">실제 비밀 BPM</div>
                <div className="text-4xl font-black font-mono text-amber-400">
                  {secretBpm} <span className="text-sm font-normal">BPM</span>
                </div>
              </div>
              <div className="text-2xl text-slate-600 font-bold">vs</div>
              <div>
                <div className="text-xs text-slate-400">나의 추측</div>
                <div className="text-4xl font-black font-mono text-cyan-400">
                  {guessedBpm} <span className="text-sm font-normal">BPM</span>
                </div>
              </div>
            </div>

            <div className="text-base font-bold text-white mb-2">
              오차: <span className="text-amber-400 font-mono">{diff} BPM</span> · 일치율: <span className="text-cyan-400 font-mono">{accuracy}%</span>
            </div>

            <p className="text-xs text-slate-300 mb-5">
              {diff === 0
                ? '완벽합니다! 컴퓨터와 동일한 절대 청음 BPM 판별력을 가졌습니다.'
                : diff <= 3
                ? '거의 정확합니다! 프로 뮤지션 급의 템포 인식 능력입니다.'
                : diff <= 8
                ? '양호한 수준입니다. 템포 대역별 체감 속도를 기억해보세요.'
                : '오차가 있습니다. 메트로놈을 자주 들으며 기준 BPM을 체화해보세요.'}
            </p>

            <button
              onClick={generateNewSecret}
              className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm shadow-md transition cursor-pointer"
            >
              다음 문제 도전
            </button>
          </div>
        )}
      </div>

      <footer className="text-center text-[11px] text-slate-400 font-mono">
        청각 기억과 내면의 리듬 감각을 단련하세요
      </footer>
    </div>
  );
}
