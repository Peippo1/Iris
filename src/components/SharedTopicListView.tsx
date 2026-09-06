import React from 'react';
import {
  Sparkles,
  Layers,
  Clock,
  Mic,
  Tag,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  X,
  Share2,
  BookmarkPlus,
  Radio,
} from 'lucide-react';
import { SharedLibrary } from '../types';

interface SharedTopicListViewProps {
  sharedLibrary: SharedLibrary;
  onImportToStudio: (sharedLibrary: SharedLibrary) => void;
  onDismiss: () => void;
}

export const SharedTopicListView: React.FC<SharedTopicListViewProps> = ({
  sharedLibrary,
  onImportToStudio,
  onDismiss,
}) => {
  const formattedDate = new Date(sharedLibrary.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      id="shared-topic-list-banner"
      className="bg-white rounded-[24px] border border-[#E8EAED] google-card-shadow p-6 sm:p-7 space-y-5 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8EAED]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="label bg-[#E8F0FE] text-[#1A73E8] px-3 py-1 rounded-full font-mono flex items-center gap-1">
              <Share2 className="w-3 h-3 text-[#1A73E8]" />
              Shared Curated Library
            </span>
            <span className="text-xs font-medium text-[#5F6368] bg-[#F8F9FA] px-2.5 py-0.5 rounded-full border border-[#E8EAED]">
              Curated by {sharedLibrary.creatorName} &bull; {formattedDate}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-medium font-serif text-[#202124]">
            {sharedLibrary.title || `${sharedLibrary.creatorName}'s Commute Reading List`}
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6368] max-w-2xl leading-relaxed">
            This personalised news collection and commute setup was shared publicly via Firestore.
            You can load these {sharedLibrary.articles?.length || 0} topics directly into your studio to generate a personalised audio broadcast.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            id="btn-import-shared-library"
            type="button"
            onClick={() => onImportToStudio(sharedLibrary)}
            className="inline-flex items-center px-5 py-2.5 bg-[#1A73E8] hover:bg-[#1765CC] text-white font-medium text-xs rounded-full shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            <span>Load into My Studio</span>
          </button>

          <button
            id="btn-dismiss-shared-view"
            type="button"
            onClick={onDismiss}
            className="p-2 text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA] rounded-full border border-[#E8EAED] transition-colors cursor-pointer"
            title="Dismiss shared view"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Shared Configuration Overview */}
      <div className="flex flex-wrap items-center gap-4 bg-[#F8F9FA] px-4 py-3 rounded-2xl border border-[#E8EAED] text-xs text-[#5F6368]">
        <div className="flex items-center gap-1.5 font-medium text-[#202124]">
          <Clock className="w-4 h-4 text-[#1A73E8]" />
          <span>Commute: {sharedLibrary.config?.commuteMinutes || 10} Minutes</span>
        </div>
        <span>&bull;</span>
        <div className="flex items-center gap-1.5 font-medium text-[#202124]">
          <Radio className="w-4 h-4 text-[#1A73E8]" />
          <span className="capitalize">
            Style: {sharedLibrary.config?.tone?.replace('_', ' ') || 'Morning Briefing'}
          </span>
        </div>
        <span>&bull;</span>
        <div className="flex items-center gap-1.5 font-medium text-[#202124]">
          <Mic className="w-4 h-4 text-[#1A73E8]" />
          <span>Voice: {sharedLibrary.config?.voice || 'Kore'}</span>
        </div>
      </div>

      {/* Curated Categories */}
      {sharedLibrary.categories && sharedLibrary.categories.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#5F6368] flex items-center gap-1 font-mono">
            <Tag className="w-3.5 h-3.5 text-[#1A73E8]" />
            Curated Topic Beats:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sharedLibrary.categories.map((cat) => (
              <span
                key={cat}
                className="label bg-[#E8F0FE] text-[#1A73E8] px-3 py-1 rounded-full font-mono"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Articles in this Shared Topic List */}
      <div className="space-y-2.5">
        <span className="text-xs font-medium uppercase tracking-wider text-[#5F6368] block font-mono">
          Articles in this Shared Collection ({sharedLibrary.articles?.length || 0})
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sharedLibrary.articles?.map((article, idx) => (
            <div
              key={article.id || idx}
              className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E8EAED] space-y-1.5"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-4 h-4 rounded-full bg-[#E8F0FE] text-[#1A73E8] text-[10px] font-medium flex items-center justify-center font-mono shrink-0">
                  {idx + 1}
                </span>
                <span className="label bg-white text-[#1A73E8] border border-[#E8EAED] px-2 py-0.5 rounded">
                  {article.category || 'General'}
                </span>
                {article.source && (
                  <span className="text-[10px] text-[#5F6368] font-mono">
                    {article.source}
                  </span>
                )}
              </div>

              <h4 className="font-serif font-semibold text-sm text-[#202124] line-clamp-2">
                {article.title}
              </h4>

              <p className="text-xs text-[#5F6368] line-clamp-2 leading-relaxed">
                {article.content}
              </p>

              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#1A73E8] hover:underline font-medium pt-1"
                >
                  <span>Source article</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
