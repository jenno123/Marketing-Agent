"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { museums } from "@/lib/museums";
import { cn } from "@/lib/utils";
import {
  Newspaper, TreePine, Building2, Waves, Sparkles,
  PenLine, Clock, Settings2, BarChart2, KeyRound, LogOut,
  BookOpen, SlidersHorizontal,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

const museumIcons: Record<string, React.ElementType> = {
  hjerlhede: TreePine,
  holstebro: Building2,
  strandingsmuseum: Waves,
};

const museumDot: Record<string, string> = {
  hjerlhede: "bg-emerald-500",
  holstebro: "bg-blue-500",
  strandingsmuseum: "bg-amber-500",
};

const museumSubLinks = [
  { href: "", label: "Skriv opslag", icon: PenLine, exact: true },
  { href: "/historik", label: "Historik", icon: Clock, exact: false },
  { href: "/konfiguration", label: "Konfiguration", icon: Settings2, exact: false },
];

const nyhedsbrevSubLinks = [
  { href: "/nyhedsbrev", label: "Opret", icon: PenLine, exact: true },
  { href: "/nyhedsbrev/inspiration", label: "Inspiration", icon: BookOpen, exact: false },
  { href: "/nyhedsbrev/indstillinger", label: "Indstillinger", icon: SlidersHorizontal, exact: false },
];

const systemLinks = [
  { href: "/forbrug", label: "Forbrug", icon: BarChart2 },
  { href: "/indstillinger", label: "Indstillinger", icon: KeyRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isNyhedsbrevActive = pathname.startsWith("/nyhedsbrev");

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 flex flex-col shrink-0 bg-[#EEEAE4] border-r border-[#E0DBD4]">
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#3C2415] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-stone-200" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800 leading-none tracking-tight">
              Push<span className="text-stone-400">.ai</span>
            </p>
            <p className="text-xs text-stone-400 mt-0.5">Marketing Agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-5">

        {/* Museer */}
        <div>
          <p className="px-2 mb-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
            Museer
          </p>
          <ul className="space-y-0.5">
            {museums.map((museum) => {
              const Icon = museumIcons[museum.slug];
              const base = `/museum/${museum.slug}`;
              const isMuseumActive = pathname.startsWith(base);

              return (
                <li key={museum.slug}>
                  <Link
                    href={base}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
                      isMuseumActive
                        ? "text-stone-900 font-semibold"
                        : "text-stone-500 hover:bg-white/40 hover:text-stone-800"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", isMuseumActive ? "text-stone-700" : "text-stone-400")} />
                    <span className="truncate">{museum.shortName}</span>
                    <span className={cn(
                      "ml-auto w-1.5 h-1.5 rounded-full shrink-0 transition-opacity",
                      museumDot[museum.slug],
                      isMuseumActive ? "opacity-100" : "opacity-0"
                    )} />
                  </Link>

                  {isMuseumActive && (
                    <ul className="mt-0.5 ml-3 pl-2.5 border-l border-stone-300/50 space-y-0.5">
                      {museumSubLinks.map(({ href, label, icon: SubIcon, exact }) => {
                        const fullHref = `${base}${href}`;
                        const isActive = exact
                          ? pathname === base || pathname === base + "/"
                          : pathname.startsWith(fullHref);
                        return (
                          <li key={href}>
                            <Link
                              href={fullHref}
                              className={cn(
                                "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all",
                                isActive
                                  ? "text-stone-900 font-semibold bg-white/70 shadow-sm"
                                  : "text-stone-500 hover:text-stone-800 hover:bg-white/40"
                              )}
                            >
                              <SubIcon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-stone-700" : "text-stone-400")} />
                              {label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Nyhedsbreve */}
        <div>
          <p className="px-2 mb-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
            Nyhedsbreve
          </p>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/nyhedsbrev"
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
                  isNyhedsbrevActive
                    ? "text-stone-900 font-semibold"
                    : "text-stone-500 hover:bg-white/40 hover:text-stone-800"
                )}
              >
                <Newspaper className={cn("w-4 h-4 shrink-0", isNyhedsbrevActive ? "text-stone-700" : "text-stone-400")} />
                <span>Nyhedsbrev</span>
                <span className={cn(
                  "ml-auto w-1.5 h-1.5 rounded-full shrink-0 bg-stone-500 transition-opacity",
                  isNyhedsbrevActive ? "opacity-100" : "opacity-0"
                )} />
              </Link>

              {isNyhedsbrevActive && (
                <ul className="mt-0.5 ml-3 pl-2.5 border-l border-stone-300/50 space-y-0.5">
                  {nyhedsbrevSubLinks.map(({ href, label, icon: SubIcon, exact }) => {
                    const isActive = exact
                      ? pathname === href || pathname === href + "/"
                      : pathname.startsWith(href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all",
                            isActive
                              ? "text-stone-900 font-semibold bg-white/70 shadow-sm"
                              : "text-stone-500 hover:text-stone-800 hover:bg-white/40"
                          )}
                        >
                          <SubIcon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-stone-700" : "text-stone-400")} />
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          </ul>
        </div>

        {/* System */}
        <div>
          <p className="px-2 mb-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
            System
          </p>
          <ul className="space-y-0.5">
            {systemLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
                    pathname.startsWith(href)
                      ? "bg-white/70 text-stone-900 font-medium shadow-sm"
                      : "text-stone-600 hover:bg-white/40 hover:text-stone-800"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0 text-stone-500" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#E0DBD4] space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-stone-500 hover:bg-white/40 hover:text-stone-800 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0 text-stone-400" />
          <span>Log ud</span>
        </button>
        <p className="px-2.5 text-[10px] text-stone-400 leading-snug">
          De Kulturhistoriske Museer<br />i Holstebro Kommune
        </p>
      </div>
    </aside>
  );
}
