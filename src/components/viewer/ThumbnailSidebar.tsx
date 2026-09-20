import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setCurrentPage } from '../../store/viewerSlice';
import { FileText } from 'lucide-react';

interface ThumbnailSidebarProps {
  onPageSelect?: (pageNumber: number) => void;
}

export const ThumbnailSidebar: React.FC<ThumbnailSidebarProps> = ({ onPageSelect }) => {
  const dispatch = useAppDispatch();
  const activeDocId = useAppSelector((state) => state.viewer.activeDocId);
  const currentPage = useAppSelector((state) => state.viewer.currentPage);
  const documents = useAppSelector((state) => state.documents.items);

  const activeDoc = documents.find((d) => d.id === activeDocId);

  if (!activeDoc) return null;

  const handleSelect = (pageNumber: number) => {
    dispatch(setCurrentPage(pageNumber));
    if (onPageSelect) {
      onPageSelect(pageNumber);
    }
  };

  return (
    <div className="viewer-sidebar">
      {activeDoc.pages.map((page, idx) => {
        const pageNum = idx + 1;
        const isActive = pageNum === currentPage;

        return (
          <div
            key={page.id}
            className={`sidebar-thumb-item ${isActive ? 'active' : ''}`}
            onClick={() => handleSelect(pageNum)}
            title={`Go to Page ${pageNum}`}
          >
            <div className="sidebar-thumb-preview">
              {page.thumbnailUrl ? (
                <img
                  src={page.thumbnailUrl}
                  alt={`Thumb ${pageNum}`}
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                  <FileText size={20} />
                </div>
              )}
            </div>
            <span className="sidebar-thumb-num">Page {pageNum}</span>
          </div>
        );
      })}
    </div>
  );
};
