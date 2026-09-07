import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  Clock,
  Radio,
  Sparkles,
  Gauge,
  Check,
  Activity,
  PlayCircle,
} from 'lucide-react';
import { CommuteSummary, AudioChapter } from '../types';
import { FrequencyWaveform } from './FrequencyWaveform';

interface AudioPlayerProps {
  summary: CommuteSummary;
  onSeekToChapter?: (chapter: AudioChapter) => void;
  activeChapterId?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  audioElement?: HTMLAudioElement | null;
  autoPlayOnGenerate?: boolean;
  onToggleAutoPlay?: () => void;
  isAutoplayPending?: boolean;
  onStartAutoplay?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  summary,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  playbackRate,
  onChangePlaybackRate,
  volume,
  onChangeVolume,
  isMuted,
  onToggleMute,
  audioElement,
  autoPlayOnGenerate = true,
  onToggleAutoPlay,
  isAutoplayPending = false,
  onStartAutoplay,
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const remainingSeconds = Math.max(0, duration - currentTime);

  // Find active chapter based on current time
  const currentChapter = summary.chapters?.find(
    (ch) => currentTime >= ch.startTime && currentTime <= ch.endTime
  ) || summary.chapters?.[0];

  const currentChapterIndex = summary.chapters?.findIndex(
    (ch) => ch.id === currentChapter?.id
  ) ?? -1;

  const handleSeekBackward15 = () => {
    onSeek(Math.max(0, currentTime - 15));
  };

  const handleSeekForward15 = () => {
    onSeek(Math.min(duration, currentTime + 15));
  };

  const handlePrevChapter = () => {
    if (!summary.chapters || summary.chapters.length === 0) return;
    if (currentChapterIndex > 0) {
      onSeek(summary.chapters[currentChapterIndex - 1].startTime);
    } else {
      onSeek(0);
    }
  };

