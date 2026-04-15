import streamlit as st
import anthropic
import base64
from datetime import datetime
from helpers import (
    load_knowledge, load_retningslinjer, gem_retningslinjer,
    load_inspiration, inspiration_sektion_ui,
    get_anthropic_key, get_sæson
)

NB_RETNINGSLINJER_NØGLE = "nyhedsbrev_retningslinjer"


def build_newsletter_system_prompt(knowledge):
    retningslinjer = load_retningslinjer(NB_RETNINGSLINJER_NØGLE)
    sæson = get_sæson()

    # Hent inspiration fra gamle nyhedsbreve
    nyhedsbrev_inspiration = load_inspiration("nyhedsbrev")
    inspiration_sektion = ""
    if nyhedsbrev_inspiration:
        formateret = "\n\n---\n\n".join([i["opslag"] for i in nyhedsbrev_inspiration])
        inspiration_sektion = f"""
EKSEMPLER PÅ TIDLIGERE NYHEDSBREVE FRA HJERL HEDE:
Brug disse som reference for tone, stil og opbygning. Lær af dem men kopier dem ikke.
{formateret}
"""

    return f"""
Du er nyhedsbrevsforfatter for Hjerl Hede Frilandsmuseum i Midtjylland.
Du skriver nyhedsbrevsindhold der er varmt, informativt og fortællende.
Tonen skal passe til et nyhedsbrev: personlig men professionel, engagerende uden at være påtrængende.

AKTUEL SÆSON: {sæson}

RETNINGSLINJER FOR NYHEDSBREVE:
{retningslinjer}
{inspiration_sektion}
VIDEN OM HJERL HEDE (hentet direkte fra hjerlhede.dk):
{knowledge}

VIGTIGE REGLER:
- Brug kun konkrete detaljer fra vidensbasen. Opfind ikke information.
- Skriv i en varm, fortællende tone der passer til nyhedsbrevsformatet.
- Hold teksten fokuseret og let at skimme.
"""


def generer_nyhedsbrev_sektion(nøgleord, brug_billede, billede_bytes=None, billede_type=None):
    """Genererer én sektion som en selvstændig HTML-blok til HeyLoyalty."""
    knowledge = load_knowledge()
    system = build_newsletter_system_prompt(knowledge)

    billede_layout_instruktion = ""
    if billede_bytes:
        billede_layout_instruktion = """
BILLEDE-LAYOUT:
Sektionen skal have billedet til venstre og teksten til højre (eller billede øverst på mobil).
Brug denne struktur til billedet:
<img src="[INDSÆT_BILLEDE_URL]" alt="Hjerl Hede" width="250" style="display:block; border-radius:4px;" />
Brugeren erstatter [INDSÆT_BILLEDE_URL] med den rigtige URL i HeyLoyalty bagefter.
"""

    prompt = f"""Skriv én sektion til et nyhedsbrev om: {nøgleord}

Svar med PRÆCIS dette format (inkluder taggene):

<HTML>
[En selvstændig HTML-blok der kan indsættes direkte i HeyLoyalty.
Brug inline styles overalt. INGEN <style> tags, INGEN CSS classes, INGEN <div> tags.
Alt layout bygges med <table>, <tr>, <td>.
Width: 100% (HeyLoyalty styrer bredden).
Font: Arial, Helvetica, sans-serif.
Inkluder en tydelig overskrift for sektionen med <h2>.
Hold det simpelt og rent.
{billede_layout_instruktion}]
</HTML>

<TEKST>
[Samme indhold som ren tekst uden formatering.]
</TEKST>
"""

    if brug_billede and billede_bytes:
        prompt += "\n\nJeg har vedhæftet et stemningsbillede. Lad dig inspirere af billedets stemning, lys og atmosfære. Skriv teksten så den vækker den samme følelse som billedet."

    client = anthropic.Anthropic(api_key=get_anthropic_key())

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

    # Fallback
    if not html_del:
        html_del = f"""<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:#333333; padding:20px;">
{svar}
</td></tr></table>"""
    if not tekst_del:
        tekst_del = svar

    return html_del, tekst_del


