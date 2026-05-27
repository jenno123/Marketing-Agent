"use client";

import { useState, useEffect } from "react";
import { Museum } from "@/lib/museums";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export function SettingsPanel({ museum, compact }: { museum: Museum; compact?: boolean }) {
  const [retningslinjer, setRetningslinjer] = useState("");
  const [loading, setLoading] = useState(true);
  const [gemmer, setGemmer] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/indstillinger?nøgle=${encodeURIComponent(museum.supabaseKeys.retningslinjer)}`);
      const { værdi } = await res.json();
      setRetningslinjer(værdi ?? "");
      setLoading(false);
    }
    load();
  }, [museum.supabaseKeys.retningslinjer]);

  async function gem() {
    setGemmer(true);
    const res = await fetch("/api/indstillinger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nøgle: museum.supabaseKeys.retningslinjer, værdi: retningslinjer }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(`Fejl: ${error}`);
    } else {
      toast.success("Retningslinjer gemt");
    }
    setGemmer(false);
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-stone-400 py-8">
      <Loader2 className="w-4 h-4 animate-spin" /> Henter retningslinjer...
    </div>
  );

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-stone-800">Retningslinjer</h3>
          <p className="text-sm text-stone-500">
            Sendes med til agenten ved hvert opslag. Beskriv tone, stil, platformregler og hvad der skal undgås.
          </p>
        </div>
      )}
        <textarea
          value={retningslinjer}
          onChange={(e) => setRetningslinjer(e.target.value)}
          rows={16}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 font-mono leading-relaxed placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-y transition-shadow shadow-sm"
          placeholder="F.eks. tone og stil, platformregler, ting der skal undgås..."
        />
        <button
          onClick={gem}
          disabled={gemmer}
          className="flex items-center gap-2 px-4 py-2 bg-[#3C2415] text-stone-50 rounded-lg text-sm font-medium hover:bg-[#4A2E1C] disabled:opacity-40 transition-colors"
        >
          {gemmer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Gem retningslinjer
        </button>
      {!compact && (
        <>
          <hr className="border-stone-200" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-medium text-stone-800">Vidensbase</h3>
            <p className="text-sm text-stone-500">
              Agentens faktaviden er indlæst fra{" "}
              <code className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                data/{museum.knowledgeFile}
              </code>
              . Opdater ved at køre scraperen lokalt og genstarte serveren.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
