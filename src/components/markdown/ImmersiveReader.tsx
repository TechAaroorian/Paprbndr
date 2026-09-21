import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setActiveTab, setNotification } from '../../store/uiSlice';
import { addDocuments } from '../../store/documentsSlice';
import { setViewerDoc } from '../../store/viewerSlice';
import {
  compileMarkdownToHtml,
  generatePdfFromMarkdown,
  printMarkdownDocument,
} from '../../services/markdownPdfService';
import { downloadBlob, renderPageThumbnail } from '../../services/pdfService';
import { getBuffer } from '../../services/bufferRegistry';
import type { DocumentItem } from '../../types/pdf';
import {
  Download,
  Eye,
  Files,
  Printer,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const ImmersiveReader: React.FC = () => {
  const dispatch = useAppDispatch();
  const { content, assets, readingSettings, exportSettings } = useAppSelector(
    (state) => state.markdown
  );

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportAction, setExportAction] = useState<string | null>(null);

  // Compile HTML with resolved assets and TOC heading IDs
  const compiledHtml = compileMarkdownToHtml(content, assets);

  const handleGeneratePdf = async (target: 'download' | 'viewer' | 'merger') => {
    try {
      setIsExporting(true);
      setExportAction(target);

      const { blob, docId, totalPages, filename } = await generatePdfFromMarkdown({
        markdown: content,
        assets,
        exportSettings,
      });

      if (target === 'download') {
        downloadBlob(blob, filename);
        dispatch(
          setNotification({
            type: 'success',
            message: `Generated and downloaded "${filename}" (${totalPages} pages).`,
          })
        );
      } else if (target === 'viewer' || target === 'merger') {
        // Fetch buffer to create DocumentItem with page thumbnails
        const buffer = await getBuffer(docId);
        if (!buffer) throw new Error('PDF buffer missing from local memory');
        const pages = [];

        for (let p = 1; p <= totalPages; p++) {
          let thumb = '';
          try {
            thumb = await renderPageThumbnail(buffer, p, 0, 160);
          } catch {
            // fallback
          }
          pages.push({
            id: `${docId}_p${p}`,
            originalPageNumber: p,
            rotation: 0,
            isDeleted: false,
            thumbnailUrl: thumb,
          });
        }

        const newDoc: DocumentItem = {
          id: docId,
          name: filename,
          size: blob.size,
          totalPages,
          isExpanded: true,
          pages,
          createdAt: Date.now(),
        };

        dispatch(addDocuments([newDoc]));

        if (target === 'viewer') {
          dispatch(setViewerDoc({ docId: newDoc.id, totalPages: newDoc.totalPages }));
          dispatch(setActiveTab('viewer'));
          dispatch(
            setNotification({
              type: 'success',
              message: `Opened "${filename}" in High-DPI Document Reader.`,
            })
          );
        } else {
          dispatch(setActiveTab('merge'));
          dispatch(
            setNotification({
              type: 'success',
              message: `Added "${filename}" to Merge queue.`,
            })
          );
        }
      }
    } catch (err) {
      console.error('PDF Generation failed:', err);
      dispatch(
        setNotification({
          type: 'error',
          message: 'Failed to generate PDF. Check console for details.',
        })
      );
    } finally {
      setIsExporting(false);
      setExportAction(null);
    }
  };

  return (
    <div className={`immersive-reader-container theme-${readingSettings.theme}`}>
      {/* Document Reading Viewport */}
      <div className="reader-scroll-viewport">
        <article
          className={`reader-article-content font-${readingSettings.fontFamily} size-${readingSettings.fontSize} width-${readingSettings.columnWidth}`}
          dangerouslySetInnerHTML={{ __html: compiledHtml }}
        />
      </div>

      {/* Floating Action Bar for PDF Output */}
      <div className="reader-floating-action-bar">
        <div className="action-bar-label">
          <Sparkles size={14} style={{ color: 'var(--accent-blue)' }} />
          <span>PDF Compilation:</span>
        </div>

        <div className="action-bar-buttons">
          <button
            type="button"
            className="btn-reader-action primary"
            onClick={() => handleGeneratePdf('download')}
            disabled={isExporting}
            title="Compile and download PDF directly"
          >
            {isExporting && exportAction === 'download' ? (
              <Loader2 size={15} className="spinner" />
            ) : (
              <Download size={15} />
            )}
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            className="btn-reader-action"
            onClick={() => handleGeneratePdf('viewer')}
            disabled={isExporting}
            title="Open generated PDF in Paprbndr Reader"
          >
            {isExporting && exportAction === 'viewer' ? (
              <Loader2 size={15} className="spinner" />
            ) : (
              <Eye size={15} />
            )}
            <span>Open in Viewer</span>
          </button>

          <button
            type="button"
            className="btn-reader-action"
            onClick={() => handleGeneratePdf('merger')}
            disabled={isExporting}
            title="Send to Merge queue to combine with other PDFs"
          >
            {isExporting && exportAction === 'merger' ? (
              <Loader2 size={15} className="spinner" />
            ) : (
              <Files size={15} />
            )}
            <span>Send to Merger</span>
          </button>

          <button
            type="button"
            className="btn-reader-action"
            onClick={printMarkdownDocument}
            title="Print or Save as Vector PDF via browser"
          >
            <Printer size={15} />
            <span>Vector Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
