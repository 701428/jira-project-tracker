"""
Polaris Grids — Automation Portfolio Dashboard
Executive Overview (home page)
"""

import streamlit as st

st.set_page_config(
    page_title="Automation Dashboard · Polaris Grids",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="expanded",
)

import pandas as pd
from datetime import date

from utils.styles      import inject_css, sidebar_logo, page_header, section_title, COLORS
from utils.data_loader import (
    ensure_data_file, load_projects, load_non_automatable,
    load_day_plan, load_completion_plan,
    process_uploaded_file, get_template_excel, get_tracker_download,
)
from utils.calculations import enrich_projects, portfolio_summary
from utils.exports      import export_excel, export_pdf_html

from components.kpi_cards import portfolio_kpi_row
from components.charts    import coverage_donut, progress_bar_chart, portfolio_stacked_bar
from components.gantt     import project_gantt

if "dark_mode"    not in st.session_state: st.session_state.dark_mode    = False
if "data_version" not in st.session_state: st.session_state.data_version = 0
if "uploader_key" not in st.session_state: st.session_state.uploader_key = 0

inject_css(st.session_state.dark_mode)
sidebar_logo(st.session_state.dark_mode)

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.session_state.dark_mode = st.toggle("Dark Mode", value=st.session_state.dark_mode)
    st.divider()
    st.caption("DATA MANAGEMENT")
    uploaded = st.file_uploader(
        "Upload Tracker / Data", type=["xlsx","xls","csv"], label_visibility="collapsed",
        help="Upload 'Automation tracker.xlsx' to refresh all project data",
        key=f"uploader_{st.session_state.uploader_key}",
    )
    if uploaded:
        with st.spinner("Processing tracker…"):
            ok, msg = process_uploaded_file(uploaded)
        if ok:
            st.session_state.data_version += 1
            st.session_state.uploader_key += 1
            st.session_state["_upload_ok_msg"] = msg
            st.rerun()
        else:
            st.error(msg)
    st.download_button("Download Template", get_template_excel(),
                       "automation_template.xlsx",
                       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                       use_container_width=True)
    st.caption(f"v2.0 · {date.today().strftime('%d %b %Y')}")


# ── Load data ──────────────────────────────────────────────────────────────────
@st.cache_data(ttl=60, show_spinner=False)
def get_data(v: int):
    ensure_data_file()
    df   = enrich_projects(load_projects())
    non  = load_non_automatable()
    plan = load_day_plan()
    comp = load_completion_plan()
    summ = portfolio_summary(df)
    return df, non, plan, comp, summ

df_proj, df_non, df_plan, df_comp, summary = get_data(st.session_state.data_version)


# ── Header ─────────────────────────────────────────────────────────────────────
page_header(
    "Automation Portfolio",
    f"Meter Firmware · Executive Overview · {date.today().strftime('%d %B %Y')}",
)

if st.session_state.get("_upload_ok_msg"):
    st.success(st.session_state.pop("_upload_ok_msg"))

# ── KPI row ────────────────────────────────────────────────────────────────────
portfolio_kpi_row(summary)

st.divider()

# ── Charts ─────────────────────────────────────────────────────────────────────
section_title("Coverage & Breakdown")
col1, col2, col3 = st.columns([1, 1.4, 1.6])
with col1:
    st.plotly_chart(
        coverage_donut(df_proj, st.session_state.dark_mode),
        use_container_width=True, config={"displayModeBar": False}, key="exec_donut",
    )
with col2:
    st.plotly_chart(
        progress_bar_chart(df_proj, st.session_state.dark_mode),
        use_container_width=True, config={"displayModeBar": False}, key="exec_bar",
    )
with col3:
    st.plotly_chart(
        portfolio_stacked_bar(df_proj, st.session_state.dark_mode),
        use_container_width=True, config={"displayModeBar": False}, key="exec_stack",
    )

# ── Timeline ───────────────────────────────────────────────────────────────────
section_title("Implementation Timeline")
st.plotly_chart(
    project_gantt(df_proj, st.session_state.dark_mode),
    use_container_width=True,
    config={"displayModeBar": True, "modeBarButtonsToRemove": ["lasso2d","select2d"]},
    key="exec_gantt",
)

# ── Completion Plan summary ────────────────────────────────────────────────────
section_title("Project Completion Plan")
st.dataframe(
    df_comp.rename(columns={c: c.replace("_"," ").title() for c in df_comp.columns}),
    use_container_width=True, hide_index=True,
)

# ── Non-Automatable summary ────────────────────────────────────────────────────
section_title("Non-Automatable Summary")
col_na1, col_na2 = st.columns([1, 2])
with col_na1:
    by_proj = df_non.groupby("project_id")["count"].sum().reset_index()
    by_proj.columns = ["Project", "Count"]
    st.dataframe(by_proj, use_container_width=True, hide_index=True)
with col_na2:
    st.dataframe(
        df_non[["project_id","module","count","reason","approach"]].rename(
            columns={"project_id":"Project","module":"Module","count":"Count",
                     "reason":"Reason","approach":"Approach"}
        ),
        use_container_width=True, hide_index=True, height=280,
    )

# ── Export ─────────────────────────────────────────────────────────────────────
section_title("Export Reports")

# Tracker download — same format as Automation tracker.xlsx
st.download_button(
    "Download Automation Tracker",
    get_tracker_download(),
    f"Automation tracker {date.today().strftime('%d-%m-%Y')}.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    use_container_width=True,
    help="Downloads all project data in the same format as 'Automation tracker.xlsx'",
)

st.markdown("")
col_e1, col_e2, col_e3 = st.columns(3)
with col_e1:
    st.download_button(
        "Export Excel (Summary)",
        export_excel(df_proj, df_non, df_plan, df_comp),
        f"automation_report_{date.today().isoformat()}.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )
with col_e2:
    st.download_button(
        "Export PDF (HTML)",
        export_pdf_html(df_proj, df_non, df_plan).encode(),
        f"automation_report_{date.today().isoformat()}.html",
        "text/html",
        use_container_width=True,
        help="Open in browser → Ctrl+P → Save as PDF",
    )
with col_e3:
    st.download_button(
        "Export CSV",
        df_proj.to_csv(index=False).encode(),
        f"projects_{date.today().isoformat()}.csv",
        "text/csv",
        use_container_width=True,
    )
