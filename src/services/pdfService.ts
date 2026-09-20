import * as pdfjsLib from 'pdfjs-dist';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { DocumentItem, PDFPageItem } from '../types/pdf';
import { getBuffer, setBuffer } from './bufferRegistry';

// Configure PDF.js worker
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'doc_' + crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
};

/**
 * Render a specific page of a PDF buffer to a high-quality data URL thumbnail
 */
export const renderPageThumbnail = async (
  buffer: ArrayBuffer,
  pageNumber: number,
  rotation: number = 0,
  targetWidth: number = 180
): Promise<string> => {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(pageNumber);

    const baseViewport = page.getViewport({ scale: 1.0, rotation });
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale, rotation });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas 2d context');

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn('Failed to render thumbnail for page', pageNumber, err);
    return '';
  }
};

/**
 * Process an uploaded File into a DocumentItem
 */
export const parsePdfFile = async (file: File): Promise<DocumentItem> => {
  const id = generateId();
  // Store the File (Blob) directly to guarantee immunity from worker detachment
  setBuffer(id, file);

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const pages: PDFPageItem[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push({
      id: `${id}_p${i}`,
      originalPageNumber: i,
      rotation: 0,
      isDeleted: false,
    });
  }

  return {
    id,
    name: file.name,
    size: file.size,
    totalPages,
    isExpanded: false,
    pages,
    createdAt: Date.now(),
  };
};

/**
 * Merge multiple DocumentItems using pdf-lib into a downloadable PDF Blob
 */
export const mergeDocuments = async (
  documents: DocumentItem[],
  onProgress?: (msg: string) => void
): Promise<Blob> => {
  const mergedDoc = await PDFDocument.create();

  let processedDocCount = 0;
  for (const docItem of documents) {
    processedDocCount++;
    if (onProgress) {
      onProgress(`Processing document ${processedDocCount} of ${documents.length}: ${docItem.name}`);
    }

    const buffer = await getBuffer(docItem.id);
    if (!buffer || buffer.byteLength === 0) {
      throw new Error(`Document data for "${docItem.name}" is missing or unreadable in memory.`);
    }

    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    
    // Process each page that is not deleted
    for (const pageItem of docItem.pages) {
      if (pageItem.isDeleted) continue;

      const pageIndex = pageItem.originalPageNumber - 1;
      const [copiedPage] = await mergedDoc.copyPages(srcDoc, [pageIndex]);

      if (pageItem.rotation !== 0) {
        const currentRot = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRot + pageItem.rotation) % 360));
      }

      mergedDoc.addPage(copiedPage);
    }
  }

  if (mergedDoc.getPageCount() === 0) {
    throw new Error('No pages were added to the merged PDF. Please ensure at least one page is not excluded.');
  }

  if (onProgress) {
    onProgress('Finalizing and encoding merged PDF...');
  }

  const mergedBytes = await mergedDoc.save();
  return new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
};

/**
 * Generate a realistic sample PDF for testing/demo
 */
