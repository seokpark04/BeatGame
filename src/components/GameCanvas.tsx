import { useEffect, useRef } from 'react';
import { Judgment } from '../types/game';

interface GameCanvasProps {
  currentBeatProgress: number; // 0 to 1 within the current beat
  totalBeats: number;
  currentBeatIndex: number;
  cueBeats: number;
  isSilent: boolean;
  showVisualGuide: boolean;
  lastJudgment: { text: string; offsetMs: number; judgment: Judgment; id: number } | null;
  streak: number;
  bpm: number;
  isPlaying: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  color: string;
  size: number;
}

interface HitText {
  x: number;
  y: number;
  text: string;
  subtext: string;
  color: string;
  alpha: number;
  scale: number;
  id: number;
}

export default function GameCanvas({
  currentBeatProgress,
  totalBeats,
  currentBeatIndex,
  cueBeats,
  isSilent,
  showVisualGuide,
  lastJudgment,
  streak,
  bpm,
  isPlaying,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const hitTextsRef = useRef<HitText[]>([]);
  const lastProcessedJudgmentId = useRef<number>(-1);
  const animFrameId = useRef<number>(0);

  // Trigger particles and floating texts on new judgment
  useEffect(() => {
    if (!lastJudgment || lastJudgment.id === lastProcessedJudgmentId.current) return;
    lastProcessedJudgmentId.current = lastJudgment.id;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    let color = '#10b981'; // PERFECT emerald
    let count = 28;
    if (lastJudgment.judgment === 'PERFECT') {
      color = '#fbbf24'; // Gold
      count = 36;
    } else if (lastJudgment.judgment === 'GREAT') {
      color = '#38bdf8'; // Sky blue
      count = 24;
    } else if (lastJudgment.judgment === 'GOOD') {
      color = '#a855f7'; // Purple
      count = 16;
    } else if (lastJudgment.judgment === 'MISS') {
      color = '#ef4444'; // Red
      count = 10;
    }

    // Spawn particles
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 6;
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
        color,
        size: 2.5 + Math.random() * 3.5,
      });
    }

    // Spawn floating text
    const sign = lastJudgment.offsetMs > 0 ? '+' : '';
    const offsetStr = `${sign}${Math.round(lastJudgment.offsetMs)}ms`;
    hitTextsRef.current.push({
      x: centerX,
      y: centerY - 15,
      text: lastJudgment.text,
      subtext: lastJudgment.judgment === 'MISS' ? 'MISS' : offsetStr,
      color,
      alpha: 1,
      scale: 1.3,
      id: lastJudgment.id,
    });
  }, [lastJudgment]);

  // Main 60fps Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let prevTime = performance.now();

    const render = (now: number) => {
      const rawDt = (now - prevTime) / 1000;
      prevTime = now;
      const dt = Math.min(rawDt, 0.05);

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const targetWidth = Math.floor(rect.width * dpr);
      const targetHeight = Math.floor(rect.height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.36;

      ctx.clearRect(0, 0, width, height);

      // 1. Oscilloscope / subtle ambient audio grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Background subtle animated sine waveform
      if (isPlaying) {
        ctx.beginPath();
        ctx.strokeStyle = isSilent
          ? 'rgba(147, 51, 234, 0.12)'
          : 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 1.5;
        const waveFreq = (bpm / 60) * 4;
        for (let x = 0; x <= width; x += 6) {
          const normX = x / width;
          const y =
            centerY +
            Math.sin(normX * Math.PI * 4 * waveFreq + now * 0.005) *
              16 *
              (isSilent && !showVisualGuide ? 0.2 : 1.0);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 2. Base Radial Metronome Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Silent phase arc or Cue phase arc
      if (isPlaying && totalBeats > 0) {
        const cueRatio = cueBeats / totalBeats;
        // Cue arc
        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          radius,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * cueRatio
        );
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Silent arc
        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          radius,
          -Math.PI / 2 + Math.PI * 2 * cueRatio,
          -Math.PI / 2 + Math.PI * 2
        );
        ctx.strokeStyle = isSilent
          ? 'rgba(168, 85, 247, 0.8)'
          : 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = isSilent ? 6 : 4;
        ctx.stroke();
      }

      // Tick markers around perimeter
      if (totalBeats > 0) {
        for (let i = 0; i < totalBeats; i++) {
          const angle = -Math.PI / 2 + (Math.PI * 2 * i) / totalBeats;
          const isCue = i < cueBeats;
          const isPassed = i <= currentBeatIndex;
          const isCurrent = i === currentBeatIndex;

          const innerR = radius - (isCurrent ? 14 : 8);
          const outerR = radius + (isCurrent ? 10 : 6);

          const x1 = centerX + Math.cos(angle) * innerR;
          const y1 = centerY + Math.sin(angle) * innerR;
          const x2 = centerX + Math.cos(angle) * outerR;
          const y2 = centerY + Math.sin(angle) * outerR;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);

          if (isCurrent) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
          } else if (isPassed) {
            ctx.strokeStyle = isCue
              ? 'rgba(56, 189, 248, 0.7)'
              : 'rgba(168, 85, 247, 0.7)';
            ctx.lineWidth = 2.5;
          } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 1.5;
          }
          ctx.stroke();
        }
      }

      // 3. Sweeping Needle / Beat Arm
      if (isPlaying) {
        const canShowSweep = !isSilent || showVisualGuide;
        if (canShowSweep && totalBeats > 0) {
          const totalProgress = (currentBeatIndex + currentBeatProgress) / totalBeats;
          const needleAngle = -Math.PI / 2 + Math.PI * 2 * Math.min(1, Math.max(0, totalProgress));

          // Draw radar glow wedge
          const grad = ctx.createRadialGradient(
            centerX,
            centerY,
            radius * 0.2,
            centerX,
            centerY,
            radius
          );
          grad.addColorStop(
            0,
            isSilent ? 'rgba(168, 85, 247, 0.02)' : 'rgba(56, 189, 248, 0.04)'
          );
          grad.addColorStop(
            1,
            isSilent ? 'rgba(168, 85, 247, 0.22)' : 'rgba(56, 189, 248, 0.3)'
          );

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(
            centerX,
            centerY,
            radius,
            needleAngle - 0.25,
            needleAngle
          );
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();

          // Needle line
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(
            centerX + Math.cos(needleAngle) * radius,
            centerY + Math.sin(needleAngle) * radius
          );
          ctx.strokeStyle = isSilent ? '#c084fc' : '#38bdf8';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Outer tip dot
          ctx.beginPath();
          ctx.arc(
            centerX + Math.cos(needleAngle) * radius,
            centerY + Math.sin(needleAngle) * radius,
            5,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }

        // Pulse ring on current beat start
        if ((!isSilent || showVisualGuide) && currentBeatProgress < 0.45) {
          const pulseProgress = currentBeatProgress / 0.45;
          const pulseR = radius * (0.35 + pulseProgress * 0.65);
          const pulseAlpha = (1 - pulseProgress) * 0.4;
          ctx.beginPath();
          ctx.arc(centerX, centerY, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = isSilent
            ? `rgba(168, 85, 247, ${pulseAlpha})`
            : `rgba(56, 189, 248, ${pulseAlpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // 4. Center Core
      const coreR = radius * 0.32;
      const coreGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        coreR
      );
      if (isPlaying) {
        if (isSilent) {
          coreGrad.addColorStop(0, 'rgba(59, 7, 100, 0.9)');
          coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
        } else {
          coreGrad.addColorStop(0, 'rgba(12, 74, 110, 0.9)');
          coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
        }
      } else {
        coreGrad.addColorStop(0, 'rgba(30, 41, 59, 0.8)');
        coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.strokeStyle = isSilent
        ? 'rgba(168, 85, 247, 0.4)'
        : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 5. Update and Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Update and Draw Floating Judgement Texts
      for (let i = hitTextsRef.current.length - 1; i >= 0; i--) {
        const ht = hitTextsRef.current[i];
        ht.y -= 1.4;
        ht.alpha -= 0.025;
        ht.scale = Math.max(1, ht.scale - 0.015);

        if (ht.alpha <= 0) {
          hitTextsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, ht.alpha);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Main text
        ctx.font = `900 ${Math.round(26 * ht.scale)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = ht.color;
        ctx.shadowColor = ht.color;
        ctx.shadowBlur = 12;
        ctx.fillText(ht.text, ht.x, ht.y);

        // Subtext (offset in ms)
        ctx.font = `700 ${Math.round(15 * ht.scale)}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.fillText(ht.subtext, ht.x, ht.y + 24);
        ctx.restore();
      }

      ctx.restore();
      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId.current);
    };
  }, [
    currentBeatProgress,
    totalBeats,
    currentBeatIndex,
    cueBeats,
    isSilent,
    showVisualGuide,
    streak,
    bpm,
    isPlaying,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block pointer-events-none"
      style={{ touchAction: 'none' }}
    />
  );
}
