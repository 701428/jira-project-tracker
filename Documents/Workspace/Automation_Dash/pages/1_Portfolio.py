"""
Portfolio page — project cards + editable progress table.
"""

import streamlit as st

st.set_page_config(
    page_title="Portfolio · Automation Dashboard",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="expanded",
)

import pandas as pd
from datetime import date

from utils.styles      import inject_css, sidebar_logo, page_header, section_title, COLORS
from utils.data_loader import (
    ensure_data_file, load_projects, load_non_automatable,
    load_day_plan, save_projects,
    process_uploaded_file, get_template_excel,
)
from utils.calculations import enrich_projects, portfolio_summary
from components.charts  import progress_bar_chart, portfolio_stacked_bar
from components.gantt   import project_gantt

if "dark_mode"    not in st.session_state: st.session_state.dark_mode    = False
if "data_version" not in st.session_state: st.session_state.data_version = 0
if "uploader_key" not in st.session_state: st.session_state.uploader_key = 0

inject_css(st.session_state.dark_mode)
sidebar_logo(st.session_state.dark_mode)

with st.sidebar:
    st.session_state.dark_mode = st.toggle("Dark Mode", value=st.session_state.dark_mode)
    st.divider()
    st.caption("DATA MANAGEMENT")
    uploaded = st.file_uploader(
        "Upload Tracker / Data", type=["xlsx","xls","csv"],
        label_visibility="collapsed",
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
    st.download_button("Template", get_template_excel(), "automation_template.xlsx",
                       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                       use_container_width=True)


@st.cache_data(ttl=60, show_spinner=False)
def get_data(v: int):
    ensure_data_file()
    df = enrich_projects(load_projects())
    return df

df_proj = get_data(st.session_state.data_version)

page_header("Portfolio Overview", "All projects — coverage, schedule, and progress")

if st.session_state.get("_upload_ok_msg"):
    st.success(st.session_state.pop("_upload_ok_msg"))


# ── Project cards ──────────────────────────────────────────────────────────────
section_title("Projects")

_STATUS_COLOR = {
    "In Progress":     "#37aafe",
    "Not Started":     "#6c86bc",
    "Completed":       "#02c9a8",
    "At Risk":         "#f6ad55",
    "Planning Pending":"#6c86bc",
    "On Track":        "#02c9a8",
}

cols = st.columns(len(df_proj))
for col, (_, row) in zip(cols, df_proj.iterrows()):
    cov    = float(row.get("coverage_pct", 0))
    status = str(row.get("status",""))
    sc     = _STATUS_COLOR.get(status, "#6c86bc")
    pend   = int(row.get("pending", 0))
    auto   = int(row["automated"])
    nona   = int(row.get("non_automatable", 0))
    auto_tgt = int(row.get("automatable", int(row["total_cases"]) - nona))

    with col:
        st.metric(row["name"], f"{cov:.1f}% coverage",
                  f"{auto:,} / {auto_tgt:,} automated")
        st.progress(cov / 100)
        st.caption(f"**Status:** {status}  |  **Pending:** {pend:,}  |  **Non-auto:** {nona:,}")
        st.caption(f"**Target:** {row.get('target_date','')}  |  **Team:** {int(row.get('team_size',0))}")
        if row.get("notes"):
            with st.expander("Notes"):
                st.write(row["notes"])
        if st.button("View Detail", key=f"btn_{row['id']}", use_container_width=True):
            st.session_state["selected_project"] = row["id"]
            st.switch_page("pages/2_Project_Detail.py")

st.divider()

# ── Charts ─────────────────────────────────────────────────────────────────────
section_title("Visual Comparison")
col_c1, col_c2 = st.columns(2)
with col_c1:
    st.plotly_chart(progress_bar_chart(df_proj, st.session_state.dark_mode),
                    use_container_width=True, config={"displayModeBar":False}, key="port_bar")
with col_c2:
    st.plotly_chart(portfolio_stacked_bar(df_proj, st.session_state.dark_mode),
                    use_container_width=True, config={"displayModeBar":False}, key="port_stack")

section_title("Implementation Timeline")
st.plotly_chart(project_gantt(df_proj, st.session_state.dark_mode),
                use_container_width=True,
                config={"displayModeBar":True,"modeBarButtonsToRemove":["lasso2d","select2d"]},
                key="port_gantt")

# ── Editable progress table ────────────────────────────────────────────────────
section_title("Update Automation Progress")
st.caption("Edit **Automated** and **In Progress** counts then click Save.")

edit_cols = ["id","name","total_cases","automatable","non_automatable","automated","in_progress","status"]
avail     = [c for c in edit_cols if c in df_proj.columns]
edited    = st.data_editor(
    df_proj[avail],
    use_container_width=True,
    hide_index=True,
    disabled=[c for c in avail if c not in ("automated","in_progress","status")],
    column_config={
        "automated":   st.column_config.NumberColumn("Automated",   min_value=0, step=1),
        "in_progress": st.column_config.NumberColumn("In Progress", min_value=0, step=1),
        "status":      st.column_config.SelectboxColumn(
            "Status", options=["Not Started","In Progress","At Risk","Completed","Planning Pending"]),
    },
    key="portfolio_editor",
)

col_s1, col_s2, _ = st.columns([1, 1, 4])
with col_s1:
    if st.button("Save Changes", use_container_width=True):
        try:
            full = load_projects()
            for _, er in edited.iterrows():
                pid = er["id"]
                for col in ["automated","in_progress","status"]:
                    if col in er and col in full.columns:
                        full.loc[full["id"]==pid, col] = er[col]
            save_projects(full)
            st.session_state.data_version += 1
            st.success("Saved!")
            st.rerun()
        except Exception as e:
            st.error(f"Save failed: {e}")
with col_s2:
    if st.button("Reset to Defaults", use_container_width=True):
        from utils.data_loader import MAIN_FILE
        if MAIN_FILE.exists():
            MAIN_FILE.unlink()
        st.session_state.data_version += 1
        st.rerun()
