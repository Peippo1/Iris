import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, Type } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Creates a standard 44-byte RIFF WAV header for raw 16-bit mono PCM audio
 */
function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const wavBuffer = Buffer.alloc(totalSize);

  // RIFF chunk descriptor
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(totalSize - 8, 4);
  wavBuffer.write('WAVE', 8);

  // "fmt " sub-chunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  wavBuffer.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  wavBuffer.writeUInt16LE(numChannels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);

  // Copy raw PCM audio bytes
  pcmBuffer.copy(wavBuffer, 44);

  return wavBuffer;
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Search & fetch news articles by topic or query using Gemini 3.8 Flash
app.post('/api/search-articles', async (req: Request, res: Response) => {
  const { query, category, count = 3 } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Valid search query is required' });
  }

  try {
    const ai = getAi();
    const articleCount = Math.max(1, Math.min(Number(count) || 3, 5));

    const prompt = `Search Topic / Query: "${query.trim()}"
${category && category !== 'All' ? `Preferred Category Focus: "${category}"` : ''}

Retrieve and curate ${articleCount} high-quality, authentic-feeling news reporting articles covering the latest developments, key angles, and factual analysis related to "${query.trim()}".

Requirements for each article:
1. Realistic, current, informative headline.
2. Reputable news source attribution (e.g., Reuters, Bloomberg, MIT Technology Review, The Wall Street Journal, Financial Times, Ars Technica, AP News).
3. Realistic category beat (e.g., Technology, Business, Science, World News, Transportation, Culture, Health, Environment).
4. Substantive content: 2 to 4 detailed paragraphs (approx 150-300 words) containing specific developments, context, quotes, numbers, and impact, ideal for a spoken commute broadcast.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: prompt }],
      config: {
        systemInstruction:
          'You are a professional news agency retrieval and intelligence engine. You produce realistic, insightful, and factual news reporting articles based on requested topics and current news events.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            articles: {
              type: Type.ARRAY,
              description: 'List of curated news articles',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  source: { type: Type.STRING },
                  category: { type: Type.STRING },
                  content: { type: Type.STRING },
                  url: { type: Type.STRING },
                },
                required: ['title', 'source', 'category', 'content'],
              },
            },
          },
          required: ['articles'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No response received from Gemini news search');
    }

    const data = JSON.parse(text);
    const fetchedArticles = (data.articles || []).map((art: any, idx: number) => ({
      id: `searched-${Date.now()}-${idx}`,
      title: art.title,
      source: art.source || 'News Wire',
      category: art.category || category || 'Technology',
      content: art.content,
      url: art.url || `https://news.google.com/search?q=${encodeURIComponent(art.title)}`,
      publishedAt: new Date().toISOString(),
    }));

    return res.json({
      success: true,
      query: query.trim(),
      articlesCount: fetchedArticles.length,
      articles: fetchedArticles,
    });
  } catch (err: any) {
    console.error('Search articles error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to search and fetch articles',
    });
  }
});


// URL article extraction endpoint
app.post('/api/extract-url', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid URL is required' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch article (Status: ${response.status})`);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : 'News Article';
    title = title.replace(/\s*[-–|].*$/, '').trim();

    // Clean body text
    let clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

    // Extract paragraph text
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

    if (!content || content.length < 50) {
      return res.status(422).json({
        error:
          'Could not extract meaningful article text from this webpage. Please copy and paste the article text directly.',
      });
    }

    // Attempt to guess source name from hostname
    let source = '';
    try {
      const parsedUrl = new URL(url);
      source = parsedUrl.hostname.replace(/^www\./, '');
    } catch {
      source = 'Web Article';
    }

    return res.json({
      title,
      source,
      content,
      url,
    });
  } catch (err: any) {
    console.error('URL extraction error:', err);
    return res.status(500).json({
      error:
        err.name === 'AbortError'
          ? 'Fetching the URL timed out. Please paste the article text directly.'
          : (err.message || 'Failed to extract article from URL'),
    });
  }
});

