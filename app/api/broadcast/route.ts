import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';

interface ArchiveArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  archiveUrl: string;
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
});

const CATEGORY_DOMAIN_MATRIX: Record<string, { origins: string[]; defaultSource: string }> = {
  tech: {
    origins: [
      'http://www.wired.com/',
      'http://slashdot.org/',
      'http://techcrunch.com/',
      'http://news.yahoo.com/tech/'
    ],
    defaultSource: 'Wired / Tech Wire'
  },
  politics: {
    origins: [
      'http://politicalwire.com/',
      'http://www.politico.com/',
      'http://news.yahoo.com/politics/',
      'http://www.washingtonpost.com/politics/'
    ],
    defaultSource: 'Capitol Wire'
  },
  world: {
    origins: [
      'http://www.reuters.com/',
      'http://news.bbc.co.uk/2/hi/world/default.stm',
      'http://news.yahoo.com/world/',
      'http://www.cnn.com/WORLD/'
    ],
    defaultSource: 'Global Dispatch'
  },
  finance: {
    origins: [
      'http://money.cnn.com/',
      'http://finance.yahoo.com/',
      'http://www.marketwatch.com/',
      'http://biz.yahoo.com/'
    ],
    defaultSource: 'Wall St. Wire'
  },
  sports: {
    origins: [
      'http://sports.yahoo.com/',
      'http://www.espn.com/',
      'http://sportsillustrated.cnn.com/'
    ],
    defaultSource: 'Sports Press'
  },
  general: {
    origins: [
      'http://news.yahoo.com/',
      'http://www.cnn.com/',
      'http://www.bbc.co.uk/'
    ],
    defaultSource: 'Public Wire'
  }
};

const CATEGORY_PROMPTS: Record<string, { persona: string; tone: string; focus: string }> = {
  tech: {
    persona: 'Roxie Vance, the fast-talking host of Time-Capsule Radio. You are an energetic tech broadcaster analyzing historical web archives live across the shortwave band.',
    tone: 'High-energy, punchy, charismatic, upbeat, and quick-witted.',
    focus: 'Deliver an exciting radio rundown of the headline gadgets, early software platforms, and tech predictions. Keep momentum high, use conversational contractions, and humorously contrast their predictions to what actually happened by 2026.'
  },
  politics: {
    persona: 'Vee Sinclair, the lead political correspondent on Time-Capsule Radio. You deliver fast-paced political news with newsroom urgency and sharp cadence.',
    tone: 'Dynamic, authoritative, sharp, and engaging.',
    focus: 'Break down the major political showdowns, election races, and legislative debates on this date with broadcast newsroom energy. Contrast those historic tensions with our current 2026 political reality.'
  },
  world: {
    persona: 'Maya Brooks, international wire anchor on Time-Capsule Radio. You broadcast global dispatches with vivid, captivating radio momentum.',
    tone: 'Vibrant, cosmopolitan, urgent, and captivating.',
    focus: 'Bring international events to life with crisp details. Frame the global stories with momentum, concluding with an incisive look at how those geopolitical alliances stand in 2026.'
  },
  finance: {
    persona: 'Chloe Sterling, the rapid-fire market anchor on the Time-Capsule morning bell.',
    tone: 'Upbeat, articulate, fast-paced, and commercially savvy.',
    focus: 'Break down stock moves, company acquisitions, and consumer trends with trading-floor speed. Compare the market valuations of that day to the mega-cap tech dominance of 2026.'
  },
  sports: {
    persona: 'Dani Cruz, the fiery stadium play-by-play host on Time-Capsule Radio.',
    tone: 'Passionate, energetic, punchy, and electric.',
    focus: 'Bring the thrill of game day, playoff races, and iconic player milestones directly to the listener with high-octane commentary and legendary hindsight.'
  },
  general: {
    persona: 'Roxie Vance, the charismatic voice of Time-Capsule Radio, dialing into forgotten web history with lively banter.',
    tone: 'Warm, magnetic, energetic, and witty.',
    focus: 'Deliver a lively headline sweep of what captured society’s attention on this day, sprinkled with sharp commentary comparing their world to life in 2026.'
  }
};

