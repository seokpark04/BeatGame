import { useState, useEffect } from 'react';
import { AnalysisReport } from '../types/game';
import { audioEngine } from '../services/audioEngine';
import {
  Trophy,
  Activity,
  Zap,
  Play,
  Square,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Copy,
  ChevronRight,
  TrendingUp,
  Volume2,
} from 'lucide-react';

interface AnalysisModalProps {
  report: AnalysisReport;
  onRetry: () => void;
  onGoHome: () => void;
  onNextDifficulty?: () => void;
  hasNextDifficulty?: boolean;
}

export default function AnalysisModal({
  report,
  onRetry,
  onGoHome,
  onNextDifficulty,
  hasNextDifficulty,
}: AnalysisModalProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'distribution' | 'advice'>('timeline');

  // Handle Audio Replay
  const toggleAudioReplay = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      setReplayProgress(0);
    } else {
      setIsPlayingAudio(true);
      const expectedTimes = report.taps.map((t) => t.expectedTimeMs);
      const actualTaps = report.taps.map((t) => ({
        timeMs: t.actualTimeMs,
        judgment: t.judgment,
      }));

      const stopReplay = audioEngine.replaySession(
        expectedTimes,
        actualTaps,
        (curr, total) => {
          setReplayProgress((curr / total) * 100);
        },
        () => {
          setIsPlayingAudio(false);
          setReplayProgress(0);
        }
      );

      return () => stopReplay();
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      setIsPlayingAudio(false);
    };
  }, []);

  const handleCopySummary = () => {
    const text = `[절대 박자 연구소 결과]\n🏆 등급: ${report.grade} (${report.gradeTitle})\n🎯 점수: ${report.overallScore}/100점\n⏱️ 평균 오차: ±${report.absErrorMs}ms\n📊 템포 드리프트: ${report.targetBpm} -> ${report.effectiveBpm} BPM (${report.driftBpm >= 0 ? '+' : ''}${report.driftBpm})\n당신의 내장 메트로놈을 시험해보세요!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Grade color scheme
  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'SSS':
        return 'from-amber-400 to-rose-500 text-amber-300 border-amber-400 shadow-amber-500/30';
      case 'SS':
        return 'from-purple-400 to-pink-500 text-purple-300 border-purple-400 shadow-purple-500/30';
      case 'S':
        return 'from-cyan-400 to-blue-500 text-cyan-300 border-cyan-400 shadow-cyan-500/30';
      case 'A':
        return 'from-emerald-400 to-teal-500 text-emerald-300 border-emerald-400 shadow-emerald-500/30';
      case 'B':
        return 'from-blue-400 to-indigo-500 text-blue-300 border-blue-400 shadow-blue-500/30';
      case 'C':
        return 'from-yellow-400 to-amber-600 text-yellow-300 border-yellow-400 shadow-yellow-500/30';
      default:
        return 'from-zinc-500 to-slate-600 text-zinc-400 border-zinc-500 shadow-zinc-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 md:p-8 text-white max-h-[92vh] flex flex-col my-auto">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center font-black text-3xl md:text-4xl border-2 bg-gradient-to-br shadow-xl ${getGradeStyle(
                report.grade
              )}`}
            >
              {report.grade}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  리듬 정밀 분석 리포트
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {report.targetBpm} BPM
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-0.5">
                {report.gradeTitle}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                종합 스코어 <span className="font-bold text-amber-400 text-base">{report.overallScore}</span>/100점 · 최대 콤보 {report.maxStreak}회
              </p>
            </div>
          </div>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '복사 완료' : '결과 복사'}
          </button>
        </div>

        {/* 4 Core Timing Metrics Cluster */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-5">
          {/* 1. Mean Absolute Error */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>평균 오차 (MAE)</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl md:text-2xl font-black tracking-tight text-cyan-300 tabular-nums">
              ±{report.absErrorMs}
              <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              정박과의 평균 타이밍 편차
            </div>
          </div>

          {/* 2. Jitter / Consistency */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>안정성 (지터/표준편차)</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl md:text-2xl font-black tracking-tight text-amber-300 tabular-nums">
              ±{report.stdDevMs}
              <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {report.stdDevMs <= 18 ? '기계급 일관성' : report.stdDevMs <= 35 ? '양호한 균일성' : '타격 편차 높음'}
            </div>
          </div>

          {/* 3. Tempo Drift */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>체감 BPM 드리프트</span>
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl md:text-2xl font-black tracking-tight text-purple-300 tabular-nums">
              {report.effectiveBpm}
              <span className="text-xs font-normal text-slate-400 ml-1">BPM</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              변화율: {report.driftBpm >= 0 ? `+${report.driftBpm}` : report.driftBpm} BPM
            </div>
          </div>

          {/* 4. Bias: Rush vs Drag */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>타격 성향</span>
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white mt-1">
              <span className="text-amber-400 font-mono">{report.rushingPercent}%</span> 빠름 /{' '}
              <span className="text-cyan-400 font-mono">{report.draggingPercent}%</span> 느림
            </div>
            {/* Visual ratio bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex mt-2">
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${report.rushingPercent}%` }}
              />
              <div
                className="bg-cyan-400 h-full transition-all"
                style={{ width: `${report.draggingPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Interactive Audio A/B Replay Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAudioReplay}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-lg ${
                isPlayingAudio
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              }`}
            >
              {isPlayingAudio ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  {isPlayingAudio ? '입체 오디오 동기화 재생 중...' : '🎧 입체 오디오 비교 청취 (Stereo Replay)'}
                </span>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                왼쪽 채널(L): 정박 메트로놈 · 오른쪽 채널(R): 당신의 실제 탭 소리
              </p>
            </div>
          </div>

          <div className="hidden sm:block w-36">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-75"
                style={{ width: `${replayProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b border-slate-800 mb-3 text-xs">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-2 px-1 font-bold border-b-2 transition ${
              activeTab === 'timeline'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            비트별 오프셋 산포도 (Scatter Timeline)
          </button>
          <button
            onClick={() => setActiveTab('advice')}
            className={`pb-2 px-1 font-bold border-b-2 transition ${
              activeTab === 'advice'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            닥터 비트의 맞춤 처방전 ({report.diagnosisAdvice.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-[160px] max-h-[220px]">
          {activeTab === 'timeline' && (
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 relative">
              {/* Zero Reference Line */}
              <div className="text-[10px] text-slate-500 flex justify-between mb-1">
                <span>빠름 (Rush) -60ms</span>
                <span className="text-emerald-400 font-bold">0ms 정박 (Perfect On-Beat)</span>
                <span>느림 (Drag) +60ms</span>
              </div>

              {/* Scatter Plot visualization */}
              <div className="relative h-28 w-full border border-slate-800 rounded-lg bg-slate-900/60 overflow-hidden flex items-center">
                {/* Horizontal guide lines */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-emerald-500/40 z-0" />
                <div className="absolute inset-x-0 top-1/4 h-[1px] border-b border-dashed border-slate-700/40 z-0" />
                <div className="absolute inset-x-0 bottom-1/4 h-[1px] border-b border-dashed border-slate-700/40 z-0" />

                {/* Data points */}
                <div className="absolute inset-0 flex items-center justify-around px-4 z-10">
                  {report.taps.map((t, idx) => {
                    // Clamped offset between -60 and +60ms for plotting
                    const clampedOffset = Math.max(-60, Math.min(60, t.offsetMs));
                    // Y: 0ms is at 50%, -60ms is top (10%), +60ms is bottom (90%)
                    const yPercent = 50 + (clampedOffset / 60) * 40;

                    let dotColor = 'bg-cyan-400 border-cyan-200';
                    if (t.judgment === 'PERFECT') dotColor = 'bg-amber-400 border-yellow-100 ring-2 ring-amber-400/50';
                    else if (t.judgment === 'GREAT') dotColor = 'bg-cyan-400 border-cyan-100';
                    else if (t.judgment === 'GOOD') dotColor = 'bg-purple-400 border-purple-200';
                    else dotColor = 'bg-rose-500 border-rose-200';

                    return (
                      <div
                        key={idx}
                        className="relative group flex flex-col items-center h-full justify-center"
                      >
                        {/* Dot */}
                        <div
                          className={`w-3.5 h-3.5 rounded-full border-2 cursor-pointer transition-transform group-hover:scale-150 ${dotColor}`}
                          style={{
                            position: 'absolute',
                            top: `${yPercent}%`,
                            transform: 'translateY(-50%)',
                          }}
                        />

                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -bottom-7 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-white whitespace-nowrap z-30 shadow-lg">
                          #{idx + 1}: {t.offsetMs > 0 ? `+${t.offsetMs}` : t.offsetMs}ms ({t.judgment})
                        </div>

                        {/* Beat number at bottom */}
                        <span className="absolute bottom-1 text-[9px] text-slate-500 font-mono">
                          {idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> PERFECT
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> GREAT
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> GOOD
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> MISS
                </span>
              </div>
            </div>
          )}

          {activeTab === 'advice' && (
            <div className="space-y-2">
              {report.diagnosisAdvice.map((advice, i) => (
                <div
                  key={i}
                  className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                    {advice}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-800 mt-4">
          <button
            onClick={onGoHome}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm transition"
          >
            <Sliders className="w-4 h-4" />
            메인 메뉴로
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition"
            >
              <RotateCcw className="w-4 h-4" />
              다시 도전
            </button>

            {hasNextDifficulty && onNextDifficulty && (
              <button
                onClick={onNextDifficulty}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/20 transition"
              >
                다음 난이도 도전
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
