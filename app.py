import streamlit as st
import anthropic
import json
import os
import base64
import hmac
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

KNOWLEDGE_FILE = "data/hjerlhede_knowledge.txt"

DEFAULT_SIDER = [
    "https://www.hjerlhede.dk",
    "https://www.hjerlhede.dk/om-hjerlhede",
    "https://www.hjerlhede.dk/besog",
    "https://www.hjerlhede.dk/aktiviteter",
    "https://www.hjerlhede.dk/historien",
    "https://www.hjerlhede.dk/billetter",
    "https://www.hjerlhede.dk/skoler",
    "https://www.hjerlhede.dk/grupper",
    "https://www.hjerlhede.dk/kontakt",
    "https://hjerlhede.dk/oplevelse/historiske-huse-og-bygninger/",
    "https://hjerlhede.dk/oplevelse/vip-tur-med-hestevogn-ud-over-heden/",
    "https://hjerlhede.dk/oplevelse/det-legende-menneske-gennem-tiden/",
    "https://hjerlhede.dk/oplevelse/vi-aabner-for-saesonen-1-maj-2026/",
    "https://da.wikipedia.org/wiki/Frilandsmuseet_Hjerl_Hede",
]


# --- Supabase ---
def get_supabase():
    url = st.secrets.get("SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = st.secrets.get("SUPABASE_KEY") or os.getenv("SUPABASE_KEY")
    return create_client(url, key)


# --- Login ---
def check_password():
    if "authenticated" not in st.session_state:
        st.session_state.authenticated = False
    if st.session_state.authenticated:
        return True
    st.title("Marketing Agent")
    st.markdown("Log ind for at fortsætte.")
    kodeord = st.text_input("Kodeord", type="password")
    if st.button("Log ind", type="primary"):
        forventet = st.secrets.get("APP_PASSWORD") or os.getenv("APP_PASSWORD", "")
        if hmac.compare_digest(kodeord, forventet):
            st.session_state.authenticated = True
            st.rerun()
        else:
            st.error("Forkert kodeord.")
    return False


if not check_password():
    st.stop()


# --- Hjælpefunktioner ---
def load_knowledge():
    try:
        with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def load_retningslinjer():
    sb = get_supabase()
    try:
        res = sb.table("indstillinger").select("værdi").eq("nøgle", "retningslinjer").execute()
        if res.data:
            return res.data[0]["værdi"]
    except:
        pass
    try:
        with open("retningslinjer.txt", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def gem_retningslinjer(tekst):
    sb = get_supabase()
    sb.table("indstillinger").upsert({"nøgle": "retningslinjer", "værdi": tekst}).execute()


def load_inspiration(platform):
    sb = get_supabase()
    res = sb.table("inspiration").select("id, opslag").eq("platform", platform).order("oprettet").execute()
    return res.data or []


def tilføj_inspiration(platform, opslag_tekst):
    sb = get_supabase()
    sb.table("inspiration").insert({"platform": platform, "opslag": opslag_tekst}).execute()


def opdater_inspiration(id, opslag_tekst):
    sb = get_supabase()
    sb.table("inspiration").update({"opslag": opslag_tekst}).eq("id", id).execute()


def slet_inspiration(id):
    sb = get_supabase()
    sb.table("inspiration").delete().eq("id", id).execute()


def load_historik():
    sb = get_supabase()
    res = sb.table("historik").select("*").order("dato", desc=True).limit(100).execute()
    return res.data or []


def gem_historik(platform, briefing, opslag):
    sb = get_supabase()
    sb.table("historik").insert({
        "dato": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "platform": platform,
        "briefing": briefing,
        "opslag": opslag
    }).execute()


def load_sider():
    sb = get_supabase()
    try:
        res = sb.table("sider").select("id, url").order("url").execute()
        if res.data:
            return res.data
    except:
        pass
    return [{"id": None, "url": u} for u in DEFAULT_SIDER]


def init_sider():
    sb = get_supabase()
    res = sb.table("sider").select("url").execute()
    if not res.data:
        for url in DEFAULT_SIDER:
            sb.table("sider").insert({"url": url}).execute()


# --- SoMe Agent ---
def build_system_prompt(knowledge, platform):
    retningslinjer = load_retningslinjer()
    instagram_liste = [i["opslag"] for i in load_inspiration("instagram")]
    facebook_liste = [i["opslag"] for i in load_inspiration("facebook")]
    maaned = datetime.now().strftime("%B").lower()
    sæson_map = {
        "january":   "januar — vinterstille, få besøgende, ro på museet",
        "february":  "februar — vinter ved at give slip, forberedelser til sæsonen",
        "march":     "marts — forår på vej, museet vågner op",
        "april":     "april — forår, påske, sæsonstart nærmer sig",
        "may":       "maj — sæsonåbning, frisk natur, lyse dage",
        "june":      "juni — højsæson, skoleudflugt, lange lyse aftener",
        "july":      "juli — højsommer, feriefamilier, fuldt program",
        "august":    "august — sensommer, stadig højsæson, begyndende eftersommer",
        "september": "september — gylden efterår, roligere, smuk natur",
        "october":   "oktober — efterårsferie, høst, sæsonen lakker mod enden",
        "november":  "november — sæson slut, museet i dvale",
        "december":  "december — jul, eftertanke, forberedelse til næste år"
    }
    sæson = sæson_map.get(maaned, "")

    inspiration_sektion = ""
    if platform == "Instagram" and instagram_liste:
        formateret = "\n\n---\n\n".join(instagram_liste)
        inspiration_sektion = f"\nEKSEMPLER PÅ GODE INSTAGRAM-OPSLAG FRA HJERL HEDE:\n{formateret}\n"
    elif platform == "Facebook" and facebook_liste:
        formateret = "\n\n---\n\n".join(facebook_liste)
        inspiration_sektion = f"\nEKSEMPLER PÅ GODE FACEBOOK-OPSLAG FRA HJERL HEDE:\n{formateret}\n"

    return f"""
Du er social media manager for Hjerl Hede Frilandsmuseum i Midtjylland.

AKTUEL SÆSON: {sæson}

RETNINGSLINJER:
{retningslinjer}
{inspiration_sektion}
VIDEN OM HJERL HEDE (hentet direkte fra hjerlhede.dk):
{knowledge}
"""


def generer_opslag(platform, briefing, ekstra, billedforslag, billede_bytes=None, billede_type=None):
    knowledge = load_knowledge()
    system = build_system_prompt(knowledge, platform)

    prompt = f"Skriv et {platform}-opslag om: {briefing}" if briefing else f"Skriv et {platform}-opslag."
    if ekstra:
        prompt += f"\n\n⚠️ VIGTIGE FAKTA DER SKAL MED I OPSLAGET — OBLIGATORISK:\n{ekstra}\nDisse punkter skal fremgå tydeligt i opslaget."
    if billedforslag:
        prompt += "\n\nTilføj til sidst et kort billedforslag på én linje der starter med 'BILLEDFORSLAG:'"
    if billede_bytes:
        prompt += "\n\nJeg har vedhæftet et billede. Lad dig inspirere af billedets stemning, lys og atmosfære — men beskriv IKKE billedet direkte. Skriv et opslag der vækker den samme følelse som billedet giver, og trækker på Hjerl Hedes historie og natur."

    anthropic_key = st.secrets.get("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=anthropic_key)

    if billede_bytes:
        billede_b64 = base64.standard_b64encode(billede_bytes).decode("utf-8")
        indhold = [
            {"type": "image", "source": {"type": "base64", "media_type": billede_type, "data": billede_b64}},
            {"type": "text", "text": prompt}
        ]
    else:
        indhold = prompt

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=system,
        messages=[{"role": "user", "content": indhold}]
    )
    return response.content[0].text


def grupper_historik_efter_dato(historik):
    grupper = {}
    for item in historik:
        dato = item["dato"][:10]
        if dato not in grupper:
            grupper[dato] = []
        grupper[dato].append(item)
    return grupper


def inspiration_sektion_ui(platform_key, platform_label):
    inspiration_liste = load_inspiration(platform_key)

    if not inspiration_liste:
        st.info(f"Ingen {platform_label}-opslag tilføjet endnu.")

    slet_id = None
    for item in inspiration_liste:
        col_tekst, col_slet = st.columns([6, 1])
        with col_tekst:
            opdateret = st.text_area(
                f"Opslag",
                value=item["opslag"],
                height=150,
                key=f"insp_{platform_key}_{item['id']}",
                label_visibility="collapsed"
            )
            if opdateret != item["opslag"]:
                opdater_inspiration(item["id"], opdateret)
        with col_slet:
            st.markdown("<div style='margin-top: 8px'>", unsafe_allow_html=True)
            if st.button("Slet", key=f"slet_insp_{item['id']}"):
                slet_id = item["id"]
            st.markdown("</div>", unsafe_allow_html=True)

    if slet_id:
        slet_inspiration(slet_id)
        st.rerun()

    st.divider()
    st.markdown("**Tilføj nyt opslag:**")
    nyt_opslag = st.text_area(
        "Indsæt opslag her",
        height=150,
        placeholder=f"Indsæt et eksisterende {platform_label}-opslag...",
        key=f"nyt_{platform_key}_opslag"
    )
    if st.button(f"Tilføj {platform_label}-opslag", type="primary", key=f"tilføj_{platform_key}"):
        if nyt_opslag.strip():
            tilføj_inspiration(platform_key, nyt_opslag.strip())
            st.success("Opslag tilføjet!")
            st.rerun()
        else:
            st.warning("Skriv et opslag først.")


def hjerlhede_agent():
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "Generer opslag",
        "Historik",
        "Instagram inspiration",
        "Facebook inspiration",
        "Indstillinger"
    ])

    with tab1:
        col1, col2 = st.columns([1, 1])

        with col1:
            platform = st.selectbox("Platform", ["Facebook", "Instagram", "LinkedIn"])

            briefing = st.text_area(
                "Hvad skal opslaget handle om?",
                placeholder="F.eks. skovtur for børnefamilier i juni, åbning af sæsonen...",
                height=100
            )

            ekstra = st.text_area(
                "Ekstra retningslinjer (valgfrit)",
                placeholder="F.eks. nævn at det er gratis for børn under 5...",
                height=80
            )

            billedforslag = st.toggle("Tilføj billedforslag", value=True)

            uploadet_billede = st.file_uploader(
                "Upload billede (valgfrit)",
                type=["jpg", "jpeg", "png", "webp"],
                help="Agenten analyserer billedets stemning og bruger det i opslaget"
            )

            if uploadet_billede:
                st.image(uploadet_billede, use_container_width=True)

            generer_btn = st.button("Generer opslag", type="primary", use_container_width=True)

        with col2:
            st.subheader("Genereret opslag")

            if generer_btn:
                if not briefing and not uploadet_billede:
                    st.warning("Skriv hvad opslaget skal handle om, eller upload et billede.")
                else:
                    with st.spinner("Genererer opslag..."):
                        if uploadet_billede:
                            billede_bytes = uploadet_billede.read()
                            billede_type = uploadet_billede.type
                        else:
                            billede_bytes = None
                            billede_type = None
                        opslag = generer_opslag(platform, briefing, ekstra, billedforslag, billede_bytes, billede_type)
                    st.session_state["sidste_opslag"] = opslag
                    st.session_state["sidste_platform"] = platform
                    st.session_state["sidste_briefing"] = briefing
                    gem_historik(platform, briefing, opslag)

            if "sidste_opslag" in st.session_state:
                opslag = st.session_state["sidste_opslag"]
                st.text_area("", value=opslag, height=350, label_visibility="collapsed")

                kol1, kol2 = st.columns(2)
                with kol1:
                    st.download_button(
                        "Download",
                        data=opslag,
                        file_name=f"hjerlhede_{st.session_state['sidste_platform'].lower()}.txt",
                        mime="text/plain",
                        use_container_width=True
                    )
                with kol2:
                    if st.button("Regenerer", use_container_width=True):
                        with st.spinner("Genererer nyt bud..."):
                            nyt_opslag = generer_opslag(
                                st.session_state["sidste_platform"],
                                st.session_state["sidste_briefing"],
                                "", billedforslag
                            )
                        st.session_state["sidste_opslag"] = nyt_opslag
                        gem_historik(
                            st.session_state["sidste_platform"],
                            st.session_state["sidste_briefing"],
                            nyt_opslag
                        )
                        st.rerun()

    with tab2:
        historik = load_historik()
        if not historik:
            st.info("Ingen opslag endnu — generer dit første ovenfor.")
        else:
            grupper = grupper_historik_efter_dato(historik)
            for dato, opslag_liste in grupper.items():
                try:
                    dato_obj = datetime.strptime(dato, "%d/%m/%Y")
                    dansk_dato = dato_obj.strftime("%d. %B %Y")
                except (ValueError, TypeError):
                    dansk_dato = dato

                st.markdown(f"### {dansk_dato}")
                for item in opslag_liste:
                    tidspunkt = item["dato"][11:]
                    label = f"{tidspunkt} — {item['platform']} — {item['briefing'][:60]}"
                    with st.expander(label):
                        st.text_area(
                            "",
                            value=item["opslag"],
                            height=200,
                            label_visibility="collapsed",
                            key=f"ta_{item['id']}"
                        )
                        st.download_button(
                            "Download",
                            data=item["opslag"],
                            file_name=f"hjerlhede_{item['platform'].lower()}_{dato}.txt",
                            key=f"dl_{item['id']}"
                        )
                st.divider()

    with tab3:
        st.markdown("Tilføj gode eksempler på Instagram-opslag fra Hjerl Hede. Agenten lærer tone og stil fra dem.")
        inspiration_sektion_ui("instagram", "Instagram")

    with tab4:
        st.markdown("Tilføj gode eksempler på Facebook-opslag fra Hjerl Hede. Agenten lærer tone og stil fra dem.")
        inspiration_sektion_ui("facebook", "Facebook")

    with tab5:
        st.markdown("### Retningslinjer")
        nuværende_retningslinjer = load_retningslinjer()
        nye_retningslinjer = st.text_area(
            "Retningslinjer",
            value=nuværende_retningslinjer,
            height=400,
            label_visibility="collapsed"
        )
        if st.button("Gem retningslinjer", type="primary"):
            gem_retningslinjer(nye_retningslinjer)
            st.success("Retningslinjer gemt!")

        st.divider()
        st.markdown("### Datakilder")
        st.markdown("Agenten henter sin viden fra disse sider:")
        sider = load_sider()
        for side in sider:
            st.markdown(f"""
            <div style="
                padding: 10px 16px;
                margin: 6px 0;
                border-radius: 8px;
                border: 1px solid rgba(128,128,128,0.2);
                font-size: 14px;
                font-family: monospace;
            ">
                {side["url"]}
            </div>
            """, unsafe_allow_html=True)