function buildWaybackUrl(rawHref: string, baseOrigin: string, timestamp: string, docBase?: string): string {
  if (!rawHref) return `https://web.archive.org/web/${timestamp}/${baseOrigin}`;

  const waybackMatch = rawHref.match(/\/web\/\d+(?:id_)?\/(https?:\/\/.*)/i);
  if (waybackMatch && waybackMatch[1]) {
    return `https://web.archive.org/web/${timestamp}/${waybackMatch[1]}`;
  }

  let absoluteUrl = rawHref;
  if (!rawHref.startsWith('http://') && !rawHref.startsWith('https://')) {
    if (rawHref.startsWith('//')) {
      absoluteUrl = `https:${rawHref}`;
    } else {
      try {
        const root = docBase || baseOrigin;
        absoluteUrl = new URL(rawHref, root).href;
      } catch {
        const cleanBase = (docBase || baseOrigin).replace(/\/+$/, '');
        const cleanPath = rawHref.replace(/^\/+/, '');
        absoluteUrl = `${cleanBase}/${cleanPath}`;
      }
    }
  }

  return `https://web.archive.org/web/${timestamp}/${absoluteUrl}`;
}

// Deterministic Cleaner: Strips scratchpad reflections, section headings, and checklists
function cleanBroadcastScript(raw: string): string {
  if (!raw) return '';

  let text = raw.replace(
    /^[\s\S]*?(?=(?:Hey everyone|Hello listeners|Good (?:morning|afternoon|evening)|Welcome|You're listening|This is|Locked into|Tuning into|Greetings|Broadcasting live|Here is|Here's))/i,
    ''
  );

  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Filter out verification checklist lines (e.g. "- Upbeat? Yes.", "Upbeat: Yes")
    if (/^[-*•]?\s*(?:[A-Za-z0-9\s/()\-]+)\?\s*(?:Yes|No|Met|True|False)\.?$/i.test(trimmed)) {
      continue;
    }
    if (/^[-*•]?\s*(?:Check|Checklist|Audit|Verification|Criteria):\s*/i.test(trimmed)) {
      continue;
    }

    // Filter out outline labels (e.g. "- *Paragraph 2: The Archival Reports.*", "Paragraph 1:")
    if (/^[-*•#\s]*(?:Paragraph\s*\d+|Station Tuner Opening|Archival Reports|Prophecy Contrast|Sign-off|Opening|Reports|Contrast|Directive|Task)(?:\*|#|\s|:|-)*$/i.test(trimmed)) {
      continue;
    }

    // Filter out pure parenthetical thinking notes (e.g. "(Since the dispatch is just...)")
    if (/^\(.*\)$/.test(trimmed)) {
      continue;
    }

    // Strip inline meta notes in parentheses
    trimmed = trimmed.replace(/\((?:Since|Looking back|In reality|Focusing|Needs to be|Note|Author note)[^)]*\)/gi, '').trim();

    // Strip enclosing decorative quotes
    trimmed = trimmed.replace(/^["'“”]+|["'“”]+$/g, '').trim();

    if (trimmed.length > 0) {
      cleanedLines.push(trimmed);
    }
  }

  return cleanedLines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetYear = parseInt(body.year, 10);
    const category = (body.category || 'general').toLowerCase();

    if (isNaN(targetYear) || targetYear < 1996 || targetYear > 2025) {
      return NextResponse.json({ error: 'Please choose an archival year between 1996 and 2025.' }, { status: 400 });
    }

    const now = new Date();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const targetTimestamp = `${targetYear}${mm}${dd}120000`;

    const targetConfig = CATEGORY_DOMAIN_MATRIX[category] || CATEGORY_DOMAIN_MATRIX.general;
    let validSnapshot: { url: string; timestamp: string } | null = null;
    let selectedOrigin = targetConfig.origins[0];

    for (const testUrl of targetConfig.origins) {
      try {
        const availRes = await fetch(
          `https://archive.org/wayback/available?url=${encodeURIComponent(testUrl)}&timestamp=${targetTimestamp}`,
          { cache: 'no-store' }
        );
        const availJson = await availRes.json();
        const candidate = availJson?.archived_snapshots?.closest;
        if (candidate && candidate.available) {
          validSnapshot = candidate;
          selectedOrigin = testUrl;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!validSnapshot) {
      return NextResponse.json(
        { error: `No carrier signal discovered for ${category.toUpperCase()} in ${targetYear} on this date.` },
        { status: 404 }
      );
    }

    const rawSnapshotUrl = validSnapshot.url.replace(
      new RegExp(`(/web/${validSnapshot.timestamp})(/|id_/)`),
      `$1id_/`
    );

    const pageRes = await fetch(rawSnapshotUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = await pageRes.text();
    const $ = cheerio.load(html);
    const docBase = $('base').attr('href');

    const articles: ArchiveArticle[] = [];
    const seenTitles = new Set<string>();
    const blacklist = [
      'javascript', 'cookie', 'terms of service', 'privacy policy', 'yahoo!',
      'sign in', 'log in', 'help', 'copyright', 'feedback', 'all rights reserved',
      'skip to', 'advertisement', 'subscribe', 'contact us', 'about us'
    ];

    const isGarbage = (text: string) => {
      const lower = text.toLowerCase();
      return text.length < 18 || blacklist.some((w) => lower.includes(w));
    };

    // Strategy 1: Modern Article Cards
    $('article, .story, .post, .entry, .news-item, li[data-type="article"], .js-stream-content, .media-block, .card').each((i, el) => {
      if (articles.length >= 8) return;

      const titleLink = $(el).find('h1 a, h2 a, h3 a, h4 a, .title a, a.js-stream-content-link, a.js-content-title, a[data-share-link]').first();
      let title = '';
      let rawHref = '';

      if (titleLink.length > 0) {
        title = titleLink.text().replace(/\s+/g, ' ').trim();
        rawHref = titleLink.attr('data-share-link') || titleLink.attr('href') || '';
      } else {
        const heading = $(el).find('h1, h2, h3, h4, .title, .js-stream-item-title').first();
        title = heading.text().replace(/\s+/g, ' ').trim();
        rawHref = $(el).find('a').attr('href') || '';
      }

      const summary = $(el).find('p.summary, .stream-summary, p.deck, p.description, p')
        .not('header p, footer p')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      const source = $(el).find('.source, .byline, .author, .Fz\\(11px\\)').first().text().replace(/\s+/g, ' ').trim() || targetConfig.defaultSource;
      const normTitle = title.toLowerCase();

      if (!isGarbage(title) && rawHref && !rawHref.startsWith('#') && !seenTitles.has(normTitle)) {
        seenTitles.add(normTitle);
        articles.push({
          id: `art-${i}`,
          title,
          summary: summary || 'Archival wire dispatch recorded from transmission carrier.',
          source,
          category,
          archiveUrl: buildWaybackUrl(rawHref, selectedOrigin, validSnapshot.timestamp, docBase),
        });
      }
    });

    // Strategy 2: Pre-2010 Table Anchors Fallback
    if (articles.length < 3) {
      $('h1 a, h2 a, h3 a, h4 a, dt a, td.story a, td.news a, .headline a, b a').each((i, el) => {
        if (articles.length >= 8) return;

        const rawHref = $(el).attr('href') || '';
        const title = $(el).text().replace(/\s+/g, ' ').trim();
        const normTitle = title.toLowerCase();

        if (isGarbage(title) || !rawHref || rawHref.startsWith('#') || seenTitles.has(normTitle)) {
          return;
        }

        const parentCell = $(el).closest('p, td, li, dd');
        let summary = '';
        if (parentCell.length > 0) {
          summary = parentCell.clone().children('a, script, style, b, h1, h2, h3, h4').remove().end().text().replace(/\s+/g, ' ').trim();
          if (summary.length > 250) summary = summary.slice(0, 250) + '...';
        }

        const nearbySource = parentCell.find('.source, .byline, font[size="-2"]').text().replace(/\s+/g, ' ').trim();

        seenTitles.add(normTitle);
        articles.push({
          id: `art-s2-${i}`,
          title,
          summary: summary || 'Historical catalog record.',
          source: nearbySource || targetConfig.defaultSource,
          category,
          archiveUrl: buildWaybackUrl(rawHref, selectedOrigin, validSnapshot.timestamp, docBase),
        });
      });
    }

    if (articles.length === 0) {
      articles.push({
        id: 'art-fallback',
        title: `Historical Spectrum Dispatch: ${category.toUpperCase()} on ${targetYear}-${mm}-${dd}`,
        summary: `Preserved record frequency captured for ${selectedOrigin}.`,
        source: targetConfig.defaultSource,
        category,
        archiveUrl: rawSnapshotUrl,
      });
    }

    // 3. Assemble Sanitized Wire Dossier
    const contextDossier = articles
      .map((a, i) => `[DISPATCH ${i + 1}]
OUTLET: ${a.source}
HEADLINE: ${a.title}
SUMMARY: ${a.summary}`)
      .join('\n\n')
      .replace(/murder(ed)?|kill(ed)?|sexual(ly)?/gi, 'incident');

    // 4. Gemma Direct-Command Prompt (Forbids outlines, thought logs, and checklists)
    const promptCfg = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.general;
    const prompt = `You are ${promptCfg.persona}

You are broadcasting LIVE on Time-Capsule Radio across the ${targetYear} MHz band.
Today's calendar date: Month ${mm}, Day ${dd}, Year ${targetYear}.

DISPATCHES RECORDED TODAY:
"""
${contextDossier}
"""

YOUR INSTRUCTIONS:
Speak directly to your listeners in a continuous, fast-paced 3-paragraph radio broadcast.
- Open immediately with an energetic station call-in, stating the date (${targetYear}-${mm}-${dd}) and frequency (${targetYear} MHz).
- Report on 2 to 3 of the dispatches with vivid detail, quoting names, devices, controversies, and figures with period authenticity.
- Compare those past expectations with how the world actually turned out in our present year 2026.
- Sign off cleanly as the carrier wave fades.

MANDATORY RULES:
- Output ONLY the spoken words.
- Do NOT include section titles, paragraph labels, bullet points, checklists, outlines, or thought notes.
- Do NOT wrap paragraphs in quotation marks.
- Do NOT write parenthetical comments.
- Start directly with your first spoken word.`;

    const modelName = process.env.GEMMA_MODEL || 'gemma-2-27b-it';
    let rawText = '';

    try {
      const gemmaResponse = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 900,
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any },
          ],
        },
      });

      const candidate = gemmaResponse.candidates?.[0];
      const partText = candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('\n');
      rawText = gemmaResponse.text || partText || '';
    } catch {
      try {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { temperature: 0.65, maxOutputTokens: 800 },
        });
        rawText = fallbackRes.text || '';
      } catch {}
    }

    let broadcastScript = cleanBroadcastScript(rawText);

    if (!broadcastScript) {
      broadcastScript = `Hey everyone, you're locked into Time-Capsule Radio, dialing right back to ${targetYear}-${mm}-${dd} on the ${category.toUpperCase()} band! Today's wire is packed with news: ${articles[0]?.title || 'major events'} is dominating conversations everywhere. Looking back at all of this from 2026, it's wild to see how confident everyone was about the future! Catch you on the next sweep across the dial!`;
    }

    return NextResponse.json({
      success: true,
      year: targetYear,
      category,
      anchorDate: `${targetYear}-${mm}-${dd}`,
      snapshotTimestamp: validSnapshot.timestamp,
      snapshotOrigin: selectedOrigin,
      articles,
      broadcastScript,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Transmission failed.' }, { status: 500 });
  }
}