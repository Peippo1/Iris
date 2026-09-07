import React, { useState, useEffect } from 'react';
import {
  Plus,
  Link2,
  FileText,
  Trash2,
  Sparkles,
  ExternalLink,
  Layers,
  AlertCircle,
  Loader2,
  BookmarkPlus,
  BookmarkCheck,
  Tag,
  Filter,
  Check,
  Search,
  History,
  PanelLeft,
  CheckCircle2,
} from 'lucide-react';
import { NewsArticle, DEFAULT_CATEGORIES } from '../types';
import { authFetch } from '../lib/api';

interface ArticleManagerProps {
  articles: NewsArticle[];
  onAddArticle: (article: NewsArticle) => void;
  onAddMultipleArticles?: (articles: NewsArticle[]) => void;
  onRemoveArticle: (id: string) => void;
  onUpdateArticleCategory: (id: string, category: string) => void;
  onClearArticles: () => void;
  onLoadSamples: () => void;
  onAddToQueue: (article: NewsArticle) => void;
  queuedArticleIds: Set<string>;
  selectedCategoryFilter: string;
  onSelectCategoryFilter: (category: string) => void;
  customCategories: string[];
  onAddCustomCategory: (category: string) => void;
  onSaveRecentSearch?: (query: string, type: 'topic' | 'url', articles: NewsArticle[], category?: string) => void;
  externalSearchQuery?: { query: string; category?: string; timestamp: number } | null;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  recentSearchesCount?: number;
}

