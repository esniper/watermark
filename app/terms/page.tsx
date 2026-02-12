import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Watermark",
};

export default function Terms() {
  return (
    <div className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-[640px]">
        <Link href="/" className="mb-12 inline-flex items-center gap-3">
          <Image src="/logo.svg" alt="" width={28} height={28} />
          <span className="text-xl font-semibold tracking-tight">
            Watermark
          </span>
        </Link>

        <h1 className="mb-2 text-2xl font-bold">Terms of Service</h1>
        <p className="mb-10 text-sm text-text-secondary">
          Effective February 12, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-text-secondary">
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              1. Overview
            </h2>
            <p>
              Watermark is operated by FlagVault Technologies. By using this
              service you agree to these terms. If you do not agree, please do
              not use the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              2. How the Service Works
            </h2>
            <p>
              Watermark processes PDF files entirely in your browser.
              Your files are never uploaded to our servers. All watermarking
              happens client-side using JavaScript.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              3. Your Content
            </h2>
            <p>
              You retain full ownership of any files you open with PDF
              Watermark. Because processing happens locally in your browser,
              FlagVault Technologies never accesses, stores, or transmits your
              uploaded content.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              4. Acceptable Use
            </h2>
            <p>
              You agree not to use the service for any unlawful purpose or in
              any way that could damage, disable, or impair the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              5. Disclaimer of Warranties
            </h2>
            <p>
              The service is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, whether express
              or implied. FlagVault Technologies does not warrant that the
              service will be uninterrupted, error-free, or that the results
              will meet your requirements.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              6. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, FlagVault Technologies
              shall not be liable for any indirect, incidental, special, or
              consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              7. Changes to These Terms
            </h2>
            <p>
              We may update these terms from time to time. Continued use of the
              service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              8. Contact
            </h2>
            <p>
              Questions about these terms? Reach us at{" "}
              <a
                href="mailto:privacy@flagvault.com"
                className="text-foreground underline"
              >
                privacy@flagvault.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
