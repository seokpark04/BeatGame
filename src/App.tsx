import { useState, useEffect } from 'react';
import {
  GameMode,
  DifficultyId,
  DifficultyConfig,
  DIFFICULTY_PRESETS,
  TapRecord,
  AnalysisReport,
  AudioSettings,
} from './types/game';
import { audioEngine } from './services/audioEngine';
import { analyzeRhythm } from './utils/rhythmAnalysis';
import TitleScreen from './components/TitleScreen';
import PlayScreen from './components/PlayScreen';
import TimeSniperScreen from './components/TimeSniperScreen';
import BpmGuessScreen from './components/BpmGuessScreen';
import RhythmLabScreen from './components/RhythmLabScreen';
import AnalysisModal from './components/AnalysisModal';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [screen, setScreen] = useState<'title' | 'play' | 'sniper' | 'guess' | 'lab'>('title');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>('standard');
  const [targetBpm, setTargetBpm] = useState<number>(120);

  // Audio settings
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => {
    const saved = localStorage.getItem('absolute_beat_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      soundPreset: 'woodblock',
      cueVolume: 0.85,
      tapVolume: 0.95,
      calibrationOffsetMs: 0,
      isMuted: false,
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(null);

  // Sync settings with audio engine
  useEffect(() => {
    audioEngine.setPreset(audioSettings.soundPreset);
    audioEngine.setVolumes(audioSettings.cueVolume, audioSettings.tapVolume);
    audioEngine.setMuted(audioSettings.isMuted);
    localStorage.setItem('absolute_beat_settings', JSON.stringify(audioSettings));
  }, [audioSettings]);

  // Start a game from Title Screen
  const handleStartGame = (mode: GameMode, difficulty: DifficultyId, bpm: number) => {
    setSelectedDifficulty(difficulty);
    setTargetBpm(bpm);

    if (mode === 'ghost_beat') {
      setScreen('play');
    } else if (mode === 'time_sniper') {
      setScreen('sniper');
    } else if (mode === 'bpm_guess') {
      setScreen('guess');
    } else if (mode === 'rhythm_lab') {
      setScreen('lab');
    }
  };

  // When Ghost Beat game finishes
  const handleFinishGame = (taps: TapRecord[], bpm: number, totalBeats: number) => {
    const report = analyzeRhythm(taps, bpm, totalBeats);
    setCurrentReport(report);
  };

  // Progression to next difficulty
  const difficultyKeys: DifficultyId[] = ['beginner', 'standard', 'pro', 'cyborg'];
  const currentIndex = difficultyKeys.indexOf(selectedDifficulty);
  const hasNextDifficulty = currentIndex < difficultyKeys.length - 1;

  const handleNextDifficulty = () => {
    if (hasNextDifficulty) {
      const nextDiff = difficultyKeys[currentIndex + 1];
      setSelectedDifficulty(nextDiff);
      setCurrentReport(null);
      setScreen('play');
    }
  };

  const handleRetry = () => {
    setCurrentReport(null);
    setScreen('play');
  };

  const handleGoHome = () => {
    setCurrentReport(null);
    setScreen('title');
  };

  const handleToggleMute = () => {
    setAudioSettings((prev) => ({
      ...prev,
      isMuted: !prev.isMuted,
    }));
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 font-sans antialiased text-white selection:bg-cyan-500 selection:text-slate-950">
      {screen === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isMuted={audioSettings.isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {screen === 'play' && (
        <PlayScreen
          difficulty={DIFFICULTY_PRESETS[selectedDifficulty]}
          targetBpm={targetBpm}
          audioSettings={audioSettings}
          onFinishGame={handleFinishGame}
          onExit={() => setScreen('title')}
        />
      )}

      {screen === 'sniper' && (
        <TimeSniperScreen onExit={() => setScreen('title')} />
      )}

      {screen === 'guess' && (
        <BpmGuessScreen onExit={() => setScreen('title')} />
      )}

      {screen === 'lab' && (
        <RhythmLabScreen onExit={() => setScreen('title')} />
      )}

      {/* Post-game Rhythm Analysis Modal */}
      {currentReport && (
        <AnalysisModal
          report={currentReport}
          onRetry={handleRetry}
          onGoHome={handleGoHome}
          onNextDifficulty={handleNextDifficulty}
          hasNextDifficulty={hasNextDifficulty}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={audioSettings}
          onSave={(newSettings) => setAudioSettings(newSettings)}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
