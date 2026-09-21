import React from 'react';
import type { TocItem } from '../../services/markdownPdfService';
import { ListCollapse, ChevronRight } from 'lucide-react';

interface TableOfContentsProps {
  items: TocItem[];
  isOpen: boolean;
  onToggle: () => void;
  activeId?: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items,
  isOpen,
  onToggle,
  activeId,
}) => {
  const handleScrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="toc-floating-toggle"
        onClick={onToggle}
        title="Open Table of Contents (Outline)"
      >
        <ListCollapse size={18} />
        <span>Outline</span>
      </button>
    );
  }

  return (
    <aside className="toc-sidebar">
      <div className="toc-header">
        <div className="toc-title-group">
          <ListCollapse size={16} />
          <span>Document Outline</span>
        </div>
        <button
          type="button"
          className="toc-close-btn"
          onClick={onToggle}
          title="Collapse outline"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="toc-content">
        {items.length === 0 ? (
          <div className="toc-empty">
            <span>No headings detected. Use #, ##, or ### to structure your document.</span>
          </div>
        ) : (
          <nav className="toc-nav">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`toc-item-link level-${item.level} ${item.id === activeId ? 'active' : ''}`}
                onClick={() => handleScrollToHeading(item.id)}
                title={item.title}
              >
                <span className="toc-bullet" />
                <span className="toc-text">{item.title}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
};
