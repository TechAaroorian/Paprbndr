import React, { useRef, useState } from 'react';
import { UploadCloud, FilePlus, Sparkles } from 'lucide-react';
import { useAppDispatch } from '../store';
import { addDocuments } from '../store/documentsSlice';
import { setViewerDoc } from '../store/viewerSlice';
import { setNotification, setActiveTab } from '../store/uiSlice';
import { parsePdfFile, createSamplePdf } from '../services/pdfService';

export const Dropzone: React.FC = () => {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      dispatch(
        setNotification({
          type: 'error',
          message: 'Please select valid PDF documents.',
        })
      );
      return;
    }

    setIsUploading(true);
    try {
      const parsedDocs = await Promise.all(pdfFiles.map((file) => parsePdfFile(file)));
      dispatch(addDocuments(parsedDocs));
      if (parsedDocs.length > 0) {
        dispatch(setViewerDoc({ docId: parsedDocs[0].id, totalPages: parsedDocs[0].totalPages }));
        dispatch(setActiveTab('viewer'));
      }
      dispatch(
        setNotification({
          type: 'success',
          message: `Loaded ${parsedDocs.length} PDF ${parsedDocs.length === 1 ? 'file' : 'files'}. Opening in reader.`,
        })
      );
    } catch (err) {
      console.error('Failed to parse PDF files', err);
      dispatch(
        setNotification({
          type: 'error',
          message: 'Error reading PDF files. Check if any file is corrupted or password-protected.',
        })
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleLoadSamples = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUploading(true);
    try {
      const doc1 = await createSamplePdf('Quarterly_Financial_Report', 'Q1 Revenue & Margin Breakdown', 2, {
        r: 0.08,
        g: 0.25,
        b: 0.45,
      });
      const doc2 = await createSamplePdf('Product_Architecture_Spec', 'Microservices & Storage Schema', 2, {
        r: 0.15,
        g: 0.35,
        b: 0.25,
      });
      const doc3 = await createSamplePdf('Project_Milestones', 'Sprint Roadmap & Quality Checklist', 1, {
        r: 0.45,
        g: 0.2,
        b: 0.1,
      });

      dispatch(addDocuments([doc1, doc2, doc3]));
      dispatch(setViewerDoc({ docId: doc1.id, totalPages: doc1.totalPages }));
      dispatch(setActiveTab('viewer'));
      dispatch(
        setNotification({
          type: 'success',
          message: 'Loaded sample PDFs and opened in document reader.',
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`dropzone-container ${isDragOver ? 'is-dragover' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />

      <div className="dropzone-icon-box">
        <UploadCloud size={28} strokeWidth={1.8} />
      </div>

      <h3 className="dropzone-title">
        {isUploading ? 'Analyzing documents...' : 'Drop your PDF documents here'}
      </h3>
      <p className="dropzone-hint">
        or click to browse from your device. Documents remain completely offline in your browser.
      </p>

      <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <FilePlus size={16} />
          <span>Browse Files</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={handleLoadSamples}
          disabled={isUploading}
        >
          <Sparkles size={16} style={{ color: '#d97706' }} />
          <span>Try with Sample PDFs</span>
        </button>
      </div>
    </div>
  );
};