# =============================================
# NYHEDSBREV AGENT
# =============================================

def build_newsletter_system_prompt(knowledge):
    retningslinjer = load_retningslinjer()
    maaned = datetime.now().strftime("%B").lower()
    sæson_map = {
        "january":   "januar — vinterstille, få besøgende, ro på museet",
        "february":  "februar — vinter ved at give slip, forberedelser til sæsonen",
        "march":     "marts — forår på vej, museet vågner op",
        "april":     "april — forår, påske, sæsonstart nærmer sig",
        "may":       "maj — sæsonåbning, frisk natur, lyse dage",
        "june":      "juni — højsæson, skoleudflugt, lange lyse aftener",
        "july":      "juli — højsommer, feriefamilier, fuldt program",
        "august":    "august — sensommer, stadig højsæson, begyndende eftersommer",
        "september": "september — gylden efterår, roligere, smuk natur",
        "october":   "oktober — efterårsferie, høst, sæsonen lakker mod enden",
        "november":  "november — sæson slut, museet i dvale",
        "december":  "december — jul, eftertanke, forberedelse til næste år"
    }
    sæson = sæson_map.get(maaned, "")

    return f"""
Du er nyhedsbrevsforfatter for Hjerl Hede Frilandsmuseum i Midtjylland.
Du skriver nyhedsbrevsindhold der er varmt, informativt og fortællende.
Tonen skal passe til et nyhedsbrev: personlig men professionel, engagerende uden at være påtrængende.

AKTUEL SÆSON: {sæson}

RETNINGSLINJER:
{retningslinjer}

VIDEN OM HJERL HEDE (hentet direkte fra hjerlhede.dk):
{knowledge}

VIGTIGE REGLER:
- Brug kun konkrete detaljer fra vidensbasen. Opfind ikke information.
- Skriv i en varm, fortællende tone der passer til nyhedsbrevsformatet.
- Hold teksten fokuseret og let at skimme.
"""


