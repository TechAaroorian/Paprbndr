import React, { useRef } from 'react';
import { Files, Eye, ShieldCheck, Sparkles, FilePlus, GitCompare, BookOpen } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { setActiveTab, setNotification } from '../store/uiSlice';
import { addDocuments } from '../store/documentsSlice';
import { createSamplePdf, parsePdfFile } from '../services/pdfService';
import { setViewerDoc } from '../store/viewerSlice';
import { PaprbndrLogo } from './PaprbndrLogo';

export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const documents = useAppSelector((state) => state.documents.items);
  const activeViewerDocId = useAppSelector((state) => state.viewer.activeDocId);

  const activeDoc = documents.find((d) => d.id === activeViewerDocId);

  const handleOpenPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const parsedDocs = await Promise.all(
        Array.from(files)
          .filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
          .map((f) => parsePdfFile(f))
      );

      if (parsedDocs.length > 0) {
        dispatch(addDocuments(parsedDocs));
        dispatch(setViewerDoc({ docId: parsedDocs[0].id, totalPages: parsedDocs[0].totalPages }));
        dispatch(setActiveTab('viewer'));
        dispatch(
          setNotification({
            type: 'success',
            message: `Loaded ${parsedDocs[0].name} in viewer.`,
          })
        );
      }
    } catch (err) {
      console.error(err);
      dispatch(
        setNotification({
          type: 'error',
          message: 'Failed to open PDF file.',
        })
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadSamples = async () => {
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
          message: 'Sample PDFs loaded into viewer.',
        })
      );
    } catch (err) {
      console.error('Failed to load sample documents', err);
    }
  };

  return (
    <header className="app-header">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleOpenPdfFile}
      />

      <div className="brand-section">
        <div className="brand-logo-icon" title="Paprbndr • 100% Client-Side PDF Studio">
          <PaprbndrLogo size={34} />
        </div>
        <div>
          <span className="brand-title">Paprbndr</span>
          <span className="brand-badge">Studio</span>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'viewer' ? 'active' : ''}`}
          onClick={() => dispatch(setActiveTab('viewer'))}
        >
          <Eye size={16} />
          <span>View PDF</span>
          {activeDoc && (
            <span
              className="tab-badge"
              style={{
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeDoc.name.replace('.pdf', '')}
            </span>
          )}
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'merge' ? 'active' : ''}`}
          onClick={() => dispatch(setActiveTab('merge'))}
        >
          <Files size={16} />
          <span>Merge PDF</span>
          {documents.length > 0 && (
            <span className="tab-badge">{documents.length}</span>
          )}
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'diff' ? 'active' : ''}`}
          onClick={() => dispatch(setActiveTab('diff'))}
          title="Visually compare two document versions"
        >
          <GitCompare size={16} />
          <span>Compare & Diff</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'markdown' ? 'active' : ''}`}
          onClick={() => dispatch(setActiveTab('markdown'))}
          title="Markdown to PDF Studio & Immersive Reader"
        >
          <BookOpen size={16} />
          <span>Markdown Studio</span>
        </button>
      </nav>

      <div className="header-actions">
        <button
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          title="Open a PDF to view immediately"
        >
          <FilePlus size={15} />
          <span>Open PDF</span>
        </button>

        {documents.length === 0 && (
          <button
            className="btn-secondary"
            onClick={handleLoadSamples}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <Sparkles size={14} style={{ color: '#d97706' }} />
            <span>Load Samples</span>
          </button>
        )}

        <div
          className="local-shield-badge"
          title="All processing occurs locally in browser memory. No server uploads."
        >
          <ShieldCheck size={14} />
          <span>100% Local Privacy</span>
        </div>
      </div>
    </header>
  );
};
