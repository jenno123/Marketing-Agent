import streamlit as st
import anthropic
import base64
from datetime import datetime
from helpers import (
    load_knowledge, load_retningslinjer, gem_retningslinjer,
    load_inspiration, load_historik, gem_historik, load_sider,
    grupper_historik_efter_dato, inspiration_sektion_ui,
    get_anthropic_key, get_sæson
)


def build_system_prompt(knowledge, platform):
    retningslinjer = load_retningslinjer()
    instagram_liste = [i["opslag"] for i in load_inspiration("instagram")]
    facebook_liste = [i["opslag"] for i in load_inspiration("facebook")]
    sæson = get_sæson()

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