import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { getCurrentSeason } from "@/lib/seasons";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const briefing = formData.get("briefing") as string;
    const billedeUrl = formData.get("billedeUrl") as string | null;
    const brugBillede = formData.get("brugBillede") === "true";
    const imageFile = formData.get("image") as File | null;

    // Knowledge base (Hjerl Hede)
    const knowledgePath = path.join(process.cwd(), "data", "hjerlhede_knowledge.txt");
    let vidensbase = "Vidensbase ikke tilgængelig.";
    try {
      const raw = fs.readFileSync(knowledgePath, "utf-8");
      vidensbase = raw.length > 32000 ? raw.slice(0, 32000) + "\n\n[...afkortet...]" : raw;
    } catch { /* filen mangler */ }

    const sb = createServerClient();
    const [retRes, inspRes, apiKeyRes] = await Promise.all([
      sb.from("indstillinger").select("værdi").eq("nøgle", "nyhedsbrev_retningslinjer").single(),
      sb.from("inspiration").select("opslag").eq("platform", "nyhedsbrev").order("oprettet"),
      sb.from("indstillinger").select("værdi").eq("nøgle", "anthropic_api_key").single(),
    ]);

    const retningslinjer = (retRes.data as { værdi?: string } | null)?.værdi ?? "";
    const apiKey = (apiKeyRes.data as { værdi?: string } | null)?.værdi || process.env.ANTHROPIC_API_KEY || "";

    const inspirationseksempler = (inspRes.data ?? [])
      .map((r: { opslag: string }) => r.opslag)
      .join("\n\n---\n\n");

    const inspirationSektion = inspirationseksempler
      ? `\nEKSEMPLER PÅ TIDLIGERE NYHEDSBREVE FRA HJERL HEDE:\nBrug disse som reference for tone, stil og opbygning. Lær af dem men kopier dem ikke.\n${inspirationseksempler}\n`
      : "";

    const systemPrompt = `Du er nyhedsbrevsforfatter for Hjerl Hede Frilandsmuseum i Midtjylland.
Du skriver nyhedsbrevsindhold der er varmt, informativt og fortællende.
Tonen skal passe til et nyhedsbrev: personlig men professionel, engagerende uden at være påtrængende.

AKTUEL SÆSON: ${getCurrentSeason()}

RETNINGSLINJER FOR NYHEDSBREVE:
${retningslinjer}
${inspirationSektion}
VIDEN OM HJERL HEDE (hentet direkte fra hjerlhede.dk):
${vidensbase}

VIGTIGE REGLER:
- Brug kun konkrete detaljer fra vidensbasen. Opfind ikke information.
- Skriv i en varm, fortællende tone der passer til nyhedsbrevsformatet.
- Hold teksten fokuseret og let at skimme.`;

    let billedeLayout = "";
    if (billedeUrl) {
      billedeLayout = `\nBILLEDE-LAYOUT:\nSektionen skal have billedet til venstre og teksten til højre.\nBrug PRÆCIS denne URL:\n<img src="${billedeUrl}" alt="Hjerl Hede" width="250" style="display:block; border-radius:4px;" />`;
    } else if (brugBillede && imageFile) {
      billedeLayout = `\nBILLEDE-LAYOUT:\nSektionen skal have billedet til venstre og teksten til højre.\nBrug denne placeholder:\n<img src="[INDSÆT_BILLEDE_URL]" alt="Hjerl Hede" width="250" style="display:block; border-radius:4px;" />`;
    }

    const promptTekst = `Skriv én sektion til et nyhedsbrev om: ${briefing}

Svar med PRÆCIS dette format (inkluder taggene):

<HTML>
[En selvstændig HTML-blok der kan indsættes direkte i HeyLoyalty.
Brug inline styles overalt. INGEN <style> tags, INGEN CSS classes, INGEN <div> tags.
Alt layout bygges med <table>, <tr>, <td>.
Width: 100% (HeyLoyalty styrer bredden).
Font: Arial, Helvetica, sans-serif.
Inkluder en tydelig overskrift med <h2>.
Hold det simpelt og rent.${billedeLayout}]
</HTML>

<TEKST>
[Samme indhold som ren tekst uden formatering.]
</TEKST>${imageFile && brugBillede ? "\n\nJeg har vedhæftet et stemningsbillede. Lad dig inspirere af billedets stemning, lys og atmosfære. Skriv teksten så den vækker den samme følelse." : ""}`;

    const userContent: Anthropic.MessageParam["content"] = [];
    if (imageFile && brugBillede) {
      const base64 = Buffer.from(await imageFile.arrayBuffer()).toString("base64");
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: imageFile.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 },
      });
    }
    userContent.push({ type: "text", text: promptTekst });

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const svar = (response.content[0] as { type: "text"; text: string }).text;
    let html = svar.includes("<HTML>") ? svar.split("<HTML>")[1].split("</HTML>")[0].trim() : "";
    let tekst = svar.includes("<TEKST>") ? svar.split("<TEKST>")[1].split("</TEKST>")[0].trim() : "";

    if (!html) html = `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;padding:20px;">${svar}</td></tr></table>`;
    if (!tekst) tekst = svar;

    // Track usage
    void Promise.resolve(
      sb.from("forbrug").insert({
        museum: "hjerlhede",
        platform: "Nyhedsbrev",
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        model: "claude-sonnet-4-6",
      })
    ).catch(() => {});

    return NextResponse.json({ html, tekst });
  } catch (err) {
    console.error("Newsletter generate error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
