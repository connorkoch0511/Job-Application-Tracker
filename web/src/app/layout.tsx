import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Application Tracker",
  description: "AI-powered job tracking and matching",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <nav className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">Job Tracker</h1>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="/" className="hover:text-white transition-colors">Jobs</a>
              <a href="/applications" className="hover:text-white transition-colors">Applications</a>
              <a href="/resume" className="hover:text-white transition-colors">Resume</a>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
