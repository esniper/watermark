import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Watermark",
};

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-[640px]">
        <Link href="/" className="mb-12 inline-flex items-center gap-3">
          <Image src="/logo.svg" alt="" width={28} height={28} />
          <span className="text-xl font-semibold tracking-tight">
            Watermark
          </span>
        </Link>

        <h1 className="mb-2 text-2xl font-bold">Privacy Policy</h1>
        <p className="mb-10 text-sm text-text-secondary">
          Effective February 12, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-text-secondary">
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              The Short Version
            </h2>
            <p>
              Watermark does not collect, store, or transmit any of your
              data. Your files never leave your device.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              1. Who We Are
            </h2>
            <p>
              Watermark is operated by FlagVault Technologies. This policy
              describes how we handle information in connection with the
              service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              2. Information We Collect
            </h2>
            <p>
              None. Watermark runs entirely in your browser. We do not
              collect personal information, usage data, or any other data from
              you.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              3. File Processing
            </h2>
            <p>
              When you open a PDF in the app, it is processed locally using
              client-side JavaScript. Your files are never uploaded to any
              server. FlagVault Technologies has no ability to access, view, or
              store your files.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              4. Cookies &amp; Tracking
            </h2>
            <p>
              We do not use cookies, analytics, or any tracking technologies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              5. Third-Party Services
            </h2>
            <p>
              Watermark does not integrate with or send data to any
              third-party services.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              6. Data Retention
            </h2>
            <p>
              Because we do not collect any data, there is nothing to retain.
              Files you open exist only in your browser&rsquo;s memory and are
              discarded when you close the page.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              7. Changes to This Policy
            </h2>
            <p>
              If we change this policy, we will update the effective date above.
              Continued use of the service after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              8. Contact
            </h2>
            <p>
              Questions or concerns? Reach us at{" "}
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
