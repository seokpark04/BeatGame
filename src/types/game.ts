export type GameMode = 'ghost_beat' | 'time_sniper' | 'bpm_guess' | 'rhythm_lab';

export type DifficultyId = 'beginner' | 'standard' | 'pro' | 'cyborg';

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  subname: string;
  description: string;
  cueBeats: number;
  silentBeats: number;
  perfectWindow: number; // ±ms
  greatWindow: number;   // ±ms
  goodWindow: number;    // ±ms
  showVisualCueDuringSilence: boolean;
  badgeColor: string;
  borderColor: string;
}

export type Judgment = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | 'NONE';

export interface TapRecord {
  beatIndex: number;
  expectedTimeMs: number;
  actualTimeMs: number;
  offsetMs: number; // < 0 is early, > 0 is late
  judgment: Judgment;
  isSilentPhase: boolean;
}

export interface AnalysisReport {
  overallScore: number;
  grade: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';
  gradeTitle: string;
  meanOffsetMs: number;
  stdDevMs: number;
  absErrorMs: number;
  rushingPercent: number;
  draggingPercent: number;
  targetBpm: number;
  effectiveBpm: number;
  driftBpm: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  maxStreak: number;
  taps: TapRecord[];
  totalExpectedBeats: number;
  diagnosisAdvice: string[];
}

export type SoundPreset = 'woodblock' | 'electronic' | 'cowbell' | 'rimshot';

export interface AudioSettings {
  soundPreset: SoundPreset;
  cueVolume: number;
  tapVolume: number;
  calibrationOffsetMs: number; // Hardware/BT audio latency compensation
  isMuted: boolean;
}

export const DIFFICULTY_PRESETS: Record<DifficultyId, DifficultyConfig> = {
  beginner: {
    id: 'beginner',
    name: '입문 (Beginner)',
    subname: '리듬 입문자용',
    description: '4박자 무음, 판정 완화(±35ms), 은은한 비주얼 가이드 지원',
    cueBeats: 4,
    silentBeats: 4,
    perfectWindow: 35,
    greatWindow: 70,
    goodWindow: 110,
    showVisualCueDuringSilence: true,
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
    borderColor: 'border-emerald-500',
  },
  standard: {
    id: 'standard',
    name: '표준 (Standard)',
    subname: '기본 밸런스',
    description: '8박자 무음, 표준 판정(±22ms), 완벽한 블라인드 진행',
    cueBeats: 4,
    silentBeats: 8,
    perfectWindow: 22,
    greatWindow: 45,
    goodWindow: 80,
    showVisualCueDuringSilence: false,
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
    borderColor: 'border-cyan-500',
  },
  pro: {
    id: 'pro',
    name: '전문가 (Pro)',
    subname: '프로 드러머 레벨',
    description: '12박자 장기 무음, 엄격한 판정(±14ms), 미세 타이밍 승부',
    cueBeats: 4,
    silentBeats: 12,
    perfectWindow: 14,
    greatWindow: 30,
    goodWindow: 55,
    showVisualCueDuringSilence: false,
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
    borderColor: 'border-amber-500',
  },
  cyborg: {
    id: 'cyborg',
    name: '절대 박자 (Cyborg)',
    subname: '인간 메트로놈 한계 도전',
    description: '16박자 완전 침묵, 초정밀 판정(±8ms), 기계 수준의 박자감 요구',
    cueBeats: 4,
    silentBeats: 16,
    perfectWindow: 8,
    greatWindow: 18,
    goodWindow: 35,
    showVisualCueDuringSilence: false,
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-500/40',
    borderColor: 'border-rose-500',
  },
};
