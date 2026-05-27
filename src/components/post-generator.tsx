"use client";

import { useState, useRef } from "react";
import { Museum } from "@/lib/museums";
import { toast } from "sonner";
import { Loader2, Copy, RefreshCw, Upload, X, ImageIcon, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PostGenerator({ museum }: { museum: Museum }) {
  const [platform, setPlatform] = useState(museum.platforms[0]);
  const [briefing, setBriefing] = useState("");
  const [ekstra, setEkstra] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [billedforslag, setBilledforslag] = useState(true);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function generate() {
    if (!briefing.trim() && !image) {
      toast.error("Skriv en briefing eller upload et billede");
      return;
    }
    setLoading(true);
    setOutput("");

    const fd = new FormData();
    fd.append("museum", museum.slug);
    fd.append("platform", platform);
    fd.append("briefing", briefing);
    fd.append("ekstra", ekstra);
    fd.append("billedforslag", String(billedforslag));
    if (image) fd.append("image", image);

    try {
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setOutput(full);
      }

      const now = new Date();
      const dato = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const platformNøgle =
        museum.slug === "hjerlhede" ? platform
        : museum.slug === "holstebro" ? `holstebro_${platform}`
        : `stranding_${platform}`;

      await fetch("/api/historik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dato, platform: platformNøgle, briefing, opslag: full }),
      });
    } catch (err) {
      toast.error("Fejl: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

      {/* ── Venstre: input ── */}
      <div className="space-y-5">

        {/* Platform pills */}
        <div className="flex gap-1.5">
          {museum.platforms.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm transition-all border",
                platform === p
                  ? "bg-[#3C2415] text-stone-50 border-stone-800 font-medium"
                  : "bg-transparent text-stone-500 border-stone-300 hover:border-stone-500 hover:text-stone-700"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Briefing */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">
            Hvad skal opslaget handle om?
          </label>
          <textarea
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            placeholder="F.eks. skovtur for børnefamilier, åbning af ny udstilling..."
            rows={3}
            className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none transition-shadow"
          />
        </div>

        {/* Ekstra */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">
            Fakta der skal med{" "}
            <span className="text-stone-400 font-normal">— valgfrit</span>
          </label>
          <textarea
            value={ekstra}
            onChange={(e) => setEkstra(e.target.value)}
            placeholder="F.eks. gratis for børn under 5, åbent til kl. 17..."
            rows={2}
            className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none transition-shadow"
          />
        </div>

        {/* Billede + toggle */}
        <div className="flex items-center justify-between gap-4 py-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
              role="switch"
              aria-checked={billedforslag}
              onClick={() => setBilledforslag(!billedforslag)}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors focus:outline-none",
                billedforslag ? "bg-stone-700" : "bg-stone-200"
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                billedforslag && "translate-x-4"
              )} />
            </button>
            <span className="text-sm text-stone-600">Tilføj billedforslag</span>
          </label>

          {imagePreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="" className="h-10 w-auto rounded-md border border-stone-200 object-cover" />
              <button
                onClick={() => { setImage(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50"
              >
                <X className="w-2.5 h-2.5 text-stone-500" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-stone-300 text-xs text-stone-500 hover:border-stone-400 hover:bg-stone-50 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Stemningsbillede
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        </div>

        {/* Knap */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#3C2415] hover:bg-[#4A2E1C] active:bg-[#2E1A0E] text-stone-50 rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Genererer...</>
          ) : output ? (
            <><RefreshCw className="w-4 h-4" /> Generer nyt bud</>
          ) : (
            <><Wand2 className="w-4 h-4" /> Generer opslag</>
          )}
        </button>
      </div>

      {/* ── Højre: output ── */}
      <div className="min-h-72">
        {!output && !loading ? (
          <div className="h-full min-h-72 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 text-center p-10">
            <Wand2 className="w-7 h-7 text-stone-300" />
            <p className="text-sm text-stone-400">Intet opslag endnu</p>
            <p className="text-xs text-stone-300">Udfyld briefingen og klik generer</p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50">
              <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{platform}</span>
              {output && (
                <button
                  onClick={() => { navigator.clipboard.writeText(output); toast.success("Kopieret"); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-stone-500 hover:text-stone-900 hover:bg-white border border-transparent hover:border-stone-200 transition-all"
                >
                  <Copy className="w-3 h-3" /> Kopiér
                </button>
              )}
            </div>
            <div className="px-5 py-5">
              {loading && !output ? (
                <div className="flex items-center gap-2 text-sm text-stone-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Skriver...
                </div>
              ) : (
                <pre className="text-sm text-stone-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {output}{loading && <span className="animate-pulse opacity-60">▋</span>}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
