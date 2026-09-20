import React from 'react';
import {
  ArrowLeftRight,
  ZoomIn,
  ZoomOut,
  Sliders,
  Sparkles,
  Layers,
  Columns2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setDocA,
  setDocB,
  swapDocs,
  setDiffMode,
  toggleSyncLock,
  diffZoomIn,
  diffZoomOut,
  setDiffZoom,
  setPageA,
  setComparisonDocs,
} from '../../store/diffSlice';
import { addDocuments } from '../../store/documentsSlice';
import { createContractDiffPair } from '../../services/pdfService';
import { setNotification } from '../../store/uiSlice';

export const DiffToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const documents = useAppSelector((state) => state.documents.items);
  const {
    docAId,
    docBId,
    pageA,
    pageB,
    isSyncLocked,
    diffMode,
    zoom,
  } = useAppSelector((state) => state.diff);

  const docA = documents.find((d) => d.id === docAId);
  const docB = documents.find((d) => d.id === docBId);

  const maxPagesA = docA?.totalPages || 1;
  const maxPagesB = docB?.totalPages || 1;
  const maxPages = Math.max(maxPagesA, maxPagesB);

  const handleLoadContractDiff = async () => {
    try {
      const [itemA, itemB] = await createContractDiffPair();
      dispatch(addDocuments([itemA, itemB]));
      dispatch(setComparisonDocs({ docAId: itemA.id, docBId: itemB.id }));
      dispatch(
        setNotification({
          type: 'success',
          message: 'Loaded contract revision pair (v1.0 vs v2.1) ready for visual diff.',
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="diff-toolbar">
      {/* Document Pickers & Swap */}
      <div className="diff-doc-selectors">
        <div className="diff-doc-picker-group">
          <span className="diff-doc-badge doc-a-badge">A (Original)</span>
          <select
            value={docAId || ''}
            onChange={(e) => dispatch(setDocA(e.target.value || null))}
            className="diff-select"
          >
            <option value="">Select Document A...</option>
            {documents.map((d) => (
              <option key={`a_${d.id}`} value={d.id}>
                {d.name} ({d.totalPages}p)
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-icon"
          onClick={() => dispatch(swapDocs())}
          title="Swap Document A and Document B"
        >
          <ArrowLeftRight size={15} />
        </button>

        <div className="diff-doc-picker-group">
          <span className="diff-doc-badge doc-b-badge">B (Revised)</span>
          <select
            value={docBId || ''}
            onChange={(e) => dispatch(setDocB(e.target.value || null))}
            className="diff-select"
          >
            <option value="">Select Document B...</option>
            {documents.map((d) => (
              <option key={`b_${d.id}`} value={d.id}>
                {d.name} ({d.totalPages}p)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="diff-mode-tabs">
        <button
          type="button"
          className={`diff-mode-btn ${diffMode === 'swipe' ? 'active' : ''}`}
          onClick={() => dispatch(setDiffMode('swipe'))}
          title="Drag slider to peel between Document A and B"
        >
          <Sliders size={14} />
          <span>Swipe Slider</span>
        </button>

        <button
          type="button"
          className={`diff-mode-btn ${diffMode === 'difference' ? 'active' : ''}`}
          onClick={() => dispatch(setDiffMode('difference'))}
          title="Highlights changes: green for additions, red for deletions"
        >
          <Layers size={14} />
          <span>Difference Overlay</span>
        </button>

        <button
          type="button"
          className={`diff-mode-btn ${diffMode === 'side-by-side' ? 'active' : ''}`}
          onClick={() => dispatch(setDiffMode('side-by-side'))}
          title="View both documents side-by-side with locked scrolling"
        >
          <Columns2 size={14} />
          <span>Side-by-Side</span>
        </button>
      </div>

      {/* Page Navigation & Controls */}
      <div className="diff-controls-group">
        <div className="page-stepper-compact">
          <button
            type="button"
            className="btn-icon"
            onClick={() => dispatch(setPageA(Math.max(1, pageA - 1)))}
            disabled={pageA <= 1}
            title="Previous Page"
            style={{ width: '26px', height: '26px' }}
          >
            <ChevronLeft size={16} />
          </button>

          <span className="page-stepper-text">
            Page {pageA} {isSyncLocked ? `/ ${maxPages}` : `(B: ${pageB})`}
          </span>

          <button
            type="button"
            className="btn-icon"
            onClick={() => dispatch(setPageA(Math.min(maxPages, pageA + 1)))}
            disabled={pageA >= maxPages}
            title="Next Page"
            style={{ width: '26px', height: '26px' }}
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className={`btn-icon ${isSyncLocked ? 'active' : ''}`}
            onClick={() => dispatch(toggleSyncLock())}
            title={isSyncLocked ? 'Page sync locked (both advance together)' : 'Page sync unlocked'}
            style={{ width: '26px', height: '26px' }}
          >
            {isSyncLocked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => dispatch(diffZoomOut())}
            disabled={zoom <= 0.4}
            title="Zoom Out"
            style={{ width: '26px', height: '26px' }}
          >
            <ZoomOut size={14} />
          </button>

          <span
            className="zoom-label"
            onClick={() => dispatch(setDiffZoom(1.0))}
            style={{ fontSize: '0.76rem', width: '42px', cursor: 'pointer' }}
            title="Click to reset zoom"
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            className="btn-icon"
            onClick={() => dispatch(diffZoomIn())}
            disabled={zoom >= 2.5}
            title="Zoom In"
            style={{ width: '26px', height: '26px' }}
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <button
          type="button"
          className="btn-secondary"
          onClick={handleLoadContractDiff}
          style={{ padding: '4px 10px', fontSize: '0.76rem', gap: '5px' }}
          title="Load sample contract revisions to test visual diffing"
        >
          <Sparkles size={13} style={{ color: '#d97706' }} />
          <span>Try Sample Diff</span>
        </button>
      </div>
    </div>
  );
};
