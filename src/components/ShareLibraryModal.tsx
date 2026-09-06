import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  Clock,
  Mic,
  Tag,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Radio,
  Globe,
} from 'lucide-react';
import { CommuteConfig, NewsArticle } from '../types';
import { createSharedLibrary } from '../lib/firestoreService';
import type { User } from '../lib/firebase';

interface ShareLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CommuteConfig;
  articles: NewsArticle[];
  user: User | null;
}

export const ShareLibraryModal: React.FC<ShareLibraryModalProps> = ({
  isOpen,
  onClose,
  config,
  articles,
  user,
}) => {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  // Extract unique categories from articles
  const categories: string[] = Array.from(
    new Set<string>(articles.map((a) => (a.category || 'General') as string).filter(Boolean))
  );

  // Generate unique public share URL when opened
  useEffect(() => {
    if (!isOpen) {
      setShareUrl('');
      setShareId(null);
      setError(null);
      setCopied(false);
      return;
    }

    const generateShare = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        const creatorName =
          user?.displayName ||
          (user?.email ? user.email.split('@')[0] : 'Commuter');

        const title = `${creatorName}'s Curated Commute Topics`;

        const newShareId = await createSharedLibrary({
          userId: user?.uid,
          creatorName,
          title,
          config,
          articles,
          categories,
          articlesCount: articles.length,
        });

        setShareId(newShareId);
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        const fullUrl = `${origin}${pathname}?share=${newShareId}`;
        setShareUrl(fullUrl);
      } catch (err: any) {
        console.error('Error generating share link:', err);
        setError(err.message || 'Failed to generate share link in Firestore');
      } finally {
        setIsGenerating(false);
      }
    };

    generateShare();
  }, [isOpen, articles, config, user]);

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Curated Commute News Topics',
          text: `Check out my curated ${articles.length} news articles for a ${config.commuteMinutes}-minute commute!`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/40 backdrop-blur-xs">
      <div
        id="share-library-modal"
        className="bg-white rounded-[24px] max-w-xl w-full max-h-[90vh] flex flex-col google-card-shadow overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E8EAED] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1A73E8] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-medium font-serif text-[#202124]">
                Share Curated Topic List
              </h2>
              <p className="text-xs text-[#5F6368]">
                Public Firestore link for your articles and commute configuration
              </p>
            </div>
          </div>
          <button
            id="btn-close-share-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isGenerating ? (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-[#1A73E8] animate-spin" />
              <p className="text-sm font-medium text-[#202124]">
                Generating unique public share URL in Firestore...
              </p>
              <p className="text-xs text-[#5F6368]">
                Publishing your curated topic list so anyone with the link can view it.
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-[#EA4335] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EA4335] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Could not create share link</strong>
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Share URL Box */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#1A73E8] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#1A73E8]" />
                    <span>Unique Public Share URL</span>
                  </span>
                  <span className="text-[10px] text-[#34A853] font-mono bg-[#E6F4EA] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Live in Firestore
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    id="input-public-share-url"
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-[#F8F9FA] border border-[#E8EAED] rounded-xl font-mono text-[#202124] select-all focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                  />
                  <button
                    id="btn-copy-share-url"
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      copied
                        ? 'bg-[#34A853] text-white shadow-xs'
                        : 'bg-[#1A73E8] hover:bg-[#1765CC] text-white shadow-xs'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#1A73E8] hover:underline font-medium"
                  >
                    <span>Preview shared page</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="text-xs text-[#1A73E8] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share via device...</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Curated Topic Preview */}
              <div className="bg-[#F8F9FA] p-4.5 rounded-2xl border border-[#E8EAED] space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8EAED] pb-2.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#1A73E8] flex items-center gap-1.5 font-mono">
                    <Tag className="w-3.5 h-3.5 text-[#1A73E8]" />
                    <span>Topics in this Share</span>
                  </span>
                  <span className="text-xs font-mono text-[#5F6368]">
                    {articles.length} {articles.length === 1 ? 'Article' : 'Articles'}
                  </span>
                </div>

                {/* Categories badges */}
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="label bg-white text-[#1A73E8] border border-[#E8EAED] px-2.5 py-0.5 rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Commute setup pill */}
                <div className="flex items-center gap-2 pt-1 text-[11px] text-[#5F6368] font-mono flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#1A73E8]" />
                    {config.commuteMinutes} min commute
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Mic className="w-3 h-3 text-[#1A73E8]" />
                    {config.voice} voice
                  </span>
                  <span>&bull;</span>
                  <span className="capitalize">{config.tone.replace('_', ' ')}</span>
                </div>

                {/* List of articles */}
                <div className="space-y-1.5 pt-1">
                  {articles.slice(0, 4).map((art, idx) => (
                    <div
                      key={art.id || idx}
                      className="text-xs text-[#202124] truncate flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-[#E8EAED]"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#E8F0FE] text-[#1A73E8] text-[10px] font-medium flex items-center justify-center shrink-0 font-mono">
                        {idx + 1}
                      </span>
                      <span className="font-medium truncate">{art.title}</span>
                      {art.source && (
                        <span className="text-[10px] text-[#5F6368] shrink-0 font-mono">
                          ({art.source})
                        </span>
                      )}
                    </div>
                  ))}
                  {articles.length > 4 && (
                    <p className="text-[11px] text-[#5F6368] text-center italic">
                      + {articles.length - 4} more stories included
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8F9FA] border-t border-[#E8EAED] flex items-center justify-between">
          <p className="text-[11px] text-[#5F6368]">
            Anyone with this unique link can view this topic list in their browser.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-medium text-[#1A73E8] bg-[#E8F0FE] hover:bg-[#D2E3FC] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
