import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://watermark.flagvault.com"),
  title: "Watermark",
  description: "Add text watermarks to your PDFs — entirely in the browser",
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Watermark",
    description: "Add text watermarks to your PDFs — entirely in the browser",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Watermark",
    description: "Add text watermarks to your PDFs — entirely in the browser",
    images: ["/og.png"],
  },
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