// Generate commute news script using Gemini 3.8 Flash
app.post('/api/generate-summary', async (req: Request, res: Response) => {
  try {
    const {
      articles,
      commuteMinutes = 10,
      tone = 'morning_briefing',
      format = 'single_host',
      voice = 'Kore',
      coHostVoice = 'Puck',
      commuterNotes = '',
    } = req.body;

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({ error: 'At least one article is required' });
    }

    const ai = getAi();

    // Map tone and format to instructions
    const toneInstructions: Record<string, string> = {
      morning_briefing:
        'Tone: Bright, energetic morning broadcast anchor. Crisp pacing, engaging hook, punchy highlights.',
      commuter_casual:
        'Tone: Relaxed, friendly, conversational podcast style. Warm, relatable, natural transitions.',
      deep_dive:
        'Tone: In-depth, analytical journalism (like NPR or Bloomberg). Insightful context, connecting the dots on broader implications.',
      executive_snapshot:
        'Tone: Direct, high-impact executive intelligence. Zero fluff, strategic takeaways, key numbers and bottom-line meaning.',
    };

    const formatInstructions =
      format === 'co_hosts'
        ? `Format: Co-hosted podcast conversation between two anchors named "Alex" and "Sam". They share banter, ask each other insightful questions, bounce observations, and trade coverage of the stories. Make the dialogue feel natural and fluid.`
        : `Format: Single solo host named "Host". An articulate, captivating audio narrator speaking directly to the listener in their car, train, or headphones.`;

    const systemPrompt = `You are an elite audio news broadcast producer creating a personalised commute audio digest in UK English (British English).
The commuter has a ${commuteMinutes}-minute transit window.
${toneInstructions[tone] || toneInstructions.morning_briefing}
${formatInstructions}
${commuterNotes ? `Specific listener preferences: "${commuterNotes}"` : ''}

CRITICAL BROADCAST AUDIO RULES:
1. This text will be spoken out loud via Text-to-Speech to someone walking, driving, or riding transit.
2. DO NOT include visual cues, markdown asterisks (*, **), brackets, links, URLs, bullet symbols, or citation numbers like [1].
3. Spell out acronyms phonetically or pronounceably where needed. Use conversational speech rhythms.
4. Craft seamless transitions between news stories (e.g., "Turning now to clean energy...", "Meanwhile in global markets...", "Next up on your commute...").
5. The total spoken script should be calibrated to comfortably fit approximately ${commuteMinutes} minutes at standard speech rate (~130-150 words per minute). For a ${commuteMinutes}-minute commute, target roughly ${Math.min(commuteMinutes * 120, 1000)} total words.
6. Provide an engaging intro welcoming the listener to their personalised commute brief, discrete structured segments for each article with crisp headlines, and a smooth outro wishing them a safe journey.
7. LANGUAGE & SPELLING: Always write the entire script, headlines, and overview in British English (UK English / en-GB). Strictly adhere to UK spelling (e.g., personalised, prioritised, categorised, synthesise, colour, programme, centre, motorway, tube/train) with natural British news delivery.`;

    const articlesPayload = articles.map((a: any, idx: number) => ({
      index: idx + 1,
      id: a.id || `art-${idx + 1}`,
      title: a.title,
      source: a.source || 'News Wire',
      content: a.content ? a.content.slice(0, 3000) : '',
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          text: `Create the personalised commute audio digest in UK English for these ${articles.length} news articles:\n\n${JSON.stringify(articlesPayload, null, 2)}`,
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Catchy broadcast title for this commute digest',
            },
            overview: {
              type: Type.STRING,
              description: '1-2 sentence executive overview of what this digest covers',
            },
            intro: {
              type: Type.STRING,
              description: 'Warm, spoken broadcast introduction welcoming the commuter',
            },
            segments: {
              type: Type.ARRAY,
              description: 'Individual news segments corresponding to the provided stories',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  articleId: { type: Type.STRING },
                  articleTitle: { type: Type.STRING },
                  category: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  speaker: {
                    type: Type.STRING,
                    description: 'Speaker name: "Host" or "Alex" or "Sam"',
                  },
                  script: {
                    type: Type.STRING,
                    description:
                      'Conversational spoken script for this segment without markdown or citations',
                  },
                  estimatedSeconds: {
                    type: Type.NUMBER,
                    description: 'Estimated spoken duration in seconds',
                  },
                },
                required: [
                  'id',
                  'articleTitle',
                  'category',
                  'headline',
                  'speaker',
                  'script',
                  'estimatedSeconds',
                ],
              },
            },
            outro: {
              type: Type.STRING,
              description: 'Smooth, spoken broadcast sign-off wishing the commuter a safe trip',
            },
            fullScript: {
              type: Type.STRING,
              description: 'Complete continuous script combining intro, all segments, and outro',
            },
          },
          required: ['title', 'overview', 'intro', 'segments', 'outro', 'fullScript'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No response text received from Gemini');
    }

    const summaryData = JSON.parse(text);

    return res.json({
      success: true,
      summary: {
        ...summaryData,
        createdAt: new Date().toISOString(),
        config: {
          commuteMinutes,
          tone,
          format,
          voice,
          coHostVoice,
          commuterNotes,
        },
        articlesCount: articles.length,
      },
    });
  } catch (err: any) {
    console.error('Summary generation error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate news summary script',
    });
  }
});

