"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false });

type DocEntry = { id: string; file: File; url: string };

export default function Home() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [flatten, setFlatten] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [watermarkColor, setWatermarkColor] = useState("#BFBFBF");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDoc = docs.find((d) => d.id === activeId) ?? null;

  const addFiles = (selected: FileList | File[]) => {
    const pdfs = Array.from(selected).filter(
      (f) => f.type === "application/pdf"
    );
    if (pdfs.length === 0) return;

    const entries: DocEntry[] = pdfs.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));

    setDocs((prev) => [...prev, ...entries]);
    setActiveId((prev) => prev ?? entries[0].id);
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const next = prev.filter((d) => d.id !== id);
      setActiveId((curr) =>
        curr === id ? next[0]?.id ?? null : curr
      );
      return next;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
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

  // Draw the watermark onto every page and return the bytes (no flattening).
  const applyWatermark = async (file: File): Promise<Uint8Array> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const text = watermarkText.trim();

    const r = parseInt(watermarkColor.slice(1, 3), 16) / 255;
    const g = parseInt(watermarkColor.slice(3, 5), 16) / 255;
    const b = parseInt(watermarkColor.slice(5, 7), 16) / 255;

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
        color: rgb(r, g, b),
        rotate: degrees(45),
        opacity: watermarkOpacity,
      });
    }

    return pdfDoc.save();
  };

  // Watermark a single file and return the final (optionally flattened) bytes.
  const watermarkOne = async (file: File): Promise<Uint8Array> => {
    const pdfBytes = await applyWatermark(file);
    return flatten ? await flattenPdf(new Uint8Array(pdfBytes)) : pdfBytes;
  };

  // Rasterize each page of a PDF to a JPEG data URL via pdf.js.
  const renderPdfToImages = async (
    pdfBytes: Uint8Array
  ): Promise<string[]> => {
    const { pdfjs } = await import("react-pdf");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const doc = await pdfjs.getDocument({ data: pdfBytes }).promise;
    const urls: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvas, viewport }).promise;
      urls.push(canvas.toDataURL("image/jpeg", 0.92));
    }

    doc.destroy();
    return urls;
  };

  const downloadName = (file: File) =>
    file.name.replace(/\.pdf$/i, "") + "-watermarked.pdf";

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addWatermark = async () => {
    if (docs.length === 0 || !watermarkText.trim()) return;

    setProcessing(true);
    try {
      if (docs.length === 1) {
        const bytes = await watermarkOne(docs[0].file);
        triggerDownload(
          new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
          downloadName(docs[0].file)
        );
      } else {
        const zip = new JSZip();
        const used = new Set<string>();
        for (const doc of docs) {
          const bytes = await watermarkOne(doc.file);
          let name = downloadName(doc.file);
          // Avoid clobbering duplicate filenames inside the archive.
          for (let n = 2; used.has(name); n++) {
            name = downloadName(doc.file).replace(/\.pdf$/i, `-${n}.pdf`);
          }
          used.add(name);
          zip.file(name, bytes);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        triggerDownload(blob, "watermarked.zip");
      }
    } catch (err) {
      console.error("Failed to watermark PDF:", err);
      alert("Failed to process the PDF. Make sure each file is a valid PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const printWatermarked = async () => {
    if (docs.length === 0 || !watermarkText.trim()) return;

    setProcessing(true);
    try {
      // Render every watermarked page to an image. Printing images in a plain
      // HTML document avoids relying on the browser's PDF viewer, whose
      // render timing inside a hidden iframe is unreliable.
      const images: string[] = [];
      for (const doc of docs) {
        const bytes = await applyWatermark(doc.file);
        images.push(...(await renderPdfToImages(bytes)));
      }

      const imgTags = images
        .map((src) => `<img src="${src}" />`)
        .join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        @page { margin: 0; }
        html, body { margin: 0; padding: 0; }
        img { display: block; width: 100%; page-break-after: always; }
        img:last-child { page-break-after: auto; }
      </style></head><body>${imgTags}</body></html>`;

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "800px";
      iframe.style.height = "1000px";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const idoc = iframe.contentWindow!.document;
      idoc.open();
      idoc.write(html);
      idoc.close();

      // Wait until every image has finished loading before printing, so the
      // print preview never captures a half-rendered document.
      const imgs = Array.from(idoc.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
        )
      );

      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();

      const cleanup = () => iframe.remove();
      iframe.contentWindow!.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 60000);
    } catch (err) {
      console.error("Failed to prepare PDF for printing:", err);
      alert("Failed to prepare the PDF for printing. Make sure each file is a valid PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const canProcess = docs.length > 0 && watermarkText.trim() && !processing;

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
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-sm text-text-secondary">
            {docs.length > 0
              ? "Drop or click to add more PDFs"
              : "Drop PDFs here or click to select"}
          </p>
        </div>

        {/* Uploaded files list */}
        {docs.length > 0 && (
          <ul className="flex flex-col gap-1">
            {docs.map((doc) => (
              <li
                key={doc.id}
                onClick={() => setActiveId(doc.id)}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                  doc.id === activeId
                    ? "bg-surface-hover text-foreground"
                    : "text-text-secondary hover:bg-surface-hover"
                }`}
              >
                <span className="flex-1 truncate" title={doc.file.name}>
                  {doc.file.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDoc(doc.id);
                  }}
                  aria-label={`Remove ${doc.file.name}`}
                  className="shrink-0 text-text-muted opacity-0 transition-opacity duration-150 hover:text-foreground group-hover:opacity-100"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

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

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={addWatermark}
            disabled={!canProcess}
            className="w-full rounded-[10px] bg-accent py-3.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-accent-hover disabled:opacity-40"
          >
            {processing
              ? "Processing..."
              : docs.length > 1
                ? "Add Watermark & Download ZIP"
                : "Add Watermark & Download"}
          </button>
          <button
            onClick={printWatermarked}
            disabled={!canProcess}
            className="w-full rounded-[10px] border border-border py-3.5 text-sm font-semibold text-foreground transition-all duration-150 hover:bg-surface-hover disabled:opacity-40"
          >
            {docs.length > 1 ? "Print All" : "Print"}
          </button>
        </div>

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
        {activeDoc ? (
          <PdfPreview key={activeDoc.id} fileUrl={activeDoc.url} watermarkText={watermarkText} watermarkColor={watermarkColor} watermarkOpacity={watermarkOpacity} />
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
