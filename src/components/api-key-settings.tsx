"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function ApiKeySettings() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/indstillinger?nøgle=anthropic_api_key")
      .then(r => r.json())
      .then(d => { setValue(d.værdi ?? ""); setLoading(false); });
  }, []);

  async function gem() {
    setSaving(true);
    const res = await fetch("/api/indstillinger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nøgle: "anthropic_api_key", værdi: value }),
    });
    if (res.ok) toast.success("API-nøgle gemt");
    else toast.error("Kunne ikke gemme");
    setSaving(false);
  }

  const isSet = value.startsWith("sk-ant-");

  return (
    <div className="space-y-5 max-w-lg">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-stone-800">Anthropic API-nøgle</h3>
        <p className="text-sm text-stone-500">
          Nøglen bruges til at generere opslag. Find den på{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-stone-800 transition-colors"
          >
            console.anthropic.com
          </a>
          .
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Henter...
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <input
              type={visible ? "text" : "password"}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-stone-900 font-mono placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
            />
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
            >
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {isSet && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Nøgle konfigureret
            </div>
          )}

          <button
            onClick={gem}
            disabled={saving || !value.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#3C2415] text-stone-50 rounded-lg text-sm font-medium hover:bg-[#4A2E1C] disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Gem nøgle
          </button>
        </div>
      )}

      <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500 leading-relaxed">
        <strong className="text-stone-700">Sikkerhed:</strong> Nøglen gemmes krypteret i databasen og sendes aldrig til klienten — al kommunikation med Anthropic sker server-side.
      </div>
    </div>
  );
}