export const ArticleManager: React.FC<ArticleManagerProps> = ({
  articles,
  onAddArticle,
  onAddMultipleArticles,
  onRemoveArticle,
  onUpdateArticleCategory,
  onClearArticles,
  onLoadSamples,
  onAddToQueue,
  queuedArticleIds,
  selectedCategoryFilter,
  onSelectCategoryFilter,
  customCategories,
  onAddCustomCategory,
  onSaveRecentSearch,
  externalSearchQuery,
  onToggleSidebar,
  isSidebarOpen,
  recentSearchesCount = 0,
}) => {
  const [inputMode, setInputMode] = useState<'search' | 'url' | 'paste'>('search');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState<string>('Technology');
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [content, setContent] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCount, setSearchCount] = useState<number>(3);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccessMsg, setSearchSuccessMsg] = useState<string | null>(null);

  // Sync external search selection (e.g. from Recent Searches sidebar)
  useEffect(() => {
    if (externalSearchQuery && externalSearchQuery.query) {
      setInputMode('search');
      setSearchQuery(externalSearchQuery.query);
      if (externalSearchQuery.category) {
        setCategory(externalSearchQuery.category);
      }
      setSearchSuccessMsg(null);
      setSearchError(null);
    }
  }, [externalSearchQuery]);

  // Combine default categories and custom user categories
  const allAvailableCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...customCategories])
  );

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const chosenCat = isAddingCategory && newCustomCategory.trim()
      ? newCustomCategory.trim()
      : category;

    if (isAddingCategory && newCustomCategory.trim()) {
      onAddCustomCategory(newCustomCategory.trim());
    }

    const newArticle: NewsArticle = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      source: source.trim() || 'Custom Input',
      category: chosenCat,
      content: content.trim(),
      publishedAt: new Date().toISOString(),
    };

    onAddArticle(newArticle);
    setTitle('');
    setSource('');
    setContent('');
    setNewCustomCategory('');
    setIsAddingCategory(false);
  };

  const handleExtractUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsExtracting(true);
    setExtractError(null);

    try {
      const res = await authFetch('/api/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract article content');
      }

      const chosenCat = isAddingCategory && newCustomCategory.trim()
        ? newCustomCategory.trim()
        : category;

      if (isAddingCategory && newCustomCategory.trim()) {
        onAddCustomCategory(newCustomCategory.trim());
      }

      const extractedArticle: NewsArticle = {
        id: `extracted-${Date.now()}`,
        title: data.title || 'Extracted Article',
        source: data.source || 'Web Link',
        url: data.url || urlInput.trim(),
        category: chosenCat || 'Technology',
        content: data.content,
        publishedAt: new Date().toISOString(),
      };

      onAddArticle(extractedArticle);
      if (onSaveRecentSearch) {
        onSaveRecentSearch(data.title || urlInput.trim(), 'url', [extractedArticle], chosenCat || 'Technology');
      }
      setUrlInput('');
      setNewCustomCategory('');
      setIsAddingCategory(false);
    } catch (err: any) {
      setExtractError(err.message || 'Could not fetch web article');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSearchArticles = async (
    e?: React.FormEvent,
    overrideQuery?: string,
    overrideCategory?: string
  ) => {
    if (e) e.preventDefault();
    const q = (overrideQuery ?? searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchSuccessMsg(null);

    const chosenCat =
      overrideCategory ??
      (isAddingCategory && newCustomCategory.trim()
        ? newCustomCategory.trim()
        : category);

    if (isAddingCategory && newCustomCategory.trim()) {
      onAddCustomCategory(newCustomCategory.trim());
    }

    try {
      const res = await authFetch('/api/search-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          category: chosenCat,
          count: searchCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search articles');
      }

      const fetchedList: NewsArticle[] = data.articles || [];
      if (fetchedList.length === 0) {
        throw new Error('No articles found for this topic. Please try different keywords.');
      }

      if (onAddMultipleArticles) {
        onAddMultipleArticles(fetchedList);
      } else {
        fetchedList.forEach((art) => onAddArticle(art));
      }

      if (onSaveRecentSearch) {
        onSaveRecentSearch(q, 'topic', fetchedList, chosenCat);
      }

      setSearchSuccessMsg(
        `Added ${fetchedList.length} articles on "${q}" to your playlist & saved to Recent Searches.`
      );
      setNewCustomCategory('');
      setIsAddingCategory(false);
    } catch (err: any) {
      setSearchError(err.message || 'Error searching articles');
    } finally {
      setIsSearching(false);
    }
  };


  // Filtered articles list based on selected category tab
  const filteredArticles = selectedCategoryFilter === 'All'
    ? articles
    : articles.filter(
        (a) => (a.category || '').toLowerCase() === selectedCategoryFilter.toLowerCase()
      );

  const totalWords = articles.reduce((acc, a) => {
    return acc + (a.content ? a.content.trim().split(/\s+/).length : 0);
  }, 0);

  return (
    <div id="article-manager-section" className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white rounded-[24px] google-card-shadow p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8EAED]">
          <div>
            <h2 className="text-lg sm:text-xl font-medium font-serif text-[#202124] flex items-center gap-2">
              <span>Articles Playlist</span>
              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0FE] text-[#1A73E8] font-mono">
                {articles.length} {articles.length === 1 ? 'story' : 'stories'}
              </span>
            </h2>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Add topics, web links, or text to include in your personalized spoken digest.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onToggleSidebar && (
              <button
                id="btn-toggle-recent-searches-sidebar"
                type="button"
                onClick={onToggleSidebar}
                className={`inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer border ${
                  isSidebarOpen
                    ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                    : 'bg-[#F8F9FA] text-[#202124] hover:bg-[#E8F0FE] hover:text-[#1A73E8] border-[#E8EAED]'
                }`}
                title="Toggle Recent Article Searches sidebar"
              >
                <History className="w-3.5 h-3.5 mr-1.5" />
                <span>Recent Searches</span>
                {recentSearchesCount > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                      isSidebarOpen ? 'bg-white text-[#1A73E8]' : 'bg-[#1A73E8] text-white'
                    }`}
                  >
                    {recentSearchesCount}
                  </span>
                )}
              </button>
            )}
            <button
              id="btn-load-samples"
              type="button"
              onClick={onLoadSamples}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-[#1A73E8] bg-[#E8F0FE] hover:bg-[#D4E4FC] rounded-full transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Load Curated Samples
            </button>
            {articles.length > 0 && (
              <button
                id="btn-clear-queue"
                type="button"
                onClick={onClearArticles}
                className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-[#5F6368] hover:text-[#EA4335] hover:bg-[#F8F9FA] border border-[#E8EAED] rounded-full transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Input Toggle */}
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              id="tab-input-search"
              type="button"
              onClick={() => setInputMode('search')}
              className={`flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                inputMode === 'search'
                  ? 'bg-[#1A73E8] text-white shadow-xs'
                  : 'bg-[#F8F9FA] text-[#5F6368] hover:text-[#202124] hover:bg-[#E8F0FE]'
              }`}
            >
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search News Topics
            </button>
            <button
              id="tab-input-url"
              type="button"
              onClick={() => setInputMode('url')}
              className={`flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                inputMode === 'url'
                  ? 'bg-[#1A73E8] text-white shadow-xs'
                  : 'bg-[#F8F9FA] text-[#5F6368] hover:text-[#202124] hover:bg-[#E8F0FE]'
              }`}
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Fetch from Web Link
            </button>
            <button
              id="tab-input-paste"
              type="button"
              onClick={() => setInputMode('paste')}
              className={`flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                inputMode === 'paste'
                  ? 'bg-[#1A73E8] text-white shadow-xs'
                  : 'bg-[#F8F9FA] text-[#5F6368] hover:text-[#202124] hover:bg-[#E8F0FE]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Paste Article Text
            </button>
          </div>

          {/* Form: Search News Topics */}
          {inputMode === 'search' && (
            <form onSubmit={(e) => handleSearchArticles(e)} className="space-y-4">
              <div className="bg-[#F1F3F4] rounded-[28px] px-4 sm:px-5 py-2 sm:py-2.5 flex items-center gap-3 transition-shadow focus-within:ring-2 focus-within:ring-[#1A73E8]/30 focus-within:bg-white border border-transparent focus-within:border-[#1A73E8]/40">
                <Search className="w-5 h-5 text-[#5F6368] shrink-0" />
                <input
                  id="article-search-query-input"
                  type="text"
                  required
                  placeholder="Search News Topics or Keywords (e.g., Solid-State Batteries, Renewable Energy)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm sm:text-base text-[#202124] placeholder-[#5F6368] w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#5F6368] hover:text-[#202124] p-1 cursor-pointer"
                  >
                    &times;
                  </button>
                )}
                <button
                  id="btn-search-articles-submit"
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="h-8 sm:h-9 px-4 sm:px-5 rounded-full bg-[#1A73E8] hover:bg-[#1765CC] text-white text-xs sm:text-sm font-medium transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <span>Search</span>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#5F6368] px-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="label">Beat:</span>
                    <select
                      id="article-search-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-[#F8F9FA] border border-[#E8EAED] rounded-lg px-2.5 py-1 text-xs text-[#202124] outline-none cursor-pointer"
                    >
                      {allAvailableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="label">Count:</span>
                    <select
                      id="article-search-count-select"
                      value={searchCount}
                      onChange={(e) => setSearchCount(Number(e.target.value))}
                      className="bg-[#F8F9FA] border border-[#E8EAED] rounded-lg px-2.5 py-1 text-xs text-[#202124] outline-none cursor-pointer"
                    >
                      <option value={1}>1 story</option>
                      <option value={2}>2 stories</option>
                      <option value={3}>3 stories</option>
                      <option value={4}>4 stories</option>
                    </select>
                  </div>
                </div>

                {/* Suggested Search Topics Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="label text-[#5F6368]">Quick picks:</span>
                  {[
                    { label: 'Solid-State Batteries', cat: 'Technology' },
                    { label: 'Clean Energy Grid', cat: 'Environment' },
                    { label: 'Space Telescopes', cat: 'Science' },
                    { label: 'Autonomous Vehicles', cat: 'Transportation' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      id={`btn-search-chip-${idx}`}
                      type="button"
                      onClick={() => {
                        setSearchQuery(item.label);
                        setCategory(item.cat);
                        handleSearchArticles(undefined, item.label, item.cat);
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-[#F8F9FA] hover:bg-[#E8F0FE] hover:text-[#1A73E8] text-[#202124] border border-[#E8EAED] transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {searchError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}

              {searchSuccessMsg && (
                <div className="p-3 bg-[#E8F0FE] border border-[#D4E4FC] rounded-xl text-xs text-[#1A73E8] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34A853] shrink-0" />
                    <span>{searchSuccessMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchSuccessMsg(null)}
                    className="text-[#5F6368] hover:text-[#202124] text-xs font-bold cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}
            </form>
          )}


          {/* Form: Paste Text */}
          {inputMode === 'paste' && (
            <form onSubmit={handleManualAdd} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="article-title-input"
                    className="block text-xs font-semibold text-[#5A5A40] mb-1"
                  >
                    Article Title / Headline *
                  </label>
                  <input
                    id="article-title-input"
                    type="text"
                    required
                    placeholder="e.g. Next-Gen Solid-State Battery Clears Commercial Safety Milestone"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#F5F5F0] border border-[#DCDCD2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all text-[#2D2D20]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="article-source-input"
                    className="block text-xs font-semibold text-[#5A5A40] mb-1"
                  >
                    Source / Outlet (Optional)
                  </label>
                  <input
                    id="article-source-input"
                    type="text"
                    placeholder="e.g. Bloomberg, Reuters, Wired"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#F5F5F0] border border-[#DCDCD2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all text-[#2D2D20]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1 space-y-1.5">
                  <label
                    htmlFor="article-category-select"
                    className="block text-xs font-semibold text-[#5A5A40]"
                  >
                    Assign Category *
                  </label>
                  {!isAddingCategory ? (
                    <div className="space-y-1">
                      <select
                        id="article-category-select"
                        value={category}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsAddingCategory(true);
                          } else {
                            setCategory(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm bg-[#F5F5F0] border border-[#DCDCD2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:bg-white transition-all text-[#2D2D20]"
                      >
                        {allAvailableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="__custom__">+ Add Custom Category...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <input
                          id="new-category-input"
                          type="text"
                          required
                          placeholder="e.g. AI Ethics"
                          value={newCustomCategory}
                          onChange={(e) => setNewCustomCategory(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-[#F5F5F0] border border-[#DCDCD2] rounded-lg text-[#2D2D20]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newCustomCategory.trim()) {
                              onAddCustomCategory(newCustomCategory.trim());
                              setCategory(newCustomCategory.trim());
                            }
                            setIsAddingCategory(false);
                          }}
                          className="p-1.5 bg-[#1A73E8] text-white rounded-lg text-xs cursor-pointer"
                          title="Confirm category"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="text-[10px] text-[#5F6368] hover:underline cursor-pointer"
                      >
                        Cancel custom category
                      </button>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="article-content-textarea"
                    className="block text-xs font-medium text-[#202124] mb-1"
                  >
                    Article Text / Key Paragraphs *
                  </label>
                  <textarea
                    id="article-content-textarea"
                    required
                    rows={3}
                    placeholder="Paste article paragraphs, report summary, or news dispatch..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#F8F9FA] border border-[#E8EAED] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1A73E8] focus:bg-white transition-all text-[#202124] resize-y"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  id="btn-add-article-submit"
                  type="submit"
                  disabled={!title.trim() || !content.trim()}
                  className="inline-flex items-center px-5 py-2 bg-[#1A73E8] hover:bg-[#1765CC] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-full transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Article to Commute
                </button>
              </div>
            </form>
          )}

          {/* Form: URL Fetch */}
          {inputMode === 'url' && (
            <form onSubmit={handleExtractUrl} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="article-url-input"
                    className="block text-xs font-medium text-[#202124] mb-1"
                  >
                    Article Web URL
                  </label>
                  <input
                    id="article-url-input"
                    type="url"
                    required
                    placeholder="https://news.ycombinator.com or https://reuters.com/article/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#F8F9FA] border border-[#E8EAED] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1A73E8] focus:bg-white transition-all text-[#202124]"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label
                    htmlFor="url-article-category-select"
                    className="block text-xs font-medium text-[#202124] mb-1"
                  >
                    Assign Category
                  </label>
                  <select
                    id="url-article-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#F8F9FA] border border-[#E8EAED] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1A73E8] focus:bg-white transition-all text-[#202124]"
                  >
                    {allAvailableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  id="btn-fetch-url-submit"
                  type="submit"
                  disabled={isExtracting || !urlInput.trim()}
                  className="inline-flex items-center px-5 py-2 bg-[#1A73E8] hover:bg-[#1765CC] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Extracting Webpage...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1.5" />
                      Extract & Add Article
                    </>
                  )}
                </button>
              </div>

              {extractError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{extractError}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Category Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl google-card-shadow">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="label mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#1A73E8]" />
            Category Filter:
          </span>
          <button
            id="filter-all-articles"
            type="button"
            onClick={() => onSelectCategoryFilter('All')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedCategoryFilter === 'All'
                ? 'bg-[#E8F0FE] text-[#1A73E8] border-transparent font-semibold'
                : 'bg-white text-[#202124] border-[#E8EAED] hover:bg-[#F8F9FA]'
            }`}
          >
            All ({articles.length})
          </button>
          {allAvailableCategories.map((cat) => {
            const count = articles.filter(
              (a) => (a.category || '').toLowerCase() === cat.toLowerCase()
            ).length;
            if (count === 0 && !customCategories.includes(cat)) return null;

            return (
              <button
                key={cat}
                id={`filter-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
                onClick={() => onSelectCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  selectedCategoryFilter.toLowerCase() === cat.toLowerCase()
                    ? 'bg-[#E8F0FE] text-[#1A73E8] border-transparent font-semibold'
                    : 'bg-white text-[#202124] border-[#E8EAED] hover:bg-[#F8F9FA]'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <div className="text-xs font-mono text-[#5F6368] shrink-0">
          Showing {filteredArticles.length} of {articles.length} articles
        </div>
      </div>

      {/* Queued Articles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#34A853]" />
            <span className="font-medium text-[0.95rem] text-[#202124]">
              Active Articles Playlist
            </span>
          </div>
          <span className="label font-mono">
            {filteredArticles.length} items &bull; ~{totalWords} words
          </span>
        </div>

        {filteredArticles.length === 0 ? (
          <div
            id="empty-articles-placeholder"
            className="p-10 text-center bg-white rounded-[24px] google-card-shadow space-y-3"
          >
            <Layers className="w-8 h-8 text-[#5F6368] mx-auto opacity-50" />
            <p className="font-serif text-lg font-medium text-[#202124]">
              {selectedCategoryFilter === 'All'
                ? 'No news articles added yet'
                : `No articles in category "${selectedCategoryFilter}"`}
            </p>
            <p className="text-xs sm:text-sm text-[#5F6368] mt-1 max-w-md mx-auto leading-relaxed">
              {selectedCategoryFilter === 'All'
                ? 'Add news articles using the form above or click below to load curated sample articles instantly.'
                : 'Try switching the category filter back to "All" or add an article in this category.'}
            </p>
            {selectedCategoryFilter === 'All' ? (
              <button
                id="btn-load-samples-empty"
                type="button"
                onClick={onLoadSamples}
                className="mt-2 inline-flex items-center px-5 py-2 text-xs font-medium text-[#1A73E8] bg-[#E8F0FE] hover:bg-[#D4E4FC] rounded-full transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Load Curated Samples
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectCategoryFilter('All')}
                className="mt-2 inline-flex items-center px-5 py-2 text-xs font-medium text-[#1A73E8] bg-[#E8F0FE] hover:bg-[#D4E4FC] rounded-full transition-colors cursor-pointer"
              >
                View All Categories
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredArticles.map((article, index) => {
              const wordCount = article.content
                ? article.content.trim().split(/\s+/).length
                : 0;
              const isQueued = queuedArticleIds.has(article.id);

              const categoryColor =
                (article.category || '').toLowerCase() === 'technology'
                  ? '#1A73E8'
                  : (article.category || '').toLowerCase() === 'business' ||
                    (article.category || '').toLowerCase() === 'markets'
                  ? '#EA4335'
                  : (article.category || '').toLowerCase() === 'environment'
                  ? '#34A853'
                  : '#FBBC04';

              return (
                <div
                  key={article.id}
                  id={`article-card-${article.id}`}
                  className="bg-white rounded-[20px] p-5 google-card-shadow transition-all hover:bg-[#FAFBFD] flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F1F3F4] text-[#5F6368] text-[11px] font-bold flex items-center justify-center font-mono">
                          {index + 1}
                        </span>

                        {/* Category Badge with in-place Category Switcher */}
                        <div className="relative inline-flex items-center">
                          <select
                            id={`select-category-${article.id}`}
                            value={article.category || 'Technology'}
                            onChange={(e) => onUpdateArticleCategory(article.id, e.target.value)}
                            className="label font-semibold bg-[#F8F9FA] hover:bg-[#E8F0FE] px-2.5 py-1 rounded-full border border-[#E8EAED] cursor-pointer focus:outline-none"
                            style={{ color: categoryColor }}
                            title="Click to change category"
                          >
                            {allAvailableCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        {article.source && (
                          <span className="label text-[#5F6368]">
                            &bull; {article.source}
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-mono text-[#5F6368]">
                        ~{wordCount} words
                      </span>
                    </div>

                    <h3 className="font-serif text-[1.2rem] sm:text-[1.25rem] font-medium text-[#202124] group-hover:text-[#1A73E8] transition-colors leading-snug">
                      {article.title}
                    </h3>

                    <p className="text-[0.85rem] text-[#5F6368] line-clamp-2 leading-relaxed">
                      {article.content}
                    </p>

                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-[11px] text-[#1A73E8] hover:underline gap-1 pt-0.5 font-medium"
                      >
                        <span>View source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-end sm:self-start">
                    <button
                      id={`btn-add-queue-${article.id}`}
                      type="button"
                      onClick={() => onAddToQueue(article)}
                      disabled={isQueued}
                      className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        isQueued
                          ? 'bg-[#F1F3F4] text-[#5F6368] cursor-default'
                          : 'bg-[#E8F0FE] hover:bg-[#D4E4FC] text-[#1A73E8]'
                      }`}
                      title={isQueued ? 'Already in Listen Later Queue' : 'Add to Listen Later Queue'}
                    >
                      {isQueued ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 mr-1 text-[#34A853]" />
                          <span>Queued</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
                          <span>Listen Later</span>
                        </>
                      )}
                    </button>

                    <button
                      id={`btn-remove-article-${article.id}`}
                      type="button"
                      onClick={() => onRemoveArticle(article.id)}
                      className="text-[#5F6368] hover:text-[#EA4335] p-2 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
