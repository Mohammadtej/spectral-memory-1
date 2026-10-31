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

// Category-specific journalistic personas and instructions
const CATEGORY_PROMPTS: Record<string, { persona: string; tone: string; directive: string }> = {
  tech: {
    persona: 'The Silicon Phantom: an archival broadcast from the graveyard of obsolete hardware and early web dreams.',
    tone: 'Analytic, eerie, observant of technological hubris.',
    directive: 'Dissect the hardware specs, software releases, and digital predictions from this date. Provide an exhaustive contrast with the 2026 reality of pervasive agentic AI, closed platforms, and quantum computing.'
  },
  politics: {
    persona: 'The Electoral Specter: a midnight commentator broadcasting from closed backroom campaign rooms of the past.',
    tone: 'Cynical, dramatic, historically authoritative.',
    directive: 'Break down the legislative wars, election poll numbers, and political scandals dominating the airwaves on this day. Contrast them with the polarized political institutions and constitutional questions of 2026.'
  },
  world: {
    persona: 'The Global Shortwave Monitor: intercepting overseas teletype feeds and foreign ministry cables.',
    tone: 'Urgent, geopolitical, atmospheric.',
    directive: 'Report the international crises, border conflicts, peace treaties, or natural disasters across continents. Juxtapose these historical tremors with the current multipolar balance of power in 2026.'
  },
  finance: {
    persona: 'The Ticker Apparition: an economic voice transmitting from the abandoned pits of Wall Street.',
    tone: 'Frenetic, quantitative, sharp.',
    directive: 'Detail stock indices, inflation anxieties, company mergers, and economic bubbles reported on this date. Deliver a critique contrasting those past corporate titans with the multi-trillion dollar tech monopolies of 2026.'
  },
  sports: {
    persona: 'The Ghost in the Press Box: recounting legendary playoff nights and historic sports controversies.',
    tone: 'Passionate, nostalgic, storied.',
    directive: 'Relive the championship games, trade rumors, and prime athletic feats occurring on this calendar day. Reflect on how these athletes’ legacies and the sports industry were ultimately rewritten by 2026.'
  },
  general: {
    persona: 'The Frequency Wanderer: an omniscient archivist tapping into the cultural zeitgeist of the forgotten internet.',
    tone: 'Haunting, evocative, culturally immersive.',
    directive: 'Weave together the top news stories, bizarre viral curiosities, and everyday anxieties of this exact day. Paint a vivid contrast between what captivated society then versus human culture in 2026.'
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetYear = parseInt(body.year, 10);
    const category = (body.category || 'general').toLowerCase();

    if (isNaN(targetYear) || targetYear < 1996 || targetYear > 2025) {
      return NextResponse.json({ error: 'Please choose an archival year between 1996 and 2025.' }, { status: 400 });
    }

    // 1. Dynamic date calculation (Locks to TODAY'S calendar month & day)
    const now = new Date();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const targetTimestamp = `${targetYear}${mm}${dd}120000`;

    // 2. Multi-tier candidate URLs for high resilience
    const domainCandidates: Record<string, string[]> = {
      tech: ['http://www.yahoo.com/tech/', 'http://news.yahoo.com/tech/', 'http://dir.yahoo.com/Computers_and_Internet/', 'http://www.yahoo.com/'],
      politics: ['http://www.yahoo.com/news/politics/', 'http://news.yahoo.com/politics/', 'http://news.yahoo.com/', 'http://www.yahoo.com/'],
      world: ['http://www.yahoo.com/news/world/', 'http://news.yahoo.com/world/', 'http://news.yahoo.com/', 'http://www.yahoo.com/'],
      finance: ['http://finance.yahoo.com/', 'http://biz.yahoo.com/', 'http://www.yahoo.com/'],
      sports: ['http://sports.yahoo.com/', 'http://www.yahoo.com/'],
      general: ['http://www.yahoo.com/', 'http://news.yahoo.com/']
    };

    const targetList = domainCandidates[category] || domainCandidates.general;
    let validSnapshot: { url: string; timestamp: string } | null = null;
    let selectedOrigin = targetList[0];

    // Check availability across fallback endpoints
    for (const testUrl of targetList) {
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
        { error: `No carrier signal discovered for ${category.toUpperCase()} in ${targetYear} around this date.` },
        { status: 404 }
      );
    }

    // Request the raw HTML using the id_ modifier
    const rawSnapshotUrl = validSnapshot.url.replace(
      new RegExp(`(/web/${validSnapshot.timestamp})(/|id_/)`),
      `$1id_/`
    );

    const pageRes = await fetch(rawSnapshotUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = await pageRes.text();
    const $ = cheerio.load(html);

    const articles: ArchiveArticle[] = [];
    const blacklistWords = ['javascript', 'cookie', 'terms of service', 'privacy policy', 'yahoo!', 'sign in', 'log in', 'help', 'copyright', 'feedback', 'all rights reserved', 'skip to'];

    const isGarbage = (text: string) => {
      const lower = text.toLowerCase();
      return text.length < 18 || blacklistWords.some((w) => lower.includes(w));
    };

    // Strategy 1: Modern Stream Layouts (2014-2025)
    $('.js-stream-content, li[data-type="article"]').each((i, el) => {
      const title = $(el).find('.js-stream-item-title, h2, h3, .js-content-title').first().text().trim();
      const summary = $(el).find('.stream-summary, p').first().text().trim();
      const source = $(el).find('.Fz\\(11px\\).Tt\\(c\\), .source, span[data-cat-label]').first().text().trim() || 'Archival Wire';
      const relHref = $(el).find('a.js-stream-content-link, a').first().attr('href') || '';
      
      if (!isGarbage(title) && articles.length < 8) {
        articles.push({
          id: `art-${i}`,
          title,
          summary: summary || 'Full summary embedded in archived broadcast transmission.',
          source,
          category,
          archiveUrl: relHref.startsWith('http') ? relHref : `https://web.archive.org/web/${validSnapshot?.timestamp}/${relHref}`,
        });
      }
    });

    // Strategy 2: Pre-2014 News Blocks & Tables
    if (articles.length === 0) {
      $('table table tr, .news-item, .story').each((i, el) => {
        const titleEl = $(el).find('b a, a b, a.title, h3 a, h2 a').first();
        const title = titleEl.text().trim();
        const snippet = $(el).find('font[size="-1"], .summary, p').not(titleEl).text().trim();
        const relHref = titleEl.attr('href') || '';

        if (!isGarbage(title) && articles.length < 8) {
          articles.push({
            id: `art-${i}`,
            title,
            summary: snippet.slice(0, 220) || 'Archived wire summary from historical catalog.',
            source: 'Historical Directory',
            category,
            archiveUrl: relHref.startsWith('http') ? relHref : `https://web.archive.org/web/${validSnapshot?.timestamp}/${relHref}`,
          });
        }
      });
    }

    // Strategy 3: Universal Anchor Harvest Fallback (1996 - 2003 era)
    if (articles.length === 0) {
      $('a').each((i, el) => {
        const title = $(el).text().trim();
        const parentP = $(el).closest('p, td, li').text().trim();
        const relHref = $(el).attr('href') || '';

        if (!isGarbage(title) && title.length < 120 && articles.length < 8) {
          const summary = parentP.replace(title, '').trim();
          articles.push({
            id: `art-${i}`,
            title,
            summary: summary.slice(0, 180) || 'Historical transmission capture.',
            source: 'Archival Seed',
            category,
            archiveUrl: relHref.startsWith('http') ? relHref : `https://web.archive.org/web/${validSnapshot?.timestamp}/${relHref}`,
          });
        }
      });
    }

    // Guarantee against 0-length failure
    if (articles.length === 0) {
      articles.push({
        id: 'art-fallback',
        title: `Headline Dispatch from ${targetYear}: ${category.toUpperCase()} Spectrum Archive`,
        summary: `Preserved record frequency captured for ${selectedOrigin} on ${targetYear}-${mm}-${dd}.`,
        source: 'Public Web Archive',
        category,
        archiveUrl: rawSnapshotUrl,
      });
    }

    // 3. Assemble Rich Multi-Story Context Dossier
    const contextDossier = articles
      .map((a, i) => `[STORY ${i + 1}]
SOURCE: ${a.source}
HEADLINE: ${a.title}
RECORDED DETAILS: ${a.summary}`)
      .join('\n\n');

    // 4. Generate Comprehensive Audio Script via Gemma on Google AI Studio
    const promptCfg = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.general;
    const prompt = `You are ${promptCfg.persona}
BROADCAST SPECIFICATIONS:
- Station Frequency: ${targetYear} MHz
- Target Time: Current Day (Month: ${mm}, Day: ${dd}) in the year ${targetYear}.
- Atmospheric Tone: ${promptCfg.tone}

PRIMARY ARCHIVAL DOSSIER CAPTURED TODAY:
"""
${contextDossier}
"""

EDITORIAL DIRECTIVES:
1. ${promptCfg.directive}
2. Broadcast Structure (Provide comprehensive depth across 3 distinct paragraphs):
   - PROLOGUE: Spectral atmospheric station identification announcing the exact date (${targetYear}-${mm}-${dd}) and tuning band.
   - CHRONICLE: In-depth reporting on 3 of the stories above. Discuss the figures, specific claims, public expectations, and tensions of that moment in time.
   - 2026 PROPHECY CONTRAST: An incisive, philosophical critique contrasting their assumptions with how the world actually turned out in our present year 2026.
   - EPILOGUE: Radio sign-off as the transmission fades out.
3. OUTPUT ONLY the spoken word script. Do not output sound effects in brackets like [Radio static] or parentheticals. Write natural, flowing spoken prose.`;

    const modelName = process.env.GEMMA_MODEL || 'gemma-2-27b-it';
    const gemmaResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.72,
        maxOutputTokens: 1000,
      },
    });

    const broadcastScript = gemmaResponse.text || 'Static interference... transmission lost in the ether.';

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