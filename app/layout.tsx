import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Watermark",
  description: "Add text watermarks to your PDFs — entirely in the browser",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
