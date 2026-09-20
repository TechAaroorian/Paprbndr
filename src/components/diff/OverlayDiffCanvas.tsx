import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getBuffer } from '../../services/bufferRegistry';

interface OverlayDiffCanvasProps {
  docAId: string;
  docBId: string;
  pageA: number;
  pageB: number;
  zoom: number;
}

export const OverlayDiffCanvas: React.FC<OverlayDiffCanvasProps> = ({
  docAId,
  docBId,
  pageA,
  pageB,
  zoom,
}) => {
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfA, setPdfA] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfB, setPdfB] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [diffStats, setDiffStats] = useState<{ additions: number; deletions: number; unchanged: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  useEffect(() => {
    let isCancelled = false;

    const computePixelDiff = async () => {
      if (!pdfA || !pdfB || !diffCanvasRef.current) return;

      setIsProcessing(true);
      try {
        const pA = await pdfA.getPage(Math.min(pageA, pdfA.numPages));
        const pB = await pdfB.getPage(Math.min(pageB, pdfB.numPages));
        if (isCancelled) return;

        const vpA = pA.getViewport({ scale: zoom });
        const vpB = pB.getViewport({ scale: zoom });

        const width = Math.floor(Math.max(vpA.width, vpB.width));
        const height = Math.floor(Math.max(vpA.height, vpB.height));

        // Offscreen canvas A
        const offCanvasA = document.createElement('canvas');
        offCanvasA.width = width;
        offCanvasA.height = height;
        const ctxA = offCanvasA.getContext('2d');
        if (!ctxA) return;

        // Offscreen canvas B
        const offCanvasB = document.createElement('canvas');
        offCanvasB.width = width;
        offCanvasB.height = height;
        const ctxB = offCanvasB.getContext('2d');
        if (!ctxB) return;

        await pA.render({ canvasContext: ctxA, viewport: vpA, canvas: offCanvasA }).promise;
        await pB.render({ canvasContext: ctxB, viewport: vpB, canvas: offCanvasB }).promise;
        if (isCancelled) return;

        const imgDataA = ctxA.getImageData(0, 0, width, height);
        const imgDataB = ctxB.getImageData(0, 0, width, height);

        const dataA = imgDataA.data;
        const dataB = imgDataB.data;

        // Target diff canvas
        const diffCanvas = diffCanvasRef.current;
        diffCanvas.width = width;
        diffCanvas.height = height;
        diffCanvas.style.width = `${width}px`;
        diffCanvas.style.height = `${height}px`;

        const diffCtx = diffCanvas.getContext('2d');
        if (!diffCtx) return;

        const diffImgData = diffCtx.createImageData(width, height);
        const outData = diffImgData.data;

        let additionsCount = 0;
        let deletionsCount = 0;
        let unchangedCount = 0;

        const totalPixels = width * height;
        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;

          const rA = dataA[idx];
          const gA = dataA[idx + 1];
          const bA = dataA[idx + 2];
          const lumA = (rA * 299 + gA * 587 + bA * 114) / 1000;

          const rB = dataB[idx];
          const gB = dataB[idx + 1];
          const bB = dataB[idx + 2];
          const lumB = (rB * 299 + gB * 587 + bB * 114) / 1000;

          // Threshold for detecting ink vs paper background
          const inkThreshold = 225;
          const isInkA = lumA < inkThreshold;
          const isInkB = lumB < inkThreshold;

          if (isInkA && isInkB) {
            // Unchanged text: dark neutral slate
            outData[idx] = 71;      // R
            outData[idx + 1] = 85;  // G
            outData[idx + 2] = 105; // B
            outData[idx + 3] = 255; // Alpha
            unchangedCount++;
          } else if (!isInkA && isInkB) {
            // Added in Document B: vibrant emerald green
            outData[idx] = 16;     // R
            outData[idx + 1] = 185; // G
            outData[idx + 2] = 129; // B
            outData[idx + 3] = 255;
            additionsCount++;
          } else if (isInkA && !isInkB) {
            // Removed from Document A: vibrant coral red
            outData[idx] = 239;    // R
            outData[idx + 1] = 68;  // G
            outData[idx + 2] = 68;  // B
            outData[idx + 3] = 255;
            deletionsCount++;
          } else {
            // Background: clean white
            outData[idx] = 255;
            outData[idx + 1] = 255;
            outData[idx + 2] = 255;
            outData[idx + 3] = 255;
          }
        }

        diffCtx.putImageData(diffImgData, 0, 0);
        setDiffStats({ additions: additionsCount, deletions: deletionsCount, unchanged: unchangedCount });
      } catch (err) {
        console.error('Pixel diff computation error', err);
      } finally {
        setIsProcessing(false);
      }
    };

    computePixelDiff();

    return () => {
      isCancelled = true;
    };
  }, [pdfA, pdfB, pageA, pageB, zoom]);

  return (
    <div className="diff-stage-viewport">
      {/* Legend & Stats Banner */}
      <div className="diff-legend-banner">
        <div className="diff-legend-item">
          <span className="diff-legend-color add-color" />
          <span>Added in B (Revised)</span>
          {diffStats && <span className="diff-legend-count">+{diffStats.additions.toLocaleString()} px</span>}
        </div>

        <div className="diff-legend-item">
          <span className="diff-legend-color del-color" />
          <span>Removed from A (Original)</span>
          {diffStats && <span className="diff-legend-count">-{diffStats.deletions.toLocaleString()} px</span>}
        </div>

        <div className="diff-legend-item">
          <span className="diff-legend-color match-color" />
          <span>Unchanged Content</span>
        </div>
      </div>

      <div className="diff-canvas-card">
        {isProcessing && (
          <div className="diff-processing-overlay">
            <span>Analyzing pixel differences...</span>
          </div>
        )}
        <canvas ref={diffCanvasRef} />
      </div>
    </div>
  );
};
