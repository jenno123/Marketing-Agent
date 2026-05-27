"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2, Upload, Download, RefreshCw, Plus, Trash2,
  ChevronDown, ChevronUp, ImageIcon, X, Code, AlignLeft, Eye,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Sektion = { id: string; nøgleord: string; html: string; tekst: string };
type ViewMode = "preview" | "tekst" | "kode";
type Tab = "billede" | "opret" | "samlet";

const tabs: { id: Tab; label: string }[] = [
  { id: "billede", label: "Billeder" },
  { id: "opret",   label: "Opret sektion" },
  { id: "samlet",  label: "Samlet nyhedsbrev" },
];

const RATIOS = ["5:4 (HeyLoyalty)", "16:9", "1:1", "4:3", "3:2", "Original"] as const;
const RATIO_KEYS: Record<typeof RATIOS[number], string> = {
  "5:4 (HeyLoyalty)": "5:4",
  "16:9": "16:9",
  "1:1": "1:1",
  "4:3": "4:3",
  "3:2": "3:2",
  "Original": "original",
};

const MAX_SIZES = ["200 KB", "500 KB", "1 MB", "Ingen grænse"] as const;
const MAX_SIZE_KB: Record<typeof MAX_SIZES[number], number> = {
  "200 KB": 200,
  "500 KB": 500,
  "1 MB": 1000,
  "Ingen grænse": 0,
};

// ─── Main component ───────────────────────────────────────────────────────────

export function NewsletterGenerator() {
  const [tab, setTab] = useState<Tab>("opret");
  const [sektioner, setSektioner] = useState<Sektion[]>([]);

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm transition-all border",
              tab === t.id
                ? "bg-[#3C2415] text-stone-50 border-stone-800 font-medium"
                : "bg-transparent text-stone-500 border-stone-300 hover:border-stone-500 hover:text-stone-700"
            )}
          >
            {t.label}
            {t.id === "samlet" && sektioner.length > 0 && (
              <span className="ml-1.5 text-xs bg-stone-600 text-stone-100 rounded-full px-1.5 py-0.5">
                {sektioner.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "billede" && <BilledTab />}
      {tab === "opret"   && <OpretTab sektioner={sektioner} setSektioner={setSektioner} />}
      {tab === "samlet"  && <SamletTab sektioner={sektioner} setSektioner={setSektioner} />}
    </div>
  );
}

// ─── Billede tab ──────────────────────────────────────────────────────────────

