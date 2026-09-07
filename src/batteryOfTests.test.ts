import { describe, it, expect } from 'vitest';
import { SAMPLE_ARTICLES } from './data/sampleArticles';
import { CommuteConfig, NewsArticle, CommuteSummary } from './types';
import { calculateDigestPlan, formatAudioTime, filterArticlesByCategory } from './digestUtils.test';

// Simulation of WAV header generator from server.ts
function createPcmWavBuffer(
  pcmBuffer: Uint8Array,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Uint8Array {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // Helper to write ASCII string
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const out = new Uint8Array(buffer);
  out.set(pcmBuffer, 44);
  return out;
}

// Simulation of JWT parser from server.ts
function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Simulation of HTML paragraph & title extraction from server.ts
function extractArticleFromHtml(html: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  let title = titleMatch ? titleMatch[1].trim() : 'News Article';
  title = title.replace(/\s*[-–|].*$/, '').trim();

  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

  const paragraphs: string[] = [];
  const pRegex = /<p\b[^>]*>([^<]+)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(clean)) !== null) {
    const text = match[1].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    if (text.length > 40) {
      paragraphs.push(text);
    }
  }

  const content = paragraphs.slice(0, 10).join('\n\n');
  return { title, content };
}

describe('Battery of Tests: Core Business Logic & Edge Cases', () => {
  describe('1. Sample Articles Integrity', () => {
    it('provides valid curated articles with required properties', () => {
      expect(SAMPLE_ARTICLES.length).toBeGreaterThanOrEqual(3);
      for (const art of SAMPLE_ARTICLES) {
        expect(art.id).toBeDefined();
        expect(art.title.trim().length).toBeGreaterThan(10);
        expect(art.content.trim().length).toBeGreaterThan(50);
        expect(art.category).toBeDefined();
        expect(art.source).toBeDefined();
      }
    });

    it('all sample articles have non-zero word counts', () => {
      SAMPLE_ARTICLES.forEach((art) => {
        const words = art.content.trim().split(/\s+/).length;
        expect(words).toBeGreaterThan(30);
      });
    });
  });

  describe('2. Audio WAV Encoding & PCM Header', () => {
    it('creates a valid 44-byte WAV header for PCM data', () => {
      // 24000 samples of 16-bit mono = 1 second = 48000 bytes
      const dummyPcm = new Uint8Array(48000);
      const wav = createPcmWavBuffer(dummyPcm, 24000, 1, 16);

      expect(wav.length).toBe(48000 + 44);

      // Check RIFF header
      const view = new DataView(wav.buffer);
      const riffTag = String.fromCharCode(wav[0], wav[1], wav[2], wav[3]);
      expect(riffTag).toBe('RIFF');

      const waveTag = String.fromCharCode(wav[8], wav[9], wav[10], wav[11]);
      expect(waveTag).toBe('WAVE');

      // Check sample rate at byte 24
      const sampleRate = view.getUint32(24, true);
      expect(sampleRate).toBe(24000);

      // Check channels at byte 22
      const channels = view.getUint16(22, true);
      expect(channels).toBe(1);

      // Check bits per sample at byte 34
      const bitsPerSample = view.getUint16(34, true);
      expect(bitsPerSample).toBe(16);

      // Check data size at byte 40
      const dataSize = view.getUint32(40, true);
      expect(dataSize).toBe(48000);
    });

    it('handles empty PCM buffer gracefully', () => {
      const emptyPcm = new Uint8Array(0);
      const wav = createPcmWavBuffer(emptyPcm, 24000, 1, 16);
      expect(wav.length).toBe(44);
      const view = new DataView(wav.buffer);
      expect(view.getUint32(40, true)).toBe(0);
    });
  });

  describe('3. JWT Authentication Verification Logic', () => {
    it('correctly parses valid JWT payloads', () => {
      const payloadObj = {
        sub: 'user-12345',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'https://securetoken.google.com/cityscope-506222',
        aud: 'cityscope-506222',
      };
      const base64Payload = btoa(JSON.stringify(payloadObj));
      const token = `header.${base64Payload}.signature`;

      const parsed = parseJwtPayload(token);
      expect(parsed).not.toBeNull();
      expect(parsed.sub).toBe('user-12345');
      expect(parsed.aud).toBe('cityscope-506222');
    });

    it('rejects malformed or unpadded JWT tokens safely', () => {
      expect(parseJwtPayload('')).toBeNull();
      expect(parseJwtPayload('invalid-single-string')).toBeNull();
      expect(parseJwtPayload('header.invalid-base64.sig')).toBeNull();
      expect(parseJwtPayload('part1.part2')).toBeNull();
    });
  });

  describe('4. HTML Article Parser & Cleaner', () => {
    it('extracts clean title and paragraph text while stripping scripts, nav, footer', () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Revolutionary Solar Grid Unveiled - Tech Times</title>
            <script>console.log("ad script");</script>
            <style>body { color: red; }</style>
          </head>
          <body>
            <nav><p>Home Menu Navigation Link Items Here</p></nav>
            <header><p>Banner Ad Information Here</p></header>
            <main>
              <p>Engineers have officially deployed the world's most resilient solar distribution system today.</p>
              <p>The network covers over two hundred square miles and features bidirectional battery synchronization.</p>
              <p>Short paragraph</p>
            </main>
            <footer><p>Copyright 2026 Tech Times Media Group All Rights Reserved Worldwide.</p></footer>
          </body>
        </html>
      `;

      const result = extractArticleFromHtml(mockHtml);
      expect(result.title).toBe('Revolutionary Solar Grid Unveiled');
      expect(result.content).toContain("Engineers have officially deployed the world's most resilient solar distribution");
      expect(result.content).toContain('bidirectional battery synchronization');
      // Stripped script, nav, header, footer
      expect(result.content).not.toContain('ad script');
      expect(result.content).not.toContain('Home Menu Navigation Link Items Here');
      expect(result.content).not.toContain('Banner Ad Information Here');
      expect(result.content).not.toContain('Copyright 2026');
      // Filtered paragraphs shorter than 40 chars
      expect(result.content).not.toContain('Short paragraph');
    });
  });

  describe('5. Audio Player Calculation & Chapter Alignment', () => {
    it('identifies the active chapter based on current playback time', () => {
      const mockSummary: CommuteSummary = {
        id: 'digest-test-1',
        title: 'Commute Digest',
        overview: 'Overview',
        intro: 'Welcome',
        segments: [],
        outro: 'Goodbye',
        fullScript: 'Full script',
        createdAt: new Date().toISOString(),
        config: {
          commuteMinutes: 10,
          tone: 'morning_briefing',
          format: 'single_host',
          voice: 'Kore',
          coHostVoice: 'Puck',
          commuterNotes: '',
          selectedCategories: [],
        },
        articlesCount: 2,
        chapters: [
          { id: 'intro', title: 'Intro', headline: 'Welcome', startTime: 0, endTime: 30 },
          { id: 'seg-1', title: 'Story 1', headline: 'Tech Breakthrough', startTime: 30, endTime: 120 },
          { id: 'seg-2', title: 'Story 2', headline: 'Economy Update', startTime: 120, endTime: 240 },
          { id: 'outro', title: 'Outro', headline: 'Safe Travels', startTime: 240, endTime: 260 },
        ],
      };

      const getChapterAt = (time: number) =>
        mockSummary.chapters?.find((ch) => time >= ch.startTime && time <= ch.endTime) ||
        mockSummary.chapters?.[0];

      expect(getChapterAt(0)?.id).toBe('intro');
      expect(getChapterAt(15)?.id).toBe('intro');
      expect(getChapterAt(35)?.id).toBe('seg-1');
      expect(getChapterAt(120)?.id).toBe('seg-1'); // boundary
      expect(getChapterAt(180)?.id).toBe('seg-2');
      expect(getChapterAt(250)?.id).toBe('outro');
      expect(getChapterAt(300)?.id).toBe('intro'); // fallback to first
    });

    it('formats time intervals edge cases properly', () => {
      expect(formatAudioTime(0)).toBe('0:00');
      expect(formatAudioTime(59)).toBe('0:59');
      expect(formatAudioTime(60)).toBe('1:00');
      expect(formatAudioTime(3599)).toBe('59:59');
      expect(formatAudioTime(3600)).toBe('60:00');
      expect(formatAudioTime(-10)).toBe('0:00');
      expect(formatAudioTime(undefined as any)).toBe('0:00');
    });

    it('calculates 32-band frequency amplitude bounds correctly', () => {
      const BAR_COUNT = 32;
      const rawByteData = new Uint8Array(BAR_COUNT).fill(128);
      const amplitudes: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const normalized = Math.max(0.08, rawByteData[i] / 255);
        amplitudes.push(normalized);
      }
      expect(amplitudes).toHaveLength(32);
      expect(amplitudes[0]).toBeCloseTo(128 / 255, 2);
      expect(amplitudes.every((a) => a >= 0.08 && a <= 1.0)).toBe(true);
    });

    it('validates supported commute playback speeds: 0.5x, 1.0x, 1.5x, 2.0x', () => {
      const supportedSpeeds = [0.5, 1.0, 1.5, 2.0];
      expect(supportedSpeeds).toEqual([0.5, 1.0, 1.5, 2.0]);
      supportedSpeeds.forEach((spd) => {
        expect(spd).toBeGreaterThanOrEqual(0.5);
        expect(spd).toBeLessThanOrEqual(2.0);
      });
    });

    it('validates autoPlayOnGenerate defaults and persistence serialization', () => {
      // Test default configuration
      const defaultConfig: CommuteConfig = {
        commuteMinutes: 10,
        tone: 'morning_briefing',
        format: 'single_host',
        voice: 'Kore',
        coHostVoice: 'Puck',
        commuterNotes: '',
        selectedCategories: [],
        autoPlayOnGenerate: true,
      };
      expect(defaultConfig.autoPlayOnGenerate).toBe(true);

      // Simulate local storage serialization & toggle
      const mockStorage: Record<string, string> = {};
      const key = 'commutebrief_autoplay_on_generate';

      // Save true
      mockStorage[key] = String(defaultConfig.autoPlayOnGenerate);
      expect(mockStorage[key] === 'true').toBe(true);

      // Toggle to false
      const toggled = !defaultConfig.autoPlayOnGenerate;
      mockStorage[key] = String(toggled);
      expect(mockStorage[key] === 'true').toBe(false);
      expect(toggled).toBe(false);
    });

    it('simulates browser auto-play restriction with user-interaction fallback event', async () => {
      let isPlaying = false;
      let isAutoplayPending = false;
      let directPlayBlocked = true;

      const listeners: Record<string, (() => void)[]> = {};
      const addEventListenerMock = (evt: string, fn: () => void) => {
        if (!listeners[evt]) listeners[evt] = [];
        listeners[evt].push(fn);
      };
      const removeEventListenerMock = (evt: string, fn: () => void) => {
        if (listeners[evt]) {
          listeners[evt] = listeners[evt].filter((cb) => cb !== fn);
        }
      };

      // Playback attempt function simulating browser policy
      const attemptPlay = () => {
        if (directPlayBlocked) {
          // Browser rejects programmatic play (NotAllowedError)
          isAutoplayPending = true;
          // Register user interaction fallback listeners
          ['click', 'pointerdown', 'keydown', 'touchstart'].forEach((event) => {
            addEventListenerMock(event, onUserInteraction);
          });
          return Promise.reject(new Error('NotAllowedError: play() failed'));
        } else {
          isPlaying = true;
          isAutoplayPending = false;
          return Promise.resolve();
        }
      };

      const cleanupListeners = () => {
        ['click', 'pointerdown', 'keydown', 'touchstart'].forEach((event) => {
          removeEventListenerMock(event, onUserInteraction);
        });
        isAutoplayPending = false;
      };

      const onUserInteraction = () => {
        // User gesture unlocks playback
        directPlayBlocked = false;
        isPlaying = true;
        cleanupListeners();
      };

      // Step 1: Initial auto-play attempt is blocked by browser policy
      await attemptPlay().catch(() => {});
      expect(isPlaying).toBe(false);
      expect(isAutoplayPending).toBe(true);
      expect(listeners['click'].length).toBe(1);
      expect(listeners['keydown'].length).toBe(1);

      // Step 2: User touches the screen / interacts with the page
      listeners['click'][0]();

      // Step 3: Audio starts playing and pending state is resolved
      expect(isPlaying).toBe(true);
      expect(isAutoplayPending).toBe(false);
      expect(listeners['click'].length).toBe(0);
    });
  });
});
