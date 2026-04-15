import streamlit as st
import os
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

SÆSON_MAP = {
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


def get_sæson():
    maaned = datetime.now().strftime("%B").lower()
    return SÆSON_MAP.get(maaned, "")


def get_supabase():
    url = st.secrets.get("SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = st.secrets.get("SUPABASE_KEY") or os.getenv("SUPABASE_KEY")
    return create_client(url, key)


def get_anthropic_key():
    return st.secrets.get("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_API_KEY")


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


def load_knowledge():
    try:
        with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def load_retningslinjer(nøgle="retningslinjer"):
    sb = get_supabase()
    try:
        res = sb.table("indstillinger").select("værdi").eq("nøgle", nøgle).execute()
        if res.data:
            return res.data[0]["værdi"]
    except:
        pass
    if nøgle == "retningslinjer":
        try:
            with open("retningslinjer.txt", "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            pass
    return ""


def gem_retningslinjer(tekst, nøgle="retningslinjer"):
    sb = get_supabase()
    sb.table("indstillinger").upsert({"nøgle": nøgle, "værdi": tekst}).execute()


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
        st.info(f"Ingen {platform_label}-eksempler tilføjet endnu.")

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
    st.markdown("**Tilføj nyt eksempel:**")
    nyt_opslag = st.text_area(
        "Indsæt her",
        height=150,
        placeholder=f"Indsæt et eksisterende {platform_label}-eksempel...",
        key=f"nyt_{platform_key}_opslag"
    )
    if st.button(f"Tilføj {platform_label}-eksempel", type="primary", key=f"tilføj_{platform_key}"):
        if nyt_opslag.strip():
            tilføj_inspiration(platform_key, nyt_opslag.strip())
            st.success("Eksempel tilføjet!")
            st.rerun()
        else:
            st.warning("Skriv et eksempel først.")