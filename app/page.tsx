"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false });

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [processing, setProcessing] = useState(false);
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

        // Calculate largest font size where rotated text fits on page.
        // At 45° rotation, bounding box = (textWidth + fontSize) * sin(45)
        // for each axis. Constraint: (tw + fh) * 0.707 <= minDim.
        // Since widthOfTextAtSize scales linearly: tw = widthAt1 * fontSize.
        const widthAt1 = font.widthOfTextAtSize(text, 1);
        const maxFontSize = (minDim * Math.SQRT2 * 0.9) / (widthAt1 + 1);
        const fontSize = Math.min(maxFontSize, 200);

        const textWidth = font.widthOfTextAtSize(text, fontSize);

        // Center the rotated text. drawText places (x,y) at the baseline
        // start and rotates around that point. We offset so the rotated
        // center lands at the page center.
        const cos45 = Math.SQRT1_2;
        const x = width / 2 - cos45 * (textWidth / 2) + cos45 * (fontSize / 2);
        const y = height / 2 - cos45 * (textWidth / 2) - cos45 * (fontSize / 2);

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.75, 0.75, 0.75),
          rotate: degrees(45),
          opacity: 0.3,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], {
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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-6 border-r border-zinc-200 p-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            PDF Watermark
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Add a text watermark to every page. Everything runs in your browser.
          </p>
        </div>

        {/* File drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400"
        />

        {/* Download button */}
        <button
          onClick={addWatermark}
          disabled={!canProcess}
          className="w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-40"
        >
          {processing ? "Processing..." : "Add Watermark & Download"}
        </button>
      </aside>

      {/* Preview area */}
      <main className="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-900">
        {fileUrl ? (
          <PdfPreview fileUrl={fileUrl} watermarkText={watermarkText} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-400">
              Upload a PDF to preview it here
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
