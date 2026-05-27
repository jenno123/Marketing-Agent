"use client";

import { useEffect, useState } from "react";
import { Loader2, TreePine, Building2, Waves, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Aggr = { input: number; output: number; cost: number; count: number };
type Stats = {
  thisMonth: Aggr;
  allTime: Aggr;
  byMuseum: Record<string, Aggr>;
};

const museumMeta: Record<string, { label: string; Icon: React.ElementType; dot: string }> = {
  hjerlhede:        { label: "Hjerl Hede",     Icon: TreePine,   dot: "bg-emerald-500" },
  holstebro:        { label: "Holstebro Mus.",  Icon: Building2,  dot: "bg-blue-500"    },
  strandingsmuseum: { label: "Strandingsmus.",  Icon: Waves,      dot: "bg-amber-500"   },
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toString();
}

function fmtCost(usd: number) {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function UsageDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/forbrug")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-stone-400 py-8">
      <Loader2 className="w-4 h-4 animate-spin" /> Henter forbrugsdata...
    </div>
  );

  if (error) return (
    <p className="text-sm text-red-500 py-4">Fejl: {error}</p>
  );

  if (!stats) return null;

  const { thisMonth, allTime, byMuseum } = stats;

  const monthLabel = new Date().toLocaleDateString("da-DK", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8 max-w-2xl">

      {/* This month highlight */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1 capitalize">
              {monthLabel}
            </p>
            <p className="text-4xl font-semibold text-stone-900 tracking-tight">
              {fmtCost(thisMonth.cost)}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {fmt(thisMonth.input + thisMonth.output)} tokens · {thisMonth.count} opslag
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-stone-400" />
          </div>
        </div>

        {/* Token breakdown bar */}
        {thisMonth.input + thisMonth.output > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs text-stone-400">
              <span>Input tokens <span className="text-stone-600 font-medium">{fmt(thisMonth.input)}</span></span>
              <span>Output tokens <span className="text-stone-600 font-medium">{fmt(thisMonth.output)}</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full bg-stone-700 rounded-full"
                style={{ width: `${(thisMonth.input / (thisMonth.input + thisMonth.output)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-stone-400">
              Input koster $3/M · Output koster $15/M (claude-sonnet-4-6)
            </p>
          </div>
        )}
      </div>

      {/* Per museum */}
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
          Fordeling pr. museum — alle tider
        </p>
        <div className="space-y-2">
          {Object.entries(museumMeta).map(([slug, { label, Icon, dot }]) => {
            const m = byMuseum[slug] ?? { input: 0, output: 0, cost: 0, count: 0 };
            const totalCost = allTime.cost;
            const pct = totalCost > 0 ? (m.cost / totalCost) * 100 : 0;
            return (
              <div key={slug} className="rounded-xl border border-stone-200 bg-white px-4 py-3 flex items-center gap-3">
                <span className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
                <Icon className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="text-sm text-stone-700 flex-1">{label}</span>
                <span className="text-xs text-stone-400">{m.count} opslag</span>
                <span className="text-sm font-medium text-stone-800 w-16 text-right">{fmtCost(m.cost)}</span>
                <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-stone-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All time */}
      <div className="rounded-xl border border-stone-100 bg-stone-50 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-widest font-semibold">Samlet forbrug</p>
          <p className="text-sm text-stone-600 mt-0.5">{allTime.count} opslag · {fmt(allTime.input + allTime.output)} tokens</p>
        </div>
        <p className="text-xl font-semibold text-stone-800">{fmtCost(allTime.cost)}</p>
      </div>

    </div>
  );
}