export const createSamplePdf = async (
  title: string,
  subtitle: string,
  pageCount: number = 2,
  themeColor: { r: number; g: number; b: number } = { r: 0.1, g: 0.2, b: 0.35 }
): Promise<DocumentItem> => {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // Top decorative banner
    page.drawRectangle({
      x: 0,
      y: height - 12,
      width: width,
      height: 12,
      color: rgb(themeColor.r, themeColor.g, themeColor.b),
    });

    // Header badge
    page.drawText('DOCUMENT RECORD // CONFIDENTIAL', {
      x: 48,
      y: height - 60,
      size: 9,
      font: fontBold,
      color: rgb(0.45, 0.5, 0.55),
    });

    // Document Title
    page.drawText(`${title} - Page ${i}`, {
      x: 48,
      y: height - 95,
      size: 24,
      font: fontBold,
      color: rgb(0.1, 0.12, 0.15),
    });

    // Subtitle
    page.drawText(`${subtitle} • Generated for Paprbndr Local Testing`, {
      x: 48,
      y: height - 120,
      size: 11,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.45),
    });

    // Divider
    page.drawLine({
      start: { x: 48, y: height - 138 },
      end: { x: width - 48, y: height - 138 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.9),
    });

    // Content body
    const paragraphs = [
      `Section 1.${i}: Overview and Architectural Scope`,
      `This document section outlines the client-side processing pipeline for document manipulation. All operations are executed locally within the browser sandbox without sending binary data across external networks.`,
      `Security & Privacy: By leveraging WebAssembly and modern ECMAScript standard streams, this PDF file demonstrates zero-latency rendering, page reordering, and lossless merging.`,
      `Document Metadata: Sheet ${i} of ${pageCount} | Format: Standard ISO 216 A4 | DPI: 300 | Color Model: sRGB.`,
    ];

    let currentY = height - 180;
    for (const text of paragraphs) {
      if (text.startsWith('Section')) {
        page.drawText(text, {
          x: 48,
          y: currentY,
          size: 13,
          font: fontBold,
          color: rgb(0.15, 0.2, 0.25),
        });
        currentY -= 26;
      } else {
        page.drawText(text, {
          x: 48,
          y: currentY,
          size: 10,
          font: fontRegular,
          color: rgb(0.25, 0.3, 0.35),
          maxWidth: width - 96,
          lineHeight: 16,
        });
        currentY -= 45;
      }
    }

    // A sample visual table box
    page.drawRectangle({
      x: 48,
      y: currentY - 110,
      width: width - 96,
      height: 90,
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1,
      color: rgb(0.97, 0.98, 0.99),
    });

    page.drawText('METRIC / ATTRIBUTE', {
      x: 64,
      y: currentY - 45,
      size: 9,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.4),
    });
    page.drawText('VERIFICATION VALUE', {
      x: 320,
      y: currentY - 45,
      size: 9,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.4),
    });

    page.drawLine({
      start: { x: 48, y: currentY - 58 },
      end: { x: width - 48, y: currentY - 58 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.9),
    });

    page.drawText(`Integrity Checksum (Page ${i})`, {
      x: 64,
      y: currentY - 80,
      size: 9,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.3),
    });
    page.drawText(`SHA-256: 7a8f9c2d...${i * 1024}`, {
      x: 320,
      y: currentY - 80,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.4, 0.2),
    });

    // Footer
    page.drawLine({
      start: { x: 48, y: 55 },
      end: { x: width - 48, y: 55 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.9),
    });

    page.drawText(`Paprbndr Studio • ${title}.pdf`, {
      x: 48,
      y: 40,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.6),
    });

    page.drawText(`Page ${i} / ${pageCount}`, {
      x: width - 90,
      y: 40,
      size: 8,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.4),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const id = generateId();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  setBuffer(id, blob);

  const pages: PDFPageItem[] = [];
  for (let i = 1; i <= pageCount; i++) {
    pages.push({
      id: `${id}_p${i}`,
      originalPageNumber: i,
      rotation: 0,
      isDeleted: false,
    });
  }

  return {
    id,
    name: `${title}.pdf`,
    size: blob.size,
    totalPages: pageCount,
    isExpanded: false,
    pages,
    createdAt: Date.now(),
  };
};

/**
 * Download a Blob as a file in browser
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = cleanName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 3500);
};

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Generate a pair of contract revisions for testing Visual Document Diff
 */
