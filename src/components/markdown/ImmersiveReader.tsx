import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setActiveTab, setNotification } from '../../store/uiSlice';
import { addDocuments } from '../../store/documentsSlice';
import { updateReadingSettings } from '../../store/markdownSlice';
import {
  compileMarkdownToHtml,
  generatePdfFromMarkdown,
  printMarkdownDocument,
} from '../../services/markdownPdfService';
import { downloadBlob, renderPageThumbnail } from '../../services/pdfService';
import { getBuffer } from '../../services/bufferRegistry';
import type { DocumentItem } from '../../types/pdf';
import {
  Download,
  Files,
  Printer,
  Loader2,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Edit3,
  FileText,
  Bookmark,
} from 'lucide-react';

interface ImmersiveReaderProps {
  onHeadingChange?: (id: string) => void;
}

export const ImmersiveReader: React.FC<ImmersiveReaderProps> = ({ onHeadingChange }) => {
  const dispatch = useAppDispatch();
  const { content, assets, readingSettings, exportSettings } = useAppSelector(
    (state) => state.markdown
  );

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportAction, setExportAction] = useState<string | null>(null);

  // Scroll progress & reading tracking
  const [scrollPercent, setScrollPercent] = useState<number>(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  // In-document text search
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compile base HTML with assets and heading IDs
  const rawCompiledHtml = useMemo(
    () => compileMarkdownToHtml(content, assets),
    [content, assets]
  );

  // Inject search highlight marks into HTML when searching
  const displayHtml = useMemo(() => {
    const q = searchQuery.trim();
    if (!isSearchOpen || !q) return rawCompiledHtml;

    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match text outside HTML tags
      const regex = new RegExp(`(?![^<]*>)(${escaped})`, 'gi');
      let idx = 0;
      return rawCompiledHtml.replace(regex, (match) => {
        const id = `reader-match-${idx}`;
        idx++;
        return `<mark class="reader-search-highlight ${idx - 1 === currentMatchIndex ? 'current' : ''}" id="${id}">${match}</mark>`;
      });
    } catch {
      return rawCompiledHtml;
    }
  }, [rawCompiledHtml, searchQuery, isSearchOpen, currentMatchIndex]);

  // Update match count when search query or content changes
  useEffect(() => {
    if (!isSearchOpen || !searchQuery.trim()) {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      return;
    }

    const matches = document.querySelectorAll('.reader-search-highlight');
    setTotalMatches(matches.length);
    if (currentMatchIndex >= matches.length) {
      setCurrentMatchIndex(0);
    }
  }, [displayHtml, isSearchOpen, searchQuery, currentMatchIndex]);

  // Scroll to active search match
  useEffect(() => {
    if (totalMatches > 0) {
      const activeEl = document.getElementById(`reader-match-${currentMatchIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, totalMatches]);

  // Track scroll percentage and active heading for Table of Contents
  const handleScroll = () => {
    const el = viewportRef.current;
    if (!el) return;

    const total = el.scrollHeight - el.clientHeight;
    const pct = total > 0 ? Math.min(100, Math.round((el.scrollTop / total) * 100)) : 0;
    setScrollPercent(pct);

    // Detect heading nearest top of viewport
    if (onHeadingChange) {
      const headings = el.querySelectorAll('h1, h2, h3, h4');
      const viewportTop = el.scrollTop;
      let activeId = '';

      for (let i = 0; i < headings.length; i++) {
        const h = headings[i] as HTMLElement;
        if (h.offsetTop <= viewportTop + 140) {
          activeId = h.id;
        } else {
          break;
        }
      }
      if (activeId) {
        onHeadingChange(activeId);
      }
    }
  };

  // Keyboard shortcut Ctrl+F / Cmd+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const handleNextMatch = () => {
    if (totalMatches <= 1) return;
    setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
  };

  const handlePrevMatch = () => {
    if (totalMatches <= 1) return;
    setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  };

  // Save raw markdown file directly
  const handleSaveMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const safeTitle = (exportSettings.title || 'document')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/(^-|-$)/g, '');
    downloadBlob(blob, `${safeTitle || 'document'}.md`);
    dispatch(
      setNotification({
        type: 'success',
        message: 'Saved markdown document to downloads.',
      })
    );
  };

  // Export PDF or Send to Merger directly without ejecting user from Markdown Reader
  const handleGeneratePdf = async (target: 'download' | 'merger') => {
    try {
      setIsExporting(true);
      setExportAction(target);

      const { blob, docId, totalPages, filename } = await generatePdfFromMarkdown({
        markdown: content,
        assets,
        exportSettings,
      });

      if (target === 'download') {
        downloadBlob(blob, filename);
        dispatch(
          setNotification({
            type: 'success',
            message: `Exported and downloaded "${filename}" (${totalPages} pages).`,
          })
        );
      } else if (target === 'merger') {
        const buffer = await getBuffer(docId);
        if (!buffer) throw new Error('PDF buffer missing from local memory');
        const pages = [];

        for (let p = 1; p <= totalPages; p++) {
          let thumb = '';
          try {
            thumb = await renderPageThumbnail(buffer, p, 0, 160);
          } catch {
            // fallback
          }
          pages.push({
            id: `${docId}_p${p}`,
            originalPageNumber: p,
            rotation: 0,
            isDeleted: false,
            thumbnailUrl: thumb,
          });
        }

        const newDoc: DocumentItem = {
          id: docId,
          name: filename,
          size: blob.size,
          totalPages,
          isExpanded: true,
          pages,
          createdAt: Date.now(),
          sourceType: 'markdown',
        };

        dispatch(addDocuments([newDoc]));
        dispatch(setActiveTab('merge'));
        dispatch(
          setNotification({
            type: 'success',
            message: `Sent "${filename}" to PDF Merge queue.`,
          })
        );
      }
    } catch (err) {
      console.error('PDF Generation failed:', err);
      dispatch(
        setNotification({
          type: 'error',
          message: 'Failed to generate PDF. Check console for details.',
        })
      );
    } finally {
      setIsExporting(false);
      setExportAction(null);
    }
  };

  return (
    <div className={`immersive-reader-container theme-${readingSettings.theme}`}>
      {/* Top Reading Progress Bar */}
      <div className="reader-progress-track">
        <div
          className="reader-progress-fill"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {/* In-Document Search Bar Overlay */}
      {isSearchOpen && (
        <div className="reader-search-overlay">
          <div className="reader-search-box">
            <Search size={15} style={{ color: 'var(--text-secondary)' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="reader-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find in document... (Esc to close)"
            />
            {searchQuery && (
              <span className="reader-search-count">
                {totalMatches > 0
                  ? `${currentMatchIndex + 1} of ${totalMatches}`
                  : '0 matches'}
              </span>
            )}
            <button
              type="button"
              className="btn-search-nav"
              onClick={handlePrevMatch}
              disabled={totalMatches <= 1}
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp size={15} />
            </button>
            <button
              type="button"
              className="btn-search-nav"
              onClick={handleNextMatch}
              disabled={totalMatches <= 1}
              title="Next match (Enter)"
            >
              <ChevronDown size={15} />
            </button>
            <button
              type="button"
              className="btn-search-close"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              title="Close search"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Fluid Document Reading Viewport */}
      <div
        ref={viewportRef}
        className="reader-scroll-viewport"
        onScroll={handleScroll}
      >
        <article
          className={`reader-article-content font-${readingSettings.fontFamily} size-${readingSettings.fontSize} width-${readingSettings.columnWidth}`}
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      </div>

      {/* Reader Floating Dock / Action Toolbar */}
      <div className="reader-floating-action-bar">
        {/* Reading Progress Chip */}
        <div className="reader-progress-chip" title="Current scroll progress">
          <Bookmark size={13} style={{ color: 'var(--accent-blue)' }} />
          <span>{scrollPercent}% Read</span>
        </div>

        <div className="action-bar-buttons">
          {/* In-Document Search Toggle */}
          <button
            type="button"
            className={`btn-reader-action ${isSearchOpen ? 'active' : ''}`}
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (!isSearchOpen) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }
            }}
            title="Search text in document (Ctrl+F)"
          >
            <Search size={14} />
            <span>Find</span>
          </button>

          {/* Quick Switch to Split / Editor */}
          {readingSettings.layout === 'reader-only' && (
            <button
              type="button"
              className="btn-reader-action"
              onClick={() => dispatch(updateReadingSettings({ layout: 'split' }))}
              title="Switch to Editor & Preview Studio"
            >
              <Edit3 size={14} />
              <span>Edit Document</span>
            </button>
          )}

          {/* Direct PDF Export */}
          <button
            type="button"
            className="btn-reader-action primary"
            onClick={() => handleGeneratePdf('download')}
            disabled={isExporting}
            title="Export high-DPI PDF document directly"
          >
            {isExporting && exportAction === 'download' ? (
              <Loader2 size={14} className="spinner" />
            ) : (
              <Download size={14} />
            )}
            <span>Export PDF</span>
          </button>

          {/* Direct Save Markdown */}
          <button
            type="button"
            className="btn-reader-action"
            onClick={handleSaveMarkdown}
            title="Save raw Markdown (.md) file"
          >
            <FileText size={14} />
            <span>Save .md</span>
          </button>

          {/* Vector Print */}
          <button
            type="button"
            className="btn-reader-action"
            onClick={printMarkdownDocument}
            title="Print or Save as Vector PDF via browser print"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>

          {/* Send to PDF Merger */}
          <button
            type="button"
            className="btn-reader-action"
            onClick={() => handleGeneratePdf('merger')}
            disabled={isExporting}
            title="Send compiled PDF to Merge queue to combine with other files"
          >
            {isExporting && exportAction === 'merger' ? (
              <Loader2 size={14} className="spinner" />
            ) : (
              <Files size={14} />
            )}
            <span>Merge Queue</span>
          </button>
        </div>
      </div>
    </div>
  );
};

