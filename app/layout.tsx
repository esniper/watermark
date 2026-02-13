import type { Metadata } from "next";
import "./globals.css";

const title = "Watermark — Free PDF watermarking, right in your browser";
const description =
  "Add diagonal text watermarks to every page of your PDF. Runs entirely in your browser — files never leave your device. No signup required, completely free.";

export const metadata: Metadata = {
  metadataBase: new URL("https://watermark.flagvault.com"),
  title,
  description,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
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