export const createContractDiffPair = async (): Promise<[DocumentItem, DocumentItem]> => {
  // Document A: Version 1.0
  const docA = await PDFDocument.create();
  const fontBold = await docA.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await docA.embedFont(StandardFonts.Helvetica);

  const pageA = docA.addPage([595.28, 841.89]);
  const { width: wA, height: hA } = pageA.getSize();

  pageA.drawRectangle({ x: 0, y: hA - 10, width: wA, height: 10, color: rgb(0.15, 0.2, 0.28) });
  pageA.drawText('CONFIDENTIAL LEGAL INSTRUMENT', { x: 48, y: hA - 50, size: 9, font: fontBold, color: rgb(0.5, 0.55, 0.6) });
  pageA.drawText('MASTER SERVICE AGREEMENT (v1.0)', { x: 48, y: hA - 80, size: 20, font: fontBold, color: rgb(0.1, 0.12, 0.15) });
  pageA.drawText('Effective Date: March 15, 2026 • Jurisdiction: State of California', { x: 48, y: hA - 102, size: 10, font: fontReg, color: rgb(0.4, 0.45, 0.5) });
  pageA.drawLine({ start: { x: 48, y: hA - 118 }, end: { x: wA - 48, y: hA - 118 }, thickness: 1, color: rgb(0.85, 0.88, 0.9) });

  const paragraphsA = [
    { title: 'Section 1. Statement of Work & Delivery', body: 'Service Provider shall perform the professional cloud architecture services described in Exhibit A. All deliverables must conform to standard quality acceptance tests conducted within ten (10) business days.' },
    { title: 'Section 2. Compensation, Invoicing & Terms', body: 'Client agrees to pay a fixed professional service fee of $50,000 USD. Invoices are submitted bi-weekly and payable Net 30 days from date of receipt. Late payments shall incur interest of 1.5% per month.' },
    { title: 'Section 3. Term and Termination Notice', body: 'Either party may terminate this Agreement without cause upon providing thirty (30) calendar days prior written notice to the designated legal address of the counterparty.' },
    { title: 'Section 4. Limitation of Liability', body: 'In no event shall either party total aggregate liability exceed the total amounts actually paid under this Agreement in the preceding twelve (12) months, strictly capped at $50,000 USD.' },
  ];

  let yA = hA - 160;
  for (const p of paragraphsA) {
    pageA.drawText(p.title, { x: 48, y: yA, size: 12, font: fontBold, color: rgb(0.12, 0.16, 0.22) });
    yA -= 20;
    pageA.drawText(p.body, { x: 48, y: yA, size: 10, font: fontReg, color: rgb(0.3, 0.35, 0.4), maxWidth: wA - 96, lineHeight: 16 });
    yA -= 55;
  }

  // Footer
  pageA.drawText('Page 1 of 1 • Contract_Agreement_v1.0.pdf', { x: 48, y: 40, size: 8, font: fontReg, color: rgb(0.5, 0.55, 0.6) });

  const bytesA = await docA.save();
  const idA = generateId();
  const blobA = new Blob([bytesA.buffer as ArrayBuffer], { type: 'application/pdf' });
  setBuffer(idA, blobA);

  const itemA: DocumentItem = {
    id: idA,
    name: 'Contract_Agreement_v1.0.pdf',
    size: blobA.size,
    totalPages: 1,
    isExpanded: false,
    pages: [{ id: `${idA}_p1`, originalPageNumber: 1, rotation: 0, isDeleted: false }],
    createdAt: Date.now(),
  };

  // Document B: Version 2.1 Revised
  const docB = await PDFDocument.create();
  const fontBoldB = await docB.embedFont(StandardFonts.HelveticaBold);
  const fontRegB = await docB.embedFont(StandardFonts.Helvetica);

  const pageB = docB.addPage([595.28, 841.89]);
  const { width: wB, height: hB } = pageB.getSize();

  pageB.drawRectangle({ x: 0, y: hB - 10, width: wB, height: 10, color: rgb(0.05, 0.35, 0.2) });
  pageB.drawText('CONFIDENTIAL LEGAL INSTRUMENT // REVISED', { x: 48, y: hB - 50, size: 9, font: fontBoldB, color: rgb(0.1, 0.45, 0.25) });
  pageB.drawText('MASTER SERVICE AGREEMENT (v2.1 Revised)', { x: 48, y: hB - 80, size: 20, font: fontBoldB, color: rgb(0.1, 0.12, 0.15) });
  pageB.drawText('Effective Date: April 02, 2026 • Jurisdiction: State of California', { x: 48, y: hB - 102, size: 10, font: fontRegB, color: rgb(0.4, 0.45, 0.5) });
  pageB.drawLine({ start: { x: 48, y: hB - 118 }, end: { x: wB - 48, y: hB - 118 }, thickness: 1, color: rgb(0.85, 0.88, 0.9) });

  const paragraphsB = [
    { title: 'Section 1. Statement of Work & Delivery', body: 'Service Provider shall perform the professional cloud architecture services described in Exhibit A, including 24/7 emergency failover response. All deliverables must conform to quality acceptance tests conducted within five (5) business days.' },
    { title: 'Section 2. Compensation, Invoicing & Terms', body: 'Client agrees to pay a revised professional service fee of $75,000 USD. Invoices are submitted bi-weekly and payable Net 14 days from date of receipt. Late payments shall incur interest of 3.0% per month.' },
    { title: 'Section 3. Term and Termination Notice', body: 'Either party may terminate this Agreement without cause upon providing fourteen (14) calendar days prior written notice to the designated legal address of the counterparty.' },
    { title: 'Section 4. Limitation of Liability', body: 'In no event shall either party total aggregate liability exceed two times (2x) the total amounts actually paid under this Agreement, capped at $150,000 USD, with mutual IP indemnity obligations.' },
    { title: 'Section 5. Data Privacy & Audit Compliance', body: 'Service Provider warrants full compliance with ISO/IEC 27001 and SOC 2 Type II data protection security controls throughout the engagement duration.' },
  ];

  let yB = hB - 160;
  for (const p of paragraphsB) {
    pageB.drawText(p.title, { x: 48, y: yB, size: 12, font: fontBoldB, color: rgb(0.12, 0.16, 0.22) });
    yB -= 20;
    pageB.drawText(p.body, { x: 48, y: yB, size: 10, font: fontRegB, color: rgb(0.3, 0.35, 0.4), maxWidth: wB - 96, lineHeight: 16 });
    yB -= 52;
  }

  // Footer
  pageB.drawText('Page 1 of 1 • Contract_Agreement_v2.1.pdf', { x: 48, y: 40, size: 8, font: fontRegB, color: rgb(0.5, 0.55, 0.6) });

  const bytesB = await docB.save();
  const idB = generateId();
  const blobB = new Blob([bytesB.buffer as ArrayBuffer], { type: 'application/pdf' });
  setBuffer(idB, blobB);

  const itemB: DocumentItem = {
    id: idB,
    name: 'Contract_Agreement_v2.1.pdf',
    size: blobB.size,
    totalPages: 1,
    isExpanded: false,
    pages: [{ id: `${idB}_p1`, originalPageNumber: 1, rotation: 0, isDeleted: false }],
    createdAt: Date.now() + 10,
  };

  return [itemA, itemB];
};
