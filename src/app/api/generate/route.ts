import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { getMuseum } from "@/lib/museums";
import { getCurrentSeason } from "@/lib/seasons";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const museumSlug = formData.get("museum") as string;
    const platform = formData.get("platform") as string;
    const briefing = formData.get("briefing") as string;
    const ekstra = formData.get("ekstra") as string;
    const billedforslag = formData.get("billedforslag") === "true";
    const imageFile = formData.get("image") as File | null;

    const museum = getMuseum(museumSlug);
    if (!museum) return NextResponse.json({ error: "Ukendt museum" }, { status: 400 });

    // Knowledge base
    const knowledgePath = path.join(process.cwd(), "data", museum.knowledgeFile);
    let vidensbase = "Vidensbase ikke tilgængelig.";
    try {
      const raw = fs.readFileSync(knowledgePath, "utf-8");
      vidensbase = raw.length > 32000 ? raw.slice(0, 32000) + "\n\n[...afkortet...]" : raw;
    } catch { /* filen mangler */ }

    // Retningslinjer + inspiration + API-nøgle (via server client)
    const sb = createServerClient();
    const inspirationKey =
      platform === "Instagram" ? museum.supabaseKeys.instagramInspiration
      : platform === "Facebook" ? museum.supabaseKeys.facebookInspiration
      : null;

    const [retRes, inspRes, apiKeyRes] = await Promise.all([
      sb.from("indstillinger").select("værdi").eq("nøgle", museum.supabaseKeys.retningslinjer).single(),
      inspirationKey
        ? sb.from("inspiration").select("opslag").eq("platform", inspirationKey).order("oprettet")
        : Promise.resolve({ data: [] }),
      sb.from("indstillinger").select("værdi").eq("nøgle", "anthropic_api_key").single(),
    ]);

    const retningslinjer = (retRes.data as { værdi?: string } | null)?.værdi ?? "";
    const apiKey =
      (apiKeyRes.data as { værdi?: string } | null)?.værdi ||
      process.env.ANTHROPIC_API_KEY ||
      "";

    const inspirationseksempler = (inspRes.data ?? [])
      .map((r: { opslag: string }) => r.opslag)
      .join("\n\n---\n\n");

    const inspirationSektion =
      inspirationseksempler && platform !== "LinkedIn"
        ? `\nEKSEMPLER PÅ GODE ${platform.toUpperCase()}-OPSLAG FRA ${museum.name.toUpperCase()}:\n${inspirationseksempler}\n`
        : "";

    const systemPrompt = `${museum.systemPrompt}

AKTUEL SÆSON: ${getCurrentSeason()}

RETNINGSLINJER:
${retningslinjer}
${inspirationSektion}
VIDEN OM ${museum.name.toUpperCase()} (hentet direkte fra hjemmesiden):
${vidensbase}`;

    let prompt = briefing ? `Skriv et ${platform}-opslag om: ${briefing}` : `Skriv et ${platform}-opslag.`;
    if (ekstra) prompt += `\n\n⚠️ VIGTIGE FAKTA DER SKAL MED I OPSLAGET — OBLIGATORISK:\n${ekstra}\nDisse punkter skal fremgå tydeligt i opslaget.`;
    if (billedforslag) prompt += "\n\nTilføj til sidst et kort billedforslag på én linje der starter med 'BILLEDFORSLAG:'";
    if (imageFile) prompt += `\n\n${museum.billedePrompt}`;

    const userContent: Anthropic.MessageParam["content"] = [];
    if (imageFile) {
      const base64 = Buffer.from(await imageFile.arrayBuffer()).toString("base64");
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: imageFile.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 },
      });
    }
    userContent.push({ type: "text", text: prompt });

    // Stream
    const client = new Anthropic({ apiKey });
    const encoder = new TextEncoder();
    let inputTokens = 0;
    let outputTokens = 0;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [{ role: "user", content: userContent }],
          });

          for await (const chunk of stream) {
            if (chunk.type === "message_start") {
              inputTokens = chunk.message.usage.input_tokens;
            }
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
            if (chunk.type === "message_delta") {
              outputTokens = chunk.usage.output_tokens;
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\n[Fejl: ${String(err)}]`));
        } finally {
          controller.close();
          // Fire-and-forget: save usage to forbrug table
          if (inputTokens > 0 || outputTokens > 0) {
            void Promise.resolve(
              sb.from("forbrug").insert({
                museum: museumSlug,
                platform,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                model: "claude-sonnet-4-6",
              })
            ).catch(() => {});
          }
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (err) {
    console.error("Generate route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
