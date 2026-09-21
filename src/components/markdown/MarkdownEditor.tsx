import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setMarkdownContent,
  setAssetModalOpen,
  resetMarkdownToSample,
} from '../../store/markdownSlice';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Table as TableIcon,
  CheckSquare,
  Minus,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface MarkdownEditorProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ textareaRef }) => {
  const dispatch = useAppDispatch();
  const content = useAppSelector((state) => state.markdown.content);
  const assets = useAppSelector((state) => state.markdown.assets);

  const insertSnippet = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;

    const newContent =
      content.substring(0, start) + before + selected + after + content.substring(end);

    dispatch(setMarkdownContent(newContent));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      insertSnippet('  ', '', '');
    }
  };

  const handleInsertTable = () => {
    const tableSnippet = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data A | Data B | Data C |\n| Value 1 | Value 2 | Value 3 |\n`;
    insertSnippet(tableSnippet);
  };

  const handleInsertChecklist = () => {
    const checklistSnippet = `\n- [ ] Task 1\n- [ ] Task 2\n- [x] Completed task\n`;
    insertSnippet(checklistSnippet);
  };

  return (
    <div className="markdown-editor-pane">
      {/* Editor Header Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => insertSnippet('**', '**', 'bold text')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => insertSnippet('*', '*', 'italic text')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>

          <div className="editor-tool-sep" />

          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => insertSnippet('\n# ', '\n', 'Heading 1')}
            title="Heading 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => insertSnippet('\n## ', '\n', 'Heading 2')}
            title="Heading 2"
          >
            <Heading2 size={15} />
          </button>
          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => insertSnippet('\n### ', '\n', 'Heading 3')}
            title="Heading 3"
          >
            <Heading3 size={15} />
          </button>

          <div className="editor-tool-sep" />

          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => insertSnippet('\n> ', '\n', 'Blockquote')}
            title="Blockquote"
          >
            <Quote size={15} />
          </button>
          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => insertSnippet('\n```typescript\n', '\n```\n', '// code here')}
            title="Code block"
          >
            <Code size={15} />
          </button>
          <button
            type="button"
            className="editor-tool-btn"
            onClick={handleInsertTable}
            title="Insert Table"
          >
            <TableIcon size={15} />
          </button>
          <button
            type="button"
            className="editor-tool-btn"
            onClick={handleInsertChecklist}
            title="Task Checklist"
          >
            <CheckSquare size={15} />
          </button>
          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => insertSnippet('\n---\n')}
            title="Horizontal Divider"
          >
            <Minus size={15} />
          </button>
        </div>

        <div className="toolbar-section right">
          {/* Asset Manager Trigger */}
          <button
            type="button"
            className="btn-assets-trigger"
            onClick={() => dispatch(setAssetModalOpen(true))}
            title="Manage Image Assets (Max 5, 2MB each)"
          >
            <ImageIcon size={14} />
            <span>Assets</span>
            <span className="asset-pill-count">{assets.length}/5</span>
          </button>

          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => dispatch(resetMarkdownToSample())}
            title="Reset to sample document"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            className="editor-tool-btn delete"
            onClick={() => dispatch(setMarkdownContent(''))}
            title="Clear editor"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Editor Body Area */}
      <div className="editor-body">
        <textarea
          ref={textareaRef}
          className="markdown-textarea"
          value={content}
          onChange={(e) => dispatch(setMarkdownContent(e.target.value))}
          onKeyDown={handleKeyDown}
          placeholder="Write your markdown document here... Use # for headings, tables, code blocks, or embed images with the Asset Manager."
          spellCheck="false"
        />
      </div>
    </div>
  );
};
