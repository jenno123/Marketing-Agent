"use client";

import { useState } from "react";
import { Museum } from "@/lib/museums";
import { SettingsPanel } from "@/components/settings-panel";
import { InspirationManager } from "@/components/inspiration-manager";
import { FileText, Instagram, Facebook, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetaImport } from "@/components/meta-import";

type Section = "retningslinjer" | "instagram" | "facebook" | "meta";

const sections: { id: Section; label: string; icon: React.ElementType; sub: string }[] = [
  { id: "retningslinjer", label: "Retningslinjer", icon: FileText, sub: "Tone, stil og regler" },
  { id: "instagram", label: "Instagram", icon: Instagram, sub: "Inspirationseksempler" },
  { id: "facebook", label: "Facebook", icon: Facebook, sub: "Inspirationseksempler" },
  { id: "meta", label: "Meta import", icon: Share2, sub: "Hent fra Facebook-side" },
];

export function KonfigurationPage({ museum }: { museum: Museum }) {
  const [active, setActive] = useState<Section>("retningslinjer");

  return (
    <div className="flex gap-0 h-full min-h-0">

      {/* Venstre nav */}
      <nav className="w-52 shrink-0 border-r border-stone-200 pr-4 space-y-0.5">
        {sections.map(({ id, label, icon: Icon, sub }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cn(
              "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
              active === id
                ? "bg-white shadow-sm border border-stone-200 text-stone-900"
                : "text-stone-500 hover:bg-stone-100/60 hover:text-stone-800"
            )}
          >
            <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", active === id ? "text-stone-700" : "text-stone-400")} />
            <div>
              <p className={cn("text-sm leading-none", active === id ? "font-medium" : "font-normal")}>
                {label}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
            </div>
          </button>
        ))}
      </nav>

      {/* Højre indhold */}
      <div className="flex-1 pl-8 overflow-y-auto min-h-0">
        {active === "retningslinjer" && <SettingsPanel museum={museum} compact />}
        {active === "instagram" && (
          <InspirationManager
            museum={museum}
            platform={museum.supabaseKeys.instagramInspiration}
            label="Instagram"
          />
        )}
        {active === "facebook" && (
          <InspirationManager
            museum={museum}
            platform={museum.supabaseKeys.facebookInspiration}
            label="Facebook"
          />
        )}
        {active === "meta" && <MetaImport museum={museum} />}
      </div>

    </div>
  );
}
