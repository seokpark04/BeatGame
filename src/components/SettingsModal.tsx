import { useState } from 'react';
import { AudioSettings, SoundPreset } from '../types/game';
import { audioEngine } from '../services/audioEngine';
import { X, Volume2, Sliders, Check, Play, Keyboard } from 'lucide-react';

interface SettingsModalProps {
  settings: AudioSettings;
  onSave: (newSettings: AudioSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({
  settings,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AudioSettings>({ ...settings });
  const [testActive, setTestActive] = useState(false);

  const presets: { id: SoundPreset; name: string; desc: string }[] = [
    { id: 'woodblock', name: '클라베 우드블록', desc: '자연스러운 음향의 고주파 우드 클릭' },
    { id: 'electronic', name: '808 일렉트로닉', desc: '단단한 어택감의 신스 펄스' },
    { id: 'cowbell', name: '빈티지 카우벨', desc: '아날로그 드럼 머신 특유의 듀얼 스퀘어 사운드' },
    { id: 'rimshot', name: '스튜디오 림샷', desc: '금속성 스네어 림 클릭' },
  ];

  const handleTestSound = (preset: SoundPreset) => {
    audioEngine.setPreset(preset);
    audioEngine.playMetronomeTick(undefined, true);
    setTimeout(() => {
      audioEngine.playUserTap('PERFECT');
    }, 250);
  };

  const handleApply = () => {
    audioEngine.setPreset(localSettings.soundPreset);
    audioEngine.setVolumes(localSettings.cueVolume, localSettings.tapVolume);
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-black tracking-tight text-white">
              오디오 및 장치 설정
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sound Preset Selection */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            메트로놈 & 탭 사운드 팩
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((p) => {
              const isSelected = localSettings.soundPreset === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setLocalSettings({ ...localSettings, soundPreset: p.id });
                    handleTestSound(p.id);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400/80 text-white'
                      : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      {p.name}
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestSound(p.id);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300"
                    title="미리듣기"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volume Sliders */}
        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>가이드 메트로놈 음량</span>
              <span className="font-mono text-cyan-400">
                {Math.round(localSettings.cueVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localSettings.cueVolume}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  cueVolume: parseFloat(e.target.value),
                })
              }
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>내 탭 피드백 사운드 음량</span>
              <span className="font-mono text-cyan-400">
                {Math.round(localSettings.tapVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localSettings.tapVolume}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  tapVolume: parseFloat(e.target.value),
                })
              }
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Bluetooth / Hardware Audio Latency Offset */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-1">
            <span>블루투스 / 하드웨어 오프셋 보정</span>
            <span className="font-mono text-amber-400">
              {localSettings.calibrationOffsetMs > 0 ? '+' : ''}
              {localSettings.calibrationOffsetMs} ms
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            무선 이어폰 사용 시 사운드가 늦게 들릴 수 있습니다. 들리는 박자보다 늦게 판정된다면 음수(-)로 보정하세요.
          </p>
          <input
            type="range"
            min="-100"
            max="100"
            step="5"
            value={localSettings.calibrationOffsetMs}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                calibrationOffsetMs: parseInt(e.target.value, 10),
              })
            }
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>-100ms (이어폰 지연)</span>
            <span>0ms (유선/스피커)</span>
            <span>+100ms</span>
          </div>
        </div>

        {/* Shortcuts info */}
        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 mb-6 flex items-start gap-2.5">
          <Keyboard className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white">단축키 안내:</span> Spacebar, J, K 키로 박자를 칠 수 있습니다. M 키로 즉시 음소거/해제됩니다.
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}