def generer_nyhedsbrev_sektion(nøgleord, brug_billede, billede_bytes=None, billede_type=None):
    """Genererer én sektion af et nyhedsbrev i både HTML og rå tekst."""
    knowledge = load_knowledge()
    system = build_newsletter_system_prompt(knowledge)

    prompt = f"""Skriv én sektion til et nyhedsbrev om: {nøgleord}

Svar med PRÆCIS dette format (inkluder taggene):

<HTML>
[Email-kompatibelt HTML for denne sektion. Brug inline styles, tabel-layout, og sørg for kompatibilitet med email-klienter.
Brug max-width: 600px. Brug en enkelt tabel med width="100%".
Font: Arial, Helvetica, sans-serif. Brug behagelige farver og god spacing.
Inkluder en tydelig overskrift for sektionen.
Brug IKKE <style> tags, <div> tags eller CSS classes — KUN inline styles på tabel-elementer, td, p, h2, h3, a, span osv.
Alt layout skal bygges med <table>, <tr>, <td>.]
</HTML>

<TEKST>
[Samme indhold som ren tekst uden formatering, klar til at kopiere.]
</TEKST>
"""

    if brug_billede and billede_bytes:
        prompt += "\n\nJeg har vedhæftet et stemningsbillede. Lad dig inspirere af billedets stemning, lys og atmosfære. Skriv teksten så den vækker den samme følelse som billedet."

    anthropic_key = st.secrets.get("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=anthropic_key)

    if brug_billede and billede_bytes:
        billede_b64 = base64.standard_b64encode(billede_bytes).decode("utf-8")
        indhold = [
            {"type": "image", "source": {"type": "base64", "media_type": billede_type, "data": billede_b64}},
            {"type": "text", "text": prompt}
        ]
    else:
        indhold = prompt

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=system,
        messages=[{"role": "user", "content": indhold}]
    )

    svar = response.content[0].text

    # Parse HTML og tekst ud
    html_del = ""
    tekst_del = ""

    if "<HTML>" in svar and "</HTML>" in svar:
        html_del = svar.split("<HTML>")[1].split("</HTML>")[0].strip()
    if "<TEKST>" in svar and "</TEKST>" in svar:
        tekst_del = svar.split("<TEKST>")[1].split("</TEKST>")[0].strip()

    # Fallback hvis parsing fejler
    if not html_del:
        html_del = f"<table width='100%' cellpadding='0' cellspacing='0'><tr><td style='font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;padding:20px;'>{svar}</td></tr></table>"
    if not tekst_del:
        tekst_del = svar

    return html_del, tekst_del


