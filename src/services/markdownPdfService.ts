import { marked } from 'marked';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import type { MarkdownAsset, PdfExportSettings } from '../types/pdf';
import { generateId } from './pdfService';
import { setBuffer } from './bufferRegistry';

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export interface ReadingStats {
  wordCount: number;
  charCount: number;
  readingTimeMinutes: number;
}

/**
 * Configure marked options for clean GitHub-flavored markdown
 */
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Replace asset references (asset:id or asset:filename) with actual base64 data URLs
 */
export function resolveMarkdownAssets(
  markdown: string,
  assets: MarkdownAsset[]
): string {
  let resolved = markdown;

  assets.forEach((asset) => {
    // Replace ![alt](asset:id)
    const idRegex = new RegExp(`!\\[(.*?)\\]\\(asset:${asset.id}\\)`, 'g');
    resolved = resolved.replace(idRegex, `![$1](${asset.dataUrl})`);

    // Replace ![alt](asset:filename)
    const safeName = asset.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`!\\[(.*?)\\]\\(asset:${safeName}\\)`, 'g');
    resolved = resolved.replace(nameRegex, `![$1](${asset.dataUrl})`);

    // Also replace standalone filename if referenced directly: ![alt](filename)
    const directRegex = new RegExp(`!\\[(.*?)\\]\\(${safeName}\\)`, 'g');
    resolved = resolved.replace(directRegex, `![$1](${asset.dataUrl})`);
  });

  return resolved;
}

/**
 * Extract outline / Table of Contents from markdown headings
 */
