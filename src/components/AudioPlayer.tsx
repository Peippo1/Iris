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
} from 'lucide-react';
import { CommuteSummary, AudioChapter } from '../types';

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

  // 24-bar waveform pattern matching Natural Tones layout
  const waveformHeights = [
    32, 48, 40, 56, 46, 36, 60, 44, 30, 52, 24, 40, 58, 36, 48, 28, 44, 52, 34, 48, 62, 38, 46, 30,
  ];

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

      {/* Main Player Card */}
      <div
        id="commute-audio-player-card"
        className="bg-white p-6 sm:p-8 rounded-[32px] google-card-shadow relative space-y-6"
      >
        {/* Waveform & Remaining Time Header */}
        <div className="flex items-center justify-between gap-4 pb-2">
          {/* Vertical Audio Bars */}
          <div className="flex gap-1 sm:gap-1.5 items-end h-16 flex-1 max-w-md">
            {waveformHeights.map((h, i) => {
              const barProgress = (i / waveformHeights.length) * 100;
              const isPlayed = progressPercent >= barProgress;
              return (
                <div
                  key={i}
                  style={{ height: `${h}px` }}
                  className={`w-1.5 sm:w-2 rounded-full transition-colors ${
                    isPlayed ? 'bg-[#1A73E8]' : 'bg-[#E8EAED]'
                  } ${isPlaying && isPlayed ? 'opacity-90' : ''}`}
                />
              );
            })}
          </div>

          {/* Time Remaining Counter */}
          <div className="text-right shrink-0">
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
            {/* Speed Toggle */}
            <div className="relative">
              <button
                id="btn-playback-speed-toggle"
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-xs font-medium font-mono text-[#1A73E8] hover:text-[#1765CC] cursor-pointer"
                title="Playback speed"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-24 bg-white border border-[#E8EAED] rounded-xl shadow-lg p-1 z-30 space-y-0.5">
                  {[0.8, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                    <button
                      key={rate}
                      id={`btn-speed-option-${rate}`}
                      type="button"
                      onClick={() => {
                        onChangePlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-2.5 py-1 text-left text-xs rounded-md flex items-center justify-between cursor-pointer ${
                        playbackRate === rate
                          ? 'bg-[#E8F0FE] text-[#1A73E8] font-medium'
                          : 'text-[#202124] hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <Check className="w-3 h-3 text-[#1A73E8]" />}
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
      </div>
    </div>
  );
};
