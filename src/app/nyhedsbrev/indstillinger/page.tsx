"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function NyhedsbrevIndstillingerPage() {
  const [retningslinjer, setRetningslinjer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/indstillinger?nøgle=nyhedsbrev_retningslinjer");
    const { værdi } = await res.json();
    setRetningslinjer(værdi ?? "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function gem() {
    setSaving(true);
    const res = await fetch("/api/indstillinger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nøgle: "nyhedsbrev_retningslinjer", værdi: retningslinjer }),
    });
    if (res.ok) toast.success("Retningslinjer gemt");
    else toast.error("Kunne ikke gemme");
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-stone-800">Nyhedsbrev — Indstillinger</h1>
        <p className="text-sm text-stone-500 mt-1">
          Separate retningslinjer for nyhedsbreve — uafhængige af SoMe-agenten.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Henter retningslinjer...
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          <textarea
            value={retningslinjer}
            onChange={e => setRetningslinjer(e.target.value)}
            rows={18}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 font-mono leading-relaxed placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-y transition-shadow shadow-sm"
            placeholder="F.eks. tone, målgruppe, foretrukne emner, ting der skal undgås..."
          />
          <button
            onClick={gem}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#3C2415] text-stone-50 rounded-lg text-sm font-medium hover:bg-[#4A2E1C] disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Gem retningslinjer
          </button>
        </div>
      )}
    </div>
  );
}