export function extractTableOfContents(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const toc: TocItem[] = [];
  const slugCounts: Record<string, number> = {};

  lines.forEach((line) => {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const rawTitle = headingMatch[2].trim().replace(/[*_`#]/g, '');
      
      // Generate clean slug
      let slug = rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      if (!slug) slug = `heading-${toc.length + 1}`;

      if (slugCounts[slug]) {
        slugCounts[slug] += 1;
        slug = `${slug}-${slugCounts[slug]}`;
      } else {
        slugCounts[slug] = 1;
      }

      toc.push({
        id: slug,
        title: rawTitle,
        level,
      });
    }
  });

  return toc;
}

/**
 * Calculate reading statistics (word count, reading time)
 */
export function calculateReadingStats(markdown: string): ReadingStats {
  const cleanText = markdown
    .replace(/^#+\s+/gm, '') // Remove heading markers
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Extract link text
    .replace(/[`*_~>]/g, '') // Remove formatting markers
    .trim();

  const charCount = cleanText.length;
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  // Average reading speed: 200 words per minute
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    wordCount,
    charCount,
    readingTimeMinutes,
  };
}

/**
 * Compile markdown to styled HTML with anchor IDs on headings
 */
export function compileMarkdownToHtml(
  markdown: string,
  assets: MarkdownAsset[]
): string {
  const resolvedMarkdown = resolveMarkdownAssets(markdown, assets);
  const rawHtml = marked.parse(resolvedMarkdown) as string;

  // Post-process HTML to attach IDs to headings for smooth TOC navigation
  let headingIndex = 0;
  const slugCounts: Record<string, number> = {};

  const htmlWithIds = rawHtml.replace(
    /<h([1-4])>(.*?)<\/h\1>/gi,
    (_match, level, text) => {
      headingIndex++;
      const plainText = text.replace(/<[^>]+>/g, '').trim();
      let slug = plainText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      if (!slug) slug = `heading-${headingIndex}`;
      if (slugCounts[slug]) {
        slugCounts[slug] += 1;
        slug = `${slug}-${slugCounts[slug]}`;
      } else {
        slugCounts[slug] = 1;
      }

      return `<h${level} id="${slug}">${text}</h${level}>`;
    }
  );

  return htmlWithIds;
}

/**
 * Generate a client-side PDF document using pdf-lib and register in bufferRegistry
 */
export async function generatePdfFromMarkdown(options: {
  markdown: string;
  assets: MarkdownAsset[];
  exportSettings: PdfExportSettings;
}): Promise<{
  blob: Blob;
  docId: string;
  totalPages: number;
  filename: string;
}> {
  const { markdown, assets, exportSettings } = options;
  const pdfDoc = await PDFDocument.create();

  // Set document metadata
  pdfDoc.setTitle(exportSettings.title || 'Paprbndr Markdown Document');
  pdfDoc.setAuthor('Paprbndr Studio');
  pdfDoc.setCreator('Paprbndr Modern PDF Studio');
  pdfDoc.setCreationDate(new Date());

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  // Determine page dimensions
  const baseSize = exportSettings.pageSize === 'Letter' ? PageSizes.Letter : PageSizes.A4;
  const isLandscape = exportSettings.orientation === 'landscape';
  const pageWidth = isLandscape ? baseSize[1] : baseSize[0];
  const pageHeight = isLandscape ? baseSize[0] : baseSize[1];

  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const footerHeight = 40;
  const headerHeight = exportSettings.includeHeader ? 40 : 20;
  const maxY = pageHeight - headerHeight;
  const minY = margin + footerHeight;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = maxY;
  let pageNumber = 1;

  const checkNewPage = (neededHeight: number) => {
    if (currentY - neededHeight < minY) {
      drawFooter(currentPage, pageNumber);
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pageNumber++;
      currentY = maxY;
      drawHeader(currentPage);
    }
  };

  const drawHeader = (page: typeof currentPage) => {
    if (!exportSettings.includeHeader) return;
    page.drawText(exportSettings.title || 'Paprbndr Document', {
      x: margin,
      y: pageHeight - 30,
      size: 8,
      font: fontHelveticaBold,
      color: rgb(0.4, 0.45, 0.5),
    });
    page.drawLine({
      start: { x: margin, y: pageHeight - 34 },
      end: { x: pageWidth - margin, y: pageHeight - 34 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });
  };

  const drawFooter = (page: typeof currentPage, pageNum: number) => {
    // Footer divider line
    page.drawLine({
      start: { x: margin, y: margin + 20 },
      end: { x: pageWidth - margin, y: margin + 20 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });

    // Branding on bottom left
    page.drawText('Paprbndr Studio • 100% Client-Side PDF', {
      x: margin,
      y: margin + 8,
      size: 8,
      font: fontHelvetica,
      color: rgb(0.5, 0.55, 0.6),
    });

    if (exportSettings.includePageNumbers) {
      const pageStr = `Page ${pageNum}`;
      const width = fontHelvetica.widthOfTextAtSize(pageStr, 8);
      page.drawText(pageStr, {
        x: pageWidth - margin - width,
        y: margin + 8,
        size: 8,
        font: fontHelveticaBold,
        color: rgb(0.3, 0.35, 0.4),
      });
    }
  };

  // Draw first page header
  drawHeader(currentPage);

  // Clean lines for layout
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Check for image syntax: ![alt](asset:...) or ![alt](data:...)
    const imgMatch = rawLine.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      const src = imgMatch[2];
      const targetAsset = assets.find(
        (a) => a.id === src.replace('asset:', '') || a.name === src.replace('asset:', '') || src.startsWith('data:')
      );

      if (targetAsset || src.startsWith('data:image/')) {
        const dataUrl = targetAsset ? targetAsset.dataUrl : src;
        try {
          // Embed image into pdf-lib
          const isPng = dataUrl.includes('image/png');
          const base64Data = dataUrl.split(',')[1];
          if (base64Data) {
            const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const embeddedImage = isPng
              ? await pdfDoc.embedPng(imageBytes)
              : await pdfDoc.embedJpg(imageBytes);

            // Scale to fit content width nicely
            const maxImgHeight = 220;
            const aspect = embeddedImage.width / embeddedImage.height;
            let displayW = Math.min(contentWidth, embeddedImage.width * 0.5);
            let displayH = displayW / aspect;

            if (displayH > maxImgHeight) {
              displayH = maxImgHeight;
              displayW = displayH * aspect;
            }

            checkNewPage(displayH + 20);
            currentPage.drawImage(embeddedImage, {
              x: margin + (contentWidth - displayW) / 2,
              y: currentY - displayH,
              width: displayW,
              height: displayH,
            });

            currentY -= displayH + 16;
            continue;
          }
        } catch (err) {
          console.warn('Could not embed image asset into PDF:', err);
        }
      }
    }

    // Heading 1
    if (rawLine.startsWith('# ')) {
      const text = rawLine.replace('# ', '').trim();
      checkNewPage(38);
      currentY -= 10;
      currentPage.drawText(text, {
        x: margin,
        y: currentY,
        size: 20,
        font: fontHelveticaBold,
        color: rgb(0.06, 0.09, 0.16),
      });
      currentY -= 24;
      continue;
    }

    // Heading 2
    if (rawLine.startsWith('## ')) {
      const text = rawLine.replace('## ', '').trim();
      checkNewPage(30);
      currentY -= 8;
      currentPage.drawText(text, {
        x: margin,
        y: currentY,
        size: 14,
        font: fontHelveticaBold,
        color: rgb(0.12, 0.16, 0.24),
      });
      currentY -= 18;
      continue;
    }

    // Heading 3
    if (rawLine.startsWith('### ')) {
      const text = rawLine.replace('### ', '').trim();
      checkNewPage(24);
      currentY -= 6;
      currentPage.drawText(text, {
        x: margin,
        y: currentY,
        size: 11,
        font: fontHelveticaBold,
        color: rgb(0.2, 0.25, 0.35),
      });
      currentY -= 15;
      continue;
    }

    // Horizontal Rule
    if (rawLine.trim() === '---' || rawLine.trim() === '***') {
      checkNewPage(18);
      currentY -= 6;
      currentPage.drawLine({
        start: { x: margin, y: currentY },
        end: { x: pageWidth - margin, y: currentY },
        thickness: 0.75,
        color: rgb(0.85, 0.88, 0.92),
      });
      currentY -= 14;
      continue;
    }

    // Blockquote
    if (rawLine.startsWith('> ')) {
      const quoteText = rawLine.replace('> ', '').trim();
      checkNewPage(22);
      currentPage.drawLine({
        start: { x: margin, y: currentY + 10 },
        end: { x: margin, y: currentY - 4 },
        thickness: 2.5,
        color: rgb(0.15, 0.39, 0.92),
      });
      currentPage.drawText(quoteText, {
        x: margin + 12,
        y: currentY,
        size: 9.5,
        font: fontHelveticaOblique,
        color: rgb(0.25, 0.3, 0.4),
      });
      currentY -= 16;
      continue;
    }

    // Code block line / mono
    if (rawLine.startsWith('    ') || rawLine.startsWith('```')) {
      if (rawLine.startsWith('```')) continue;
      checkNewPage(16);
      currentPage.drawRectangle({
        x: margin,
        y: currentY - 2,
        width: contentWidth,
        height: 14,
        color: rgb(0.95, 0.96, 0.98),
      });
      currentPage.drawText(rawLine.trim(), {
        x: margin + 8,
        y: currentY,
        size: 8.5,
        font: fontCourier,
        color: rgb(0.1, 0.15, 0.25),
      });
      currentY -= 16;
      continue;
    }

    // Standard paragraph or empty line
    if (rawLine.trim() === '') {
      currentY -= 8;
      continue;
    }

    // Wrap regular body text cleanly
    const fontSize = 9.5;
    const lineHeight = 14;
    const words = rawLine.split(' ');
    let currentLine = '';

    for (let w = 0; w < words.length; w++) {
      const testLine = currentLine ? `${currentLine} ${words[w]}` : words[w];
      const width = fontHelvetica.widthOfTextAtSize(testLine, fontSize);

      if (width > contentWidth && currentLine) {
        checkNewPage(lineHeight);
        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: fontHelvetica,
          color: rgb(0.15, 0.2, 0.28),
        });
        currentY -= lineHeight;
        currentLine = words[w];
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      checkNewPage(lineHeight);
      currentPage.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: fontHelvetica,
        color: rgb(0.15, 0.2, 0.28),
      });
      currentY -= lineHeight;
    }
  }

  // Draw final page footer
  drawFooter(currentPage, pageNumber);

  // Serialize to Uint8Array
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const docId = generateId();

  // Register in bufferRegistry so Paprbndr Viewer and Merger can access it in-RAM immediately
  setBuffer(docId, blob);

  const safeTitle = (exportSettings.title || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const filename = `${safeTitle || 'markdown-document'}.pdf`;

  return {
    blob,
    docId,
    totalPages: pageNumber,
    filename,
  };
}

/**
 * Trigger native browser print for high-fidelity vector PDF export
 */
export function printMarkdownDocument(): void {
  window.print();
}