function BilledTab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ratio, setRatio] = useState<typeof RATIOS[number]>("5:4 (HeyLoyalty)");
  const [maxSize, setMaxSize] = useState<typeof MAX_SIZES[number]>("500 KB");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string; origSize: number; newSize: number; origDims: string; newDims: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }

  async function behandl() {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("ratio", RATIO_KEYS[ratio]);
    fd.append("maxKb", String(MAX_SIZE_KB[maxSize]));

    try {
      const res = await fetch("/api/nyhedsbrev/process-image", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      setResult({
        url: URL.createObjectURL(blob),
        origSize: parseInt(res.headers.get("X-Orig-Size") ?? "0"),
        newSize: parseInt(res.headers.get("X-New-Size") ?? "0"),
        origDims: res.headers.get("X-Orig-Dims") ?? "",
        newDims: res.headers.get("X-New-Dims") ?? "",
      });
    } catch (err) {
      toast.error("Billedbehandling fejlede: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <p className="text-sm text-stone-500">
        Upload et billede, vælg aspect ratio og max størrelse. Download det færdige billede og upload det i HeyLoyalty.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-4">
          {!preview ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-40 rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm">Klik for at uploade billede</span>
            </button>
          ) : (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="w-full rounded-xl border border-stone-200 object-cover max-h-60" />
              <button
                onClick={() => { setFile(null); setPreview(null); setResult(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute top-2 right-2 w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50"
              >
                <X className="w-3.5 h-3.5 text-stone-500" />
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Aspect ratio</label>
              <select value={ratio} onChange={e => setRatio(e.target.value as typeof RATIOS[number])}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400">
                {RATIOS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Max størrelse</label>
              <select value={maxSize} onChange={e => setMaxSize(e.target.value as typeof MAX_SIZES[number])}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400">
                {MAX_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <button onClick={behandl} disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2 bg-[#3C2415] hover:bg-[#4A2E1C] text-stone-50 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-40 transition-colors">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Behandler...</> : "Behandl billede"}
          </button>
        </div>

        {/* Right */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.url} alt="" className="w-full rounded-xl border border-stone-200 object-cover max-h-60" />
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between text-stone-500">
                  <span>Original</span>
                  <span className="text-stone-700 font-medium">{result.origDims}px · {result.origSize} KB</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Behandlet</span>
                  <span className="text-stone-700 font-medium">{result.newDims}px · {result.newSize} KB</span>
                </div>
                {result.origSize > 0 && (
                  <div className="flex justify-between text-stone-500">
                    <span>Besparelse</span>
                    <span className="text-emerald-600 font-medium">{Math.round((1 - result.newSize / result.origSize) * 100)}%</span>
                  </div>
                )}
              </div>
              <a href={result.url} download={`hjerlhede_${new Date().toISOString().slice(0,10)}.jpg`}
                className="flex items-center justify-center gap-2 w-full bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> Download behandlet billede
              </a>
              <p className="text-xs text-stone-400">Upload billedet i HeyLoyalty og kopier URL'en. Brug den i "Opret sektion".</p>
            </>
          ) : (
            <div className="h-full min-h-48 rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-7 h-7 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-400">Behandlet billede vises her</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Opret sektion tab ────────────────────────────────────────────────────────

function OpretTab({ sektioner, setSektioner }: { sektioner: Sektion[]; setSektioner: React.Dispatch<React.SetStateAction<Sektion[]>> }) {
  const [briefing, setBriefing] = useState("");
  const [billedeUrl, setBilledeUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [brugBillede, setBrugBillede] = useState(true);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ nøgleord: string; html: string; tekst: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function generer(currentBriefing = briefing) {
    if (!currentBriefing.trim()) { toast.error("Beskriv hvad sektionen skal handle om"); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("briefing", currentBriefing);
    fd.append("billedeUrl", billedeUrl);
    fd.append("brugBillede", String(brugBillede && !!image));
    if (image && brugBillede) fd.append("image", image);

    try {
      const res = await fetch("/api/nyhedsbrev/generate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview({ nøgleord: currentBriefing, html: data.html, tekst: data.tekst });
      setViewMode("preview");
    } catch (err) {
      toast.error("Fejl: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  function tilføj() {
    if (!preview) return;
    setSektioner(prev => [...prev, { id: crypto.randomUUID(), ...preview }]);
    setPreview(null);
    setBriefing("");
    toast.success("Sektion tilføjet");
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Existing sections */}
      {sektioner.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Tilføjede sektioner ({sektioner.length})</p>
          {sektioner.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50 transition-colors">
                <span className="text-xs font-medium text-stone-500">#{i + 1}</span>
                <span className="text-sm text-stone-700 flex-1 truncate">{s.nøgleord}</span>
                <button onClick={(e) => { e.stopPropagation(); setSektioner(p => p.filter((_, idx) => idx !== i)); }}
                  className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {openIdx === i ? <ChevronUp className="w-4 h-4 text-stone-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-stone-300 shrink-0" />}
              </button>
              {openIdx === i && (
                <div className="border-t border-stone-100 px-4 pb-4 pt-3">
                  <iframe srcDoc={s.html} className="w-full rounded-lg border border-stone-100 bg-white" style={{ height: "250px" }} title={`Sektion ${i+1}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Generation form + preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left: form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Hvad skal sektionen handle om?</label>
            <textarea value={briefing} onChange={e => setBriefing(e.target.value)}
              placeholder="F.eks. sæsonåbning 1. maj, aktiviteter for børn, nye udstillinger..."
              rows={3}
              className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none transition-shadow" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">
              HeyLoyalty billede-URL <span className="text-stone-400 font-normal">— valgfrit</span>
            </label>
            <input type="url" value={billedeUrl} onChange={e => setBilledeUrl(e.target.value)}
              placeholder="https://img.heyloyalty.com/..."
              className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow" />
            <p className="text-xs text-stone-400">Upload billedet i HeyLoyalty og indsæt URL'en her — den sættes direkte ind i HTML-blokken.</p>
          </div>

          {/* Image + toggle */}
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <button role="switch" aria-checked={brugBillede} onClick={() => setBrugBillede(v => !v)}
                className={cn("relative w-9 h-5 rounded-full transition-colors focus:outline-none", brugBillede ? "bg-stone-700" : "bg-stone-200")}>
                <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform", brugBillede && "translate-x-4")} />
              </button>
              <span className="text-sm text-stone-600">Stemningsbillede påvirker teksten</span>
            </label>
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="" className="h-10 w-auto rounded-md border border-stone-200 object-cover" />
                <button onClick={() => { setImage(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50">
                  <X className="w-2.5 h-2.5 text-stone-500" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-stone-300 text-xs text-stone-500 hover:border-stone-400 hover:bg-stone-50 transition-colors">
                <ImageIcon className="w-3.5 h-3.5" /> Upload billede
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              setImage(f); setImagePreview(URL.createObjectURL(f));
            }} />
          </div>

          <button onClick={() => generer()} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#3C2415] hover:bg-[#4A2E1C] text-stone-50 rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-40 transition-colors">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Genererer...</> : preview ? <><RefreshCw className="w-4 h-4" /> Regenerer</> : "Opret sektion"}
          </button>
        </div>

        {/* Right: preview */}
        <div className="min-h-72">
          {!preview && !loading ? (
            <div className="h-full min-h-72 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-sm text-stone-400">Ingen sektion endnu</p>
              <p className="text-xs text-stone-300">Udfyld briefingen og klik "Opret sektion"</p>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              {/* View mode toggles */}
              <div className="flex items-center gap-1 px-3 py-2.5 border-b border-stone-100 bg-stone-50">
                {([["preview", Eye, "Preview"], ["tekst", AlignLeft, "Tekst"], ["kode", Code, "HTML"]] as [ViewMode, React.ElementType, string][]).map(([mode, Icon, label]) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all",
                      viewMode === mode ? "bg-white text-stone-900 font-medium shadow-sm border border-stone-200" : "text-stone-400 hover:text-stone-700")}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {loading && !preview ? (
                  <div className="flex items-center gap-2 text-sm text-stone-400 py-8 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Skriver sektion...
                  </div>
                ) : preview ? (
                  <>
                    {viewMode === "preview" && (
                      <iframe srcDoc={preview.html} className="w-full rounded-lg border border-stone-100" style={{ height: "300px" }} title="Preview" />
                    )}
                    {viewMode === "tekst" && (
                      <pre className="text-sm text-stone-800 whitespace-pre-wrap font-sans leading-relaxed">{preview.tekst}</pre>
                    )}
                    {viewMode === "kode" && (
                      <pre className="text-xs text-stone-700 whitespace-pre-wrap font-mono bg-stone-50 rounded-lg p-3 overflow-auto max-h-72">{preview.html}</pre>
                    )}
                  </>
                ) : null}
              </div>

              {preview && (
                <div className="flex gap-2 px-4 pb-4">
                  <button onClick={tilføj}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#3C2415] text-stone-50 rounded-lg text-sm font-medium hover:bg-[#4A2E1C] transition-colors">
                    <Plus className="w-4 h-4" /> Tilføj til nyhedsbrev
                  </button>
                  <button onClick={() => generer()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Samlet nyhedsbrev tab ────────────────────────────────────────────────────

function SamletTab({ sektioner, setSektioner }: { sektioner: Sektion[]; setSektioner: React.Dispatch<React.SetStateAction<Sektion[]>> }) {
  const [viewMode, setViewMode] = useState<"html" | "tekst">("html");

  if (sektioner.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-stone-200 py-12 text-center max-w-2xl">
        <p className="text-sm text-stone-400">Ingen sektioner endnu</p>
        <p className="text-xs text-stone-300 mt-1">Tilføj sektioner i "Opret sektion"</p>
      </div>
    );
  }

  const samletTekst = sektioner.map((s, i) => `=== Sektion ${i + 1}: ${s.nøgleord} ===\n\n${s.tekst}`).join("\n\n---\n\n");

  function downloadHtml(s: Sektion, i: number) {
    const blob = new Blob([s.html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nyhedsbrev_blok_${i + 1}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
  }

  function downloadTekst() {
    const blob = new Blob([samletTekst], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nyhedsbrev_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600 font-medium">{sektioner.length} sektion{sektioner.length !== 1 ? "er" : ""}</p>
        <div className="flex gap-1 p-1 bg-stone-100 rounded-lg">
          <button onClick={() => setViewMode("html")} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all", viewMode === "html" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500")}>HTML blokke</button>
          <button onClick={() => setViewMode("tekst")} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all", viewMode === "tekst" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500")}>Rå tekst</button>
        </div>
      </div>

      {viewMode === "html" ? (
        <div className="space-y-4">
          {sektioner.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50">
                <span className="text-sm font-medium text-stone-700">Sektion {i + 1}: {s.nøgleord}</span>
                <div className="flex gap-1">
                  <button onClick={() => downloadHtml(s, i)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-stone-500 hover:text-stone-800 hover:bg-white border border-transparent hover:border-stone-200 rounded-md transition-all">
                    <Download className="w-3 h-3" /> Download blok
                  </button>
                  <button onClick={() => setSektioner(p => p.filter((_, idx) => idx !== i))}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <pre className="text-xs text-stone-600 font-mono whitespace-pre-wrap bg-stone-50 rounded-lg p-3 overflow-auto max-h-48 leading-relaxed">{s.html}</pre>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <pre className="text-sm text-stone-800 whitespace-pre-wrap font-sans leading-relaxed bg-white rounded-xl border border-stone-200 p-5 max-h-[500px] overflow-auto">{samletTekst}</pre>
          <button onClick={downloadTekst}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm hover:bg-stone-50 transition-colors">
            <Download className="w-4 h-4" /> Download samlet tekst
          </button>
        </div>
      )}

      <div className="pt-2 border-t border-stone-200">
        <button onClick={() => { if (confirm("Nulstil alle sektioner?")) setSektioner([]); }}
          className="text-xs text-stone-400 hover:text-red-500 transition-colors">
          Nulstil nyhedsbrev
        </button>
      </div>
    </div>
  );
}
