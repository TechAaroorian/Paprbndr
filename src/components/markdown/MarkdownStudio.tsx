import React, { useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setMarkdownContent } from '../../store/markdownSlice';
import { calculateReadingStats, extractTableOfContents } from '../../services/markdownPdfService';
import { ReadingSettingsBar } from './ReadingSettingsBar';
import { TableOfContents } from './TableOfContents';
import { MarkdownEditor } from './MarkdownEditor';
import { ImmersiveReader } from './ImmersiveReader';
import { AssetManagerModal } from './AssetManagerModal';

export const MarkdownStudio: React.FC = () => {
  const dispatch = useAppDispatch();
  const content = useAppSelector((state) => state.markdown.content);
  const readingSettings = useAppSelector((state) => state.markdown.readingSettings);

  const [isTocOpen, setIsTocOpen] = useState<boolean>(true);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Compute live reading stats and headings outline
  const stats = calculateReadingStats(content);
  const tocItems = extractTableOfContents(content);

  const handleInsertMarkdown = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      dispatch(setMarkdownContent(content + snippet));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const updated = content.substring(0, start) + snippet + content.substring(end);
    dispatch(setMarkdownContent(updated));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const layout = readingSettings.layout;
  const isZen = readingSettings.zenMode;

  return (
    <div className={`markdown-studio-root ${isZen ? 'zen-active' : ''}`}>
      {/* Top Reading & Layout Settings Toolbar */}
      <ReadingSettingsBar stats={stats} />

      {/* Main Studio Work Area */}
      <div className="markdown-studio-body">
        {/* Table of Contents Outline Sidebar */}
        <TableOfContents
          items={tocItems}
          isOpen={isTocOpen}
          onToggle={() => setIsTocOpen(!isTocOpen)}
          activeId={activeHeadingId}
        />

        {/* Studio Content Grid */}
        <div className={`studio-content-grid layout-${layout}`}>
          {(layout === 'split' || layout === 'editor-only') && (
            <MarkdownEditor textareaRef={textareaRef} />
          )}

          {(layout === 'split' || layout === 'reader-only') && (
            <ImmersiveReader onHeadingChange={setActiveHeadingId} />
          )}
        </div>
      </div>

      {/* Asset Manager Modal */}
      <AssetManagerModal onInsertMarkdown={handleInsertMarkdown} />
    </div>
  );
};

export default MarkdownStudio;
