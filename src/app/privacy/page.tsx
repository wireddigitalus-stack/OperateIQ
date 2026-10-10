import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Vision LLC",
  description:
    "Vision LLC privacy policy — how we collect, use, and protect your information when you use teamvisionllc.com.",
  alternates: {
    canonical: "https://www.teamvisionllc.com/privacy",
  },
};

const LAST_UPDATED = "April 29, 2025";

const sections = [
  {
    heading: "Information We Collect",
    body: `When you visit teamvisionllc.com, we may collect information you voluntarily provide — such as your name, email address, phone number, and company name when you submit an inquiry through our contact form or chat widget. We also automatically collect standard server log data including your IP address, browser type, pages visited, and referring URL through our analytics provider.`,
  },
  {
    heading: "How We Use Your Information",
    body: `We use the information we collect to: respond to your leasing or advisement inquiries; send you information about available commercial properties that match your interests; improve our website and services; and comply with applicable laws. We do not sell, rent, or trade your personal information to third parties for their marketing purposes.`,
  },
  {
    heading: "Cookies & Analytics",
    body: `Our website uses cookies and similar tracking technologies to understand how visitors use the site. We use analytics tools to measure traffic and performance. You can control cookies through your browser settings. Disabling cookies may affect some functionality of the site.`,
  },
  {
    heading: "Third-Party Services",
    body: `We use third-party services including Google Analytics (traffic analysis), Supabase (secure data storage), and Gemini AI (our VISION assistant). Each of these services has its own privacy policy governing how they handle data. Links to external sites are provided for your convenience; we are not responsible for the privacy practices of those sites.`,
  },
  {
    heading: "Data Security",
    body: `We implement industry-standard security measures to protect your personal information from unauthorized access, disclosure, or destruction. All data transmission is encrypted using SSL/TLS. However, no method of internet transmission is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    heading: "Your Rights",
    body: `You may request access to, correction of, or deletion of personal information we hold about you by contacting us directly. We will respond to all reasonable requests within 30 days. If you are a resident of California or Virginia, you may have additional rights under applicable state privacy laws.`,
  },
  {
    heading: "Contact Us",
    body: `If you have questions about this Privacy Policy or how we handle your personal information, please contact us at leasing [at] teamvisionllc.com or by phone at (423) 573-1022. Our office is located at 100 5th St., Suite 2W, Bristol, TN 37620.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="section-line mb-4" />
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Privacy{" "}
            <span className="gradient-text-green">Policy</span>
          </h1>
          <p className="text-gray-400">
            Last updated: <span className="text-white font-semibold">{LAST_UPDATED}</span>
          </p>
          <p className="text-gray-400 mt-4 leading-relaxed">
            Vision LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, and safeguard your
            information when you visit{" "}
            <span className="text-[#4ADE80]">teamvisionllc.com</span>.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-7 border border-[rgba(74,222,128,0.1)]"
            >
              <h2 className="text-lg font-bold text-white mb-3">
                {i + 1}. {section.heading}
              </h2>
              <p className="text-gray-400 leading-relaxed text-sm">{section.body}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 p-6 rounded-xl border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.04)] text-center">
          <p className="text-sm text-gray-400 mb-4">
            This policy may be updated periodically. Continued use of our website constitutes
            acceptance of any changes.
          </p>
          <Link href="/contact" className="btn-primary text-sm px-6 py-3">
            Contact Us With Questions
          </Link>
        </div>
      </div>
    </div>
  );
}
