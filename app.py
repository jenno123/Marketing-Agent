import streamlit as st
import anthropic
import json
import os
import base64
import hmac
import subprocess
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
    st.title("🌿 Hjerlhede Marketing Agent")
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


def tilføj_side(url):
    sb = get_supabase()
    sb.table("sider").insert({"url": url}).execute()


def slet_side(id):
    sb = get_supabase()
    sb.table("sider").delete().eq("id", id).execute()


def init_sider():
    sb = get_supabase()
    res = sb.table("sider").select("url").execute()
    if not res.data:
        for url in DEFAULT_SIDER:
            sb.table("sider").insert({"url": url}).execute()


# --- Agent ---
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
        inspiration_sektion = f"\nEKSEMPLER PÅ GODE INSTAGRAM-OPSLAG FRA HJERLHEDE:\n{formateret}\n"
    elif platform == "Facebook" and facebook_liste:
        formateret = "\n\n---\n\n".join(facebook_liste)
        inspiration_sektion = f"\nEKSEMPLER PÅ GODE FACEBOOK-OPSLAG FRA HJERLHEDE:\n{formateret}\n"

    return f"""
Du er social media manager for Hjerlhede Frilandsmuseum i Midtjylland.

AKTUEL SÆSON: {sæson}

RETNINGSLINJER:
{retningslinjer}
{inspiration_sektion}
VIDEN OM HJERLHEDE (hentet direkte fra hjerlhede.dk):
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
        prompt += "\n\nJeg har vedhæftet et billede. Lad dig inspirere af billedets stemning, lys og atmosfære — men beskriv IKKE billedet direkte. Skriv et opslag der vækker den samme følelse som billedet giver, og trækker på Hjerlhedes historie og natur."

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
            if st.button("🗑️", key=f"slet_insp_{item['id']}", help="Slet dette opslag"):
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
    if st.button(f"➕ Tilføj {platform_label}-opslag", type="primary", key=f"tilføj_{platform_key}"):
        if nyt_opslag.strip():
            tilføj_inspiration(platform_key, nyt_opslag.strip())
            st.success("Opslag tilføjet!")
            st.rerun()
        else:
            st.warning("Skriv et opslag først.")


# Initialiser standard sider hvis databasen er tom
init_sider()


# --- UI ---
st.set_page_config(page_title="Hjerlhede Marketing Agent", page_icon="🌿", layout="wide")
st.title("🌿 Hjerlhede Marketing Agent")

tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "✍️ Generer opslag",
    "📋 Historik",
    "📸 Instagram inspiration",
    "👍 Facebook inspiration",
    "⚙️ Indstillinger"
])

with tab1:
    col1, col2 = st.columns([1, 1])

    with col1:
        st.subheader("Indstillinger")

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

        generer_btn = st.button("✨ Generer opslag", type="primary", use_container_width=True)

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
                    "⬇️ Download",
                    data=opslag,
                    file_name=f"hjerlhede_{st.session_state['sidste_platform'].lower()}.txt",
                    mime="text/plain",
                    use_container_width=True
                )
            with kol2:
                if st.button("🔁 Regenerer", use_container_width=True):
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
    st.subheader("📋 Historik")
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

            st.markdown(f"### 📅 {dansk_dato}")
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
                        "⬇️ Download",
                        data=item["opslag"],
                        file_name=f"hjerlhede_{item['platform'].lower()}_{dato}.txt",
                        key=f"dl_{item['id']}"
                    )
            st.divider()

with tab3:
    st.subheader("📸 Instagram inspiration")
    st.markdown("Tilføj gode eksempler på Instagram-opslag fra Hjerlhede. Agenten lærer tone og stil fra dem.")
    inspiration_sektion_ui("instagram", "Instagram")

with tab4:
    st.subheader("👍 Facebook inspiration")
    st.markdown("Tilføj gode eksempler på Facebook-opslag fra Hjerlhede. Agenten lærer tone og stil fra dem.")
    inspiration_sektion_ui("facebook", "Facebook")

with tab5:
    st.subheader("⚙️ Indstillinger")

    st.markdown("### 📝 Retningslinjer")
    st.markdown("Rediger agentens tone, regler og platformsregler direkte her.")

    nuværende_retningslinjer = load_retningslinjer()
    nye_retningslinjer = st.text_area(
        "Retningslinjer",
        value=nuværende_retningslinjer,
        height=400,
        label_visibility="collapsed"
    )

    if st.button("💾 Gem retningslinjer", type="primary"):
        gem_retningslinjer(nye_retningslinjer)
        st.success("Retningslinjer gemt!")

    st.divider()

    st.markdown("### 🌐 Sider der scrapers")
    st.markdown("Tilføj eller fjern sider fra vidensbasen. Tryk **Opdater vidensbase** bagefter.")

    sider = load_sider()
    slet_side_id = None

    for side in sider:
        col_url, col_del = st.columns([6, 1])
        with col_url:
            st.text(side["url"])
        with col_del:
            if st.button("🗑️", key=f"slet_side_{side['id']}", help="Fjern denne side"):
                slet_side_id = side["id"]

    if slet_side_id:
        slet_side(slet_side_id)
        st.rerun()

    st.markdown("**Tilføj ny side:**")
    ny_url = st.text_input("URL", placeholder="https://hjerlhede.dk/oplevelse/ny-side/")
    if st.button("➕ Tilføj side"):
        if ny_url and ny_url not in [s["url"] for s in sider]:
            tilføj_side(ny_url.strip())
            st.success(f"Tilføjet: {ny_url}")
            st.rerun()
        elif ny_url in [s["url"] for s in sider]:
            st.warning("Siden er allerede på listen.")
