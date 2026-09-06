/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Headphones,
  AlertCircle,
  Radio,
  Clock,
  Compass,
  CheckCircle2,
  RefreshCw,
  Layers,
  BookmarkCheck,
  Tag,
  LogIn,
  LogOut,
  Info,
  Share2,
  History,
  Trash2,
  Copy,
  Download,
  Search,
  Loader2,
} from 'lucide-react';
import {
  NewsArticle,
  CommuteConfig,
  CommuteSummary,
  ListenLaterItem,
  DEFAULT_CATEGORIES,
  SharedLibrary,
  RecentArticleSearch,
} from './types';
import { SAMPLE_ARTICLES } from './data/sampleArticles';
import { Header } from './components/Header';
import { ArticleManager } from './components/ArticleManager';
import { RecentSearchesSidebar } from './components/RecentSearchesSidebar';
import { CommuteConfigPanel } from './components/CommuteConfigPanel';
import { AudioPlayer } from './components/AudioPlayer';
import { TranscriptView } from './components/TranscriptView';
import { SavedDigestsModal } from './components/SavedDigestsModal';
import { ListenLaterQueue } from './components/ListenLaterQueue';
import { ShareLibraryModal } from './components/ShareLibraryModal';
import { SharedTopicListView } from './components/SharedTopicListView';
import { motion } from 'motion/react';
import { useAuth } from './lib/useAuth';
import {
  subscribeToSavedDigests,
  saveDigest,
  deleteDigest,
  subscribeToListenLater,
  addToListenLater,
  removeFromListenLater,
  updateListenLaterItem,
  clearListenLaterQueue,
  getSharedLibrary,
  subscribeToRecentSearches,
  saveRecentSearch,
  deleteRecentSearch,
  clearRecentSearches,
} from './lib/firestoreService';

const STORAGE_KEY_SAVED_DIGESTS = 'commutebrief_saved_digests';
const STORAGE_KEY_LISTEN_LATER = 'commutebrief_listen_later';
const STORAGE_KEY_CUSTOM_CATEGORIES = 'commutebrief_custom_categories';
const STORAGE_KEY_RECENT_SEARCHES = 'commutebrief_recent_searches';

