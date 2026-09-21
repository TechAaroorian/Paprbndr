import { marked } from 'marked';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import html2canvas from 'html2canvas';
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
 * Generate a client-side high-DPI PDF document from Markdown HTML using html2canvas & pdf-lib
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

  // Determine page dimensions
  const baseSize = exportSettings.pageSize === 'Letter' ? PageSizes.Letter : PageSizes.A4;
  const isLandscape = exportSettings.orientation === 'landscape';
  const pageWidth = isLandscape ? baseSize[1] : baseSize[0];
  const pageHeight = isLandscape ? baseSize[0] : baseSize[1];

  const marginX = 36;
  const marginTop = exportSettings.includeHeader ? 40 : 28;
  const marginBottom = 36;
  const contentW = pageWidth - marginX * 2;
  const contentH = pageHeight - marginTop - marginBottom;

  // Compile full HTML with assets and heading IDs
  const compiledHtml = compileMarkdownToHtml(markdown, assets);

  // Create off-screen A4 container with crisp report styling
  const container = document.createElement('div');
  container.className = 'markdown-pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.minHeight = '1123px';
  container.style.padding = '44px 48px';
  container.style.boxSizing = 'border-box';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.fontSize = '14px';
  container.style.lineHeight = '1.65';
  container.style.zIndex = '-9999';

  container.innerHTML = `
    <div class="pdf-export-content-wrapper">
      ${compiledHtml}
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for all images inside container to load before capturing
    const imgElements = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgElements.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );

    // Render container to master high-DPI canvas (2x Retina scaling)
    const masterCanvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // In canvas coordinates, each PDF page content slice height corresponds to:
    const sliceHeight = masterCanvas.width * (contentH / contentW);
    const totalPages = Math.max(1, Math.ceil(masterCanvas.height / sliceHeight));

    // Slice master canvas into individual PDF pages
    for (let p = 0; p < totalPages; p++) {
      const srcY = p * sliceHeight;
      const currSliceHeight = Math.min(sliceHeight, masterCanvas.height - srcY);

      // Create a slice canvas for this page
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = masterCanvas.width;
      sliceCanvas.height = sliceHeight;
      const sliceCtx = sliceCanvas.getContext('2d');
      if (sliceCtx) {
        // Fill white background
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        // Draw the slice
        sliceCtx.drawImage(
          masterCanvas,
          0,
          srcY,
          masterCanvas.width,
          currSliceHeight,
          0,
          0,
          masterCanvas.width,
          currSliceHeight
        );
      }

      const sliceDataUrl = sliceCanvas.toDataURL('image/png');
      const base64Data = sliceDataUrl.split(',')[1];
      const sliceBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const embeddedPng = await pdfDoc.embedPng(sliceBytes);

      const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

      // Draw running header if enabled
      if (exportSettings.includeHeader) {
        pdfPage.drawText(exportSettings.title || 'Paprbndr Document', {
          x: marginX,
          y: pageHeight - 24,
          size: 8,
          font: fontHelveticaBold,
          color: rgb(0.35, 0.4, 0.48),
        });
        pdfPage.drawLine({
          start: { x: marginX, y: pageHeight - 28 },
          end: { x: pageWidth - marginX, y: pageHeight - 28 },
          thickness: 0.5,
          color: rgb(0.85, 0.88, 0.92),
        });
      }

      // Draw rendered content slice
      pdfPage.drawImage(embeddedPng, {
        x: marginX,
        y: marginBottom,
        width: contentW,
        height: contentH,
      });

      // Draw running footer divider
      pdfPage.drawLine({
        start: { x: marginX, y: 26 },
        end: { x: pageWidth - marginX, y: 26 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.92),
      });

      // Branding on footer
      pdfPage.drawText('Paprbndr Studio • 100% Client-Side PDF', {
        x: marginX,
        y: 16,
        size: 7.5,
        font: fontHelvetica,
        color: rgb(0.5, 0.55, 0.6),
      });

      // Running page number
      if (exportSettings.includePageNumbers) {
        const pageStr = `Page ${p + 1} of ${totalPages}`;
        const width = fontHelvetica.widthOfTextAtSize(pageStr, 7.5);
        pdfPage.drawText(pageStr, {
          x: pageWidth - marginX - width,
          y: 16,
          size: 7.5,
          font: fontHelveticaBold,
          color: rgb(0.3, 0.35, 0.4),
        });
      }
    }

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
      totalPages,
      filename,
    };
  } finally {
    // Clean up offscreen container
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}


/**
 * Trigger native browser print for high-fidelity vector PDF export
 */
export function printMarkdownDocument(): void {
  window.print();
}
