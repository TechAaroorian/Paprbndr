import {
  Sidebar,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Download,
  ScrollText,
  Files,
  Sun,
  Coffee,
  Moon,
  Minimize2,
  BookOpen,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setActiveTab } from '../../store/uiSlice';
import { updateReadingSettings } from '../../store/markdownSlice';
import {
  nextPage,
  prevPage,
  setCurrentPage,
  setZoom,
  zoomIn,
  zoomOut,
  rotateViewer,
  setLayoutMode,
  toggleSidebar,
  setViewerDoc,
  setReadingTheme,
  toggleZenMode,
} from '../../store/viewerSlice';
import { getBlob } from '../../services/bufferRegistry';
import { downloadBlob } from '../../services/pdfService';

export const ViewerToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const documents = useAppSelector((state) => state.documents.items);
  const {
    activeDocId,
    currentPage,
    totalPages,
    zoom,
    layoutMode,
    sidebarOpen,
    readingTheme,
    zenMode,
  } = useAppSelector((state) => state.viewer);

  const activeDoc = documents.find((d) => d.id === activeDocId);

  const handleDocChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const doc = documents.find((d) => d.id === e.target.value);
    if (doc) {
      dispatch(setViewerDoc({ docId: doc.id, totalPages: doc.totalPages }));
    }
  };

  const handleDownload = () => {
    if (!activeDoc) return;
    const blob = getBlob(activeDoc.id);
    if (blob) {
      downloadBlob(blob, activeDoc.name);
    }
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      dispatch(setCurrentPage(val));
    }
  };

  return (
    <div className="viewer-toolbar">
      {/* Left controls: Sidebar toggle & Document selector */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`btn-icon ${sidebarOpen ? 'active' : ''}`}
          onClick={() => dispatch(toggleSidebar())}
          title={sidebarOpen ? 'Hide page thumbnails' : 'Show page thumbnails'}
        >
          <Sidebar size={18} />
        </button>

        <div className="toolbar-divider" />

        {documents.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
            <select
              value={activeDocId || ''}
              onChange={handleDocChange}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                maxWidth: '220px',
              }}
            >
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.totalPages} pages)
                </option>
              ))}
            </select>

            {activeDoc?.sourceType === 'markdown' && (
              <button
                type="button"
                onClick={() => {
                  dispatch(updateReadingSettings({ layout: 'reader-only' }));
                  dispatch(setActiveTab('markdown'));
                }}
                className="btn-back-to-markdown"
                title="Open in dedicated Markdown Reader for optimal fluid reading"
              >
                <BookOpen size={12} />
                <span>Open in Markdown Reader</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center controls: Pagination */}
      <div className="toolbar-group">
        <button
          type="button"
          className="btn-icon"
          onClick={() => dispatch(prevPage())}
          disabled={currentPage <= 1}
          title="Previous Page"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="page-selector-box">
          <span>Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={handlePageInput}
            className="page-input"
          />
          <span>of {totalPages}</span>
        </div>

        <button
          type="button"
          className="btn-icon"
          onClick={() => dispatch(nextPage())}
          disabled={currentPage >= totalPages}
          title="Next Page"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Right controls: Zoom, Rotate, Layout & Download */}
      <div className="toolbar-group">
        <button
          type="button"
          className="btn-icon"
          onClick={() => dispatch(zoomOut())}
          disabled={zoom <= 0.3}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>

        <span
          className="zoom-label"
          onClick={() => dispatch(setZoom(1.0))}
          style={{ cursor: 'pointer' }}
          title="Click to reset to 100%"
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          className="btn-icon"
          onClick={() => dispatch(zoomIn())}
          disabled={zoom >= 3.5}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>

        <div className="toolbar-divider" />

        <button
          type="button"
          className="btn-icon"
          onClick={() => dispatch(rotateViewer(90))}
          title="Rotate View 90° Clockwise"
        >
          <RotateCw size={16} />
        </button>

        <button
          type="button"
          className={`btn-icon ${layoutMode === 'continuous' ? 'active' : ''}`}
          onClick={() =>
            dispatch(setLayoutMode(layoutMode === 'continuous' ? 'single' : 'continuous'))
          }
          title={
            layoutMode === 'continuous'
              ? 'Switch to Single Page Mode'
              : 'Switch to Continuous Scroll Mode'
          }
        >
          {layoutMode === 'continuous' ? <ScrollText size={16} /> : <Maximize2 size={16} />}
        </button>

        <div className="toolbar-divider" />

        {/* PDF Reading Tone Filters */}
        <div className="pdf-reading-tones">
          <button
            type="button"
            className={`tone-btn original ${readingTheme === 'original' ? 'active' : ''}`}
            onClick={() => dispatch(setReadingTheme('original'))}
            title="Original document colors"
          >
            <Sun size={13} />
            <span>Normal</span>
          </button>
          <button
            type="button"
            className={`tone-btn sepia ${readingTheme === 'sepia' ? 'active' : ''}`}
            onClick={() => dispatch(setReadingTheme('sepia'))}
            title="Warm Eye-Comfort Sepia Tone"
          >
            <Coffee size={13} />
            <span>Sepia</span>
          </button>
          <button
            type="button"
            className={`tone-btn night ${readingTheme === 'night' ? 'active' : ''}`}
            onClick={() => dispatch(setReadingTheme('night'))}
            title="High-Contrast Night Reading Mode"
          >
            <Moon size={13} />
            <span>Night</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Zen Mode Toggle */}
        <button
          type="button"
          className={`btn-icon ${zenMode ? 'active' : ''}`}
          onClick={() => dispatch(toggleZenMode())}
          title={zenMode ? 'Exit Zen Mode' : 'Zen Focus Reading Mode'}
        >
          {zenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        <div className="toolbar-divider" />

        <button
          type="button"
          className="btn-icon"
          onClick={handleDownload}
          title="Download original document"
          disabled={!activeDoc}
        >
          <Download size={16} />
        </button>

        <div className="toolbar-divider" />

        <button
          type="button"
          className="btn-secondary"
          onClick={() => dispatch(setActiveTab('merge'))}
          style={{ padding: '4px 10px', fontSize: '0.78rem', gap: '5px' }}
          title="Switch to Merge PDF to combine or arrange documents"
        >
          <Files size={14} />
          <span>Merge PDF</span>
          {documents.length > 1 && (
            <span
              style={{
                background: 'var(--text-primary)',
                color: '#fff',
                fontSize: '0.68rem',
                borderRadius: '999px',
                padding: '0 5px',
                fontWeight: 700,
              }}
            >
              {documents.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
