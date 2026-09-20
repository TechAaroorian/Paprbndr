import React from 'react';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Eye,
  Trash2,
  GripVertical,
} from 'lucide-react';
import type { DocumentItem } from '../../types/pdf';
import { useAppDispatch } from '../../store';
import {
  moveDocumentDown,
  moveDocumentUp,
  removeDocument,
  toggleExpandDocument,
} from '../../store/documentsSlice';
import { setViewerDoc } from '../../store/viewerSlice';
import { setActiveTab } from '../../store/uiSlice';
import { formatFileSize } from '../../services/pdfService';
import { PageTile } from './PageTile';

interface DocumentCardProps {
  document: DocumentItem;
  index: number;
  totalDocs: number;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  index,
  totalDocs,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const dispatch = useAppDispatch();
  const activePages = document.pages.filter((p) => !p.isDeleted).length;

  const handleOpenInViewer = () => {
    dispatch(setViewerDoc({ docId: document.id, totalPages: document.totalPages }));
    dispatch(setActiveTab('viewer'));
  };

  return (
    <div
      className="doc-card"
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
    >
      <div className="doc-card-header">
        <div className="drag-handle" title="Drag to reorder document position">
          <GripVertical size={18} />
        </div>

        <div className="doc-order-chip">{index + 1}</div>

        <div className="doc-card-icon">
          <FileText size={24} />
        </div>

        <div className="doc-card-info">
          <div className="doc-card-name" title={document.name}>
            {document.name}
          </div>
          <div className="doc-card-meta">
            <span>{activePages} of {document.totalPages} {document.totalPages === 1 ? 'page' : 'pages'}</span>
            <span className="meta-dot"></span>
            <span>{formatFileSize(document.size)}</span>
          </div>
        </div>

        <div className="doc-card-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={() => dispatch(moveDocumentUp(document.id))}
            disabled={index === 0}
            title="Move document up"
          >
            <ArrowUp size={16} />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => dispatch(moveDocumentDown(document.id))}
            disabled={index === totalDocs - 1}
            title="Move document down"
          >
            <ArrowDown size={16} />
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleOpenInViewer}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Open in Document Reader"
          >
            <Eye size={14} />
            <span>Read</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => dispatch(toggleExpandDocument(document.id))}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title={document.isExpanded ? 'Collapse pages' : 'Manage pages'}
          >
            {document.isExpanded ? (
              <>
                <ChevronUp size={14} />
                <span>Hide Pages</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>Pages ({document.totalPages})</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-icon btn-icon-danger"
            onClick={() => dispatch(removeDocument(document.id))}
            title="Remove document"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {document.isExpanded && (
        <div className="doc-pages-drawer">
          <div className="pages-grid">
            {document.pages.map((page, pIdx) => (
              <PageTile
                key={page.id}
                docId={document.id}
                page={page}
                displayIndex={pIdx + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
