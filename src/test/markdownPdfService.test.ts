import { describe, it, expect } from 'vitest';
import {
  extractTableOfContents,
  calculateReadingStats,
  resolveMarkdownAssets,
  compileMarkdownToHtml,
} from '../services/markdownPdfService';
import type { MarkdownAsset } from '../types/pdf';

describe('markdownPdfService - Core Utilities', () => {
  describe('extractTableOfContents', () => {
    it('extracts H1, H2, H3 headings with correct levels and titles', () => {
      const markdown = `
# Executive Summary
Some intro text.
## Architecture Overview
Details here.
### Storage & Cache Engine
Sub-details.
#### Edge Cases
Deep edge details.
`;
      const toc = extractTableOfContents(markdown);
      expect(toc).toHaveLength(4);
      expect(toc[0]).toEqual({ id: 'executive-summary', title: 'Executive Summary', level: 1 });
      expect(toc[1]).toEqual({ id: 'architecture-overview', title: 'Architecture Overview', level: 2 });
      expect(toc[2]).toEqual({ id: 'storage-cache-engine', title: 'Storage & Cache Engine', level: 3 });
      expect(toc[3]).toEqual({ id: 'edge-cases', title: 'Edge Cases', level: 4 });
    });

    it('handles duplicate heading names by appending unique suffixes', () => {
      const markdown = `
## Configuration
First config.
## Configuration
Second config.
## Configuration
Third config.
`;
      const toc = extractTableOfContents(markdown);
      expect(toc).toHaveLength(3);
      expect(toc[0].id).toBe('configuration');
      expect(toc[1].id).toBe('configuration-2');
      expect(toc[2].id).toBe('configuration-3');
    });

    it('strips markdown formatting like bold, italic, and backticks from heading titles', () => {
      const markdown = `
# **High-DPI** *Rendering* & \`pdfjs-dist\`
`;
      const toc = extractTableOfContents(markdown);
      expect(toc).toHaveLength(1);
      expect(toc[0].title).toBe('High-DPI Rendering & pdfjs-dist');
      expect(toc[0].id).toBe('high-dpi-rendering-pdfjs-dist');
    });

    it('returns empty array when no headings exist', () => {
      const markdown = 'Just regular paragraph content without any heading tags.';
      const toc = extractTableOfContents(markdown);
      expect(toc).toEqual([]);
    });
  });

  describe('calculateReadingStats', () => {
    it('calculates word count and estimated reading time accurately', () => {
      // 100 words text
      const words = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
      const markdown = `# Title\n\n${words}`;
      const stats = calculateReadingStats(markdown);

      // Title is stripped or counted as words
      expect(stats.wordCount).toBeGreaterThanOrEqual(100);
      expect(stats.readingTimeMinutes).toBe(1); // 100 words at 200 wpm = ceil(0.5) = 1 min
    });

    it('calculates reading time for larger documents (e.g. 500 words = 3 mins)', () => {
      const words = Array.from({ length: 500 }, (_, i) => `term${i}`).join(' ');
      const stats = calculateReadingStats(words);
      expect(stats.wordCount).toBe(500);
      expect(stats.readingTimeMinutes).toBe(3); // ceil(500 / 200) = 3
    });

    it('handles empty markdown strings gracefully', () => {
      const stats = calculateReadingStats('');
      expect(stats.wordCount).toBe(0);
      expect(stats.readingTimeMinutes).toBe(1); // min 1 min
      expect(stats.charCount).toBe(0);
    });
  });

  describe('resolveMarkdownAssets', () => {
    const mockAssets: MarkdownAsset[] = [
      {
        id: 'asset_diag_1',
        name: 'architecture_diagram.png',
        size: 1024,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        mimeType: 'image/png',
        createdAt: Date.now(),
      },
      {
        id: 'asset_sig_2',
        name: 'user_signature.jpg',
        size: 512,
        dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==',
        mimeType: 'image/jpeg',
        createdAt: Date.now(),
      },
    ];

    it('resolves asset:id references with base64 data URLs', () => {
      const markdown = '![Diagram](asset:asset_diag_1)';
      const resolved = resolveMarkdownAssets(markdown, mockAssets);
      expect(resolved).toBe('![Diagram](data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==)');
    });

    it('resolves asset:filename references with base64 data URLs', () => {
      const markdown = '![Architecture](asset:architecture_diagram.png)';
      const resolved = resolveMarkdownAssets(markdown, mockAssets);
      expect(resolved).toBe('![Architecture](data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==)');
    });

    it('resolves direct filename references', () => {
      const markdown = '![Signature](user_signature.jpg)';
      const resolved = resolveMarkdownAssets(markdown, mockAssets);
      expect(resolved).toBe('![Signature](data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==)');
    });

    it('preserves other markdown content untouched', () => {
      const markdown = '# Report\nStandard text with no image links.';
      const resolved = resolveMarkdownAssets(markdown, mockAssets);
      expect(resolved).toBe(markdown);
    });
  });

  describe('compileMarkdownToHtml', () => {
    it('compiles headings with attached anchor IDs matching slug format', () => {
      const markdown = '# System Overview\n## Core Pillars';
      const html = compileMarkdownToHtml(markdown, []);
      expect(html).toContain('<h1 id="system-overview">System Overview</h1>');
      expect(html).toContain('<h2 id="core-pillars">Core Pillars</h2>');
    });

    it('compiles GitHub-flavored markdown tables with proper headers and data rows', () => {
      const markdown = `
| Service | Status | Latency |
| :--- | :--- | :--- |
| PDF Renderer | Ready | 12ms |
| Diff Engine | Ready | 18ms |
`;
      const html = compileMarkdownToHtml(markdown, []);
      expect(html).toContain('<table>');
      expect(html).toContain('Service</th>');
      expect(html).toContain('Status</th>');
      expect(html).toContain('PDF Renderer</td>');
      expect(html).toContain('12ms</td>');
    });

    it('compiles bold, italics, blockquotes, and code blocks', () => {
      const markdown = `
> Critical Architecture Note

**Paprbndr** is *100% client-side*.

\`\`\`typescript
const buffer = await getBuffer(id);
\`\`\`
`;
      const html = compileMarkdownToHtml(markdown, []);
      expect(html).toContain('<blockquote>');
      expect(html).toContain('Critical Architecture Note');
      expect(html).toContain('<strong>Paprbndr</strong>');
      expect(html).toContain('<em>100% client-side</em>');
      expect(html).toContain('<pre><code class="language-typescript">');
    });
  });
});
