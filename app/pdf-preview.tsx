"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const PAGE_WIDTH = 600;

// Approximate the largest font size where 45-degree-rotated text fits within
// a rectangle of the given width and height. Uses 0.55 as the average
// character-width-to-font-size ratio for sans-serif CSS fonts.
function fitFontSize(textLength: number, w: number, h: number): number {
  const charWidthRatio = 0.55;
  const minDim = Math.min(w, h);
  const maxSize = (minDim * Math.SQRT2 * 0.9) / (textLength * charWidthRatio + 1);
  return Math.min(maxSize, 150);
}

export default function PdfPreview({
  fileUrl,
  watermarkText,
  watermarkColor,
  watermarkOpacity,
}: {
  fileUrl: string;
  watermarkText: string;
  watermarkColor: string;
  watermarkOpacity: number;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={
          <p className="py-20 text-sm text-text-secondary">Loading PDF...</p>
        }
        error={
          <p className="py-20 text-sm text-accent">Failed to load PDF.</p>
        }
      >
        {numPages &&
          Array.from({ length: numPages }, (_, i) => (
            <WatermarkedPage
              key={i}
              pageNumber={i + 1}
              watermarkText={watermarkText}
              watermarkColor={watermarkColor}
              watermarkOpacity={watermarkOpacity}
            />
          ))}
      </Document>
    </div>
  );
}

function WatermarkedPage({
  pageNumber,
  watermarkText,
  watermarkColor,
  watermarkOpacity,
}: {
  pageNumber: number;
  watermarkText: string;
  watermarkColor: string;
  watermarkOpacity: number;
}) {
  const [pageHeight, setPageHeight] = useState<number | null>(null);

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-border">
      <Page
        pageNumber={pageNumber}
        width={PAGE_WIDTH}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onRenderSuccess={(page) => {
          setPageHeight(page.height);
        }}
      />
      {watermarkText && pageHeight && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span
            className="whitespace-nowrap select-none"
            style={{
              fontSize: fitFontSize(watermarkText.length, PAGE_WIDTH, pageHeight),
              color: watermarkColor,
              opacity: watermarkOpacity,
              transform: "rotate(-45deg)",
            }}
          >
            {watermarkText}
          </span>
        </div>
      )}
    </div>
  );
}
