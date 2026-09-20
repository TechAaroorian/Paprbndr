import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppDispatch, useAppSelector } from '../../store';
import { setCurrentPage, setViewerDoc } from '../../store/viewerSlice';
import { setActiveTab } from '../../store/uiSlice';
import { addDocuments } from '../../store/documentsSlice';
import { getBuffer } from '../../services/bufferRegistry';
import { createSamplePdf, parsePdfFile } from '../../services/pdfService';
import { ViewerToolbar } from './ViewerToolbar';
import { ThumbnailSidebar } from './ThumbnailSidebar';
import { FileUp, Sparkles, AlertCircle, FilePlus, Files } from 'lucide-react';

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
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const viewport = page.getViewport({
          scale: zoom,
          rotation: rotation % 360,
        });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
          transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNumber} render error:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNumber, zoom, rotation]);

  return (
    <div id={`page-container-${pageNumber}`} className="pdf-page-container">
      <canvas ref={canvasRef} />
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
  } = useAppSelector((state) => state.viewer);

  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

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

  // Handle scroll to page when thumbnail clicked
  const handleScrollToPage = useCallback((pageNum: number) => {
    if (layoutMode === 'continuous') {
      const pageEl = document.getElementById(`page-container-${pageNum}`);
      if (pageEl && viewportRef.current) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [layoutMode]);

  // Handle Continuous scroll page tracking
  const handleViewportScroll = () => {
    if (layoutMode !== 'continuous' || !viewportRef.current || totalPages <= 1) return;

    const viewportTop = viewportRef.current.scrollTop;
    const viewportHeight = viewportRef.current.clientHeight;
    const viewportMiddle = viewportTop + viewportHeight / 3;

    for (let i = 1; i <= totalPages; i++) {
      const el = document.getElementById(`page-container-${i}`);
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.clientHeight;
        if (top <= viewportMiddle && bottom >= viewportMiddle) {
          if (currentPage !== i) {
            dispatch(setCurrentPage(i));
          }
          break;
        }
      }
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

  return (
    <div className="viewer-layout">
      <ViewerToolbar />

      <div className="viewer-body">
        {sidebarOpen && <ThumbnailSidebar onPageSelect={handleScrollToPage} />}

        <div
          ref={viewportRef}
          className="viewer-canvas-viewport"
          onScroll={handleViewportScroll}
        >
          {loadError ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', background: '#fef2f2', padding: '16px', borderRadius: '8px' }}>
              <AlertCircle size={20} />
              <span>{loadError}</span>
            </div>
          ) : !pdfProxy ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '64px' }}>
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
    </div>
  );
};
