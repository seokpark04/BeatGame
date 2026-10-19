import { TapRecord, AnalysisReport, Judgment } from '../types/game';

/**
 * Perform comprehensive mathematical analysis on tap performance
 */
export function analyzeRhythm(
  taps: TapRecord[],
  targetBpm: number,
  totalExpectedBeats: number
): AnalysisReport {
  if (taps.length === 0) {
    return {
      overallScore: 0,
      grade: 'D',
      gradeTitle: '측정 데이터 없음',
      meanOffsetMs: 0,
      stdDevMs: 0,
      absErrorMs: 0,
      rushingPercent: 0,
      draggingPercent: 0,
      targetBpm,
      effectiveBpm: targetBpm,
      driftBpm: 0,
      perfectCount: 0,
      greatCount: 0,
      goodCount: 0,
      missCount: 0,
      maxStreak: 0,
      taps: [],
      totalExpectedBeats,
      diagnosisAdvice: ['탭 기록이 없어 분석을 진행할 수 없습니다.'],
    };
  }

  // Filter valid judgments
  let perfectCount = 0;
  let greatCount = 0;
  let goodCount = 0;
  let missCount = 0;
  let currentStreak = 0;
  let maxStreak = 0;

  let rushingCount = 0;
  let draggingCount = 0;

  const offsets = taps.map((t) => t.offsetMs);
  const absOffsets = offsets.map((o) => Math.abs(o));

  taps.forEach((t) => {
    if (t.judgment === 'PERFECT') {
      perfectCount++;
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else if (t.judgment === 'GREAT') {
      greatCount++;
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else if (t.judgment === 'GOOD') {
      goodCount++;
      currentStreak = 0;
    } else {
      missCount++;
      currentStreak = 0;
    }

    if (t.offsetMs < -4) {
      rushingCount++;
    } else if (t.offsetMs > 4) {
      draggingCount++;
    }
  });

  const totalTaps = taps.length;
  const rushingPercent = Math.round((rushingCount / totalTaps) * 100);
  const draggingPercent = Math.round((draggingCount / totalTaps) * 100);

  // Mean & Abs Error
  const sumOffset = offsets.reduce((acc, v) => acc + v, 0);
  const meanOffsetMs = Math.round((sumOffset / totalTaps) * 10) / 10;

  const sumAbsOffset = absOffsets.reduce((acc, v) => acc + v, 0);
  const absErrorMs = Math.round((sumAbsOffset / totalTaps) * 10) / 10;

  // Standard Deviation (Consistency / Jitter)
  const variance =
    offsets.reduce((acc, val) => acc + Math.pow(val - meanOffsetMs, 2), 0) /
    (totalTaps > 1 ? totalTaps - 1 : 1);
  const stdDevMs = Math.round(Math.sqrt(variance) * 10) / 10;

  // Effective BPM estimation via linear regression if >= 3 taps
  let effectiveBpm = targetBpm;
  if (taps.length >= 3) {
    // slope of actual time vs beatIndex
    const n = taps.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    taps.forEach((t) => {
      const x = t.beatIndex;
      const y = t.actualTimeMs;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const denom = n * sumXX - sumX * sumX;
    if (denom !== 0) {
      const slopeMsPerBeat = (n * sumXY - sumX * sumY) / denom;
      if (slopeMsPerBeat > 100) {
        effectiveBpm = Math.round((60000 / slopeMsPerBeat) * 10) / 10;
      }
    }
  }

  const driftBpm = Math.round((effectiveBpm - targetBpm) * 10) / 10;

  // Score Calculation (0 ~ 100)
  // Weighted: Accuracy (mean abs error) 55%, Consistency (stdDev) 30%, Hit judgments 15%
  const accuracyScore = Math.max(0, 100 - absErrorMs * 1.5);
  const consistencyScore = Math.max(0, 100 - stdDevMs * 1.6);
  const hitRatio = (perfectCount * 1.0 + greatCount * 0.7 + goodCount * 0.3) / totalExpectedBeats;
  const judgmentScore = Math.min(100, Math.max(0, hitRatio * 100));

  let overallScore = Math.round(
    accuracyScore * 0.5 + consistencyScore * 0.3 + judgmentScore * 0.2
  );
  if (overallScore > 100) overallScore = 100;
  if (overallScore < 0) overallScore = 0;

  // Grade
  let grade: AnalysisReport['grade'] = 'D';
  let gradeTitle = '탈곡기 박자감';

  if (overallScore >= 95 && absErrorMs <= 12 && stdDevMs <= 14) {
    grade = 'SSS';
    gradeTitle = '살아있는 원자시계 (Cyborg Metronome)';
  } else if (overallScore >= 90 && absErrorMs <= 18) {
    grade = 'SS';
    gradeTitle = '인간 메트로놈 (Human Metronome)';
  } else if (overallScore >= 82 && absErrorMs <= 28) {
    grade = 'S';
    gradeTitle = '프로 세션 드러머 (Master Drummer)';
  } else if (overallScore >= 72 && absErrorMs <= 42) {
    grade = 'A';
    gradeTitle = '정밀한 그루브 아티스트 (Studio Groove)';
  } else if (overallScore >= 60 && absErrorMs <= 65) {
    grade = 'B';
    gradeTitle = '안정적인 리듬감 (Solid Rhythm)';
  } else if (overallScore >= 45 && absErrorMs <= 95) {
    grade = 'C';
    gradeTitle = '주의가 필요한 템포 (Wobbly Clock)';
  } else {
    grade = 'D';
    gradeTitle = '비트 탈출 (Off-Beat Drifter)';
  }

  // Diagnostic Advice
  const diagnosisAdvice: string[] = [];

  if (grade === 'SSS' || grade === 'SS') {
    diagnosisAdvice.push(
      '경이로운 절대 박자감입니다! 무음 구간에서도 오차가 거의 발생하지 않는 기계적인 체내 시계를 유지하고 있습니다.'
    );
  }

  if (Math.abs(driftBpm) >= 2.5) {
    if (driftBpm > 0) {
      diagnosisAdvice.push(
        `무음 구간에서 약 +${driftBpm} BPM 가속(Rushing)되었습니다. 소리가 사라지면 무의식중에 심박수나 긴장감으로 빨라지는 경향이 있으니, 더 느긋하게 심호흡을 하며 템포를 지켜보세요.`
      );
    } else {
      diagnosisAdvice.push(
        `무음 구간에서 약 ${driftBpm} BPM 감속(Dragging)되었습니다. 박자를 지나치게 신중히 기다리다 늦어지고 있으니, 다음 비트를 마중 나가는 리듬감으로 탭해 보세요.`
      );
    }
  }

  if (rushingPercent >= 65) {
    diagnosisAdvice.push(
      `전체 타격의 ${rushingPercent}%가 정박보다 앞서 치는 '성급한 타격(Rush)' 성향입니다. 손가락을 미리 들고 비트의 정점을 기다리는 훈련이 필요합니다.`
    );
  } else if (draggingPercent >= 65) {
    diagnosisAdvice.push(
      `전체 타격의 ${draggingPercent}%가 정박보다 늦게 치는 '끌림(Drag)' 성향입니다. 귀로 반응하기보다 마음속으로 4분음표 카운트를 지속하세요.`
    );
  }

  if (stdDevMs >= 35) {
    diagnosisAdvice.push(
      `지터(Jitter: 변동 표준편차)가 ±${stdDevMs}ms로 다소 큽니다. 타격하는 손가락의 모션 크기와 터치 압력을 균일하게 유지하면 일관성이 급격히 향상됩니다.`
    );
  } else if (stdDevMs <= 15) {
    diagnosisAdvice.push(
      `지터가 ±${stdDevMs}ms로 매우 우수합니다! 매 타격 간격이 일정하게 유지되는 뛰어난 리듬 코어를 가지고 있습니다.`
    );
  }

  if (diagnosisAdvice.length === 0) {
    diagnosisAdvice.push(
      '전체적인 템포와 밸런스가 균형 잡혀 있습니다. 한 단계 높은 난이도(무음 구간 연장 또는 판정 엄격화)에 도전해보세요!'
    );
  }

  return {
    overallScore,
    grade,
    gradeTitle,
    meanOffsetMs,
    stdDevMs,
    absErrorMs,
    rushingPercent,
    draggingPercent,
    targetBpm,
    effectiveBpm,
    driftBpm,
    perfectCount,
    greatCount,
    goodCount,
    missCount,
    maxStreak,
    taps,
    totalExpectedBeats,
    diagnosisAdvice,
  };
}