const INITIAL_RECENT_SEARCHES: RecentArticleSearch[] = [
  {
    id: 'search-seed-1',
    query: 'Solid-State Battery Milestone',
    type: 'topic',
    category: 'Technology',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    articlesCount: 2,
    articles: [
      {
        id: 'seed-art-1',
        title: 'Solid-State Lithium Batteries Reach 800 Wh/L Density in Automaker Lab Tests',
        source: 'Automotive Engineering',
        category: 'Technology',
        content:
          'Breakthrough solid-state lithium ceramic cells have achieved energy densities exceeding 800 watt-hours per liter across 1,000 continuous charge-discharge cycles without thermal degradation.',
        publishedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
      {
        id: 'seed-art-2',
        title: 'Mining Giants Pivot to High-Purity Solid Electrolyte Raw Materials',
        source: 'Materials Weekly',
        category: 'Business',
        content:
          'Global mining syndicates announced multi-billion-dollar joint venture refineries dedicated exclusively to solid-electrolyte grade lithium sulfides and sulfide-based powders.',
        publishedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      },
    ],
  },
  {
    id: 'search-seed-2',
    query: 'Global Clean Energy Transition & Grid Storage',
    type: 'topic',
    category: 'Environment',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(),
    articlesCount: 2,
    articles: [
      {
        id: 'seed-art-3',
        title: 'Utility-Scale Iron-Air Batteries Begin Commercial Deployment Across European Grids',
        source: 'Energy Transition Report',
        category: 'Environment',
        content:
          'Long-duration iron-air energy storage facilities offering up to 100 hours of continuous multi-day discharge capability have entered commercial operation.',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(),
      },
      {
        id: 'seed-art-4',
        title: 'Offshore Wind Generation Surpasses Fossil Fuels in Quarterly Regional Output',
        source: 'Power Systems Journal',
        category: 'Science',
        content:
          'High-capacity floating turbine installations across deep-water North Sea corridors produced over 48% of total regional electricity during the winter peak.',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      },
    ],
  },
];

export default function App() {
  // Firebase Auth
  const { user, loading: authLoading, authError, signInWithGoogle, logOut } = useAuth();

  // Active articles in generator
  const [articles, setArticles] = useState<NewsArticle[]>(() => {
    return SAMPLE_ARTICLES.slice(0, 3);
  });

  // Category filtering & customization
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_CATEGORIES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [articleCategoryFilter, setArticleCategoryFilter] = useState<string>('All');
  const [summaryCategoryFilter, setSummaryCategoryFilter] = useState<string[]>([]);

  // Personalization configuration
  const [config, setConfig] = useState<CommuteConfig>({
    commuteMinutes: 10,
    tone: 'morning_briefing',
    format: 'single_host',
    voice: 'Kore',
    coHostVoice: 'Puck',
    commuterNotes: '',
    selectedCategories: [],
  });

  // Listen Later Queue state
  const [queueItems, setQueueItems] = useState<ListenLaterItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LISTEN_LATER);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    // Seed queue with sample items if empty
    return [
      {
        id: 'queue-init-1',
        title: SAMPLE_ARTICLES[0].title,
        source: SAMPLE_ARTICLES[0].source,
        category: SAMPLE_ARTICLES[0].category || 'Technology',
        content: SAMPLE_ARTICLES[0].content,
        url: SAMPLE_ARTICLES[0].url,
        addedAt: new Date().toISOString(),
        order: 0,
        isPlayed: false,
      },
      {
        id: 'queue-init-2',
        title: SAMPLE_ARTICLES[1].title,
        source: SAMPLE_ARTICLES[1].source,
        category: SAMPLE_ARTICLES[1].category || 'Business',
        content: SAMPLE_ARTICLES[1].content,
        url: SAMPLE_ARTICLES[1].url,
        addedAt: new Date().toISOString(),
        order: 1,
        isPlayed: false,
      },
    ];
  });

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Current active summary & audio
  const [currentSummary, setCurrentSummary] = useState<CommuteSummary | null>(null);

  // Saved digests
  const [savedDigests, setSavedDigests] = useState<CommuteSummary[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED_DIGESTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharedLibrary, setSharedLibrary] = useState<SharedLibrary | null>(null);
  const [isLoadingShared, setIsLoadingShared] = useState(false);

  // Main UI Tab
  const [activeTab, setActiveTab] = useState<'generator' | 'player' | 'queue'>('generator');
  const [clearedSuggestionsFeedback, setClearedSuggestionsFeedback] = useState(false);
  const [copiedScriptFeedback, setCopiedScriptFeedback] = useState(false);
  const [downloadJsonFeedback, setDownloadJsonFeedback] = useState(false);
  const [quickTopicQuery, setQuickTopicQuery] = useState('');
  const [isQuickTopicSearching, setIsQuickTopicSearching] = useState(false);
  const [quickTopicFeedback, setQuickTopicFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Recent Article Searches state
  const [recentSearches, setRecentSearches] = useState<RecentArticleSearch[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_RECENT_SEARCHES;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [externalSearchQuery, setExternalSearchQuery] = useState<{
    query: string;
    category?: string;
    timestamp: number;
  } | null>(null);

  // Check URL query params for public share link on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get('share');
      if (shareId) {
        setIsLoadingShared(true);
        getSharedLibrary(shareId)
          .then((data) => {
            if (data) {
              setSharedLibrary(data);
            }
          })
          .catch((err) => {
            console.warn('Error fetching shared curated library from Firestore:', err);
          })
          .finally(() => {
            setIsLoadingShared(false);
          });
      }
    } catch (e) {
      console.warn('URL parsing error:', e);
    }
  }, []);

  // Audio Playback State for Commute Player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);

  // --- Real-Time Firestore Synchronization ---
  useEffect(() => {
    if (!user) return;

    // 1. Subscribe to user's saved digests in Firestore
    const unsubDigests = subscribeToSavedDigests(user.uid, (cloudDigests) => {
      if (cloudDigests.length > 0) {
        setSavedDigests(cloudDigests);
      }
    });

    // 2. Subscribe to user's Listen Later queue in Firestore
    const unsubQueue = subscribeToListenLater(user.uid, (cloudQueue) => {
      setQueueItems(cloudQueue);
    });

    // 3. Subscribe to user's recent searches in Firestore
    const unsubSearches = subscribeToRecentSearches(user.uid, (cloudSearches) => {
      if (cloudSearches.length > 0) {
        setRecentSearches(cloudSearches);
      }
    });

    return () => {
      unsubDigests();
      unsubQueue();
      unsubSearches();
    };
  }, [user]);

  // Persist queue in localStorage for guest sessions
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(STORAGE_KEY_LISTEN_LATER, JSON.stringify(queueItems));
      } catch (e) {
        console.warn('LocalStorage queue save error:', e);
      }
    }
  }, [queueItems, user]);

  // Persist recent searches in localStorage for guest sessions
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(recentSearches));
      } catch (e) {
        console.warn('LocalStorage recent searches save error:', e);
      }
    }
  }, [recentSearches, user]);

  // Handlers for Recent Article Searches
  const handleReAddArticle = (article: NewsArticle) => {
    setArticles((prev) => {
      const alreadyInList = prev.some(
        (a) =>
          a.id === article.id ||
          a.title.trim().toLowerCase() === article.title.trim().toLowerCase()
      );
      if (alreadyInList) {
        // Create duplicate copy with fresh id so user can re-add multiple times if desired
        const freshArticle: NewsArticle = {
          ...article,
          id: `readded-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          publishedAt: new Date().toISOString(),
        };
        return [freshArticle, ...prev];
      }
      return [article, ...prev];
    });
  };

  const handleReAddAllArticles = (articlesToAdd: NewsArticle[]) => {
    if (!articlesToAdd || articlesToAdd.length === 0) return;

    setArticles((prev) => {
      const existingTitles = new Set(prev.map((a) => a.title.trim().toLowerCase()));
      const preparedToAdd = articlesToAdd.map((art) => {
        if (existingTitles.has(art.title.trim().toLowerCase())) {
          return {
            ...art,
            id: `readded-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            publishedAt: new Date().toISOString(),
          };
        }
        return art;
      });
      return [...preparedToAdd, ...prev];
    });
  };

  const handleSaveRecentSearch = (
    query: string,
    type: 'topic' | 'url',
    fetchedArticles: NewsArticle[],
    category?: string
  ) => {
    if (!query.trim() || fetchedArticles.length === 0) return;

    const newSearchItem: RecentArticleSearch = {
      id: `search-${Date.now()}`,
      userId: user ? user.uid : undefined,
      query: query.trim(),
      type,
      category,
      createdAt: new Date().toISOString(),
      articlesCount: fetchedArticles.length,
      articles: fetchedArticles,
    };

    setRecentSearches((prev) => [
      newSearchItem,
      ...prev.filter(
        (s) => s.query.trim().toLowerCase() !== query.trim().toLowerCase()
      ),
    ]);

    if (user) {
      saveRecentSearch(user.uid, newSearchItem).catch((err) => {
        console.warn('Error saving recent search to Firestore:', err);
      });
    }
  };

  const handleDeleteSearch = (searchId: string) => {
    setRecentSearches((prev) => prev.filter((s) => s.id !== searchId));
    if (user) {
      deleteRecentSearch(user.uid, searchId).catch((err) => {
        console.warn('Error deleting recent search from Firestore:', err);
      });
    }
  };

  const handleClearAllSearches = () => {
    const toClear = [...recentSearches];
    setRecentSearches([]);
    if (user) {
      clearRecentSearches(user.uid, toClear).catch((err) => {
        console.warn('Error clearing recent searches from Firestore:', err);
      });
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
      } catch (e) {
        console.warn('LocalStorage clear searches error:', e);
      }
    }
  };

  const handleSelectSearchQuery = (query: string, category?: string) => {
    setExternalSearchQuery({ query, category, timestamp: Date.now() });
  };

  // Persist custom categories
  const handleAddCustomCategory = (newCat: string) => {
    if (!newCat.trim()) return;
    const cat = newCat.trim();
    if (!customCategories.includes(cat) && !(DEFAULT_CATEGORIES as readonly string[]).includes(cat)) {
      const updated = [...customCategories, cat];
      setCustomCategories(updated);
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_CATEGORIES, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage custom categories save error:', e);
      }
    }
  };

  // Initialize or update HTML5 audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Sync audio source when currentSummary changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSummary?.audioDataUrl) {
      audio.src = currentSummary.audioDataUrl;
      audio.playbackRate = playbackRate;
      audio.volume = isMuted ? 0 : volume;
      audio.load();
      audio.play().catch((err) => {
        console.log('Autoplay prevented by browser, click play to start:', err);
      });
    } else {
      audio.pause();
      audio.src = '';
    }
  }, [currentSummary?.audioDataUrl]);

  // Sync playbackRate & volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Save digests to Firestore (if signed in) + localStorage
  const saveDigestToHistory = async (digest: CommuteSummary) => {
    // Local state update
    setSavedDigests((prev) => {
      const filtered = prev.filter((d) => d.id !== digest.id);
      const updated = [digest, ...filtered].slice(0, 20);
      try {
        localStorage.setItem(STORAGE_KEY_SAVED_DIGESTS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }
      return updated;
    });

    // Cloud Firestore update
    if (user) {
      try {
        await saveDigest(user.uid, digest);
      } catch (err) {
        console.error('Failed to sync digest to Firestore:', err);
      }
    }
  };

  const handleDeleteSavedDigest = async (id: string) => {
    setSavedDigests((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_SAVED_DIGESTS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not update localStorage:', e);
      }
      return updated;
    });

    if (user) {
      try {
        await deleteDigest(user.uid, id);
      } catch (err) {
        console.error('Failed to delete digest from Firestore:', err);
      }
    }
  };

  // Article handlers
  const handleAddArticle = (article: NewsArticle) => {
    setArticles((prev) => [article, ...prev]);
  };

  const handleRemoveArticle = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateArticleCategory = (id: string, newCategory: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, category: newCategory } : a))
    );
  };

  const handleClearArticles = () => {
    setArticles([]);
  };

  const handleClearAllSuggestions = () => {
    setArticles([]);
    setGenerationError(null);
    setSummaryCategoryFilter([]);
    setClearedSuggestionsFeedback(true);
    setTimeout(() => {
      setClearedSuggestionsFeedback(false);
    }, 2500);
  };

  const handleCopyScript = async () => {
    const scriptText =
      articles.length > 0
        ? articles.map((a, idx) => `${idx + 1}. ${a.title}`).join('\n')
        : 'No pending articles.';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(scriptText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = scriptText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedScriptFeedback(true);
      setTimeout(() => {
        setCopiedScriptFeedback(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to copy script to clipboard:', err);
    }
  };

  const handleDownloadArticlesJson = () => {
    try {
      const backupData = {
        app: 'Iris - Commute Audio Briefings',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalArticles: articles.length,
        articles: articles,
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const link = document.createElement('a');
      link.href = url;
      link.download = `iris_articles_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadJsonFeedback(true);
      setTimeout(() => {
        setDownloadJsonFeedback(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to export articles JSON backup:', err);
    }
  };

  const handleQuickTopicSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickTopicQuery.trim();
    if (!query) return;

    setIsQuickTopicSearching(true);
    setQuickTopicFeedback(null);

    try {
      const res = await fetch('/api/search-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          category: 'Technology',
          count: 3,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search for articles');
      }

      const fetchedList: NewsArticle[] = data.articles || [];
      if (fetchedList.length === 0) {
        throw new Error('No articles found for this topic. Try different keywords.');
      }

      // Add articles to the pending playlist
      setArticles((prev) => [...fetchedList, ...prev]);

      // Save to recent searches history
      handleSaveRecentSearch(query, 'topic', fetchedList, 'Technology');

      // Clear search query and notify user
      setQuickTopicQuery('');
      setQuickTopicFeedback({
        type: 'success',
        message: `Added ${fetchedList.length} articles on "${query}" to your pending list!`,
      });

      setTimeout(() => {
        setQuickTopicFeedback((prev) => (prev?.type === 'success' ? null : prev));
      }, 4000);
    } catch (err: any) {
      setQuickTopicFeedback({
        type: 'error',
        message: err.message || 'Error searching for articles. Please try again.',
      });
    } finally {
      setIsQuickTopicSearching(false);
    }
  };

  const handleLoadSamples = () => {
    setArticles(SAMPLE_ARTICLES);
  };

  // Personalization configuration change
  const handleChangeConfig = (updates: Partial<CommuteConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  // Category filter handlers for Audio Summary
  const handleToggleSummaryCategory = (cat: string) => {
    setSummaryCategoryFilter((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  const handleSelectAllSummaryCategories = () => {
    setSummaryCategoryFilter([]);
  };

  // Derived available categories from current articles
  const availableArticleCategories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach((a) => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats);
  }, [articles]);

  // Derived filtered articles for the broadcast summary
  const articlesForSummary = useMemo(() => {
    if (summaryCategoryFilter.length === 0) return articles;
    return articles.filter((a) =>
      summaryCategoryFilter.some(
        (cat) => cat.toLowerCase() === (a.category || '').toLowerCase()
      )
    );
  }, [articles, summaryCategoryFilter]);

  // Set of active article IDs for fast matching in sidebar
  const activeArticleIds = useMemo(() => new Set(articles.map((a) => a.id)), [articles]);

  // Audio playback controls for Commute Player
  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => console.error('Play error:', err));
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // --- Listen Later Queue Actions ---
  const handleAddToQueue = async (article: NewsArticle) => {
    const newItem: ListenLaterItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: article.title,
      source: article.source,
      category: article.category || 'General',
      content: article.content,
      url: article.url,
      addedAt: new Date().toISOString(),
      order: queueItems.length,
      isPlayed: false,
    };

    setQueueItems((prev) => [...prev, newItem]);

    if (user) {
      try {
        await addToListenLater(user.uid, newItem);
      } catch (err) {
        console.error('Failed to sync queue item to Firestore:', err);
      }
    }
  };

  const handleRemoveQueueItem = async (id: string) => {
    setQueueItems((prev) => prev.filter((item) => item.id !== id));
    if (user) {
      try {
        await removeFromListenLater(user.uid, id);
      } catch (err) {
        console.error('Failed to remove queue item from Firestore:', err);
      }
    }
  };

  const handleUpdateQueueItem = async (id: string, updates: Partial<ListenLaterItem>) => {
    setQueueItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    if (user) {
      try {
        await updateListenLaterItem(user.uid, id, updates);
      } catch (err) {
        console.error('Failed to update queue item in Firestore:', err);
      }
    }
  };

  const handleClearQueue = async () => {
    setQueueItems([]);
    if (user) {
      try {
        await clearListenLaterQueue(user.uid);
      } catch (err) {
        console.error('Failed to clear queue in Firestore:', err);
      }
    }
  };

  const handleReorderQueue = (items: ListenLaterItem[]) => {
    setQueueItems(items);
    if (user) {
      items.forEach((item, index) => {
        updateListenLaterItem(user.uid, item.id, { order: index }).catch(console.warn);
      });
    }
  };

  const handleCompileQueueToDigest = (items: ListenLaterItem[]) => {
    const compiledArticles: NewsArticle[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      source: item.source,
      category: item.category,
      content: item.content,
      url: item.url,
      publishedAt: item.addedAt,
    }));

    setArticles(compiledArticles);
    setActiveTab('generator');
  };

  const handleAddSamplesToQueue = () => {
    const sampleQueueItems: ListenLaterItem[] = SAMPLE_ARTICLES.map((article, idx) => ({
      id: `sample-q-${idx}-${Date.now()}`,
      title: article.title,
      source: article.source,
      category: article.category,
      content: article.content,
      url: article.url,
      addedAt: new Date().toISOString(),
      order: queueItems.length + idx,
      isPlayed: false,
    }));

    setQueueItems((prev) => [...prev, ...sampleQueueItems]);
    if (user) {
      sampleQueueItems.forEach((item) => {
        addToListenLater(user.uid, item).catch(console.warn);
      });
    }
  };

  const queuedArticleIds = useMemo(() => {
    return new Set(queueItems.map((item) => item.id));
  }, [queueItems]);

  // Full generation workflow: Script (Gemini 3.8 Flash) + Audio TTS (Gemini 3.1 Flash TTS Preview)
  const handleGenerateDigest = async () => {
    if (articlesForSummary.length === 0) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('1/2 Crafting personalized broadcast script with Gemini 3.8 Flash...');

    try {
      // Step 1: Generate personalized script
      const summaryRes = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: articlesForSummary,
          commuteMinutes: config.commuteMinutes,
          tone: config.tone,
          format: config.format,
          voice: config.voice,
          coHostVoice: config.coHostVoice,
          commuterNotes: config.commuterNotes,
        }),
      });

      const summaryData = await summaryRes.json();
      if (!summaryRes.ok) {
        throw new Error(summaryData.error || 'Failed to generate broadcast script');
      }

      const scriptSummary = summaryData.summary;

      // Step 2: Generate TTS Audio using gemini-3.1-flash-tts-preview
      setGenerationStep('2/2 Synthesizing natural studio audio with Gemini 3.1 Flash TTS...');

      const audioRes = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intro: scriptSummary.intro,
          segments: scriptSummary.segments,
          outro: scriptSummary.outro,
          format: config.format,
          voice: config.voice,
          coHostVoice: config.coHostVoice,
          fullScript: scriptSummary.fullScript,
        }),
      });

      const audioData = await audioRes.json();
      if (!audioRes.ok) {
        throw new Error(audioData.error || 'Failed to synthesize TTS audio');
      }

      // Complete Summary Object
      const fullSummary: CommuteSummary = {
        id: `digest-${Date.now()}`,
        title: scriptSummary.title,
        overview: scriptSummary.overview,
        createdAt: new Date().toISOString(),
        config: { ...config, selectedCategories: summaryCategoryFilter },
        articlesCount: articlesForSummary.length,
        segments: scriptSummary.segments,
        intro: scriptSummary.intro,
        outro: scriptSummary.outro,
        fullScript: scriptSummary.fullScript,
        audioDataUrl: audioData.audioDataUrl,
        audioDuration: audioData.audioDuration,
        chapters: audioData.chapters,
      };

      setCurrentSummary(fullSummary);
      saveDigestToHistory(fullSummary);
      setActiveTab('player');
    } catch (err: any) {
      console.error('Generation failure:', err);
      setGenerationError(err.message || 'An unexpected error occurred during generation.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] flex flex-col font-sans antialiased">
      {/* App Header with Auth and Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasAudio={Boolean(currentSummary?.audioDataUrl)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        historyCount={savedDigests.length}
        queueCount={queueItems.length}
        user={user}
        onSignIn={signInWithGoogle}
        onSignOut={logOut}
        authLoading={authLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Auth Error Banner if sign-in fails */}
        {authError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-[#EA4335] flex items-start justify-between gap-3 google-card-shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EA4335] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-[#C5221F]">
                  Authentication Notice
                </strong>
                <span>{authError}</span>
              </div>
            </div>
            <button
              onClick={() => signInWithGoogle()}
              className="px-3 py-1 bg-[#EA4335] text-white rounded-full text-[11px] font-medium cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Public Shared Topic List Viewer from Firestore */}
        {sharedLibrary && (
          <SharedTopicListView
            sharedLibrary={sharedLibrary}
            onImportToStudio={(sl) => {
              if (sl.articles && sl.articles.length > 0) {
                setArticles(sl.articles);
              }
              if (sl.config) {
                setConfig((prev) => ({ ...prev, ...sl.config }));
              }
              setActiveTab('generator');
              setSharedLibrary(null);
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
            onDismiss={() => {
              setSharedLibrary(null);
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
          />
        )}

        {/* Generation Error Banner if any */}
        {generationError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-[#EA4335] flex items-start justify-between gap-3 google-card-shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#EA4335] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-[#C5221F]">
                  Broadcast Generation Error
                </strong>
                <span>{generationError}</span>
              </div>
            </div>
            <button
              onClick={() => setGenerationError(null)}
              className="text-[#EA4335] hover:text-[#C5221F] p-1 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Curation & Personalization View */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            {/* Quick Hero Banner */}
            <div className="bg-white rounded-[24px] p-6 sm:p-7 text-[#202124] google-card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="label bg-[#E8F0FE] text-[#1A73E8] px-3 py-1 rounded-full font-mono">
                    Iris Audio Studio
                  </span>
                  <span className="text-xs text-[#5F6368] font-mono">
                    Target: {config.commuteMinutes} min commute
                  </span>
                  {user && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#34A853] font-medium bg-[#E6F4EA] px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34A853]" />
                      Synced with {user.email}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-medium font-serif text-[#202124]">
                  Personalized Commute News Broadcast
                </h1>
                <p className="text-xs sm:text-sm text-[#5F6368] max-w-2xl leading-relaxed">
                  Categorize articles by beat, filter by topics you care about today, and let Gemini synthesize a seamless spoken audio digest tailored to your exact commute duration.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  id="btn-hero-toggle-sidebar"
                  type="button"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  className={`px-4 py-2 rounded-full font-medium text-xs transition-all flex items-center gap-2 cursor-pointer border ${
                    isSidebarOpen
                      ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                      : 'bg-[#F8F9FA] text-[#202124] hover:bg-[#E8F0FE] hover:text-[#1A73E8] border-[#E8EAED]'
                  }`}
                  title="Toggle Recent Article Searches sidebar"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{isSidebarOpen ? 'Hide Recent Searches' : 'Show Recent Searches'}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isSidebarOpen ? 'bg-white text-[#1A73E8]' : 'bg-[#1A73E8] text-white'
                    }`}
                  >
                    {recentSearches.length}
                  </span>
                </button>

                {currentSummary?.audioDataUrl && (
                  <button
                    id="btn-resume-player"
                    type="button"
                    onClick={() => setActiveTab('player')}
                    className="px-5 py-2 rounded-full bg-[#1A73E8] hover:bg-[#1765CC] text-white font-medium text-xs shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Resume Current Digest</span>
                  </button>
                )}
              </div>
            </div>

            {/* Grid: Recent Searches Sidebar, Article Manager & Commute Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Recent Article Searches Sidebar */}
              {isSidebarOpen && (
                <div className="lg:col-span-3 space-y-6">
                  <RecentSearchesSidebar
                    recentSearches={recentSearches}
                    activeArticleIds={activeArticleIds}
                    onReAddArticle={handleReAddArticle}
                    onReAddAllArticles={handleReAddAllArticles}
                    onDeleteSearch={handleDeleteSearch}
                    onClearAllSearches={handleClearAllSearches}
                    onSelectSearchQuery={handleSelectSearchQuery}
                    isOpen={isSidebarOpen}
                    onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
                    user={user}
                  />
                </div>
              )}

              {/* Center / Primary Column: Articles Queue & Input with Category Tagging */}
              <div
                className={`${
                  isSidebarOpen ? 'lg:col-span-5' : 'lg:col-span-7'
                } space-y-6 transition-all duration-200`}
              >
                <ArticleManager
                  articles={articles}
                  onAddArticle={handleAddArticle}
                  onAddMultipleArticles={(newArts) => setArticles((prev) => [...newArts, ...prev])}
                  onRemoveArticle={handleRemoveArticle}
                  onUpdateArticleCategory={handleUpdateArticleCategory}
                  onClearArticles={handleClearArticles}
                  onLoadSamples={handleLoadSamples}
                  onAddToQueue={handleAddToQueue}
                  queuedArticleIds={queuedArticleIds}
                  selectedCategoryFilter={articleCategoryFilter}
                  onSelectCategoryFilter={setArticleCategoryFilter}
                  customCategories={customCategories}
                  onAddCustomCategory={handleAddCustomCategory}
                  onSaveRecentSearch={handleSaveRecentSearch}
                  externalSearchQuery={externalSearchQuery}
                  onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                  isSidebarOpen={isSidebarOpen}
                  recentSearchesCount={recentSearches.length}
                />
              </div>

              {/* Right Column: Commute Personalization Options with Category Filter */}
              <div
                className={`${
                  isSidebarOpen ? 'lg:col-span-4' : 'lg:col-span-5'
                } space-y-6 transition-all duration-200`}
              >
                <CommuteConfigPanel
                  config={config}
                  onChangeConfig={handleChangeConfig}
                  onGenerate={handleGenerateDigest}
                  isGenerating={isGenerating}
                  generationStep={generationStep}
                  articlesCount={articlesForSummary.length}
                  availableCategories={availableArticleCategories}
                  selectedCategories={summaryCategoryFilter}
                  onToggleCategory={handleToggleSummaryCategory}
                  onSelectAllCategories={handleSelectAllSummaryCategories}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Listen Later Queue View */}
        {activeTab === 'queue' && (
          <ListenLaterQueue
            queueItems={queueItems}
            onRemoveItem={handleRemoveQueueItem}
            onClearQueue={handleClearQueue}
            onUpdateItem={handleUpdateQueueItem}
            onReorderItems={handleReorderQueue}
            onCompileToDigest={handleCompileQueueToDigest}
            onAddSamplesToQueue={handleAddSamplesToQueue}
            user={user}
            onSignIn={signInWithGoogle}
          />
        )}

        {/* Tab 3: Commute Player & Interactive Transcript View */}
        {activeTab === 'player' && (
          <div className="space-y-6">
            {currentSummary ? (
              <>
                {/* Dedicated Audio Player */}
                <AudioPlayer
                  summary={currentSummary}
                  currentTime={currentTime}
                  duration={duration || currentSummary.audioDuration || 0}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                  onSeek={handleSeek}
                  playbackRate={playbackRate}
                  onChangePlaybackRate={setPlaybackRate}
                  volume={volume}
                  onChangeVolume={setVolume}
                  isMuted={isMuted}
                  onToggleMute={handleToggleMute}
                />

                {/* Interactive Synchronized Transcript */}
                <div className="grid grid-cols-1 gap-6">
                  <TranscriptView
                    summary={currentSummary}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                    isPlaying={isPlaying}
                  />
                </div>
              </>
            ) : (
              <motion.div
                id="no-active-summary-state"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative bg-white rounded-[24px] google-card-shadow p-12 text-center space-y-4 max-w-xl mx-auto"
              >
                {/* Pending Articles Count Badge Overlay */}
                <div
                  id="pending-articles-badge-overlay"
                  className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 flex items-center justify-center"
                  title={`${articles.length} pending article${articles.length === 1 ? '' : 's'} in list`}
                  aria-label={`${articles.length} pending articles in list`}
                >
                  <span className="w-8 h-8 rounded-full bg-[#1A73E8] text-white text-xs font-mono font-medium flex items-center justify-center shadow-md border-2 border-white">
                    {articles.length}
                  </span>
                </div>

                <div className="w-14 h-14 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center mx-auto">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium font-serif text-[#202124]">
                    No Commute Digest Generated Yet
                  </h3>
                  <p className="text-xs text-[#5F6368] mt-1 max-w-sm mx-auto leading-relaxed">
                    Select your articles and category focus in the generator, or listen through individual queued stories in the Listen Later tab.
                  </p>
                </div>

                {/* Quick Topic Search Input Field */}
                <form
                  id="form-quick-search-topic"
                  onSubmit={handleQuickTopicSearch}
                  className="w-full max-w-md mx-auto pt-1 pb-1"
                >
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5F6368]">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      id="input-quick-search-topic"
                      type="text"
                      value={quickTopicQuery}
                      onChange={(e) => {
                        setQuickTopicQuery(e.target.value);
                        if (quickTopicFeedback) setQuickTopicFeedback(null);
                      }}
                      placeholder="Quick search topics to add (e.g. AI news, EV tech)..."
                      className="w-full pl-9 pr-28 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white text-xs text-[#202124] placeholder-[#80868B] rounded-full border border-[#DADCE0] focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 transition-all outline-none"
                      disabled={isQuickTopicSearching}
                    />
                    <button
                      id="btn-quick-search-topic"
                      type="submit"
                      disabled={isQuickTopicSearching || !quickTopicQuery.trim()}
                      className="absolute right-1.5 px-3.5 py-1.5 rounded-full bg-[#1A73E8] hover:bg-[#1765CC] disabled:bg-[#DADCE0] disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isQuickTopicSearching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <span>Search & Add</span>
                      )}
                    </button>
                  </div>
                  {quickTopicFeedback && (
                    <p
                      id="quick-search-feedback"
                      className={`text-xs mt-2 transition-all ${
                        quickTopicFeedback.type === 'success'
                          ? 'text-[#1E8E3E] font-medium'
                          : 'text-[#D93025]'
                      }`}
                    >
                      {quickTopicFeedback.message}
                    </p>
                  )}
                </form>

                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  <button
                    id="btn-goto-curate"
                    type="button"
                    onClick={() => setActiveTab('generator')}
                    className="inline-flex items-center px-5 py-2.5 text-xs font-medium text-white bg-[#1A73E8] hover:bg-[#1765CC] rounded-full shadow-sm transition-colors cursor-pointer"
                  >
                    <Layers className="w-4 h-4 mr-1.5" />
                    Go to Curate & Personalize
                  </button>
                  <button
                    id="btn-goto-queue"
                    type="button"
                    onClick={() => setActiveTab('queue')}
                    className="inline-flex items-center px-4 py-2.5 text-xs font-medium text-[#202124] bg-[#F8F9FA] hover:bg-[#E8F0FE] hover:text-[#1A73E8] rounded-full border border-[#E8EAED] transition-colors cursor-pointer"
                  >
                    <BookmarkCheck className="w-4 h-4 mr-1.5" />
                    View Listen Later ({queueItems.length})
                  </button>
                  <button
                    id="btn-share-curation"
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="inline-flex items-center px-4 py-2.5 text-xs font-medium text-[#1A73E8] bg-[#E8F0FE] hover:bg-[#D2E3FC] rounded-full transition-colors cursor-pointer"
                    title="Generate unique public URL for your configuration and library using Firestore"
                  >
                    <Share2 className="w-4 h-4 mr-1.5" />
                    Share Curated Topics
                  </button>
                  <button
                    id="btn-clear-all-suggestions"
                    type="button"
                    onClick={handleClearAllSuggestions}
                    className={`inline-flex items-center px-4 py-2.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                      clearedSuggestionsFeedback
                        ? 'bg-[#E6F4EA] text-[#34A853] border-[#34A853]/30'
                        : 'text-[#D93025] bg-[#F8F9FA] hover:bg-[#FCE8E6] border-[#E8EAED] hover:border-[#F28B82]'
                    }`}
                    title="Remove all current pending items and reset state"
                  >
                    {clearedSuggestionsFeedback ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#34A853]" />
                        <span>Suggestions Cleared</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1.5 text-[#D93025]" />
                        <span>Clear All Suggestions</span>
                      </>
                    )}
                  </button>
                  <button
                    id="btn-copy-script"
                    type="button"
                    onClick={handleCopyScript}
                    className={`inline-flex items-center px-4 py-2.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                      copiedScriptFeedback
                        ? 'bg-[#E6F4EA] text-[#34A853] border-[#34A853]/30'
                        : 'text-[#202124] bg-[#F8F9FA] hover:bg-[#E8F0FE] hover:text-[#1A73E8] border-[#E8EAED]'
                    }`}
                    title="Copy current pending article titles to clipboard"
                  >
                    {copiedScriptFeedback ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#34A853]" />
                        <span>Script Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1.5 text-[#5F6368]" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                  <button
                    id="btn-download-articles-json"
                    type="button"
                    onClick={handleDownloadArticlesJson}
                    className={`inline-flex items-center px-4 py-2.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                      downloadJsonFeedback
                        ? 'bg-[#E6F4EA] text-[#34A853] border-[#34A853]/30'
                        : 'text-[#202124] bg-[#F8F9FA] hover:bg-[#E8F0FE] hover:text-[#1A73E8] border-[#E8EAED]'
                    }`}
                    title="Export current article list as a structured JSON backup file"
                  >
                    {downloadJsonFeedback ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#34A853]" />
                        <span>JSON Downloaded!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-1.5 text-[#5F6368]" />
                        <span>Download JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Share Curated Topics Modal */}
      <ShareLibraryModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        config={config}
        articles={articles}
        user={user}
      />

      {/* Saved History Modal with Firestore Sync */}
      <SavedDigestsModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        savedDigests={savedDigests}
        onSelectDigest={(digest) => {
          setCurrentSummary(digest);
          setActiveTab('player');
        }}
        onDeleteDigest={handleDeleteSavedDigest}
        activeDigestId={currentSummary?.id}
        user={user}
      />
    </div>
  );
}
