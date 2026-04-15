import streamlit as st
from helpers import check_password, init_sider
from hjerlhede_agent import hjerlhede_agent
from nyhedsbrev_agent import nyhedsbrev_agent

st.set_page_config(page_title="Marketing Agent", layout="wide")

if not check_password():
    st.stop()

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

# Sæt standard
if "aktiv_agent" not in st.session_state:
    st.session_state["aktiv_agent"] = "hjerlhede"

# --- Vis aktiv agent ---
if st.session_state["aktiv_agent"] == "hjerlhede":
    st.header("Hjerl Hede Frilandsmuseum")
    hjerlhede_agent()
elif st.session_state["aktiv_agent"] == "nyhedsbrev":
    st.header("Hjerl Hede - Nyhedsbrev")
    nyhedsbrev_agent()