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

        {/* Flatten toggle */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={flatten}
            onChange={(e) => setFlatten(e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          <span className="text-sm text-text-secondary">
            Flatten PDF
            <span className="block text-xs text-text-muted">
              Prevents the watermark from being edited or removed
            </span>
          </span>
        </label>

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
          <PdfPreview fileUrl={fileUrl} watermarkText={watermarkText} />
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
