"use client";

import { useState, useEffect, useCallback } from "react";
import type { Museum } from "@/lib/museums";
import type { Inspiration } from "@/lib/supabase";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Pencil, Check, X } from "lucide-react";

interface Props {
  museum?: Museum;
  platform: string;
  label: string;
}

export function InspirationManager({ platform, label }: Props) {
  const [items, setItems] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [nyt, setNyt] = useState("");
  const [gemmer, setGemmer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/inspiration?platform=${encodeURIComponent(platform)}`);
    const data = res.ok ? await res.json() : [];
    setItems(data);
    setLoading(false);
  }, [platform]);

  useEffect(() => { load(); }, [load]);

  async function gemEdit(id: string) {
    const res = await fetch(`/api/inspiration/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opslag: editValue }),
    });
    if (!res.ok) { toast.error("Kunne ikke gemme"); return; }
    setItems((p) => p.map((i) => (i.id === id ? { ...i, opslag: editValue } : i)));
    setEditingId(null);
    toast.success("Gemt");
  }

  async function slet(id: string) {
    const res = await fetch(`/api/inspiration/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Kunne ikke slette"); return; }
    setItems((p) => p.filter((i) => i.id !== id));
    toast.success("Slettet");
  }

  async function tilføj() {
    if (!nyt.trim()) { toast.error("Skriv et eksempel først"); return; }
    setGemmer(true);
    const res = await fetch("/api/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, opslag: nyt.trim() }),
    });
    if (!res.ok) {
      toast.error("Kunne ikke tilføje");
    } else {
      const data = await res.json();
      setItems((p) => [...p, data]);
      setNyt("");
      toast.success("Tilføjet");
    }
    setGemmer(false);
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-stone-400 py-8">
      <Loader2 className="w-4 h-4 animate-spin" /> Henter...
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <p className="text-sm text-stone-500">
        Agenten lærer din tone og stil fra disse eksempler. Jo flere og bedre eksempler, desto mere præcist bliver outputtet.
      </p>

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 py-12 text-center">
          <p className="text-sm text-stone-400">Ingen {label}-eksempler endnu</p>
          <p className="text-xs text-stone-300 mt-1">Tilføj dit første herunder</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              {editingId === item.id ? (
                <div className="p-4 space-y-3">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={5}
                    autoFocus
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:bg-white resize-y transition-shadow"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => gemEdit(item.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3C2415] text-stone-50 rounded-lg text-xs font-medium hover:bg-[#4A2E1C] transition-colors">
                      <Check className="w-3.5 h-3.5" /> Gem
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 text-stone-500 rounded-lg text-xs hover:bg-stone-50 transition-colors">
                      <X className="w-3.5 h-3.5" /> Annuller
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {item.opslag}
                  </p>
                  <div className="flex gap-1 mt-3 pt-3 border-t border-stone-100">
                    <button onClick={() => { setEditingId(item.id); setEditValue(item.opslag); }} className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors">
                      <Pencil className="w-3 h-3" /> Rediger
                    </button>
                    <button onClick={() => slet(item.id)} className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 className="w-3 h-3" /> Slet
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tilføj */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-4 space-y-3">
        <p className="text-sm font-medium text-stone-700">Tilføj nyt eksempel</p>
        <textarea
          value={nyt}
          onChange={(e) => setNyt(e.target.value)}
          placeholder={`Indsæt et eksisterende ${label}-opslag her...`}
          rows={4}
          className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:bg-white resize-y transition-shadow"
        />
        <button
          onClick={tilføj}
          disabled={gemmer}
          className="flex items-center gap-2 px-4 py-2 bg-[#3C2415] text-stone-50 rounded-lg text-sm font-medium hover:bg-[#4A2E1C] disabled:opacity-40 transition-colors"
        >
          {gemmer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Tilføj eksempel
        </button>
      </div>
    </div>
  );
}
