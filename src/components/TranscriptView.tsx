import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Play,
  Volume2,
  Mic,
  Users,
  Sparkles,
} from 'lucide-react';
import { CommuteSummary, ScriptSegment } from '../types';

interface TranscriptViewProps {
  summary: CommuteSummary;
  currentTime: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  summary,
  currentTime,
  onSeek,
  isPlaying,
}) => {
  const [viewMode, setViewMode] = useState<'segments' | 'continuous'>('segments');
  const [copied, setCopied] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(summary.fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="transcript-view-card" className="bg-white rounded-[24px] google-card-shadow p-6 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EAED]">
        <div>
          <h2 className="text-lg font-medium font-serif text-[#202124] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1A73E8]" />
            <span>Interactive Broadcast Transcript</span>
          </h2>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Synchronized spoken script. Click any segment to jump playback directly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#F8F9FA] p-1 rounded-full border border-[#E8EAED] text-xs">
            <button
              id="btn-transcript-mode-segments"
              type="button"
              onClick={() => setViewMode('segments')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                viewMode === 'segments'
                  ? 'bg-white text-[#1A73E8] shadow-xs font-semibold'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }`}
            >
              Story Segments
            </button>
            <button
              id="btn-transcript-mode-continuous"
              type="button"
              onClick={() => setViewMode('continuous')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                viewMode === 'continuous'
                  ? 'bg-white text-[#1A73E8] shadow-xs font-semibold'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }`}
            >
              Continuous Script
            </button>
          </div>

          <button
            id="btn-copy-full-script"
            type="button"
            onClick={handleCopyScript}
            className="p-2 text-[#5F6368] hover:text-[#1A73E8] bg-[#F8F9FA] hover:bg-[#E8F0FE] border border-[#E8EAED] rounded-full transition-colors cursor-pointer"
            title="Copy script text"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#34A853]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {viewMode === 'segments' ? (
        <div className="space-y-3">
          {/* Intro Segment */}
          {summary.intro && (
            <div
              id="transcript-segment-intro"
              className="p-4.5 rounded-2xl border border-[#E8EAED] bg-[#F8F9FA] space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="label bg-[#E8F0FE] text-[#1A73E8] px-2.5 py-0.5 rounded-full font-mono">
                  Broadcast Introduction
                </span>
                <button
                  type="button"
                  onClick={() => onSeek(0)}
                  className="text-[#1A73E8] hover:text-[#1765CC] font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play Intro</span>
                </button>
              </div>
              <p className="text-xs text-[#3C4043] leading-relaxed italic font-serif">
                &ldquo;{summary.intro}&rdquo;
              </p>
            </div>
          )}

          {/* Story Segments */}
          {summary.segments.map((seg, idx) => {
            const chapter = summary.chapters?.find((c) => c.id === seg.id);
            const isCurrentlyActive =
              chapter &&
              currentTime >= chapter.startTime &&
              currentTime <= chapter.endTime;

            return (
              <div
                key={seg.id || idx}
                id={`transcript-segment-${seg.id || idx}`}
                className={`p-5 rounded-2xl border transition-all ${
                  isCurrentlyActive
                    ? 'border-[#1A73E8] bg-[#E8F0FE]/35 shadow-xs ring-1 ring-[#1A73E8]/30'
                    : 'border-[#E8EAED] bg-white hover:border-[#BDC1C6]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold font-mono w-5 h-5 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-serif text-sm font-semibold text-[#202124]">
                      {seg.headline || seg.articleTitle}
                    </span>
                    <span className="label bg-[#E8F0FE] text-[#1A73E8] px-2 py-0.5 rounded-full">
                      {seg.category}
                    </span>
                    <span className="text-[11px] text-[#5F6368] font-medium font-mono">
                      Speaker: {seg.speaker}
                    </span>
                  </div>

                  {chapter && (
                    <button
                      type="button"
                      onClick={() => onSeek(chapter.startTime)}
                      className={`text-xs px-3 py-1 rounded-full font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isCurrentlyActive
                          ? 'bg-[#1A73E8] text-white shadow-xs'
                          : 'bg-[#F8F9FA] text-[#1A73E8] hover:bg-[#E8F0FE] border border-[#E8EAED]'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isCurrentlyActive ? 'Playing' : 'Listen'}</span>
                    </button>
                  )}
                </div>

                <p className="text-sm text-[#3C4043] leading-relaxed font-serif">
                  {seg.script}
                </p>
              </div>
            );
          })}

          {/* Outro Segment */}
          {summary.outro && (
            <div
              id="transcript-segment-outro"
              className="p-4.5 rounded-2xl border border-[#E8EAED] bg-[#F8F9FA] space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="label bg-[#E8F0FE] text-[#1A73E8] px-2.5 py-0.5 rounded-full font-mono">
                  Commute Sign-off
                </span>
                {summary.chapters && (
                  <button
                    type="button"
                    onClick={() => {
                      const lastCh = summary.chapters?.[summary.chapters.length - 1];
                      if (lastCh) onSeek(lastCh.startTime);
                    }}
                    className="text-[#1A73E8] hover:text-[#1765CC] font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play Wrap-up</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-[#3C4043] leading-relaxed italic font-serif">
                &ldquo;{summary.outro}&rdquo;
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 bg-[#F8F9FA] rounded-2xl border border-[#E8EAED] font-serif text-sm text-[#202124] leading-relaxed whitespace-pre-line">
          {summary.fullScript}
        </div>
      )}
    </div>
  );
};
