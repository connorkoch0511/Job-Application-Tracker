"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter, usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/resume", label: "Resume" },
];

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Don't show nav on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

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
        {email && (
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 hidden sm:block">{email}</span>
            <button onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