  const handleNextChapter = () => {
    if (!summary.chapters || summary.chapters.length === 0) return;
    if (currentChapterIndex < summary.chapters.length - 1) {
      onSeek(summary.chapters[currentChapterIndex + 1].startTime);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(fraction * duration);
  };

  const handleDownloadAudio = () => {
    if (!summary.audioDataUrl) return;
    const link = document.createElement('a');
    link.href = summary.audioDataUrl;
    link.download = `${summary.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Iris.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div id="commute-audio-player-section" className="space-y-6">
      {/* Editorial Header Display */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-[#E8F0FE] text-[#1A73E8] px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            {isPlaying ? 'Now Playing' : 'Commute Broadcast'}
          </span>
          <span className="text-xs text-[#5F6368] font-mono">
            {summary.config.commuteMinutes} min target &bull; Voice: {summary.config.voice}
            {summary.config.format === 'co_hosts' && ` & ${summary.config.coHostVoice}`}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-serif font-medium leading-tight text-[#202124]">
          {summary.title}
        </h1>

        <p className="text-[#5F6368] text-base sm:text-lg italic font-serif leading-relaxed max-w-3xl">
          {summary.overview}
        </p>
      </div>

      {/* Browser Autoplay Policy User Interaction Listener Banner */}
      {isAutoplayPending && (
        <div
          id="autoplay-pending-banner"
          onClick={onStartAutoplay}
          className="p-4 bg-[#E8F0FE] border border-[#1A73E8]/40 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[#1A73E8] cursor-pointer hover:bg-[#D2E3FC]/60 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1A73E8] text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#174EA6]">
                Commute Briefing Ready — Tap anywhere or press any key to start
              </p>
              <p className="text-xs text-[#1A73E8]/80">
                Browser audio policy requires a user touch to activate auto-play. Click anywhere on this page to listen!
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-confirm-autoplay-start"
            onClick={(e) => {
              e.stopPropagation();
              onStartAutoplay?.();
            }}
            className="px-4 py-2 bg-[#1A73E8] hover:bg-[#1765CC] text-white text-xs font-semibold rounded-full shadow-xs shrink-0 cursor-pointer self-end sm:self-center"
          >
            Play Now
          </button>
        </div>
      )}

      {/* Main Player Card */}
      <div
        id="commute-audio-player-card"
        className="bg-white p-6 sm:p-8 rounded-[32px] google-card-shadow relative space-y-6"
      >
        {/* Waveform & Remaining Time Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2">
          {/* Real-time Frequency Waveform Display */}
          <div className="flex-1 max-w-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#5F6368] flex items-center gap-1.5">
                <Activity className={`w-3.5 h-3.5 ${isPlaying ? 'text-[#1A73E8] animate-pulse' : 'text-[#80868B]'}`} />
                <span>{isPlaying ? 'Live Audio Frequency' : 'Frequency Waveform'}</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#80868B]">
                {isPlaying ? 'Active 32-Band' : 'Idle'}
              </span>
            </div>
            <div className="bg-[#F8F9FA] rounded-2xl p-2.5 border border-[#E8EAED] overflow-hidden">
              <FrequencyWaveform
                audioElement={audioElement}
                isPlaying={isPlaying}
                isMuted={isMuted}
                volume={volume}
              />
            </div>
          </div>

          {/* Time Remaining Counter */}
          <div className="text-right shrink-0 self-end sm:self-center">
            <div className="text-2xl sm:text-3xl font-mono font-medium text-[#1A73E8]">
              {formatTime(remainingSeconds)}
            </div>
            <div className="text-xs uppercase tracking-widest text-[#5F6368] font-medium">
              Remaining
            </div>
          </div>
        </div>

        {/* Chapter Headline if present */}
        {currentChapter && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#E8EAED]">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#F1F3F4] text-[#5F6368]">
                Segment {currentChapterIndex + 1}/{summary.chapters?.length || 1}
              </span>
              <span className="text-xs font-medium text-[#202124] truncate">
                {currentChapter.headline || currentChapter.title}
              </span>
            </div>

            {summary.audioDataUrl && (
              <button
                id="btn-download-audio"
                type="button"
                onClick={handleDownloadAudio}
                className="inline-flex items-center gap-1.5 text-xs text-[#1A73E8] hover:text-[#1765CC] hover:bg-[#E8F0FE] px-3 py-1 rounded-full transition-colors cursor-pointer shrink-0"
                title="Download offline .wav audio"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline WAV</span>
              </button>
            )}
          </div>
        )}

        {/* Scrubber / Progress Bar */}
        <div className="space-y-1.5">
          <div
            ref={progressBarRef}
            id="audio-progress-bar"
            onClick={handleProgressBarClick}
            className="relative w-full h-2 bg-[#F1F3F4] rounded-full cursor-pointer overflow-hidden group"
          >
            {/* Chapter boundary marks */}
            {summary.chapters &&
              duration > 0 &&
              summary.chapters.map((ch) => {
                const tickPos = (ch.startTime / duration) * 100;
                return (
                  <div
                    key={`tick-${ch.id}`}
                    style={{ left: `${tickPos}%` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                  />
                );
              })}

            {/* Filled Progress Bar */}
            <div
              style={{ width: `${progressPercent}%` }}
              className="absolute top-0 left-0 bottom-0 bg-[#1A73E8] rounded-full transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#5F6368] font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Chapter Marker Quick Navigation Pills */}
        {summary.chapters && summary.chapters.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {summary.chapters.map((ch, idx) => {
              const isActive =
                currentTime >= ch.startTime && currentTime <= ch.endTime;
              return (
                <button
                  key={ch.id || idx}
                  id={`btn-chapter-${ch.id || idx}`}
                  type="button"
                  onClick={() => onSeek(ch.startTime)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1A73E8] text-white font-medium shadow-xs'
                      : 'bg-[#F8F9FA] border border-[#E8EAED] text-[#202124] hover:bg-[#E8F0FE] hover:text-[#1A73E8]'
                  }`}
                >
                  {idx + 1}. {ch.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Transport Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E8EAED]">
          {/* Previous Story */}
          <button
            id="btn-prev-chapter"
            type="button"
            onClick={handlePrevChapter}
            className="w-10 h-10 rounded-full border border-[#E8EAED] flex items-center justify-center hover:bg-[#F8F9FA] text-[#5F6368] hover:text-[#202124] transition-colors cursor-pointer"
            title="Previous story segment"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Center Transport Cluster */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* -15s Jump */}
            <button
              id="btn-rewind-15s"
              type="button"
              onClick={handleSeekBackward15}
              className="w-11 h-11 rounded-full border border-[#E8EAED] flex items-center justify-center hover:bg-[#F8F9FA] text-[#5F6368] hover:text-[#202124] transition-colors relative cursor-pointer"
              title="Jump backward 15 seconds"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[9px] font-bold absolute inset-0 flex items-center justify-center pt-0.5">
                15
              </span>
            </button>

