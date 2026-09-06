export interface NewsArticle {
  id: string;
  title: string;
  source?: string;
  url?: string;
  content: string;
  category: string;
  publishedAt?: string;
  userId?: string;
}

export const DEFAULT_CATEGORIES = [
  'Technology',
  'Business',
  'World News',
  'Science',
  'Transportation',
  'Culture',
  'Health',
  'Environment',
] as const;

export type CommuteTone =
  | 'morning_briefing'
  | 'commuter_casual'
  | 'deep_dive'
  | 'executive_snapshot';

export type HostFormat = 'single_host' | 'co_hosts';

export type GeminiVoice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface CommuteConfig {
  commuteMinutes: number;
  tone: CommuteTone;
  format: HostFormat;
  voice: GeminiVoice;
  coHostVoice: GeminiVoice;
  commuterNotes: string;
  selectedCategories?: string[]; // Empty means all categories
}

export interface ScriptSegment {
  id: string;
  articleId?: string;
  articleTitle: string;
  category: string;
  headline: string;
  speaker: string; // "Host" or "Alex" / "Sam"
  script: string;
  estimatedSeconds: number;
}

export interface AudioChapter {
  id: string;
  title: string;
  headline: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

export interface CommuteSummary {
  id: string;
  title: string;
  overview: string;
  createdAt: string;
  config: CommuteConfig;
  articlesCount: number;
  segments: ScriptSegment[];
  intro: string;
  outro: string;
  fullScript: string;
  audioDataUrl?: string;
  audioDuration?: number;
  chapters?: AudioChapter[];
  userId?: string;
}

export interface ListenLaterItem {
  id: string;
  articleId?: string;
  title: string;
  source?: string;
  category: string;
  content: string;
  url?: string;
  addedAt: string;
  order: number;
  isPlayed?: boolean;
  audioDataUrl?: string;
  audioDuration?: number;
  spokenScript?: string;
  userId?: string;
}

export interface UserPreferences {
  defaultCommuteMinutes?: number;
  preferredTone?: CommuteTone;
  customCategories?: string[];
  autoPlayNextQueue?: boolean;
}

export interface SharedLibrary {
  shareId: string;
  userId?: string;
  creatorName: string;
  title: string;
  createdAt: string;
  config: CommuteConfig;
  articles: NewsArticle[];
  categories: string[];
  articlesCount: number;
}

export interface RecentArticleSearch {
  id: string;
  userId?: string;
  query: string;
  type: 'topic' | 'url';
  category?: string;
  createdAt: string;
  articlesCount: number;
  articles: NewsArticle[];
}