// Generate TTS audio using gemini-3.1-flash-tts-preview
app.post('/api/generate-audio', async (req: Request, res: Response) => {
  try {
    const {
      intro,
      segments,
      outro,
      format = 'single_host',
      voice = 'Kore',
      coHostVoice = 'Puck',
      fullScript,
    } = req.body;

    const ai = getAi();

    // Prepare audio segments to synthesise
    const audioTasks: Array<{
      id: string;
      title: string;
      headline: string;
      speaker: string;
      text: string;
    }> = [];

    if (intro && typeof intro === 'string' && intro.trim()) {
      audioTasks.push({
        id: 'intro',
        title: 'Broadcast Intro',
        headline: 'Commute Briefing Welcome',
        speaker: format === 'co_hosts' ? 'Alex' : 'Host',
        text: intro.trim(),
      });
    }

    if (Array.isArray(segments) && segments.length > 0) {
      for (const seg of segments) {
        if (seg.script && seg.script.trim()) {
          audioTasks.push({
            id: seg.id || `seg-${audioTasks.length}`,
            title: seg.articleTitle || seg.headline || 'News Segment',
            headline: seg.headline || seg.articleTitle || 'Headline',
            speaker: seg.speaker || (format === 'co_hosts' ? 'Alex' : 'Host'),
            text: seg.script.trim(),
          });
        }
      }
    }

    if (outro && typeof outro === 'string' && outro.trim()) {
      audioTasks.push({
        id: 'outro',
        title: 'Sign-off',
        headline: 'Safe Travels & Wrap-up',
        speaker: format === 'co_hosts' ? 'Sam' : 'Host',
        text: outro.trim(),
      });
    }

    // If no segments provided, fallback to fullScript
    if (audioTasks.length === 0 && fullScript && typeof fullScript === 'string') {
      audioTasks.push({
        id: 'full',
        title: 'Commute News Digest',
        headline: 'Full Audio Digest',
        speaker: format === 'co_hosts' ? 'Alex' : 'Host',
        text: fullScript.trim(),
      });
    }

    if (audioTasks.length === 0) {
      return res.status(400).json({ error: 'No text or segments provided for TTS' });
    }

    console.log(`Starting TTS synthesis for ${audioTasks.length} audio sections...`);

    const pcmBuffers: Buffer[] = [];
    const chapters: Array<{
      id: string;
      title: string;
      headline: string;
      startTime: number;
      endTime: number;
    }> = [];

    let currentSecond = 0;
    const SAMPLE_RATE = 24000;
    const BYTES_PER_SECOND = SAMPLE_RATE * 1 * 2; // 48000 bytes per second for 24kHz 16-bit mono

    // Synthesize each section using gemini-3.1-flash-tts-preview
    for (let i = 0; i < audioTasks.length; i++) {
      const task = audioTasks[i];
      let selectedVoice = voice || 'Kore';
      if (format === 'co_hosts' && (task.speaker === 'Sam' || (i % 2 === 1))) {
        selectedVoice = coHostVoice || 'Puck';
      }

      // Add vocal direction instruction for expressive, broadcast-grade delivery
      const spokenPrompt = task.text;

      let sectionPcmBuffer: Buffer | null = null;
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts && !sectionPcmBuffer) {
        attempts++;
        try {
          const ttsResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-tts-preview',
            contents: [{ parts: [{ text: spokenPrompt }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: selectedVoice as any,
                  },
                },
              },
            },
          });

          const base64Audio =
            ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

          if (base64Audio) {
            sectionPcmBuffer = Buffer.from(base64Audio, 'base64');
          }
        } catch (ttsErr: any) {
          console.warn(
            `TTS attempt ${attempts} failed for task "${task.title}":`,
            ttsErr.message
          );
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      }

      if (sectionPcmBuffer && sectionPcmBuffer.length > 0) {
        const durationSec = sectionPcmBuffer.length / BYTES_PER_SECOND;
        pcmBuffers.push(sectionPcmBuffer);

        chapters.push({
          id: task.id,
          title: task.title,
          headline: task.headline,
          startTime: Math.round(currentSecond * 100) / 100,
          endTime: Math.round((currentSecond + durationSec) * 100) / 100,
        });

        currentSecond += durationSec;

        // Add 0.3s gentle pause between segments (silence PCM)
        const silenceSamples = Math.floor(SAMPLE_RATE * 0.3);
        const silenceBuffer = Buffer.alloc(silenceSamples * 2); // 16-bit zero-filled
        pcmBuffers.push(silenceBuffer);
        currentSecond += 0.3;
      }
    }

    if (pcmBuffers.length === 0) {
      throw new Error(
        'TTS generation failed to produce audio data. Please check your API key and connection.'
      );
    }

    // Combine all PCM chunks into one master buffer
    const fullPcmBuffer = Buffer.concat(pcmBuffers);
    const totalDurationSeconds = Math.round((fullPcmBuffer.length / BYTES_PER_SECOND) * 10) / 10;

    // Convert raw PCM to browser-playable RIFF WAV with 44-byte header
    const wavBuffer = pcmToWav(fullPcmBuffer, SAMPLE_RATE, 1, 16);
    const audioBase64 = wavBuffer.toString('base64');
    const audioDataUrl = `data:audio/wav;base64,${audioBase64}`;

    return res.json({
      success: true,
      audioDataUrl,
      audioDuration: totalDurationSeconds,
      chapters,
      modelUsed: 'gemini-3.1-flash-tts-preview',
    });
  } catch (err: any) {
    console.error('Audio generation error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate TTS audio',
    });
  }
});