def nyhedsbrev_agent():
    """UI for nyhedsbrevagenten med sektion-for-sektion opbygning."""

    if "nb_sektioner" not in st.session_state:
        st.session_state.nb_sektioner = []

    tab_opret, tab_preview, tab_inspiration, tab_indstillinger = st.tabs([
        "Opret sektioner",
        "Samlet nyhedsbrev",
        "Nyhedsbrev inspiration",
        "Indstillinger"
    ])

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
                help="Billedet bruges til at sætte stemningen og placeres i HTML-blokken med en placeholder-URL",
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

                        # Hvis billede er uploadet (uanset tekstpåvirkning), inkluder det i layout
                        if nb_billede and not nb_brug_billede:
                            nb_billede.seek(0)
                            billede_bytes_layout = nb_billede.read()
                            billede_type_layout = nb_billede.type
                        elif nb_billede and nb_brug_billede:
                            billede_bytes_layout = billede_bytes
                            billede_type_layout = billede_type
                        else:
                            billede_bytes_layout = None
                            billede_type_layout = None

                        html_del, tekst_del = generer_nyhedsbrev_sektion(
                            nb_nøgleord,
                            nb_brug_billede,
                            billede_bytes_layout if nb_brug_billede else None,
                            billede_type_layout if nb_brug_billede else None
                        )

                        # Hvis billede uploadet men ikke bruges til tekst, tilføj layout alligevel
                        if nb_billede and not nb_brug_billede and "[INDSÆT_BILLEDE_URL]" not in html_del:
                            billede_tabel = """<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="250" valign="top" style="padding: 20px;">
<img src="[INDSÆT_BILLEDE_URL]" alt="Hjerl Hede" width="250" style="display:block; border-radius:4px;" />
</td>
<td valign="top" style="padding: 20px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:#333333;">
""" + html_del + """
</td>
</tr>
</table>"""
                            html_del = billede_tabel

                    st.session_state["nb_preview_html"] = html_del
                    st.session_state["nb_preview_tekst"] = tekst_del
                    st.session_state["nb_preview_nøgleord"] = nb_nøgleord
                    st.session_state["nb_preview_had_image"] = nb_billede is not None

            if "nb_preview_html" in st.session_state:
                preview_vis = st.radio(
                    "Vis som",
                    ["HTML preview", "Rå tekst", "HTML kode"],
                    horizontal=True,
                    key="nb_preview_vis"
                )

                if preview_vis == "HTML preview":
                    st.markdown(st.session_state["nb_preview_html"], unsafe_allow_html=True)
                    if st.session_state.get("nb_preview_had_image"):
                        st.caption("Billedet vises som placeholder. Erstat [INDSÆT_BILLEDE_URL] med den rigtige URL i HeyLoyalty.")
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
                        for key in ["nb_preview_html", "nb_preview_tekst", "nb_preview_nøgleord", "nb_preview_had_image"]:
                            if key in st.session_state:
                                del st.session_state[key]
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
            st.markdown(f"**{len(st.session_state.nb_sektioner)} sektion(er)**")

            samlet_vis = st.radio(
                "Vis som",
                ["HTML blokke (til HeyLoyalty)", "Rå tekst"],
                horizontal=True,
                key="nb_samlet_vis"
            )

            if samlet_vis == "HTML blokke (til HeyLoyalty)":
                for i, sektion in enumerate(st.session_state.nb_sektioner):
                    st.markdown(f"**Sektion {i + 1}: {sektion['nøgleord']}**")
                    st.code(sektion["html"], language="html")
                    st.download_button(
                        f"Download blok {i + 1}",
                        data=sektion["html"],
                        file_name=f"nyhedsbrev_blok_{i + 1}_{datetime.now().strftime('%Y%m%d')}.html",
                        mime="text/html",
                        key=f"nb_dl_html_{i}"
                    )
                    if i < len(st.session_state.nb_sektioner) - 1:
                        st.divider()
            else:
                samlet_tekst = "\n\n---\n\n".join([s["tekst"] for s in st.session_state.nb_sektioner])
                st.text_area("", value=samlet_tekst, height=500, label_visibility="collapsed", key="nb_samlet_tekst")
                st.download_button(
                    "Download samlet tekst",
                    data=samlet_tekst,
                    file_name=f"nyhedsbrev_hjerlhede_{datetime.now().strftime('%Y%m%d')}.txt",
                    mime="text/plain"
                )

            st.divider()
            if st.button("Nulstil nyhedsbrev", use_container_width=True):
                st.session_state.nb_sektioner = []
                st.rerun()

    with tab_inspiration:
        st.markdown("Tilføj eksempler fra tidligere nyhedsbreve. Agenten lærer tone, stil og opbygning fra dem.")
        inspiration_sektion_ui("nyhedsbrev", "Nyhedsbrev")

    with tab_indstillinger:
        st.markdown("### Retningslinjer for nyhedsbreve")
        st.caption("Disse retningslinjer er separate fra SoMe-agentens retningslinjer.")
        nuværende = load_retningslinjer(NB_RETNINGSLINJER_NØGLE)
        nye = st.text_area(
            "Retningslinjer",
            value=nuværende,
            height=400,
            label_visibility="collapsed",
            placeholder="F.eks. tone, målgruppe, foretrukne emner, ting der skal undgås...",
            key="nb_retningslinjer_tekst"
        )
        if st.button("Gem nyhedsbrev-retningslinjer", type="primary", key="nb_gem_retningslinjer"):
            gem_retningslinjer(nye, NB_RETNINGSLINJER_NØGLE)
            st.success("Retningslinjer gemt!")