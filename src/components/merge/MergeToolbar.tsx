import React, { useState } from 'react';
import { Download, Trash2, Loader2, FileCheck } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearAllDocuments } from '../../store/documentsSlice';
import { setNotification, setProcessing } from '../../store/uiSlice';
import { mergeDocuments, downloadBlob, formatFileSize } from '../../services/pdfService';
import { clearBuffers } from '../../services/bufferRegistry';

export const MergeToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const documents = useAppSelector((state) => state.documents.items);
  const isProcessing = useAppSelector((state) => state.ui.isProcessing);
  const [outputName, setOutputName] = useState('merged_document');
  const [readyDownload, setReadyDownload] = useState<{ url: string; filename: string } | null>(null);

  // Compute metrics
  const totalPages = documents.reduce(
    (acc, doc) => acc + doc.pages.filter((p) => !p.isDeleted).length,
    0
  );
  const totalSize = documents.reduce((acc, doc) => acc + doc.size, 0);

  const handleMerge = async () => {
    if (documents.length === 0) return;

    if (totalPages === 0) {
      dispatch(
        setNotification({
          type: 'warning',
          message: 'All pages are excluded. Please restore at least one page to merge.',
        })
      );
      return;
    }

    dispatch(setProcessing({ isProcessing: true, message: 'Assembling PDF pages...' }));

    try {
      const mergedBlob = await mergeDocuments(documents, (msg) => {
        dispatch(setProcessing({ isProcessing: true, message: msg }));
      });

      const finalName = outputName.trim() || 'merged_document';
      downloadBlob(mergedBlob, finalName);

      // Also create a direct download URL as a fallback button
      const blobUrl = URL.createObjectURL(mergedBlob);
      setReadyDownload({
        url: blobUrl,
        filename: finalName.endsWith('.pdf') ? finalName : `${finalName}.pdf`,
      });

      dispatch(
        setNotification({
          type: 'success',
          message: `Successfully generated and downloaded ${finalName}.pdf (${totalPages} pages).`,
        })
      );
    } catch (err: any) {
      console.error('Merge error', err);
      const detailedMessage = err?.message || String(err) || 'Unknown merge failure';
      dispatch(
        setNotification({
          type: 'error',
          message: `Merge failed: ${detailedMessage}`,
        })
      );
    } finally {
      dispatch(setProcessing({ isProcessing: false }));
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Remove all uploaded documents from this session?')) {
      if (readyDownload?.url) {
        URL.revokeObjectURL(readyDownload.url);
      }
      setReadyDownload(null);
      dispatch(clearAllDocuments());
      clearBuffers();
      dispatch(
        setNotification({
          type: 'info',
          message: 'Workspace cleared.',
        })
      );
    }
  };

  if (documents.length === 0) return null;

  return (
    <div className="merge-action-bar">
      <div className="merge-summary-stats">
        <div className="stat-item">
          <span className="stat-label">Files</span>
          <span className="stat-value">{documents.length}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Merged Pages</span>
          <span className="stat-value">{totalPages}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Total Size</span>
          <span className="stat-value">{formatFileSize(totalSize)}</span>
        </div>
      </div>

      <div className="merge-actions-group">
        <input
          type="text"
          className="output-name-input"
          value={outputName}
          onChange={(e) => setOutputName(e.target.value)}
          placeholder="Output filename"
          title="Output PDF file name"
        />

        {readyDownload ? (
          <a
            href={readyDownload.url}
            download={readyDownload.filename}
            className="btn-accent"
            style={{ textDecoration: 'none' }}
          >
            <FileCheck size={16} />
            <span>Download {readyDownload.filename}</span>
          </a>
        ) : (
          <button
            type="button"
            className="btn-accent"
            onClick={handleMerge}
            disabled={isProcessing || totalPages === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Merging...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Merge & Download</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          className="btn-secondary"
          onClick={handleClearAll}
          title="Clear all documents"
          disabled={isProcessing}
        >
          <Trash2 size={16} />
          <span>Clear All</span>
        </button>
      </div>
    </div>
  );
};
