import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const nøgle = req.nextUrl.searchParams.get("nøgle");
  if (!nøgle) return NextResponse.json({ error: "Mangler nøgle" }, { status: 400 });

  const sb = createServerClient();
  const { data } = await sb
    .from("indstillinger")
    .select("værdi")
    .eq("nøgle", nøgle)
    .single();

  const row = data as { værdi?: string } | null;
  return NextResponse.json({ værdi: row?.værdi ?? "" });
}

export async function POST(req: NextRequest) {
  const { nøgle, værdi } = await req.json();
  if (!nøgle) return NextResponse.json({ error: "Mangler nøgle" }, { status: 400 });

  const sb = createServerClient();
  const { error } = await sb
    .from("indstillinger")
    .upsert({ nøgle, værdi }, { onConflict: "nøgle" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
