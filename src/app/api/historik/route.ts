import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Mangler slug" }, { status: 400 });

  const sb = createServerClient();
  let query = sb.from("historik").select("*").order("dato", { ascending: false }).limit(150);

  if (slug === "hjerlhede") query = query.in("platform", ["Facebook", "Instagram", "LinkedIn"]);
  else if (slug === "holstebro") query = query.like("platform", "holstebro_%");
  else query = query.like("platform", "stranding_%");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { dato, platform, briefing, opslag } = body;
  if (!dato || !platform || !opslag) return NextResponse.json({ error: "Mangler felter" }, { status: 400 });

  const sb = createServerClient();
  const { error } = await sb.from("historik").insert({ dato, platform, briefing, opslag });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