def saml_nyhedsbrev_html(sektioner):
    """Samler alle sektioner til ét komplet email-kompatibelt HTML-nyhedsbrev."""
    sektioner_html = ""
    for i, sektion in enumerate(sektioner):
        sektioner_html += sektion["html"]
        if i < len(sektioner) - 1:
            # Divider mellem sektioner
            sektioner_html += """
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="padding: 10px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td style="border-top: 1px solid #e0e0e0; font-size: 0; line-height: 0;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            """

    html = f"""<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nyhedsbrev - Hjerl Hede Frilandsmuseum</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f0; font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f0;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; width:100%;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#2c4a1e; padding:30px 20px; text-align:center;">
                            <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:normal; font-family:Georgia,serif;">Hjerl Hede Frilandsmuseum</h1>
                            <p style="margin:8px 0 0 0; color:#c8d9be; font-size:14px;">Nyhedsbrev</p>
                        </td>
                    </tr>
                    <!-- Indhold -->
                    <tr>
                        <td style="padding: 0;">
                            {sektioner_html}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#2c4a1e; padding:20px; text-align:center;">
                            <p style="margin:0; color:#c8d9be; font-size:12px; font-family:Arial,Helvetica,sans-serif;">
                                Hjerl Hede Frilandsmuseum &bull; Hjerl Hedevej 14 &bull; 7830 Vinderup
                            </p>
                            <p style="margin:8px 0 0 0;">
                                <a href="https://www.hjerlhede.dk" style="color:#ffffff; font-size:12px; text-decoration:underline;">hjerlhede.dk</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
    return html


def saml_nyhedsbrev_tekst(sektioner):
    """Samler alle sektioner til ét komplet tekst-nyhedsbrev."""
    dele = []
    dele.append("=" * 50)
    dele.append("HJERL HEDE FRILANDSMUSEUM - NYHEDSBREV")
    dele.append("=" * 50)
    dele.append("")

    for i, sektion in enumerate(sektioner):
        dele.append(sektion["tekst"])
        if i < len(sektioner) - 1:
            dele.append("")
            dele.append("-" * 40)
            dele.append("")

    dele.append("")
    dele.append("=" * 50)
    dele.append("Hjerl Hede Frilandsmuseum")
    dele.append("Hjerl Hedevej 14, 7830 Vinderup")
    dele.append("hjerlhede.dk")
    dele.append("=" * 50)

    return "\n".join(dele)


def nyhedsbrev_agent():
    """UI for nyhedsbrevagenten med sektion-for-sektion opbygning."""

    # Initialiser session state
    if "nb_sektioner" not in st.session_state:
        st.session_state.nb_sektioner = []
    if "nb_færdig" not in st.session_state:
        st.session_state.nb_færdig = False

    tab_opret, tab_preview = st.tabs(["Opret sektioner", "Samlet nyhedsbrev"])

    with tab_opret:
        # Vis eksisterende sektioner
        if st.session_state.nb_sektioner:
            st.markdown("### Tilføjede sektioner")
            for i, sektion in enumerate(st.session_state.nb_sektioner):
                col_info, col_slet = st.columns([5, 1])
                with col_info:
                    with st.expander(f"Sektion {i + 1}: {sektion['nøgleord']}", expanded=False):
                        visning = st.radio(
                            "Vis som",
                            ["HTML preview", "Rå tekst", "HTML kode"],
                            horizontal=True,
                            key=f"nb_vis_{i}"
                        )
                        if visning == "HTML preview":
                            st.markdown(sektion["html"], unsafe_allow_html=True)
                        elif visning == "Rå tekst":
                            st.text_area("", value=sektion["tekst"], height=200, label_visibility="collapsed", key=f"nb_tekst_{i}")
                        else:
                            st.code(sektion["html"], language="html")
                with col_slet:
                    st.markdown("<div style='margin-top: 12px'>", unsafe_allow_html=True)
                    if st.button("Slet", key=f"nb_slet_{i}"):
                        st.session_state.nb_sektioner.pop(i)
                        st.rerun()
                    st.markdown("</div>", unsafe_allow_html=True)

            st.divider()

        # Opret ny sektion
        st.markdown("### Ny sektion")

        col_input, col_output = st.columns([1, 1])

        with col_input:
            nb_billede = st.file_uploader(
                "Upload stemningsbillede (valgfrit)",
                type=["jpg", "jpeg", "png", "webp"],
                help="Billedet bruges til at sætte stemningen for sektionens tekst",
                key="nb_billede_upload"
            )

            if nb_billede:
                st.image(nb_billede, use_container_width=True)
                nb_brug_billede = st.toggle(
                    "Billedet skal have indflydelse på teksten",
                    value=True,
                    key="nb_brug_billede"
                )
            else:
                nb_brug_billede = False

            nb_nøgleord = st.text_area(
                "Beskriv hvad sektionen omhandler",
                placeholder="F.eks. sæsonåbning 1. maj, aktiviteter for børn, historiske huse...",
                height=100,
                key="nb_nøgleord"
            )

            generer_sektion_btn = st.button("Opret sektion", type="primary", use_container_width=True)

        with col_output:
            st.subheader("Preview")

            if generer_sektion_btn:
                if not nb_nøgleord:
                    st.warning("Beskriv hvad sektionen skal handle om.")
                else:
                    with st.spinner("Genererer sektion..."):
                        if nb_billede and nb_brug_billede:
                            billede_bytes = nb_billede.read()
                            billede_type = nb_billede.type
                        else:
                            billede_bytes = None
                            billede_type = None

                        html_del, tekst_del = generer_nyhedsbrev_sektion(
                            nb_nøgleord, nb_brug_billede, billede_bytes, billede_type
                        )

                    st.session_state["nb_preview_html"] = html_del
                    st.session_state["nb_preview_tekst"] = tekst_del
                    st.session_state["nb_preview_nøgleord"] = nb_nøgleord

            if "nb_preview_html" in st.session_state:
                preview_vis = st.radio(
                    "Vis som",
                    ["HTML preview", "Rå tekst", "HTML kode"],
                    horizontal=True,
                    key="nb_preview_vis"
                )

                if preview_vis == "HTML preview":
                    st.markdown(st.session_state["nb_preview_html"], unsafe_allow_html=True)
                elif preview_vis == "Rå tekst":
                    st.text_area("", value=st.session_state["nb_preview_tekst"], height=250, label_visibility="collapsed", key="nb_preview_tekst_area")
                else:
                    st.code(st.session_state["nb_preview_html"], language="html")

                kol1, kol2 = st.columns(2)
                with kol1:
                    if st.button("Tilføj til nyhedsbrev", type="primary", use_container_width=True):
                        st.session_state.nb_sektioner.append({
                            "nøgleord": st.session_state["nb_preview_nøgleord"],
                            "html": st.session_state["nb_preview_html"],
                            "tekst": st.session_state["nb_preview_tekst"]
                        })
                        # Ryd preview
                        del st.session_state["nb_preview_html"]
                        del st.session_state["nb_preview_tekst"]
                        del st.session_state["nb_preview_nøgleord"]
                        st.rerun()
                with kol2:
                    if st.button("Regenerer", use_container_width=True, key="nb_regenerer"):
                        with st.spinner("Genererer nyt bud..."):
                            html_del, tekst_del = generer_nyhedsbrev_sektion(
                                st.session_state["nb_preview_nøgleord"], False
                            )
                        st.session_state["nb_preview_html"] = html_del
                        st.session_state["nb_preview_tekst"] = tekst_del
                        st.rerun()

    with tab_preview:
        if not st.session_state.nb_sektioner:
            st.info("Tilføj mindst én sektion for at se det samlede nyhedsbrev.")
        else:
            st.markdown(f"**{len(st.session_state.nb_sektioner)} sektion(er) i nyhedsbrevet**")

            samlet_vis = st.radio(
                "Vis som",
                ["HTML preview", "Rå tekst", "HTML kode"],
                horizontal=True,
                key="nb_samlet_vis"
            )

            samlet_html = saml_nyhedsbrev_html(st.session_state.nb_sektioner)
            samlet_tekst = saml_nyhedsbrev_tekst(st.session_state.nb_sektioner)

            if samlet_vis == "HTML preview":
                st.components.v1.html(samlet_html, height=800, scrolling=True)
            elif samlet_vis == "Rå tekst":
                st.text_area("", value=samlet_tekst, height=500, label_visibility="collapsed", key="nb_samlet_tekst")
            else:
                st.code(samlet_html, language="html")

            st.divider()

            kol1, kol2, kol3 = st.columns(3)
            with kol1:
                st.download_button(
                    "Download HTML",
                    data=samlet_html,
                    file_name=f"nyhedsbrev_hjerlhede_{datetime.now().strftime('%Y%m%d')}.html",
                    mime="text/html",
                    use_container_width=True
                )
            with kol2:
                st.download_button(
                    "Download tekst",
                    data=samlet_tekst,
                    file_name=f"nyhedsbrev_hjerlhede_{datetime.now().strftime('%Y%m%d')}.txt",
                    mime="text/plain",
                    use_container_width=True
                )
            with kol3:
                if st.button("Nulstil nyhedsbrev", use_container_width=True):
                    st.session_state.nb_sektioner = []
                    st.rerun()


# --- Setup ---
st.set_page_config(page_title="Marketing Agent", layout="wide")
init_sider()

# --- Sidebar ---
with st.sidebar:
    st.markdown("## Marketing Agent")
    st.divider()

    st.markdown("**Sociale medier**")

    with st.expander("Hjerl Hede Frilandsmuseum", expanded=True):
        if st.button("Gå til agent", key="hjerlhede_btn", use_container_width=True):
            st.session_state["aktiv_agent"] = "hjerlhede"
            st.rerun()

    with st.expander("Museum 2", expanded=False):
        st.caption("Denne agent er ikke oprettet endnu.")

    st.divider()
    st.markdown("**Nyhedsbreve**")

    with st.expander("Hjerl Hede Nyhedsbrev", expanded=False):
        if st.button("Gå til nyhedsbrev", key="nyhedsbrev_btn", use_container_width=True):
            st.session_state["aktiv_agent"] = "nyhedsbrev"
            st.rerun()

# Sæt standard agent
if "aktiv_agent" not in st.session_state:
    st.session_state["aktiv_agent"] = "hjerlhede"

# --- Vis aktiv agent ---
if st.session_state["aktiv_agent"] == "hjerlhede":
    st.header("Hjerl Hede Frilandsmuseum")
    hjerlhede_agent()
elif st.session_state["aktiv_agent"] == "nyhedsbrev":
    st.header("Hjerl Hede - Nyhedsbrev")
    nyhedsbrev_agent()