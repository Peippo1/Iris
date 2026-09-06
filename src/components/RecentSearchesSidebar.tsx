import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Plus,
  Check,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Link2,
  Layers,
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { RecentArticleSearch, NewsArticle } from '../types';
import type { User } from '../lib/firebase';

interface RecentSearchesSidebarProps {
  recentSearches: RecentArticleSearch[];
  activeArticleIds: Set<string>;
  onReAddArticle: (article: NewsArticle) => void;
  onReAddAllArticles: (articles: NewsArticle[]) => void;
  onDeleteSearch: (searchId: string) => void;
  onClearAllSearches: () => void;
  onSelectSearchQuery: (query: string, category?: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  user: User | null;
}

export const RecentSearchesSidebar: React.FC<RecentSearchesSidebarProps> = ({
  recentSearches,
  activeArticleIds,
  onReAddArticle,
  onReAddAllArticles,
  onDeleteSearch,
  onClearAllSearches,
  onSelectSearchQuery,
  isOpen,
  onToggleOpen,
  user,
}) => {
  const [filterText, setFilterText] = useState('');
  const [expandedSearchIds, setExpandedSearchIds] = useState<Set<string>>(
    () => new Set(recentSearches.slice(0, 3).map((s) => s.id))
  );

  const toggleExpand = (searchId: string) => {
    setExpandedSearchIds((prev) => {
      const next = new Set(prev);
      if (next.has(searchId)) {
        next.delete(searchId);
      } else {
        next.add(searchId);
      }
      return next;
    });
  };

  const filteredSearches = useMemo(() => {
    if (!filterText.trim()) return recentSearches;
    const lower = filterText.toLowerCase();
    return recentSearches.filter(
      (s) =>
        s.query.toLowerCase().includes(lower) ||
        (s.category && s.category.toLowerCase().includes(lower)) ||
        s.articles.some(
          (a) =>
            a.title.toLowerCase().includes(lower) ||
            (a.source && a.source.toLowerCase().includes(lower))
        )
    );
  }, [recentSearches, filterText]);

  // Format relative timestamp
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Earlier';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Quick search suggestions for empty state
  const quickSuggestions = [
    { query: 'Solid-State Battery Breakthroughs', category: 'Technology' },
    { query: 'Global Renewable Energy Transition', category: 'Environment' },
    { query: 'Autonomous Transit Networks', category: 'Transportation' },
    { query: 'Commercial Space Exploration', category: 'Science' },
  ];

  return (
    <aside
      id="recent-searches-sidebar"
      aria-label="Recent Article Searches"
      className={`bg-white rounded-[24px] google-card-shadow flex flex-col overflow-hidden transition-all duration-300 ${
        isOpen ? 'w-full' : 'hidden lg:flex lg:w-16'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-5 sm:p-6 pb-4 border-b border-[#E8EAED]">
        {isOpen ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="label">Historical Context</span>
              <div className="flex items-center gap-1">
                {recentSearches.length > 0 && (
                  <button
                    id="btn-clear-all-searches"
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear all recent article searches from history?')) {
                        onClearAllSearches();
                      }
                    }}
                    className="p-1.5 text-[#5F6368] hover:text-[#EA4335] hover:bg-[#F8F9FA] rounded-full transition-colors cursor-pointer"
                    title="Clear all recent searches"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  id="btn-collapse-sidebar"
                  type="button"
                  onClick={onToggleOpen}
                  className="p-1.5 text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA] rounded-full transition-colors cursor-pointer"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h2 className="font-serif text-[1.25rem] font-medium text-[#202124] mt-1 flex items-center gap-2">
              <span>Recent Activity</span>
              <span className="label bg-[#E8F0FE] text-[#1A73E8] px-2 py-0.5 rounded-full font-mono">
                {recentSearches.length}
              </span>
            </h2>
            <p className="text-[0.8rem] text-[#5F6368] mt-0.5">
              Saved Queries & Beats
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center py-2 space-y-3">
            <button
              id="btn-expand-sidebar"
              type="button"
              onClick={onToggleOpen}
              className="p-2 text-[#5F6368] hover:bg-[#F8F9FA] rounded-full transition-colors cursor-pointer"
              title="Expand Recent Searches sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <span className="writing-vertical-lr rotate-180 text-[11px] font-bold tracking-wider text-[#5F6368] uppercase py-2">
              Recent Activity ({recentSearches.length})
            </span>
          </div>
        )}
      </div>

      {/* Expanded Sidebar Content */}
      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick Search Filter */}
          {recentSearches.length > 3 && (
            <div className="px-5 py-3 border-b border-[#E8EAED] bg-[#F8F9FA]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#5F6368] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="filter-recent-searches-input"
                  type="text"
                  placeholder="Filter searches or articles..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-[#E8EAED] rounded-full text-[#202124] placeholder-[#5F6368] focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
                />
                {filterText && (
                  <button
                    type="button"
                    onClick={() => setFilterText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#202124]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Searches List */}
          <div className="p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[calc(100vh-260px)] min-h-[220px]">
            {filteredSearches.length === 0 ? (
              <div className="p-6 text-center text-[#5F6368] space-y-3">
                <Search className="w-8 h-8 mx-auto text-[#5F6368] opacity-50" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#202124]">
                    {recentSearches.length === 0
                      ? 'No Recent Searches Yet'
                      : 'No Matching Searches Found'}
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    {recentSearches.length === 0
                      ? 'Search topics or fetch news links to build your search history.'
                      : `No past searches match "${filterText}".`}
                  </p>
                </div>

                {recentSearches.length === 0 && (
                  <div className="pt-2 space-y-1.5 text-left">
                    <span className="label block mb-1">
                      Try a sample search:
                    </span>
                    {quickSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        id={`btn-sample-search-${idx}`}
                        type="button"
                        onClick={() => onSelectSearchQuery(item.query, item.category)}
                        className="w-full text-left p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#E8F0FE] border border-[#E8EAED] text-xs text-[#202124] transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <span className="truncate pr-1 font-medium">{item.query}</span>
                        <Sparkles className="w-3 h-3 text-[#1A73E8] shrink-0 opacity-70 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              filteredSearches.map((item) => {
                const isExpanded = expandedSearchIds.has(item.id);
                const allAdded =
                  item.articles.length > 0 &&
                  item.articles.every((art) => activeArticleIds.has(art.id));

                const borderAccent =
                  (item.category || '').toLowerCase() === 'technology'
                    ? 'border-[#4285F4]'
                    : (item.category || '').toLowerCase() === 'business' || (item.category || '').toLowerCase() === 'markets'
                    ? 'border-[#EA4335]'
                    : (item.category || '').toLowerCase() === 'environment'
                    ? 'border-[#34A853]'
                    : 'border-[#1A73E8]';

                return (
                  <div
                    key={item.id}
                    id={`recent-search-card-${item.id}`}
                    className={`rounded-[16px] p-4 bg-[#F8F9FA] border-l-4 ${borderAccent} hover:bg-[#F1F3F4] transition-all space-y-2`}
                  >
                    {/* Search Item Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="label text-[#1A73E8]">
                            {item.category || (item.type === 'url' ? 'URL Link' : 'Topic')}
                          </span>
                          <span className="text-[0.75rem] text-[#5F6368] font-mono">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>

                        {/* Search Query string */}
                        <div
                          onClick={() => onSelectSearchQuery(item.query, item.category)}
                          className="font-medium text-[0.95rem] text-[#202124] hover:text-[#1A73E8] transition-colors leading-snug cursor-pointer"
                          title="Click to search or load this beat again"
                        >
                          {item.query}
                        </div>
                      </div>

                      {/* Delete search */}
                      <button
                        id={`btn-delete-search-${item.id}`}
                        type="button"
                        onClick={() => onDeleteSearch(item.id)}
                        className="p-1 text-[#5F6368] hover:text-[#EA4335] hover:bg-white rounded-full transition-colors cursor-pointer shrink-0"
                        title="Delete from recent searches"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Summary line */}
                    {item.articles.length > 0 && (
                      <div className="text-[0.8rem] text-[#5F6368] leading-relaxed line-clamp-2">
                        {item.articles.map((a) => a.title).join(' • ')}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        id={`btn-readd-all-${item.id}`}
                        type="button"
                        onClick={() => onReAddAllArticles(item.articles)}
                        disabled={allAdded}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                          allAdded
                            ? 'bg-white text-[#5F6368] border-[#E8EAED] cursor-default'
                            : 'bg-white hover:bg-[#E8F0FE] text-[#1A73E8] border-[#E8EAED]'
                        }`}
                        title={
                          allAdded
                            ? 'All articles in active playlist'
                            : 'Re-add all articles from this search'
                        }
                      >
                        {allAdded ? (
                          <>
                            <Check className="w-3 h-3 text-[#34A853]" />
                            <span>In Playlist</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>+ Re-add</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-white hover:bg-[#F8F9FA] text-[#5F6368] border border-[#E8EAED] transition-colors cursor-pointer"
                      >
                        {isExpanded ? 'Hide' : `View (${item.articles.length})`}
                      </button>
                    </div>

                    {/* Fetched Articles List */}
                    {isExpanded && item.articles.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#E8EAED]">
                        {item.articles.map((article, idx) => {
                          const isInPlaylist = activeArticleIds.has(article.id);

                          return (
                            <div
                              key={article.id || idx}
                              id={`recent-article-item-${article.id}`}
                              className="p-2.5 bg-white rounded-xl border border-[#E8EAED] hover:border-[#1A73E8] transition-all flex items-start justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  {article.source && (
                                    <span className="label text-[#5F6368]">
                                      {article.source}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-medium text-[11px] text-[#202124] line-clamp-2 leading-tight">
                                  {article.title}
                                </h4>
                              </div>

                              {/* Quick Re-Add Article Button */}
                              <button
                                id={`btn-readd-article-${article.id}`}
                                type="button"
                                onClick={() => onReAddArticle(article)}
                                className={`shrink-0 inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                                  isInPlaylist
                                    ? 'bg-[#E8F0FE] text-[#1A73E8]'
                                    : 'bg-white hover:bg-[#E8F0FE] text-[#1A73E8] border border-[#E8EAED]'
                                }`}
                              >
                                {isInPlaylist ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 mr-0.5 text-[#34A853]" />
                                    <span>Added</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-2.5 h-2.5 mr-0.5" />
                                    <span>Re-add</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
