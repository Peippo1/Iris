import React from 'react';
import {
  X,
  Clock,
  Play,
  Trash2,
  Calendar,
  CloudCheck,
  Tag,
} from 'lucide-react';
import { CommuteSummary } from '../types';
import type { User } from '../lib/firebase';

interface SavedDigestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedDigests: CommuteSummary[];
  onSelectDigest: (digest: CommuteSummary) => void;
  onDeleteDigest: (id: string) => void;
  activeDigestId?: string;
  user?: User | null;
}

export const SavedDigestsModal: React.FC<SavedDigestsModalProps> = ({
  isOpen,
  onClose,
  savedDigests,
  onSelectDigest,
  onDeleteDigest,
  activeDigestId,
  user,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/40 backdrop-blur-xs">
      <div
        id="saved-digests-modal"
        className="bg-white rounded-[24px] max-w-2xl w-full max-h-[85vh] flex flex-col google-card-shadow overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#E8EAED] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium font-serif text-[#202124]">
                Saved Commute Digests
              </h2>
              {user ? (
                <span className="text-[10px] font-medium text-[#34A853] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                  Firestore Synced
                </span>
              ) : (
                <span className="text-[10px] text-[#5F6368] bg-[#F8F9FA] px-2 py-0.5 rounded-full">
                  Local Session
                </span>
              )}
            </div>
            <p className="text-xs text-[#5F6368]">
              {user
                ? 'Your personal audio broadcasts securely stored in your Firestore cloud account'
                : 'Your audio summaries saved in this browser. Sign in with Google to sync.'}
            </p>
          </div>
          <button
            id="btn-close-saved-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {savedDigests.length === 0 ? (
            <div className="text-center py-12 text-[#5F6368] space-y-2">
              <Clock className="w-8 h-8 mx-auto text-[#BDC1C6]" />
              <p className="text-sm font-medium text-[#202124]">No saved broadcasts yet</p>
              <p className="text-xs text-[#5F6368] max-w-sm mx-auto">
                Once you generate an audio summary for your commute, it will be automatically
                saved here so you can replay it anytime.
              </p>
            </div>
          ) : (
            savedDigests.map((digest) => {
              const isActive = digest.id === activeDigestId;
              const dateStr = new Date(digest.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              // Extract unique categories from segments
              const categories = Array.from(
                new Set(digest.segments?.map((s) => s.category).filter(Boolean))
              );

              return (
                <div
                  key={digest.id}
                  id={`saved-digest-${digest.id}`}
                  className={`p-4.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive
                      ? 'border-[#1A73E8] bg-[#E8F0FE]/40 ring-1 ring-[#1A73E8]/30 shadow-xs'
                      : 'border-[#E8EAED] bg-white hover:bg-[#F8F9FA]'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-[#5F6368] flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-[#5F6368]" />
                        {dateStr}
                      </span>
                      <span className="label bg-[#E8F0FE] text-[#1A73E8] px-2 py-0.5 rounded-full font-mono">
                        {digest.config.commuteMinutes} min commute
                      </span>
                      <span className="text-[11px] text-[#5F6368]">
                        {digest.articlesCount} stories
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold font-serif text-[#202124] truncate">
                      {digest.title}
                    </h3>
                    <p className="text-xs text-[#5F6368] line-clamp-1">
                      {digest.overview}
                    </p>

                    {/* Category tags */}
                    {categories.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {categories.slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="label bg-[#F8F9FA] text-[#5F6368] border border-[#E8EAED] px-2 py-0.5 rounded"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDigest(digest);
                        onClose();
                      }}
                      className="px-4 py-2 rounded-full text-xs font-medium bg-[#1A73E8] hover:bg-[#1765CC] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isActive ? 'Current' : 'Play'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteDigest(digest.id)}
                      className="p-2 text-[#5F6368] hover:text-[#EA4335] hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                      title="Delete digest"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
