import streamlit as st
import anthropic
import base64
from datetime import datetime
from helpers import (
    load_retningslinjer, gem_retningslinjer,
    load_inspiration, load_historik, gem_historik,
    grupper_historik_efter_dato, inspiration_sektion_ui,
    get_anthropic_key, get_sæson
)

KNOWLEDGE_FILE = "data/strandingsmuseum_knowledge.txt"
RETNINGSLINJER_NØGLE = "retningslinjer_strandingsmuseum"


def load_knowledge():
    try:
        with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def build_system_prompt(knowledge, platform):
    retningslinjer = load_retningslinjer(RETNINGSLINJER_NØGLE)
    instagram_liste = [i["opslag"] for i in load_inspiration("stranding_instagram")]
    facebook_liste = [i["opslag"] for i in load_inspiration("stranding_facebook")]
    sæson = get_sæson()

    inspiration_sektion = ""
    if platform == "Instagram" and instagram_liste:
        formateret = "\n\n---\n\n".join(instagram_liste)
        inspiration_sektion = f"\nEKSEMPLER PÅ GODE INSTAGRAM-OPSLAG FRA STRANDINGSMUSEET:\n{formateret}\n"
    elif platform == "Facebook" and facebook_liste:
        formateret = "\n\n---\n\n".join(facebook_liste)
        inspiration_sektion = f"\nEKSEMPLER PÅ GODE FACEBOOK-OPSLAG FRA STRANDINGSMUSEET:\n{formateret}\n"

    return f"""
Du er social media manager for Strandingsmuseum St. George i Thorsminde ved den jyske vestkyst.
Museet fortæller om dramatiske strandinger på Vestkysten, de britiske linjeskibe HMS St. George og HMS Defence der forliste i 1811, og om kystbefolkningens møde med søfolk fra hele verden.
Museet er bygget som skibet selv — 59 meter langt med tre etager — og rummer et imponerende tårn med HMS St. Georges originale ror og panoramaudsigt over Vesterhavet.
Det er en del af De Kulturhistoriske Museer i Holstebro Kommune.

AKTUEL SÆSON: {sæson}

RETNINGSLINJER:
{retningslinjer}
{inspiration_sektion}
VIDEN OM STRANDINGSMUSEUM ST. GEORGE (hentet direkte fra strandingsmuseet.dk):
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
        prompt += "\n\nJeg har vedhæftet et billede. Lad dig inspirere af billedets stemning, lys og atmosfære — men beskriv IKKE billedet direkte. Skriv et opslag der vækker den samme følelse som billedet giver, og trækker på museets fortællinger om havet, strandinger og kystlivet."

    client = anthropic.Anthropic(api_key=get_anthropic_key())

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


def strandingsmuseum_agent():
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
            platform = st.selectbox("Platform", ["Facebook", "Instagram", "LinkedIn"], key="stg_platform")

            briefing = st.text_area(
                "Hvad skal opslaget handle om?",
                placeholder="F.eks. HMS St. Georges ror, marinarkæologi, familieoplevelser ved havet...",
                height=100,
                key="stg_briefing"
            )

            ekstra = st.text_area(
                "Ekstra retningslinjer (valgfrit)",
                placeholder="F.eks. nævn at børn under 18 er gratis...",
                height=80,
                key="stg_ekstra"
            )

            billedforslag = st.toggle("Tilføj billedforslag", value=True, key="stg_billedforslag")

            uploadet_billede = st.file_uploader(
                "Upload billede (valgfrit)",
                type=["jpg", "jpeg", "png", "webp"],
                help="Agenten analyserer billedets stemning og bruger det i opslaget",
                key="stg_billede"
            )

            if uploadet_billede:
                st.image(uploadet_billede, use_container_width=True)

            generer_btn = st.button("Generer opslag", type="primary", use_container_width=True, key="stg_generer")

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
                    st.session_state["stg_sidste_opslag"] = opslag
                    st.session_state["stg_sidste_platform"] = platform
                    st.session_state["stg_sidste_briefing"] = briefing
                    gem_historik(f"stranding_{platform}", briefing, opslag)

            if "stg_sidste_opslag" in st.session_state:
                opslag = st.session_state["stg_sidste_opslag"]
                st.text_area("", value=opslag, height=350, label_visibility="collapsed", key="stg_opslag_vis")

                kol1, kol2 = st.columns(2)
                with kol1:
                    st.download_button(
                        "Download",
                        data=opslag,
                        file_name=f"strandingsmuseum_{st.session_state['stg_sidste_platform'].lower()}.txt",
                        mime="text/plain",
                        use_container_width=True,
                        key="stg_dl"
                    )
                with kol2:
                    if st.button("Regenerer", use_container_width=True, key="stg_regen"):
                        with st.spinner("Genererer nyt bud..."):
                            nyt_opslag = generer_opslag(
                                st.session_state["stg_sidste_platform"],
                                st.session_state["stg_sidste_briefing"],
                                "", billedforslag
                            )
                        st.session_state["stg_sidste_opslag"] = nyt_opslag
                        gem_historik(
                            f"stranding_{st.session_state['stg_sidste_platform']}",
                            st.session_state["stg_sidste_briefing"],
                            nyt_opslag
                        )
                        st.rerun()

    with tab2:
        historik = load_historik()
        stg_historik = [h for h in historik if h.get("platform", "").startswith("stranding_")]
        if not stg_historik:
            st.info("Ingen opslag endnu.")
        else:
            grupper = grupper_historik_efter_dato(stg_historik)
            for dato, opslag_liste in grupper.items():
                try:
                    dato_obj = datetime.strptime(dato, "%d/%m/%Y")
                    dansk_dato = dato_obj.strftime("%d. %B %Y")
                except (ValueError, TypeError):
                    dansk_dato = dato
                st.markdown(f"### {dansk_dato}")
                for item in opslag_liste:
                    tidspunkt = item["dato"][11:]
                    platform_navn = item["platform"].replace("stranding_", "")
                    label = f"{tidspunkt} — {platform_navn} — {item['briefing'][:60]}"
                    with st.expander(label):
                        st.text_area("", value=item["opslag"], height=200, label_visibility="collapsed", key=f"stg_ta_{item['id']}")
                        st.download_button("Download", data=item["opslag"], file_name=f"strandingsmuseum_{platform_navn}_{dato}.txt", key=f"stg_dl_{item['id']}")
                st.divider()

    with tab3:
        st.markdown("Tilføj gode eksempler på Instagram-opslag fra Strandingsmuseet.")
        inspiration_sektion_ui("stranding_instagram", "Instagram")

    with tab4:
        st.markdown("Tilføj gode eksempler på Facebook-opslag fra Strandingsmuseet.")
        inspiration_sektion_ui("stranding_facebook", "Facebook")

    with tab5:
        st.markdown("### Retningslinjer")
        nuværende = load_retningslinjer(RETNINGSLINJER_NØGLE)
        nye = st.text_area("Retningslinjer", value=nuværende, height=400, label_visibility="collapsed", key="stg_retningslinjer")
        if st.button("Gem retningslinjer", type="primary", key="stg_gem_retningslinjer"):
            gem_retningslinjer(nye, RETNINGSLINJER_NØGLE)
            st.success("Retningslinjer gemt!")

        st.divider()
        st.markdown("### Datakilder")
        st.markdown("Agenten henter sin viden fra `data/strandingsmuseum_knowledge.txt`. Kør scraperen lokalt for at opdatere.")