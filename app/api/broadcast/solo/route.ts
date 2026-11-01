import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
});

function cleanSoloScript(raw: string): string {
  if (!raw) return '';

  let text = raw.replace(
    /^[\s\S]*?(?=(?:Here's|Here is|Turning to|Special bulletin|Breaking down|Diving into|Let's talk about|In our top story|Focusing on|This just in))/i,
    ''
  );

  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Remove checklist lines
    if (/^[-*•]?\s*(?:[A-Za-z0-9\s/()\-]+)\?\s*(?:Yes|No|Met|True|False)\.?$/i.test(trimmed)) {
      continue;
    }
    if (/^[-*•]?\s*(?:Check|Checklist|Audit|Verification|Criteria):\s*/i.test(trimmed)) {
      continue;
    }

    // Remove outline headings
    if (/^[-*•#\s]*(?:Headline|Paragraph|Opening|Summary|Sign-off|Directive|Task)(?:\*|#|\s|:|-)*$/i.test(trimmed)) {
      continue;
    }

    // Remove standalone parentheticals
    if (/^\(.*\)$/.test(trimmed)) {
      continue;
    }

    trimmed = trimmed.replace(/\((?:Since|Looking back|In reality|Focusing|Needs to be|Note)[^)]*\)/gi, '').trim();
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
    const { archiveUrl, title, summary, source, category = 'general' } = body;

    if (!archiveUrl) {
      return NextResponse.json(
        { error: 'Missing archive URL for solo inspection.' },
        { status: 400 }
      );
    }

    // Resolve target year strictly from payload or URL timestamp
    let targetYear = parseInt(body.year, 10);
    if (isNaN(targetYear)) {
      const match = archiveUrl.match(/\/web\/(\d{4})/);
      if (match && match[1]) {
        targetYear = parseInt(match[1], 10);
      }
    }

    if (isNaN(targetYear) || targetYear < 1996 || targetYear > 2025) {
      return NextResponse.json(
        { error: 'A valid archival year between 1996 and 2025 must be supplied or embedded in the archive URL.' },
        { status: 400 }
      );
    }

    // Force id_ flag to extract raw HTML
    let rawSnapshotUrl = archiveUrl;
    if (archiveUrl.includes('web.archive.org/web/')) {
      rawSnapshotUrl = archiveUrl.replace(
        /\/web\/(\d+)(?:\/|id_\/)/,
        '/web/$1id_/'
      );
    }

    let extractedBodyText = '';

    try {
      const pageRes = await fetch(rawSnapshotUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
        signal: AbortSignal.timeout(9000),
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const $ = cheerio.load(html);

        $('script, style, noscript, nav, header, footer, iframe, aside, .ad, .advertisement, #header, #footer, .sidebar, .comments').remove();

        const paragraphs: string[] = [];
        $('article p, .article-body p, .story-body p, .entry-content p, .post-content p, main p, td p, p').each((_, el) => {
          const text = $(el).text().replace(/\s+/g, ' ').trim();
          if (
            text.length > 35 &&
            !text.toLowerCase().includes('copyright') &&
            !text.toLowerCase().includes('all rights reserved')
          ) {
            paragraphs.push(text);
          }
        });

        extractedBodyText = paragraphs.slice(0, 10).join('\n\n');
      }
    } catch (fetchErr) {
      console.warn('Direct article crawl timed out or failed, falling back to recorded snippet:', fetchErr);
    }

    const articlePayload = extractedBodyText && extractedBodyText.length > 120
      ? extractedBodyText.slice(0, 3500)
      : `${title}. ${summary || 'Full wire text archived in historical sector.'}`;

    // Direct, conversational prompt with strict output boundaries
    const prompt = `You are an articulate, sharp-witted broadcaster on Time-Capsule Radio delivering a SPECIAL SOLO WIRE BULLETIN.
Target Band: ${category.toUpperCase()} // Frequency: ${targetYear} MHz
Original Source: ${source || 'Historical Wire'}
Article Headline: ${title}

Article Body & Excerpt:
"""
${articlePayload}
"""

YOUR INSTRUCTIONS:
Deliver a focused, fast-paced radio feature (approx 110–140 words).
- Open with a lively radio lead-in ("Here is an in-depth bulletin from the wire...", "Let's dive deeper into this dispatch...").
- Report the critical facts, specific quotes, numbers, or controversies from the article.
- Conclude with a sharp, ironic 2026 retrospective comparing their expectations with modern reality.

MANDATORY RULES:
- Output ONLY the spoken words.
- Do NOT include section titles, paragraph labels, bullet points, checklists, outlines, or thought notes.
- Do NOT wrap text in quotation marks.
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
          maxOutputTokens: 600,
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
      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.65, maxOutputTokens: 500 },
      });
      rawText = fallbackRes.text || '';
    }

    let soloScript = cleanSoloScript(rawText);

    if (!soloScript) {
      soloScript = `Here is a deeper look at ${title}. Preserved dispatches reveal how significant this moment was at the time. Looking back from 2026, the gap between what everyone expected and where reality actually led us remains astonishing.`;
    }

    return NextResponse.json({
      success: true,
      year: targetYear,
      category,
      title,
      source: source || 'Archival Wire',
      soloScript,
      articleBody: articlePayload, // Full extracted text from the Wayback Machine
      archiveUrl: rawSnapshotUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Solo dispatch extraction failed.' }, { status: 500 });
  }
}