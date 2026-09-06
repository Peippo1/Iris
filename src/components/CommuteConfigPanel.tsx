import React from 'react';
import {
  Clock,
  Mic,
  Users,
  Radio,
  Sliders,
  Sparkles,
  Volume2,
  Tag,
  Check,
} from 'lucide-react';
import { CommuteConfig, CommuteTone, HostFormat, GeminiVoice } from '../types';

interface CommuteConfigPanelProps {
  config: CommuteConfig;
  onChangeConfig: (updates: Partial<CommuteConfig>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generationStep: string;
  articlesCount: number;
  availableCategories?: string[];
  selectedCategories?: string[];
  onToggleCategory?: (category: string) => void;
  onSelectAllCategories?: () => void;
}

const TONES: Array<{
  id: CommuteTone;
  label: string;
  badge: string;
  desc: string;
  icon: string;
}> = [
  {
    id: 'morning_briefing',
    label: 'Morning Broadcast',
    badge: 'Crisp & Punchy',
    desc: 'High-energy anchor tone with rapid, authoritative updates',
    icon: '☀️',
  },
  {
    id: 'commuter_casual',
    label: 'Commuter Casual',
    badge: 'Friendly & Relatable',
    desc: 'Conversational podcast style with natural context',
    icon: '☕',
  },
  {
    id: 'executive_snapshot',
    label: 'Executive Snapshot',
    badge: 'Bottom-Line Focus',
    desc: 'Dense, high-impact key numbers and strategic takeaways',
    icon: '💼',
  },
  {
    id: 'deep_dive',
    label: 'Deep Dive Dispatch',
    badge: 'Analytical Journalism',
    desc: 'Connecting broader market, policy, and societal trends',
    icon: '🎙️',
  },
];

export const CommuteConfigPanel: React.FC<CommuteConfigPanelProps> = ({
  config,
  onChangeConfig,
  onGenerate,
  isGenerating,
  generationStep,
  articlesCount,
  availableCategories = [],
  selectedCategories = [],
  onToggleCategory,
  onSelectAllCategories,
}) => {
  return (
    <div
      id="commute-config-panel"
      className="bg-white rounded-[24px] p-6 google-card-shadow space-y-6"
    >
      <div className="border-b border-[#E8EAED] pb-4">
        <h2 className="text-xl font-medium font-serif text-[#202124] flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#1A73E8]" />
          <span>Commute Personalisation</span>
        </h2>
        <p className="text-xs text-[#5F6368] mt-1">
          Fine-tune duration, category focus, broadcast tone, and voices for your specific travel window.
        </p>
      </div>

      {/* 1. Commute Duration */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="label text-[#202124] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>Commute Time Window</span>
          </label>
          <span className="text-xs font-medium font-mono text-[#1A73E8] bg-[#E8F0FE] px-2.5 py-0.5 rounded-full">
            {config.commuteMinutes} Minutes Total
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { mins: 5, label: '5 Min Dash', desc: 'Subway / Quick jump' },
            { mins: 10, label: '10 Min Metro', desc: 'Typical city commute' },
            { mins: 15, label: '15 Min Transit', desc: 'Train or highway drive' },
            { mins: 25, label: '25 Min Voyage', desc: 'Extended commute trip' },
          ].map((item) => (
            <button
              key={item.mins}
              id={`btn-commute-duration-${item.mins}`}
              type="button"
              onClick={() => onChangeConfig({ commuteMinutes: item.mins })}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                config.commuteMinutes === item.mins
                  ? 'border-[#1A73E8] bg-[#E8F0FE]/60 text-[#1A73E8] ring-1 ring-[#1A73E8]/30 shadow-xs'
                  : 'border-[#E8EAED] bg-[#F8F9FA] hover:bg-[#F1F3F4] text-[#202124]'
              }`}
            >
              <div className="font-medium text-sm">{item.label}</div>
              <div className="text-[11px] text-[#5F6368] mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Category Filter for the Audio Summary */}
      {availableCategories.length > 0 && onToggleCategory && (
        <div className="space-y-2.5 pt-2 border-t border-[#E8EAED]">
          <div className="flex items-center justify-between">
            <label className="label text-[#202124] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span>Filter Audio Summary by Category</span>
            </label>
            <button
              type="button"
              onClick={onSelectAllCategories}
              className="text-[11px] text-[#1A73E8] hover:underline font-medium cursor-pointer"
            >
              {selectedCategories.length === 0 || selectedCategories.length === availableCategories.length
                ? 'All Selected'
                : 'Select All Categories'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => {
              const isSelected =
                selectedCategories.length === 0 || selectedCategories.includes(cat);

              return (
                <button
                  key={cat}
                  id={`btn-toggle-summary-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => onToggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8F0FE] text-[#1A73E8] border-transparent font-semibold'
                      : 'bg-white text-[#5F6368] border-[#E8EAED] hover:bg-[#F8F9FA]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-[#1A73E8]" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[#5F6368]">
            Only articles matching the selected categories will be summarised in this broadcast.
          </p>
        </div>
      )}

      {/* 3. Broadcast Tone & Pacing */}
      <div className="space-y-2.5 pt-2 border-t border-[#E8EAED]">
        <label className="label text-[#202124] flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[#1A73E8]" />
          <span>Broadcast Style & Tone</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TONES.map((t) => (
            <button
              key={t.id}
              id={`btn-tone-${t.id}`}
              type="button"
              onClick={() => onChangeConfig({ tone: t.id })}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                config.tone === t.id
                  ? 'border-[#1A73E8] bg-[#E8F0FE]/40 ring-1 ring-[#1A73E8]/30 shadow-xs'
                  : 'border-[#E8EAED] bg-white hover:bg-[#F8F9FA]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-[#202124] flex items-center gap-1.5">
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F1F3F4] text-[#5F6368]">
                  {t.badge}
                </span>
              </div>
              <p className="text-xs text-[#5F6368] leading-relaxed">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Host Format & Voice Selection */}
      <div className="space-y-3 pt-2 border-t border-[#E8EAED]">
        <div className="flex items-center justify-between">
          <label className="label text-[#202124] flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>Anchor Voices (Gemini 3.1 Flash TTS)</span>
          </label>
          <div className="flex items-center gap-1 bg-[#F1F3F4] p-0.5 rounded-full">
            <button
              id="btn-format-single"
              type="button"
              onClick={() => onChangeConfig({ format: 'single_host' })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                config.format === 'single_host'
                  ? 'bg-white text-[#1A73E8] shadow-xs font-semibold'
                  : 'text-[#5F6368]'
              }`}
            >
              Solo Anchor
            </button>
            <button
              id="btn-format-cohosts"
              type="button"
              onClick={() => onChangeConfig({ format: 'co_hosts' })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                config.format === 'co_hosts'
                  ? 'bg-white text-[#1A73E8] shadow-xs font-semibold'
                  : 'text-[#5F6368]'
              }`}
            >
              Co-Hosts Dialogue
            </button>
          </div>
        </div>

        {/* Lead Voice */}
        <div className="space-y-1.5">
          <span className="label block">
            {config.format === 'co_hosts' ? 'Lead Anchor ("Alex") Voice' : 'Broadcast Anchor Voice'}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'Kore', name: 'Kore', tag: 'Warm & Natural' },
              { id: 'Puck', name: 'Puck', tag: 'Brisk & Clear' },
              { id: 'Charon', name: 'Charon', tag: 'Deep & Authoritative' },
              { id: 'Fenrir', name: 'Fenrir', tag: 'Calm & Steady' },
              { id: 'Zephyr', name: 'Zephyr', tag: 'Dynamic & Expressive' },
            ].map((v) => (
              <button
                key={v.id}
                id={`btn-voice-${v.id}`}
                type="button"
                onClick={() => onChangeConfig({ voice: v.id as GeminiVoice })}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  config.voice === v.id
                    ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8] shadow-xs font-medium'
                    : 'border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-[#202124]'
                }`}
              >
                <div className="font-medium text-xs">{v.name}</div>
                <div
                  className={`text-[10px] truncate ${
                    config.voice === v.id ? 'text-[#1A73E8]' : 'text-[#5F6368]'
                  }`}
                >
                  {v.tag}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Co-Host Voice (if format === 'co_hosts') */}
        {config.format === 'co_hosts' && (
          <div className="space-y-1.5 pt-1">
            <span className="label block">
              Co-Anchor (&ldquo;Sam&rdquo;) Voice
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'Puck', name: 'Puck', tag: 'Brisk & Clear' },
                { id: 'Kore', name: 'Kore', tag: 'Warm & Natural' },
                { id: 'Zephyr', name: 'Zephyr', tag: 'Dynamic & Expressive' },
                { id: 'Charon', name: 'Charon', tag: 'Deep & Authoritative' },
                { id: 'Fenrir', name: 'Fenrir', tag: 'Calm & Steady' },
              ].map((v) => (
                <button
                  key={v.id}
                  id={`btn-cohost-voice-${v.id}`}
                  type="button"
                  onClick={() => onChangeConfig({ coHostVoice: v.id as GeminiVoice })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    config.coHostVoice === v.id
                      ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8] shadow-xs font-medium'
                      : 'border-[#E8EAED] bg-white hover:bg-[#F8F9FA] text-[#202124]'
                  }`}
                >
                  <div className="font-medium text-xs">{v.name}</div>
                  <div
                    className={`text-[10px] truncate ${
                      config.coHostVoice === v.id ? 'text-[#1A73E8]' : 'text-[#5F6368]'
                    }`}
                  >
                    {v.tag}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Custom Listener Notes */}
      <div className="space-y-1.5 pt-2 border-t border-[#E8EAED]">
        <label htmlFor="commuter-notes-input" className="label text-[#202124] block">
          Listener Personalisation Notes (Optional)
        </label>
        <input
          id="commuter-notes-input"
          type="text"
          placeholder="e.g. 'I drive on the M4 motorway, focus on tech and energy impacts, keep it snappy'"
          value={config.commuterNotes}
          onChange={(e) => onChangeConfig({ commuterNotes: e.target.value })}
          className="w-full px-3.5 py-2 text-xs bg-[#F8F9FA] border border-[#E8EAED] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1A73E8] focus:bg-white text-[#202124]"
        />
      </div>

      {/* 6. Primary Action: Generate Audio Summary */}
      <div className="pt-2">
        <button
          id="btn-generate-audio-summary"
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || articlesCount === 0}
          className="w-full py-3.5 px-6 rounded-full bg-[#1A73E8] hover:bg-[#1765CC] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{generationStep || 'Generating Audio Digest...'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>
                Create Audio Digest for Commute ({articlesCount} {articlesCount === 1 ? 'Article' : 'Articles'})
              </span>
            </div>
          )}
        </button>
        {articlesCount === 0 && (
          <p className="text-[11px] text-center text-[#5F6368] mt-2">
            Please add at least 1 news article above or select active categories to begin.
          </p>
        )}
      </div>
    </div>
  );
};
