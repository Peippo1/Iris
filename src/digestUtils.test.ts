import { describe, it, expect } from 'vitest';
import { CommuteConfig, NewsArticle, CommuteTone, HostFormat, GeminiVoice } from './types';

// Helper function that calculates proportional word limits and segment allocations
export function calculateDigestPlan(
  articles: NewsArticle[],
  config: CommuteConfig
) {
  const targetMinutes = Math.max(1, Math.min(config.commuteMinutes, 60));
  // Standard conversational broadcast speech is approx 140 words per minute
  const targetWords = targetMinutes * 140;
  
  // Filter by selected categories if user specified any
  const filteredArticles =
    config.selectedCategories && config.selectedCategories.length > 0
      ? articles.filter((a) => config.selectedCategories!.includes(a.category))
      : articles;

  const articleCount = filteredArticles.length;
  const wordsPerArticle = articleCount > 0 ? Math.floor((targetWords * 0.8) / articleCount) : 0;

  return {
    targetMinutes,
    targetWords,
    filteredArticles,
    articleCount,
    wordsPerArticle,
    isCoHost: config.format === 'co_hosts',
  };
}

// Helper function to format duration in MM:SS
export function formatAudioTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper to filter articles by category
export function filterArticlesByCategory(
  articles: NewsArticle[],
  selectedCategory: string
): NewsArticle[] {
  if (!selectedCategory || selectedCategory === 'All') return articles;
  return articles.filter(
    (a) => a.category?.toLowerCase() === selectedCategory.toLowerCase()
  );
}

describe('Digest Planning and Audio Utilities (TDD)', () => {
  const mockArticles: NewsArticle[] = [
    {
      id: 'art-1',
      title: 'Solid State Battery Release',
      content: 'Solid state battery details...',
      category: 'Technology',
      source: 'CleanTech',
    },
    {
      id: 'art-2',
      title: 'Global Trade Agreement',
      content: 'Global trade agreements signed...',
      category: 'Business',
      source: 'Financial News',
    },
    {
      id: 'art-3',
      title: 'Mars Probe Launch',
      content: 'New rover launched to Mars...',
      category: 'Science',
      source: 'Aero Weekly',
    },
  ];

  it('calculates target words accurately based on commute duration', () => {
    const config: CommuteConfig = {
      commuteMinutes: 10,
      tone: 'morning_briefing',
      format: 'single_host',
      voice: 'Kore',
      coHostVoice: 'Puck',
      commuterNotes: '',
      selectedCategories: [],
    };

    const plan = calculateDigestPlan(mockArticles, config);
    expect(plan.targetMinutes).toBe(10);
    expect(plan.targetWords).toBe(1400);
    expect(plan.articleCount).toBe(3);
    // 80% of 1400 is 1120 / 3 articles ≈ 373 words/article
    expect(plan.wordsPerArticle).toBe(373);
  });

  it('respects category filtering when selecting articles for digest', () => {
    const config: CommuteConfig = {
      commuteMinutes: 15,
      tone: 'deep_dive',
      format: 'co_hosts',
      voice: 'Kore',
      coHostVoice: 'Puck',
      commuterNotes: '',
      selectedCategories: ['Technology', 'Science'],
    };

    const plan = calculateDigestPlan(mockArticles, config);
    expect(plan.articleCount).toBe(2);
    expect(plan.filteredArticles.map((a) => a.id)).toEqual(['art-1', 'art-3']);
    expect(plan.isCoHost).toBe(true);
  });

  it('formats audio seconds into mm:ss display accurately', () => {
    expect(formatAudioTime(0)).toBe('0:00');
    expect(formatAudioTime(45)).toBe('0:45');
    expect(formatAudioTime(65)).toBe('1:05');
    expect(formatAudioTime(600)).toBe('10:00');
    expect(formatAudioTime(3605)).toBe('60:05');
    expect(formatAudioTime(-5)).toBe('0:00');
    expect(formatAudioTime(NaN)).toBe('0:00');
  });

  it('filters articles by category with case-insensitivity and All fallback', () => {
    expect(filterArticlesByCategory(mockArticles, 'All')).toHaveLength(3);
    expect(filterArticlesByCategory(mockArticles, '')).toHaveLength(3);
    expect(filterArticlesByCategory(mockArticles, 'technology')).toHaveLength(1);
    expect(filterArticlesByCategory(mockArticles, 'Business')).toHaveLength(1);
    expect(filterArticlesByCategory(mockArticles, 'NonExistent')).toHaveLength(0);
  });

  it('calculates total word count across articles robustly', () => {
    const totalWords = mockArticles.reduce((acc, a) => {
      return acc + (a.content ? a.content.trim().split(/\s+/).length : 0);
    }, 0);
    expect(totalWords).toBeGreaterThan(0);
  });

  it('toggles queued articles in a set without duplicates', () => {
    const queuedIds = new Set<string>();
    queuedIds.add('art-1');
    queuedIds.add('art-2');
    queuedIds.add('art-1'); // duplicate add

    expect(queuedIds.size).toBe(2);
    expect(queuedIds.has('art-1')).toBe(true);
    expect(queuedIds.has('art-3')).toBe(false);

    queuedIds.delete('art-1');
    expect(queuedIds.has('art-1')).toBe(false);
  });
});
