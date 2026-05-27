"use client";

import { useState, useEffect } from "react";
import { Museum } from "@/lib/museums";
import { Historik } from "@/lib/supabase";
import { Loader2, Download, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function HistoryList({ museum }: { museum: Museum }) {
  const [historik, setHistorik] = useState<Historik[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/historik?slug=${museum.slug}`);
      const data = res.ok ? await res.json() : [];
      setHistorik(data);
      setLoading(false);
    }
    load();
  }, [museum.slug]);

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-stone-400 py-8">
      <Loader2 className="w-4 h-4 animate-spin" /> Henter historik...
    </div>
  );

  if (historik.length === 0) return (
    <div className="rounded-xl border-2 border-dashed border-stone-200 py-12 text-center max-w-2xl">
      <Clock className="w-7 h-7 text-stone-300 mx-auto mb-2" />
      <p className="text-sm text-stone-400">Ingen opslag genereret endnu</p>
      <p className="text-xs text-stone-300 mt-1">Opslag gemmes her automatisk</p>
    </div>
  );

  const grupper: Record<string, Historik[]> = {};
  for (const item of historik) {
    const dato = item.dato?.slice(0, 10) ?? "Ukendt";
    if (!grupper[dato]) grupper[dato] = [];
    grupper[dato].push(item);
  }

  function formatDato(dato: string) {
    try {
      const [d, m, y] = dato.split("/");
      return new Date(`${y}-${m}-${d}`).toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" });
    } catch { return dato; }
  }

  function pLabel(p: string) {
    return p.replace("holstebro_", "").replace("stranding_", "");
  }

  const pColors: Record<string, string> = {
    Facebook: "bg-blue-50 text-blue-600 border-blue-100",
    Instagram: "bg-pink-50 text-pink-600 border-pink-100",
    LinkedIn: "bg-sky-50 text-sky-600 border-sky-100",
  };

  function download(item: Historik) {
    const blob = new Blob([item.opslag], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${museum.slug}_${pLabel(item.platform).toLowerCase()}_${item.dato.slice(0, 10).replace(/\//g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-7 max-w-2xl">
      {Object.entries(grupper).map(([dato, liste]) => (
        <div key={dato}>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2.5 capitalize">
            {formatDato(dato)}
          </p>
          <div className="space-y-2">
            {liste.map((item) => {
              const label = pLabel(item.platform);
              const isOpen = openId === item.id;
              return (
                <div key={item.id} className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors"
                  >
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border shrink-0", pColors[label] ?? "bg-stone-100 text-stone-500 border-stone-200")}>
                      {label}
                    </span>
                    <span className="text-xs text-stone-400 shrink-0">{item.dato.slice(11)}</span>
                    <span className="text-sm text-stone-600 truncate flex-1">{item.briefing}</span>
                    <ChevronDown className={cn("w-4 h-4 text-stone-300 shrink-0 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-stone-100">
                      <pre className="mt-3 text-sm text-stone-800 whitespace-pre-wrap font-sans leading-relaxed bg-stone-50 rounded-lg p-4">
                        {item.opslag}
                      </pre>
                      <button onClick={() => download(item)} className="mt-2 flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
