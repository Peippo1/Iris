import React, { useState, useRef, useEffect } from 'react';
import {
  BookmarkCheck,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Trash2,
  Sparkles,
  Layers,
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  Shuffle,
  RefreshCw,
  ExternalLink,
  LogIn,
  CloudCheck,
  Tag,
  Share2,
} from 'lucide-react';
import { ListenLaterItem, DEFAULT_CATEGORIES } from '../types';
import type { User } from '../lib/firebase';
import { authFetch } from '../lib/api';

interface ListenLaterQueueProps {
  queueItems: ListenLaterItem[];
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  onUpdateItem: (id: string, updates: Partial<ListenLaterItem>) => void;
  onReorderItems: (items: ListenLaterItem[]) => void;
  onCompileToDigest: (items: ListenLaterItem[]) => void;
  onAddSamplesToQueue: () => void;
  user: User | null;
  onSignIn: () => void;
}

export const ListenLaterQueue: React.FC<ListenLaterQueueProps> = ({
  queueItems,
  onRemoveItem,
  onClearQueue,
  onUpdateItem,
  onReorderItems,
  onCompileToDigest,
  onAddSamplesToQueue,
  user,
  onSignIn,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Audio cache to avoid re-synthesizing within session
  const audioCacheRef = useRef<Record<string, { audioUrl: string; duration: number; script?: string }>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter items based on selected category
  const filteredItems = selectedCategory === 'All'
    ? queueItems
    : queueItems.filter((item) => (item.category || '').toLowerCase() === selectedCategory.toLowerCase());

  // Derive unique categories from existing queue
  const queueCategories = Array.from(
    new Set(queueItems.map((item) => item.category || 'General'))
  );

  // Active item reference
  const activeItem = queueItems.find((item) => item.id === activeItemId) || null;
  const activeIndex = filteredItems.findIndex((item) => item.id === activeItemId);

  // Estimated total listening time
  const totalEstimatedMinutes = Math.max(
    1,
    Math.round(
      queueItems.reduce((acc, item) => {
        const words = (item.content || item.title || '').trim().split(/\s+/).length;
        return acc + Math.max(0.7, words / 130);
      }, 0)
    )
  );

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Update time and track end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (activeItemId) {
        onUpdateItem(activeItemId, { isPlayed: true });
      }

      // Auto-advance sequentially to the next item
      if (autoAdvance) {
        const nextIdx = activeIndex + 1;
        if (nextIdx < filteredItems.length) {
          const nextItem = filteredItems[nextIdx];
          playQueueItem(nextItem);
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activeItemId, activeIndex, autoAdvance, filteredItems, onUpdateItem]);

  const playQueueItem = async (item: ListenLaterItem) => {
    setSynthesisError(null);
    setActiveItemId(item.id);

    // 1. Check if audio is already generated in memory cache or in item
    const cached = audioCacheRef.current[item.id] || (item.audioDataUrl ? { audioUrl: item.audioDataUrl, duration: item.audioDuration || 60, script: item.spokenScript } : null);

    if (cached && audioRef.current) {
      audioRef.current.src = cached.audioUrl;
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e: any) {
        console.warn('Playback play() call interrupted or blocked:', e);
      }
      return;
    }

    // 2. Synthesize audio on-the-fly using Gemini 3.8 Flash & 3.1 Flash TTS
    setIsSynthesizing(true);
    try {
      const res = await authFetch('/api/generate-queue-article-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          source: item.source || 'News Desk',
          content: item.content,
          category: item.category || 'General',
          voice: 'Kore',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.audioDataUrl) {
        throw new Error(data.error || 'Failed to synthesise audio for this story');
      }

      audioCacheRef.current[item.id] = {
        audioUrl: data.audioDataUrl,
        duration: data.audioDuration,
        script: data.script,
      };

      onUpdateItem(item.id, {
        audioDataUrl: data.audioDataUrl,
        audioDuration: data.audioDuration,
        spokenScript: data.script,
      });

      if (audioRef.current) {
        audioRef.current.src = data.audioDataUrl;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err: any) {
      console.error('Queue audio generation error:', err);
      setSynthesisError(err.message || 'Error creating voice summary for this article');
      setIsPlaying(false);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!activeItemId && filteredItems.length > 0) {
        playQueueItem(filteredItems[0]);
      } else {
        audioRef.current.play().catch(console.warn);
        setIsPlaying(true);
      }
    }
  };

  const playNext = () => {
    if (activeIndex >= 0 && activeIndex < filteredItems.length - 1) {
      playQueueItem(filteredItems[activeIndex + 1]);
    }
  };

  const playPrevious = () => {
    if (activeIndex > 0) {
      playQueueItem(filteredItems[activeIndex - 1]);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queueItems.length) return;

    const newItems = [...queueItems];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    // Re-assign order index
    const reordered = newItems.map((item, idx) => ({ ...item, order: idx }));
    onReorderItems(reordered);
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="listen-later-queue-view" className="space-y-6">
      {/* Hidden native audio tag */}
      <audio ref={audioRef} preload="auto" />

      {/* Header Banner */}
      <div className="bg-white rounded-[28px] p-6 google-card-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8EAED]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider bg-[#E8F0FE] text-[#1A73E8]">
                <BookmarkCheck className="w-3.5 h-3.5 mr-1" />
                Listen Later Queue
              </span>
              {user ? (
                <span className="inline-flex items-center gap-1 text-xs text-[#34A853] font-medium bg-[#E6F4EA] px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-[#34A853]" />
                  <span>Cloud Synced</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center gap-1 text-xs text-[#1A73E8] hover:underline font-medium bg-[#E8F0FE] px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Sign in with Google to sync</span>
                </button>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-medium font-serif text-[#202124]">
              Sequential Commuter Playback Queue
            </h1>
            <p className="text-xs sm:text-sm text-[#5F6368] max-w-2xl leading-relaxed">
              Queue articles throughout your day. Gemini TTS voices each story in sequence, automatically moving to the next item so your eyes stay safely on the road.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {queueItems.length > 0 && (
              <>
                <button
                  id="btn-play-all-queue"
                  type="button"
                  onClick={() => {
                    if (filteredItems.length > 0) {
                      playQueueItem(filteredItems[0]);
                    }
                  }}
                  className="inline-flex items-center px-5 py-2.5 bg-[#1A73E8] hover:bg-[#1765CC] text-white font-medium text-xs rounded-full shadow-sm transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  Play Queue Sequentially
                </button>

                <button
                  id="btn-compile-queue-digest"
                  type="button"
                  onClick={() => onCompileToDigest(filteredItems)}
                  className="inline-flex items-center px-4 py-2.5 bg-[#E8F0FE] hover:bg-[#D4E4FC] text-[#1A73E8] font-medium text-xs rounded-full transition-colors cursor-pointer"
                  title="Generate a unified Morning Broadcast show from queued articles"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#1A73E8]" />
                  Compile to Commute Broadcast
                </button>

                <button
                  id="btn-clear-listen-queue"
                  type="button"
                  onClick={onClearQueue}
                  className="inline-flex items-center p-2.5 text-[#5F6368] hover:text-[#EA4335] hover:bg-red-50 rounded-full border border-[#E8EAED] transition-colors cursor-pointer"
                  title="Clear entire queue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Category Filters Bar */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="label mr-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#1A73E8]" />
              Filter by Category:
            </span>
            <button
              id="queue-filter-all"
              type="button"
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                selectedCategory === 'All'
                  ? 'bg-[#E8F0FE] text-[#1A73E8] border-transparent font-semibold'
                  : 'bg-white text-[#202124] border-[#E8EAED] hover:bg-[#F8F9FA]'
              }`}
            >
              All ({queueItems.length})
            </button>
            {DEFAULT_CATEGORIES.map((cat) => {
              const count = queueItems.filter(
                (item) => (item.category || '').toLowerCase() === cat.toLowerCase()
              ).length;
              if (count === 0 && !queueCategories.includes(cat)) return null;

              return (
                <button
                  key={cat}
                  id={`queue-filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    selectedCategory === cat
                      ? 'bg-[#E8F0FE] text-[#1A73E8] border-transparent font-semibold'
                      : 'bg-white text-[#202124] border-[#E8EAED] hover:bg-[#F8F9FA]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="text-xs font-mono text-[#5F6368] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>Total Queue: ~{totalEstimatedMinutes} min</span>
          </div>
        </div>
      </div>

      {/* Sequential Audio Player Floating / Inline Bar */}
      {activeItem && (
        <div
          id="sequential-player-bar"
          className="bg-white rounded-[24px] p-5 google-card-shadow border border-[#1A73E8]/30 transition-all space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#1A73E8] text-white flex items-center justify-center shrink-0 shadow-sm">
                {isSynthesizing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Volume2 className="w-5 h-5 animate-pulse" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="label px-2.5 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8]">
                    Now Playing &bull; Story {activeIndex + 1} of {filteredItems.length}
                  </span>
                  <span className="label text-[#5F6368] bg-[#F1F3F4] px-2 py-0.5 rounded">
                    {activeItem.category || 'General'}
                  </span>
                  {activeItem.source && (
                    <span className="text-[10px] text-[#5F6368] font-mono">
                      via {activeItem.source}
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-medium text-base text-[#202124] truncate">
                  {activeItem.title}
                </h3>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2 self-center sm:self-auto shrink-0">
              <button
                id="btn-queue-prev"
                type="button"
                onClick={playPrevious}
                disabled={activeIndex <= 0 || isSynthesizing}
                className="p-2 text-[#5F6368] hover:bg-[#F1F3F4] rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous article in queue"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                id="btn-queue-play-pause"
                type="button"
                onClick={togglePlayPause}
                disabled={isSynthesizing}
                className="w-10 h-10 rounded-full bg-[#1A73E8] hover:bg-[#1765CC] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isSynthesizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                id="btn-queue-next"
                type="button"
                onClick={playNext}
                disabled={activeIndex >= filteredItems.length - 1 || isSynthesizing}
                className="p-2 text-[#5F6368] hover:bg-[#F1F3F4] rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next article in queue"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Auto Advance Toggle */}
              <button
                id="btn-toggle-autoadvance"
                type="button"
                onClick={() => setAutoAdvance(!autoAdvance)}
                className={`ml-2 px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                  autoAdvance
                    ? 'bg-[#E8F0FE] text-[#1A73E8] border-transparent font-semibold'
                    : 'bg-[#F8F9FA] text-[#5F6368] border-[#E8EAED]'
                }`}
                title="Auto-play next article when current article finishes"
              >
                <RefreshCw className={`w-3 h-3 ${autoAdvance ? 'animate-spin-slow' : ''}`} />
                <span>Auto-Advance: {autoAdvance ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Scrubber & Duration */}
          <div className="space-y-1 pt-1">
            <input
              id="queue-audio-scrubber"
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              disabled={isSynthesizing || duration === 0}
              className="w-full h-1.5 bg-[#F1F3F4] rounded-lg appearance-none cursor-pointer accent-[#1A73E8]"
            />
            <div className="flex justify-between text-[11px] font-mono text-[#5F6368]">
              <span>{formatSeconds(currentTime)}</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Voice synthesis error banner if any */}
          {synthesisError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{synthesisError}</span>
              </div>
              <button
                type="button"
                onClick={() => playQueueItem(activeItem)}
                className="underline font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Spoken Script Preview */}
          {activeItem.spokenScript && (
            <div className="pt-1 text-xs text-[#5F6368] italic bg-[#F8F9FA] p-3 rounded-xl border border-[#E8EAED]">
              &ldquo;{activeItem.spokenScript}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Queue Items List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-[#5F6368] px-1">
          <span className="label">
            {selectedCategory === 'All' ? 'All Queued Stories' : `${selectedCategory} Stories`}
          </span>
          <span className="font-mono text-xs">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} in queue
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div
            id="empty-queue-placeholder"
            className="p-10 text-center bg-white rounded-[24px] google-card-shadow space-y-3"
          >
            <BookmarkCheck className="w-10 h-10 text-[#5F6368] mx-auto opacity-50" />
            <h3 className="font-serif font-medium text-lg text-[#202124]">
              {selectedCategory === 'All'
                ? 'Your Listen Later Queue is empty'
                : `No stories under "${selectedCategory}" in your queue`}
            </h3>
            <p className="text-xs sm:text-sm text-[#5F6368] max-w-md mx-auto leading-relaxed">
              Save stories as you browse news headlines, or click below to populate the queue with sample articles ready for immediate voice playback.
            </p>
            <div className="pt-2">
              <button
                id="btn-add-samples-queue-empty"
                type="button"
                onClick={onAddSamplesToQueue}
                className="inline-flex items-center px-5 py-2 text-xs font-medium text-white bg-[#1A73E8] hover:bg-[#1765CC] rounded-full transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Add Curated Stories to Queue
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item, index) => {
              const isActive = activeItemId === item.id;
              const isCurrentlyPlaying = isActive && isPlaying;
              const words = (item.content || item.title || '').trim().split(/\s+/).length;

              return (
                <div
                  key={item.id}
                  id={`queue-item-${item.id}`}
                  className={`bg-white rounded-2xl p-5 transition-all google-card-shadow flex flex-col sm:flex-row sm:items-start justify-between gap-4 group ${
                    isActive
                      ? 'ring-2 ring-[#1A73E8] bg-[#FAFBFD]'
                      : 'hover:bg-[#FAFBFD]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Reorder / Status indicators */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-[#5F6368] hover:text-[#1A73E8] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                        title="Move up in playback order"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-6 h-6 rounded-full bg-[#F1F3F4] text-[#5F6368] text-xs font-medium font-mono flex items-center justify-center">
                        {index + 1}
                      </div>

                      <button
                        type="button"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === filteredItems.length - 1}
                        className="p-1 text-[#5F6368] hover:text-[#1A73E8] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                        title="Move down in playback order"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="label px-2.5 py-0.5 rounded-full bg-[#F1F3F4] text-[#5F6368]">
                          {item.category || 'General'}
                        </span>
                        {item.source && (
                          <span className="label text-[#5F6368]">
                            &bull; {item.source}
                          </span>
                        )}
                        <span className="text-xs font-mono text-[#5F6368]">
                          ~{words} words
                        </span>
                        {item.isPlayed && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#34A853] bg-[#E6F4EA] px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Listened
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-[1.15rem] font-medium text-[#202124] group-hover:text-[#1A73E8] transition-colors leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs text-[#5F6368] line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-[11px] text-[#1A73E8] hover:underline gap-1 pt-0.5 font-medium"
                        >
                          <span>Original link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions for this item */}
                  <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 self-end sm:self-start">
                    <button
                      id={`btn-play-queue-item-${item.id}`}
                      type="button"
                      onClick={() => {
                        if (isActive && isPlaying) {
                          togglePlayPause();
                        } else {
                          playQueueItem(item);
                        }
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        isActive && isPlaying
                          ? 'bg-[#1A73E8] text-white'
                          : 'bg-[#E8F0FE] text-[#1A73E8] hover:bg-[#D4E4FC]'
                      }`}
                    >
                      {isActive && isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Story</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        id={`btn-toggle-listened-${item.id}`}
                        type="button"
                        onClick={() => onUpdateItem(item.id, { isPlayed: !item.isPlayed })}
                        className="p-1.5 text-[#5F6368] hover:text-[#1A73E8] hover:bg-[#F1F3F4] rounded-full transition-colors cursor-pointer"
                        title={item.isPlayed ? 'Mark as unlistened' : 'Mark as listened'}
                      >
                        {item.isPlayed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#34A853]" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        id={`btn-remove-queue-item-${item.id}`}
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1.5 text-[#5F6368] hover:text-[#EA4335] hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
