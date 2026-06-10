"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/resume", label: "Resume" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const { isSignedIn, user } = useUser();
  const pathname = usePathname();

  // Don't show nav on auth pages
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return null;

  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  return (
    <nav className="border-b border-gray-800 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold tracking-tight">Job Tracker</h1>
          <div className="flex gap-4 text-sm">
            {LINKS.map(({ href, label }) => (
              <a key={href} href={href}
                className={`transition-colors ${pathname === href ? "text-white font-medium" : "text-gray-400 hover:text-white"}`}>
                {label}
              </a>
            ))}
          </div>
        </div>
        {isSignedIn && (
          <div className="flex items-center gap-4">
            {email && <span className="text-xs text-gray-500 hidden sm:block">{email}</span>}
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        )}
      </div>
    </nav>
  );
}