            {/* Primary Play/Pause Button */}
            <button
              id="btn-primary-play-pause"
              type="button"
              onClick={onTogglePlay}
              className="w-14 h-14 rounded-full bg-[#1A73E8] hover:bg-[#1765CC] text-white flex items-center justify-center shadow-md shadow-[#1A73E8]/30 transition-transform active:scale-95 cursor-pointer"
              title={isPlaying ? 'Pause broadcast' : 'Play broadcast'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            {/* +15s Jump */}
            <button
              id="btn-forward-15s"
              type="button"
              onClick={handleSeekForward15}
              className="w-11 h-11 rounded-full border border-[#E8EAED] flex items-center justify-center hover:bg-[#F8F9FA] text-[#5F6368] hover:text-[#202124] transition-colors relative cursor-pointer"
              title="Jump forward 15 seconds"
            >
              <RotateCw className="w-4 h-4" />
              <span className="text-[9px] font-bold absolute inset-0 flex items-center justify-center pt-0.5">
                15
              </span>
            </button>
          </div>

          {/* Next Story */}
          <button
            id="btn-next-chapter"
            type="button"
            onClick={handleNextChapter}
            className="w-10 h-10 rounded-full border border-[#E8EAED] flex items-center justify-center hover:bg-[#F8F9FA] text-[#5F6368] hover:text-[#202124] transition-colors cursor-pointer"
            title="Next story segment"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Right Controls: Speed & Volume Pill */}
          <div className="flex items-center gap-3 bg-[#F8F9FA] px-4 py-2 rounded-full border border-[#E8EAED]">
            {/* Playback Speed Selector (0.5x, 1.0x, 1.5x, 2.0x) */}
            <div className="relative">
              <button
                id="btn-playback-speed-toggle"
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-xs font-semibold font-mono text-[#1A73E8] hover:text-[#1765CC] flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-[#E8EAED] shadow-2xs"
                title="Select playback speed (0.5x, 1.0x, 1.5x, 2.0x)"
                aria-label="Playback speed selector"
              >
                <Gauge className="w-3 h-3 text-[#1A73E8]" />
                <span>{playbackRate.toFixed(1)}x</span>
              </button>

              {showSpeedMenu && (
                <div
                  id="speed-selector-dropdown"
                  className="absolute bottom-full right-0 mb-2 w-28 bg-white border border-[#E8EAED] rounded-xl shadow-lg p-1.5 z-30 space-y-1"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#80868B] px-2 py-0.5 border-b border-[#F1F3F4]">
                    Speed
                  </div>
                  {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      id={`btn-speed-option-${rate}`}
                      type="button"
                      onClick={() => {
                        onChangePlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-2.5 py-1.5 text-left text-xs font-mono rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        playbackRate === rate
                          ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold shadow-2xs'
                          : 'text-[#202124] hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <span>{rate.toFixed(1)}x</span>
                      {playbackRate === rate && <Check className="w-3.5 h-3.5 text-[#1A73E8]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <span className="w-px h-3.5 bg-[#E8EAED]" />

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn-mute-toggle"
                type="button"
                onClick={onToggleMute}
                className="text-[#5F6368] hover:text-[#202124] transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                id="audio-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                className="w-14 h-1 bg-[#E8EAED] rounded-lg appearance-none cursor-pointer accent-[#1A73E8]"
              />
            </div>
          </div>
        </div>

        {/* Secondary Toolbar: Auto-Play Setting & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F1F3F4] text-xs">
          <div className="flex items-center gap-2">
            {onToggleAutoPlay && (
              <button
                id="btn-player-autoplay-toggle"
                type="button"
                onClick={onToggleAutoPlay}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                  autoPlayOnGenerate
                    ? 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/30 font-medium shadow-2xs'
                    : 'bg-[#F8F9FA] text-[#5F6368] border-[#E8EAED] hover:bg-[#F1F3F4]'
                }`}
                title="Toggle automatic playback as soon as a new commute briefing is generated"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Auto-play on finish: <strong>{autoPlayOnGenerate ? 'On' : 'Off'}</strong></span>
              </button>
            )}
            <span className="text-[11px] text-[#80868B] hidden sm:inline">
              {autoPlayOnGenerate ? 'Starts automatically when generation finishes' : 'Manual playback start'}
            </span>
          </div>

          {summary.audioDataUrl && (
            <button
              id="btn-download-audio-secondary"
              type="button"
              onClick={handleDownloadAudio}
              className="inline-flex items-center gap-1.5 text-xs text-[#1A73E8] hover:text-[#1765CC] hover:bg-[#E8F0FE] px-3 py-1.5 rounded-full transition-colors cursor-pointer border border-transparent hover:border-[#D2E3FC]"
              title="Download offline .wav audio"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Offline WAV</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
