import React, { useEffect } from 'react';
import { RotateCw, Trash2, Undo2, FileText } from 'lucide-react';
import type { PDFPageItem } from '../../types/pdf';
import { useAppDispatch } from '../../store';
import { rotatePage, toggleDeletePage, updatePageThumbnail } from '../../store/documentsSlice';
import { getBuffer } from '../../services/bufferRegistry';
import { renderPageThumbnail } from '../../services/pdfService';

interface PageTileProps {
  docId: string;
  page: PDFPageItem;
  displayIndex: number;
}

export const PageTile: React.FC<PageTileProps> = ({ docId, page, displayIndex }) => {
  const dispatch = useAppDispatch();

  // Lazy thumbnail rendering
  useEffect(() => {
    if (!page.thumbnailUrl) {
      let isMounted = true;
      getBuffer(docId).then((buffer) => {
        if (isMounted && buffer) {
          renderPageThumbnail(buffer, page.originalPageNumber, page.rotation, 160).then((thumbUrl) => {
            if (isMounted && thumbUrl) {
              dispatch(updatePageThumbnail({ docId, pageId: page.id, thumbnailUrl: thumbUrl }));
            }
          });
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [docId, page.id, page.originalPageNumber, page.rotation, page.thumbnailUrl, dispatch]);

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(rotatePage({ docId, pageId: page.id, deltaAngle: 90 }));
  };

  const handleToggleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleDeletePage({ docId, pageId: page.id }));
  };

  return (
    <div className={`page-tile ${page.isDeleted ? 'is-deleted' : ''}`}>
      <div className="page-tile-preview">
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.originalPageNumber}`}
            loading="lazy"
          />
        ) : (
          <div className="page-placeholder">
            <FileText size={22} />
            <span>Page {page.originalPageNumber}</span>
          </div>
        )}
      </div>

      <div className="page-tile-footer">
        <span className="page-tile-number">
          P.{displayIndex} {page.rotation > 0 ? `(${page.rotation}°)` : ''}
        </span>

        <div className="page-tile-btns">
          <button
            type="button"
            className="btn-icon"
            onClick={handleRotate}
            title="Rotate 90° Clockwise"
            disabled={page.isDeleted}
            style={{ width: '26px', height: '26px' }}
          >
            <RotateCw size={13} />
          </button>

          <button
            type="button"
            className={`btn-icon ${page.isDeleted ? '' : 'btn-icon-danger'}`}
            onClick={handleToggleDelete}
            title={page.isDeleted ? 'Restore page' : 'Exclude page from merge'}
            style={{ width: '26px', height: '26px' }}
          >
            {page.isDeleted ? <Undo2 size={13} /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
};
