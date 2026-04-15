import streamlit as st
from helpers import check_password, init_sider
from hjerlhede_agent import hjerlhede_agent
from holstebro_agent import holstebro_agent
from strandingsmuseum_agent import strandingsmuseum_agent
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

    with st.expander("Holstebro Museum", expanded=False):
        if st.button("Gå til agent", key="holstebro_btn", use_container_width=True):
            st.session_state["aktiv_agent"] = "holstebro"
            st.rerun()

    with st.expander("Strandingsmuseum St. George", expanded=False):
        if st.button("Gå til agent", key="strandingsmuseum_btn", use_container_width=True):
            st.session_state["aktiv_agent"] = "strandingsmuseum"
            st.rerun()

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
elif st.session_state["aktiv_agent"] == "holstebro":
    st.header("Holstebro Museum")
    holstebro_agent()
elif st.session_state["aktiv_agent"] == "strandingsmuseum":
    st.header("Strandingsmuseum St. George")
    strandingsmuseum_agent()
elif st.session_state["aktiv_agent"] == "nyhedsbrev":
    st.header("Hjerl Hede - Nyhedsbrev")
    nyhedsbrev_agent()