"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false });

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [flatten, setFlatten] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [watermarkColor, setWatermarkColor] = useState("#BFBFBF");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File) => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(selected);
    setFileUrl(URL.createObjectURL(selected));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      handleFile(dropped);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const flattenPdf = async (pdfBytes: Uint8Array): Promise<Uint8Array> => {
    const { pdfjs } = await import("react-pdf");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const doc = await pdfjs.getDocument({ data: pdfBytes }).promise;
    const flatDoc = await PDFDocument.create();

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const origViewport = page.getViewport({ scale: 1 });
      const renderViewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;

      await page.render({ canvas, viewport: renderViewport }).promise;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92);
      });
      const imgBytes = new Uint8Array(await blob.arrayBuffer());
      const img = await flatDoc.embedJpg(imgBytes);

      const flatPage = flatDoc.addPage([
        origViewport.width,
        origViewport.height,
      ]);
      flatPage.drawImage(img, {
        x: 0,
        y: 0,
        width: flatPage.getWidth(),
        height: flatPage.getHeight(),
      });
    }

    doc.destroy();
    return flatDoc.save();
  };

  const addWatermark = async () => {
    if (!file || !watermarkText.trim()) return;

    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const text = watermarkText.trim();

      for (const page of pages) {
        const { width, height } = page.getSize();
        const minDim = Math.min(width, height);

        const widthAt1 = font.widthOfTextAtSize(text, 1);
        const maxFontSize = (minDim * Math.SQRT2 * 0.9) / (widthAt1 + 1);
        const fontSize = Math.min(maxFontSize, 200);

        const textWidth = font.widthOfTextAtSize(text, fontSize);

        const cos45 = Math.SQRT1_2;
        const x = width / 2 - cos45 * (textWidth / 2) + cos45 * (fontSize / 2);
        const y = height / 2 - cos45 * (textWidth / 2) - cos45 * (fontSize / 2);

        const r = parseInt(watermarkColor.slice(1, 3), 16) / 255;
        const g = parseInt(watermarkColor.slice(3, 5), 16) / 255;
        const b = parseInt(watermarkColor.slice(5, 7), 16) / 255;

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          rotate: degrees(45),
          opacity: watermarkOpacity,
        });
      }

      const pdfBytes = await pdfDoc.save();

      const finalBytes = flatten
        ? await flattenPdf(new Uint8Array(pdfBytes))
        : pdfBytes;

      const blob = new Blob([new Uint8Array(finalBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, "") + "-watermarked.pdf";
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to watermark PDF:", err);
      alert("Failed to process the PDF. Make sure it's a valid PDF file.");
    } finally {
      setProcessing(false);
    }
  };

  const canProcess = file && watermarkText.trim() && !processing;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — fixed, does not scroll */}
      <aside className="flex h-full w-[300px] shrink-0 flex-col gap-6 border-r border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="" width={28} height={28} />
          <h1 className="text-xl font-semibold tracking-tight">
            Watermark
          </h1>
        </div>
        <p className="text-sm text-text-secondary">
          Add a text watermark to every page. Everything runs in your browser.
        </p>

        {/* File drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-border p-6 text-center transition-all duration-150 hover:border-text-muted hover:bg-surface-hover"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <p className="text-sm font-medium break-all">{file.name}</p>
          ) : (
            <p className="text-sm text-text-secondary">
              Drop a PDF here or click to select
            </p>
          )}
        </div>

        {/* Watermark text input */}
        <input
          type="text"
          placeholder="Watermark text"
          value={watermarkText}
          onChange={(e) => setWatermarkText(e.target.value)}
          className="w-full rounded-[10px] border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-text-muted focus:border-text-secondary"
        />

        {/* Advanced section */}
        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex w-full items-center justify-between text-sm text-text-secondary hover:text-foreground transition-colors duration-150"
          >
            <span>Advanced</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform duration-150 ${advancedOpen ? "rotate-180" : ""}`}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {advancedOpen && (
            <div className="mt-3 flex flex-col gap-4">
              {/* Color picker */}
              <label className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Color</span>
                <input
                  type="color"
                  value={watermarkColor}
                  onChange={(e) => setWatermarkColor(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
              </label>

              {/* Opacity slider */}
              <label className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Opacity</span>
                  <span className="text-sm text-text-muted">{Math.round(watermarkOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                  className="w-full accent-accent"
                />
              </label>

              {/* Flatten toggle */}
              <label className="flex cursor-pointer items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={flatten}
                  onClick={() => setFlatten(!flatten)}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150 ${flatten ? "bg-accent" : "bg-border"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-150 ${flatten ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
                <span>
                  <span className="text-sm text-text-secondary">Flatten PDF</span>
                  <span className="block text-xs text-text-muted">
                    Prevents watermark removal
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Download button */}
        <button
          onClick={addWatermark}
          disabled={!canProcess}
          className="w-full rounded-[10px] bg-accent py-3.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-accent-hover disabled:opacity-40"
        >
          {processing ? "Processing..." : "Add Watermark & Download"}
        </button>

        <div className="mt-auto flex gap-3 text-xs text-text-muted">
          <Link href="/terms" className="hover:text-text-secondary">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-text-secondary">
            Privacy
          </Link>
        </div>
      </aside>

      {/* Preview area — scrolls independently */}
      <main className="flex-1 overflow-y-auto bg-background">
        {fileUrl ? (
          <PdfPreview fileUrl={fileUrl} watermarkText={watermarkText} watermarkColor={watermarkColor} watermarkOpacity={watermarkOpacity} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-muted">
              Upload a PDF to preview it here
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
