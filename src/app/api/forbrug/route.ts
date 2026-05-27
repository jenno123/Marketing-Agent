import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type ForbrugRow = {
  dato: string;
  museum: string;
  platform: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
};

// $3 per 1M input, $15 per 1M output (claude-sonnet-4-x pricing)
function calcCost(input: number, output: number) {
  return input * 0.000003 + output * 0.000015;
}

function aggr(rows: ForbrugRow[]) {
  const input = rows.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
  const output = rows.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  return { input, output, cost: calcCost(input, output), count: rows.length };
}

export async function GET() {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("forbrug")
    .select("dato, museum, platform, input_tokens, output_tokens, model")
    .order("dato", { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: ForbrugRow[] = data ?? [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const thisMonth = rows.filter(r => r.dato >= startOfMonth);

  const byMuseum = ["hjerlhede", "holstebro", "strandingsmuseum"].reduce<
    Record<string, ReturnType<typeof aggr>>
  >((acc, m) => {
    acc[m] = aggr(rows.filter(r => r.museum === m));
    return acc;
  }, {});

  return NextResponse.json({
    thisMonth: aggr(thisMonth),
    allTime: aggr(rows),
    byMuseum,
  });
}
