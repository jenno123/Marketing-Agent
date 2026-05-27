import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");
  if (!platform) return NextResponse.json({ error: "Mangler platform" }, { status: 400 });

  const sb = createServerClient();
  const { data, error } = await sb
    .from("inspiration")
    .select("id, platform, opslag, oprettet")
    .eq("platform", platform)
    .order("oprettet");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { platform, opslag } = await req.json();
  if (!platform || !opslag) return NextResponse.json({ error: "Mangler felter" }, { status: 400 });

  const sb = createServerClient();
  const { data, error } = await sb
    .from("inspiration")
    .insert({ platform, opslag })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
