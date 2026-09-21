import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setCurrentPage,
  setViewerDoc,
  toggleZenMode,
  setZenMode,
  prevPage,
  nextPage,
  zoomIn,
  zoomOut,
  setZoom,
} from '../../store/viewerSlice';
import { setActiveTab } from '../../store/uiSlice';
import { addDocuments } from '../../store/documentsSlice';
import { getBuffer } from '../../services/bufferRegistry';
import { createSamplePdf, parsePdfFile } from '../../services/pdfService';
import { ViewerToolbar } from './ViewerToolbar';
import { ThumbnailSidebar } from './ThumbnailSidebar';
import {
  FileUp,
  Sparkles,
  AlertCircle,
  FilePlus,
  Files,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  ZoomIn,
  ZoomOut,
  BookOpen,
} from 'lucide-react';

interface PageCanvasProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  rotation: number;
}

const PageCanvas: React.FC<PageCanvasProps> = ({
  pdfDoc,
  pageNumber,
  zoom,
  rotation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        // Cancel previous render task if active
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore
          }
          renderTaskRef.current = null;
        }

        const baseViewport = page.getViewport({ scale: 1.0, rotation });
        const dpr = window.devicePixelRatio || 1;
        const scale = zoom * dpr;
        const viewport = page.getViewport({ scale, rotation });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(baseViewport.width * zoom)}px`;
        canvas.style.height = `${Math.floor(baseViewport.height * zoom)}px`;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: unknown) {
        if (!isCancelled && err instanceof Error && err.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNumber} render failed:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, zoom, rotation]);

  return (
    <div
      id={`page-container-${pageNumber}`}
      className="page-canvas-wrapper"
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} className="pdf-page-canvas" />
      <div className="page-canvas-badge">Page {pageNumber}</div>
    </div>
  );
};

export const Viewer: React.FC = () => {
  const dispatch = useAppDispatch();
  const documents = useAppSelector((state) => state.documents.items);
  const {
    activeDocId,
    currentPage,
    totalPages,
    zoom,
    rotation,
    layoutMode,
    sidebarOpen,
    readingTheme,
    zenMode,
  } = useAppSelector((state) => state.viewer);

  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Listen for Escape key to exit Zen mode
  useEffect(() => {
    if (!zenMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch(setZenMode(false));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zenMode, dispatch]);

  // Synchronize activeDocId if null but documents exist
  useEffect(() => {
    if (!activeDocId && documents.length > 0) {
      dispatch(setViewerDoc({ docId: documents[0].id, totalPages: documents[0].totalPages }));
    }
  }, [activeDocId, documents, dispatch]);

  // Load PDF Document Proxy from binary buffer
  useEffect(() => {
    let isCancelled = false;
    let activeTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    if (!activeDocId) {
      setPdfProxy(null);
      return;
    }

    getBuffer(activeDocId).then((buffer) => {
      if (isCancelled) return;
      if (!buffer) {
        setLoadError('Document buffer not found in local memory.');
        return;
      }

      setLoadError(null);
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
        cMapPacked: true,
      });
      activeTask = loadingTask;

      loadingTask.promise
        .then((doc) => {
          if (!isCancelled) {
            setPdfProxy(doc);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('Failed to load PDF document', err);
            setLoadError('Failed to parse PDF document. It may be corrupted or protected.');
          }
        });
    });

    return () => {
      isCancelled = true;
      if (activeTask) {
        activeTask.destroy();
      }
    };
  }, [activeDocId]);

  // Handle scroll to page when thumbnail clicked from left navigation
  const handleScrollToPage = useCallback(
    (pageNum: number) => {
      dispatch(setCurrentPage(pageNum));
      if (layoutMode === 'continuous') {
        const pageEl = document.getElementById(`page-container-${pageNum}`);
        if (pageEl && viewportRef.current) {
          pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    },
    [layoutMode, dispatch]
  );

  // Handle Continuous scroll page tracking
  const handleViewportScroll = () => {
    if (layoutMode !== 'continuous' || !viewportRef.current || totalPages <= 1) return;

    const viewport = viewportRef.current;
    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenter = viewportRect.top + viewportRect.height / 3;

    let closestPage = currentPage;
    let minDistance = Infinity;

    for (let i = 1; i <= totalPages; i++) {
      const el = document.getElementById(`page-container-${i}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
          closestPage = i;
          break;
        }
        const dist = Math.abs(rect.top - viewportCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestPage = i;
        }
      }
    }

    if (closestPage !== currentPage) {
      dispatch(setCurrentPage(closestPage));
    }
  };

  const handleLoadSamples = async () => {
    try {
      const doc1 = await createSamplePdf('Quarterly_Financial_Report', 'Q1 Revenue & Margin Breakdown', 2, {
        r: 0.08,
        g: 0.25,
        b: 0.45,
      });
      const doc2 = await createSamplePdf('Product_Architecture_Spec', 'Microservices & Storage Schema', 2, {
        r: 0.15,
        g: 0.35,
        b: 0.25,
      });
      dispatch(addDocuments([doc1, doc2]));
      dispatch(setViewerDoc({ docId: doc1.id, totalPages: doc1.totalPages }));
    } catch (err) {
      console.error(err);
    }
  };

  const viewerFileInputRef = useRef<HTMLInputElement>(null);
  const [isViewerDragOver, setIsViewerDragOver] = useState(false);

  const handleViewerDropFiles = async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfFiles.length === 0) return;

    try {
      const parsedDocs = await Promise.all(pdfFiles.map((file) => parsePdfFile(file)));
      dispatch(addDocuments(parsedDocs));
      dispatch(setViewerDoc({ docId: parsedDocs[0].id, totalPages: parsedDocs[0].totalPages }));
      dispatch(setActiveTab('viewer'));
    } catch (err) {
      console.error('Failed to parse dropped PDF', err);
    }
  };

  // If no document is selected / available
  if (!activeDocId || documents.length === 0) {
    return (
      <div
        className="viewer-layout"
        style={{
          background: 'var(--bg-app)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsViewerDragOver(true);
        }}
        onDragLeave={() => setIsViewerDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsViewerDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleViewerDropFiles(e.dataTransfer.files);
          }
        }}
      >
        <input
          ref={viewerFileInputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) handleViewerDropFiles(e.target.files);
          }}
        />

        <div
          style={{
            textAlign: 'center',
            maxWidth: '460px',
            width: '100%',
            padding: '40px 32px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: isViewerDragOver ? '2px dashed var(--accent-blue)' : '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-md)',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--accent-blue)',
            }}
          >
            <FileUp size={30} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
            Open PDF to View & Read
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Drop any PDF file here or browse to view pages, zoom, and inspect instantly.
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => viewerFileInputRef.current?.click()}
            >
              <FilePlus size={16} />
              <span>Open PDF</span>
            </button>

            <button type="button" className="btn-secondary" onClick={handleLoadSamples}>
              <Sparkles size={16} style={{ color: '#d97706' }} />
              <span>Load Sample PDF</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => dispatch(setActiveTab('markdown'))}
              title="Switch to Markdown to PDF Studio"
            >
              <BookOpen size={16} />
              <span>Markdown Studio</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => dispatch(setActiveTab('merge'))}
            >
              <Files size={16} />
              <span>Merge PDFs</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentPage / Math.max(1, totalPages)) * 100);

  return (
    <div className={`viewer-layout ${zenMode ? 'zen-active' : ''}`}>
      {/* Subtle Reading Progress Bar */}
      <div className="reading-progress-track">
        <div
          className="reading-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {!zenMode && <ViewerToolbar />}

      <div className="viewer-body">
        {!zenMode && sidebarOpen && (
          <ThumbnailSidebar onPageSelect={handleScrollToPage} />
        )}

        <div
          ref={viewportRef}
          className={`viewer-canvas-viewport reading-theme-${readingTheme}`}
          onScroll={handleViewportScroll}
        >
          {loadError ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#b91c1c',
                background: '#fef2f2',
                padding: '16px',
                borderRadius: '8px',
              }}
            >
              <AlertCircle size={20} />
              <span>{loadError}</span>
            </div>
          ) : !pdfProxy ? (
            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                marginTop: '64px',
              }}
            >
              Loading document pages...
            </div>
          ) : layoutMode === 'continuous' ? (
            Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <PageCanvas
                key={`p_${pageNum}_${rotation}`}
                pdfDoc={pdfProxy}
                pageNumber={pageNum}
                zoom={zoom}
                rotation={rotation}
              />
            ))
          ) : (
            <PageCanvas
              key={`p_${currentPage}_${rotation}`}
              pdfDoc={pdfProxy}
              pageNumber={currentPage}
              zoom={zoom}
              rotation={rotation}
            />
          )}
        </div>
      </div>

      {/* Floating Minimal Controls in Zen Mode */}
      {zenMode && (
        <div className="zen-floating-bar">
          <button
            type="button"
            className="zen-btn"
            onClick={() => dispatch(prevPage())}
            disabled={currentPage <= 1}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="zen-page-indicator">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            className="zen-btn"
            onClick={() => dispatch(nextPage())}
            disabled={currentPage >= totalPages}
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>

          <div className="zen-sep" />

          {/* Zoom controls in Zen Mode */}
          <button
            type="button"
            className="zen-btn"
            onClick={() => dispatch(zoomOut())}
            disabled={zoom <= 0.3}
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>

          <span
            className="zen-zoom-label"
            onClick={() => dispatch(setZoom(1.0))}
            title="Click to reset zoom to 100%"
            style={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: '0 4px', color: '#e2e8f0' }}
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            className="zen-btn"
            onClick={() => dispatch(zoomIn())}
            disabled={zoom >= 3.5}
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>

          <div className="zen-sep" />

          <button
            type="button"
            className="zen-btn"
            onClick={() => dispatch(toggleZenMode())}
            title="Exit Zen Mode (Esc)"
          >
            <Minimize2 size={15} />
            <span>Exit Zen</span>
          </button>
        </div>
      )}
    </div>
  );
};
