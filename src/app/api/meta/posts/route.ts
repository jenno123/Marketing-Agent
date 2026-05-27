import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Mangler slug" }, { status: 400 });

  const sb = createServerClient();
  const { data } = await sb
    .from("indstillinger")
    .select("værdi")
    .eq("nøgle", `${slug}_meta_token`)
    .single();

  const token = (data as { værdi?: string } | null)?.værdi;
  if (!token) return NextResponse.json({ error: "Ingen Meta-token konfigureret" }, { status: 404 });

  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/posts?fields=message,created_time&limit=50&access_token=${token}`
  );
  const json = await res.json();

  if (json.error) {
    // Token expired or invalid — surface a friendly message
    const msg: string = json.error.message ?? "Ukendt Meta-fejl";
    const expired = msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("session");
    return NextResponse.json(
      { error: expired ? "Token er udløbet — indsæt et nyt Page Access Token" : msg },
      { status: 400 }
    );
  }

  // Filter out posts without text (shared links, photos with no caption, etc.)
  const posts = (json.data ?? []).filter(
    (p: { message?: string }) => p.message && p.message.trim().length > 0
  );

  return NextResponse.json({ posts });
}