// Generate audio for a single Listen Later queue article
app.post('/api/generate-queue-article-audio', async (req: Request, res: Response) => {
  try {
    const { title, source, content, category = 'General', voice = 'Kore' } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Article title is required' });
    }

    const ai = getAi();

    // 1. Script generation for audio narration
    const scriptPrompt = `You are a professional audio news anchor delivering an individual news item for a commuter's queue.
Title: "${title}"
Source: "${source || 'News Wire'}"
Category: "${category}"
Content:
${(content || title).slice(0, 2500)}

Write a concise, engaging spoken news brief for this story (approx 70-120 words).
AUDIO GUIDELINES:
- Spoken words only. NO markdown, asterisks, bullet points, brackets, or links.
- Natural broadcast cadence: start with a clear, engaging lead-in mentioning the category or topic, explain the core developments, and highlight the key impact.
- Language: British English (UK English / en-GB) with UK spelling conventions and natural BBC-style broadcasting phrasing.
- Return ONLY the raw spoken text.`;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: scriptPrompt }],
    });

    const spokenScript = scriptResponse.text?.trim() || `${title}. Reporting from ${source || 'the news desk'}. ${content ? content.slice(0, 200) : ''}`;

    // 2. Synthesise with Gemini TTS
    const SAMPLE_RATE = 24000;
    const BYTES_PER_SECOND = SAMPLE_RATE * 1 * 2;

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: spokenScript }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice as any,
            },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('TTS failed to produce audio for queue item');
    }

    const pcmBuffer = Buffer.from(base64Audio, 'base64');
    const durationSeconds = Math.round((pcmBuffer.length / BYTES_PER_SECOND) * 10) / 10;
    const wavBuffer = pcmToWav(pcmBuffer, SAMPLE_RATE, 1, 16);
    const audioDataUrl = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;

    return res.json({
      success: true,
      script: spokenScript,
      audioDataUrl,
      audioDuration: durationSeconds,
    });
  } catch (err: any) {
    console.error('Queue article audio error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to synthesise queue article audio',
    });
  }
});

// Global Express error handler
app.use((err: any, req: Request, res: Response, _next: any) => {
  console.error('Unhandled server error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: err?.message || 'Internal server error',
    });
  }
});

// Vite middleware setup
async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Iris Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
