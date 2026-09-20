import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getBuffer } from '../../services/bufferRegistry';

interface SideBySideViewProps {
  docAId: string;
  docBId: string;
  pageA: number;
  pageB: number;
  zoom: number;
}

export const SideBySideView: React.FC<SideBySideViewProps> = ({
  docAId,
  docBId,
  pageA,
  pageB,
  zoom,
}) => {
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);

  const [pdfA, setPdfA] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfB, setPdfB] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    let isCancelled = false;
    getBuffer(docAId).then((buf) => {
      if (!isCancelled && buf) {
        pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise.then((doc) => {
          if (!isCancelled) setPdfA(doc);
        });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [docAId]);

  useEffect(() => {
    let isCancelled = false;
    getBuffer(docBId).then((buf) => {
      if (!isCancelled && buf) {
        pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise.then((doc) => {
          if (!isCancelled) setPdfB(doc);
        });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [docBId]);

  // Render Canvas A
  useEffect(() => {
    let isCancelled = false;
    const renderA = async () => {
      if (!pdfA || !canvasARef.current) return;
      try {
        const page = await pdfA.getPage(Math.min(pageA, pdfA.numPages));
        if (isCancelled) return;
        const vp = page.getViewport({ scale: zoom });
        const canvas = canvasARef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = `${Math.floor(vp.width)}px`;
        canvas.style.height = `${Math.floor(vp.height)}px`;

        await page.render({
          canvasContext: ctx,
          viewport: vp,
          canvas: canvas,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        }).promise;
      } catch (err) {
        console.error('SideBySide Render A error', err);
      }
    };
    renderA();
    return () => {
      isCancelled = true;
    };
  }, [pdfA, pageA, zoom]);

  // Render Canvas B
  useEffect(() => {
    let isCancelled = false;
    const renderB = async () => {
      if (!pdfB || !canvasBRef.current) return;
      try {
        const page = await pdfB.getPage(Math.min(pageB, pdfB.numPages));
        if (isCancelled) return;
        const vp = page.getViewport({ scale: zoom });
        const canvas = canvasBRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = `${Math.floor(vp.width)}px`;
        canvas.style.height = `${Math.floor(vp.height)}px`;

        await page.render({
          canvasContext: ctx,
          viewport: vp,
          canvas: canvas,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        }).promise;
      } catch (err) {
        console.error('SideBySide Render B error', err);
      }
    };
    renderB();
    return () => {
      isCancelled = true;
    };
  }, [pdfB, pageB, zoom]);

  return (
    <div className="diff-stage-viewport">
      <div className="side-by-side-wrapper">
        <div className="side-pane">
          <div className="side-pane-header">
            <span className="diff-doc-badge doc-a-badge">Doc A (Original)</span>
            <span className="side-pane-page">Page {pageA}</span>
          </div>
          <div className="side-pane-canvas-box">
            <canvas ref={canvasARef} />
          </div>
        </div>

        <div className="side-pane">
          <div className="side-pane-header">
            <span className="diff-doc-badge doc-b-badge">Doc B (Revised)</span>
            <span className="side-pane-page">Page {pageB}</span>
          </div>
          <div className="side-pane-canvas-box">
            <canvas ref={canvasBRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
