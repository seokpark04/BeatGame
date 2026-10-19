import { useState } from 'react';
import { GameMode, DifficultyId, DIFFICULTY_PRESETS } from '../types/game';
import {
  Play,
  Sliders,
  Volume2,
  VolumeX,
  Flame,
  Clock,
  Radio,
  Zap,
  HelpCircle,
} from 'lucide-react';

interface TitleScreenProps {
  onStartGame: (mode: GameMode, difficulty: DifficultyId, bpm: number) => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function TitleScreen({
  onStartGame,
  onOpenSettings,
  isMuted,
  onToggleMute,
}: TitleScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>('ghost_beat');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>('standard');
  const [bpm, setBpm] = useState<number>(120);

  const bpmPresets = [80, 100, 120, 132, 150];

  const modes: {
    id: GameMode;
    title: string;
    subtitle: string;
    desc: string;
    icon: typeof Radio;
  }[] = [
    {
      id: 'ghost_beat',
      title: '블라인드 박자 유지',
      subtitle: 'Ghost Metronome',
      desc: '4비트 안내 후 무음 구간 진입. 내면의 박자감으로 정박을 탭하세요.',
      icon: Radio,
    },
    {
      id: 'time_sniper',
      title: '타임 스나이퍼',
      subtitle: 'Target Duration Sniper',
      desc: '소리 없이 흐르는 5.000초 / 8.000초의 정밀 밀리초 1타 맞추기.',
      icon: Clock,
    },
    {
      id: 'bpm_guess',
      title: '절대 BPM 청음 추정',
      subtitle: 'Ear BPM Guess',
      desc: '잠깐 들려주는 리듬을 듣고 탭하여 비밀 BPM을 정확히 맞추기.',
      icon: Flame,
    },
    {
      id: 'rhythm_lab',
      title: '프리 리듬 연구소',
      subtitle: 'Endless Rhythm Lab',
      desc: '자유 탭과 함께 실시간 오프셋 레이더, 지터 가우스 분포 분석.',
      icon: Zap,
    },
  ];

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 select-none overflow-x-hidden">
      {/* Background Decorative Soundwave Ambient Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-25 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-radial from-cyan-500/10 via-purple-500/5 to-transparent blur-3xl" />
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-cyan-900/10 to-transparent" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
            AB
          </div>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-mono font-medium">
            절대 박자 연구소 · v2.0
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
            title={isMuted ? '음소거 해제 (M)' : '음소거 (M)'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">오디오/보정 설정</span>
          </button>
        </div>
      </header>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <main className="relative z-10 max-w-5xl mx-auto w-full my-auto py-6 flex flex-col items-center text-center">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="mb-4">
          <svg
            viewBox="0 0 680 120"
            className="w-full max-w-[560px] h-auto drop-shadow-[0_0_25px_rgba(56,189,248,0.35)]"
          >
            <defs>
              <linearGradient id="beatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="55"
              textAnchor="middle"
              className="font-black text-4xl fill-current tracking-tight"
              style={{
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                letterSpacing: '-0.03em',
              }}
              fill="url(#beatGrad)"
            >
              절대 박자 연구소
            </text>
            <text
              x="50%"
              y="98"
              textAnchor="middle"
              className="text-xs uppercase font-mono tracking-[0.35em] fill-slate-400"
            >
              PRECISION INNER METRONOME & RHYTHM ANALYTICS
            </text>
            {/* Metronome needle tick mark line */}
            <line
              x1="180"
              y1="112"
              x2="500"
              y2="112"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.5"
            />
            <circle cx="340" cy="112" r="3.5" fill="#38bdf8" />
          </svg>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
          소리가 끊긴 침묵 속에서도 당신의 체내 메트로놈은 정확한 템포를 지킬 수 있을까요?
          정밀 오프셋(ms) 및 템포 드리프트 분석으로 리듬 본능을 측정하세요.
        </p>

        {/* Game Mode Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-6">
          {modes.map((m) => {
            const isSelected = selectedMode === m.id;
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-500" />
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    {m.subtitle}
                  </span>
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                </div>
                <h3 className="font-bold text-sm text-white mb-1">{m.title}</h3>
                <p className="text-[11px] text-slate-400 leading-snug">{m.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Configuration Panel: Difficulty & BPM */}
        <div className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl p-4 md:p-6 mb-8 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            {/* Difficulty Setting (Visible for Ghost Beat & Time Sniper) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  난이도 선택 (Difficulty)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  오차 허용 범위
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(DIFFICULTY_PRESETS) as DifficultyId[]).map((diffId) => {
                  const cfg = DIFFICULTY_PRESETS[diffId];
                  const isDiffSelected = selectedDifficulty === diffId;
                  return (
                    <button
                      key={diffId}
                      onClick={() => setSelectedDifficulty(diffId)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isDiffSelected
                          ? `${cfg.badgeColor} border-current ring-1 ring-current`
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{cfg.name.split(' ')[0]}</div>
                        <div className="text-[10px] opacity-80 mt-0.5">{cfg.subname}</div>
                      </div>
                      <div className="text-[10px] font-mono mt-2 font-bold">
                        ±{cfg.perfectWindow}ms
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                {DIFFICULTY_PRESETS[selectedDifficulty].description}
              </div>
            </div>

            {/* Target BPM Selector */}
            <div className="lg:border-l lg:border-slate-800 lg:pl-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  기준 템포 (Target BPM)
                </span>
                <span className="text-base font-black font-mono text-cyan-400">
                  {bpm} BPM
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="50"
                max="200"
                step="2"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg mb-3"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase font-mono">
                  빠른 선택:
                </span>
                {bpmPresets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setBpm(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                      bpm === p
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Big Start CTA Button */}
        <button
          onClick={() => onStartGame(selectedMode, selectedDifficulty, bpm)}
          className="group relative inline-flex items-center justify-center gap-3 px-8 md:px-12 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-500 text-slate-950 font-black text-lg md:text-xl tracking-wide shadow-[0_0_40px_rgba(56,189,248,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
          <span>연구소 가동 · 게임 시작</span>
          <span className="text-xs font-mono font-normal opacity-75 hidden sm:inline ml-1">
            [Space / Enter]
          </span>
        </button>
      </main>

      {/* Flat Control-Hint Line Footer */}
      <footer className="relative z-10 max-w-5xl mx-auto w-full pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
        <div>
          <span className="text-slate-300 font-bold">조작 키:</span> Space / J / K 탭 · Esc 일시정지 · M 음소거 · Enter 시작
        </div>
        <div>
          밀리초(ms) 단위 정밀 리듬 분석 시스템 내장
        </div>
      </footer>
    </div>
  );
}
