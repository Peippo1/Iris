import React, { useEffect, useRef } from 'react';

interface FrequencyWaveformProps {
  audioElement?: HTMLAudioElement | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}

// Global cache for MediaElementAudioSourceNode to avoid "MediaElementAudioSource outputs can only be attached to one AudioSourceNode" error
const audioSourceNodes = new WeakMap<HTMLAudioElement, {
  audioCtx: AudioContext;
  analyser: AnalyserNode;
  sourceNode: MediaElementAudioSourceNode;
}>();

export const FrequencyWaveform: React.FC<FrequencyWaveformProps> = ({
  audioElement,
  isPlaying,
  isMuted,
  volume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed frequency bar count & styling
    const BAR_COUNT = 32;
    const simulatedAmplitudes = new Float32Array(BAR_COUNT).fill(0.08);

    let analyserNode: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;

    // Attempt Web Audio API connection if audioElement is provided
    if (audioElement) {
      try {
        let entry = audioSourceNodes.get(audioElement);
        if (!entry) {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // Gives 32 frequency bins
            analyser.smoothingTimeConstant = 0.8;

            const sourceNode = audioCtx.createMediaElementSource(audioElement);
            sourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);

            entry = { audioCtx, analyser, sourceNode };
            audioSourceNodes.set(audioElement, entry);
          }
        }

        if (entry) {
          analyserNode = entry.analyser;
          dataArray = new Uint8Array(analyserNode.frequencyBinCount);
          if (entry.audioCtx.state === 'suspended' && isPlaying) {
            entry.audioCtx.resume().catch(() => {});
          }
        }
      } catch (e) {
        // Fallback gracefully to smooth synthetic speech amplitude simulation
        // (common if CORS or multiple media source restrictions trigger)
        analyserNode = null;
      }
    }

    let phase = 0;

    const render = () => {
      // Set high-DPI scaling
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Determine heights of the 32 frequency bars
      const amplitudes: number[] = [];

      if (analyserNode && dataArray && isPlaying && !isMuted && volume > 0) {
        analyserNode.getByteFrequencyData(dataArray);
        let hasRealSignal = false;

        for (let i = 0; i < BAR_COUNT; i++) {
          const val = dataArray[i] || 0;
          if (val > 5) hasRealSignal = true;
          // Normalize 0..255 to 0.08..1.0
          const normalized = Math.max(0.08, val / 255);
          amplitudes.push(normalized);
        }

        // If dataArray is completely zero (e.g., cross-origin stream without CORS header),
        // fallback dynamically to natural voice cadence simulation
        if (!hasRealSignal) {
          phase += 0.08;
          for (let i = 0; i < BAR_COUNT; i++) {
            const bellCurve = Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
            const wave1 = Math.sin(phase * 1.5 + i * 0.35);
            const wave2 = Math.cos(phase * 0.8 + i * 0.2);
            const target = Math.max(0.08, bellCurve * (0.35 + 0.5 * Math.abs(wave1 * wave2)));
            simulatedAmplitudes[i] += (target - simulatedAmplitudes[i]) * 0.2;
            amplitudes[i] = simulatedAmplitudes[i];
          }
        }
      } else if (isPlaying && !isMuted && volume > 0) {
        // Dynamic voice simulation when AudioContext is unavailable or loading
        phase += 0.08;
        for (let i = 0; i < BAR_COUNT; i++) {
          const bellCurve = Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
          const wave1 = Math.sin(phase * 1.5 + i * 0.35);
          const wave2 = Math.cos(phase * 0.8 + i * 0.2);
          const target = Math.max(0.08, bellCurve * (0.35 + 0.5 * Math.abs(wave1 * wave2)));
          simulatedAmplitudes[i] += (target - simulatedAmplitudes[i]) * 0.2;
          amplitudes.push(simulatedAmplitudes[i]);
        }
      } else {
        // Idle resting state - gentle baseline
        for (let i = 0; i < BAR_COUNT; i++) {
          simulatedAmplitudes[i] += (0.08 - simulatedAmplitudes[i]) * 0.15;
          amplitudes.push(simulatedAmplitudes[i]);
        }
      }

      // Draw frequency waveform bars
      const totalSpacingRatio = 0.35;
      const barWidth = (width / BAR_COUNT) * (1 - totalSpacingRatio);
      const gap = (width - barWidth * BAR_COUNT) / (BAR_COUNT - 1);

      // Create vertical color gradient for Google Iris palette
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#1A73E8'); // Google Blue
      gradient.addColorStop(0.6, '#4285F4'); // Bright Blue
      gradient.addColorStop(1, '#8AB4F8'); // Soft Light Blue

      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * (barWidth + gap);
        const barHeight = Math.max(4, amplitudes[i] * height * 0.95);
        const y = height - barHeight;
        const radius = Math.min(barWidth / 2, 3);

        ctx.fillStyle = isPlaying ? gradient : '#DADCE0';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, radius, radius]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioElement, isPlaying, isMuted, volume]);

  return (
    <div
      id="frequency-waveform-container"
      className="w-full flex flex-col justify-end"
    >
      <canvas
        ref={canvasRef}
        id="frequency-waveform-canvas"
        className="w-full h-12 block"
        style={{ width: '100%', height: '48px' }}
      />
    </div>
  );
};
