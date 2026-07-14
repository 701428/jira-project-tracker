"""
Project Detail page — 4 tabs: Summary | Non-Automatable | Day-by-Day Plan | Completion Plan
"""

import streamlit as st

st.set_page_config(
    page_title="Project Detail · Automation Dashboard",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="expanded",
)

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import date

from utils.styles      import inject_css, sidebar_logo, page_header, section_title, COLORS
from utils.data_loader import (
    ensure_data_file, load_projects, load_non_automatable,
    load_day_plan, load_completion_plan,
    save_projects, save_non_automatable, save_day_plan, save_completion_plan,
    process_uploaded_file, get_template_excel,
)
from utils.calculations import enrich_projects, coverage_pct, pending, plan_cumulative
from utils.exports      import export_excel, export_pdf_html
from components.kpi_cards import kpi_row
from components.gantt     import sprint_gantt

if "dark_mode"        not in st.session_state: st.session_state.dark_mode        = False
if "data_version"     not in st.session_state: st.session_state.data_version     = 0
if "selected_project" not in st.session_state: st.session_state.selected_project = "1p"

inject_css(st.session_state.dark_mode)
sidebar_logo(st.session_state.dark_mode)

with st.sidebar:
    st.session_state.dark_mode = st.toggle("Dark Mode", value=st.session_state.dark_mode)
    st.divider()
    st.caption("DATA MANAGEMENT")
    uploaded = st.file_uploader("Upload Data", type=["xlsx","xls","csv"], label_visibility="collapsed")
    if uploaded:
        ok, msg = process_uploaded_file(uploaded)
        (st.success if ok else st.error)(msg)
        if ok:
            st.session_state.data_version += 1
            st.rerun()
    st.download_button("Template", get_template_excel(), "automation_template.xlsx",
                       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                       use_container_width=True)


@st.cache_data(ttl=60, show_spinner=False)
def get_all(v: int):
    ensure_data_file()
    df    = enrich_projects(load_projects())
    non   = load_non_automatable()
    plan  = load_day_plan()
    comp  = load_completion_plan()
    return df, non, plan, comp

df_proj, df_non_all, df_plan_all, df_comp = get_all(st.session_state.data_version)

# ── Project selector ───────────────────────────────────────────────────────────
names = df_proj["name"].tolist()
ids   = df_proj["id"].tolist()
def_idx = ids.index(st.session_state.selected_project) if st.session_state.selected_project in ids else 0

col_sel, _ = st.columns([2, 5])
with col_sel:
    sel_name = st.selectbox("Project", names, index=def_idx, label_visibility="collapsed")

sel_id   = ids[names.index(sel_name)]
st.session_state.selected_project = sel_id

row      = df_proj[df_proj["id"] == sel_id].iloc[0]
df_non   = df_non_all[df_non_all["project_id"] == sel_id].reset_index(drop=True)
df_plan  = df_plan_all[df_plan_all["project_id"] == sel_id].reset_index(drop=True)
df_comp_row = df_comp[df_comp["project_id"] == sel_id]

# ── Header ─────────────────────────────────────────────────────────────────────
cov       = float(row.get("coverage_pct", 0))
auto_tgt  = int(row.get("automatable", int(row["total_cases"]) - int(row.get("non_automatable",0))))
auto_cnt  = int(row["automated"])
pend_cnt  = int(row.get("pending", auto_tgt - auto_cnt))
non_cnt   = int(row.get("non_automatable", 0))
status    = str(row.get("status",""))

col_hdr, col_badge = st.columns([3, 1])
with col_hdr:
    st.title(row['name'])
    st.caption(
        f"{int(row['total_cases']):,} total · {auto_tgt:,} automatable · "
        f"{non_cnt:,} non-automatable · "
        f"Start: {row.get('start_date','')} → Target: {row.get('target_date','')}"
    )
with col_badge:
    daily_avg = float(row.get("daily_avg", 0))
    st.metric("Status", status, f"~{daily_avg:.0f} cases/day" if daily_avg else "Plan TBD")
st.divider()

# ── KPIs ───────────────────────────────────────────────────────────────────────
kpi_row([
    {"label": "Coverage",        "value": f"{cov:.1f}%",
     "delta": f"{auto_cnt:,} of {auto_tgt:,}"},
    {"label": "Automated",       "value": f"{auto_cnt:,}"},
    {"label": "Pending",         "value": f"{pend_cnt:,}",
     "delta": f"~{daily_avg:.0f} cases/day" if daily_avg else "TBD"},
    {"label": "Non-Automatable", "value": f"{non_cnt:,}",
     "delta": f"{non_cnt/max(int(row['total_cases']),1)*100:.1f}% of total"},
    {"label": "Total Cases",     "value": f"{int(row['total_cases']):,}"},
])

st.markdown("")

# ── Tabs ───────────────────────────────────────────────────────────────────────
tab_summ, tab_nonaut, tab_plan, tab_comp, tab_export = st.tabs([
    "Summary",
    "Non-Automatable",
    "Day-by-Day Plan",
    "Completion Plan",
    "Export",
])


# ══════════════════════════════════════════════════════════════════════════════
# Tab 1 — Summary
# ══════════════════════════════════════════════════════════════════════════════
with tab_summ:
    section_title("Automation Status Summary")
    col_a, col_b = st.columns(2)

    with col_a:
        fig = go.Figure(go.Pie(
            labels=["Automated","Pending","Non-Automatable"],
            values=[auto_cnt, pend_cnt, non_cnt],
            hole=0.68,
            marker_colors=[COLORS["accent_teal"], COLORS["accent_blue"], COLORS["soft_blue"]],
            textinfo="percent+label",
            textfont=dict(size=11),
            hovertemplate="<b>%{label}</b><br>%{value:,} cases (%{percent})<extra></extra>",
        ))
        fig.add_annotation(
            text=f"<b>{cov:.1f}%</b><br><span style='font-size:10px'>Automated</span>",
            x=0.5, y=0.5, showarrow=False, font_size=16,
        )
        fig.update_layout(
            height=280, margin=dict(l=0,r=0,t=0,b=0),
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            legend=dict(orientation="h", y=-0.1, x=0.5, xanchor="center", font_size=11),
            showlegend=True,
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar":False}, key="summ_donut")

    with col_b:
        edit_row = pd.DataFrame([{
            "total_cases":     int(row.get("total_cases", 0)),
            "automatable":     int(row.get("automatable", auto_tgt)),
            "non_automatable": int(row.get("non_automatable", non_cnt)),
            "automated":       int(row.get("automated", auto_cnt)),
            "in_progress":     int(row.get("in_progress", 0)),
            "team_size":       int(row.get("team_size", 1)),
            "daily_avg":       float(row.get("daily_avg", 0)),
            "start_date":      str(row.get("start_date", "")),
            "target_date":     str(row.get("target_date", "")),
            "status":          status,
            "priority":        str(row.get("priority", "")),
            "notes":           str(row.get("notes", "")),
        }])
        edited_row = st.data_editor(
            edit_row,
            use_container_width=True,
            hide_index=True,
            column_config={
                "total_cases":     st.column_config.NumberColumn("Total Cases",     min_value=0, step=1),
                "automatable":     st.column_config.NumberColumn("Automatable",     min_value=0, step=1),
                "non_automatable": st.column_config.NumberColumn("Non-Automatable", min_value=0, step=1),
                "automated":       st.column_config.NumberColumn("Automated",       min_value=0, step=1),
                "in_progress":     st.column_config.NumberColumn("In Progress",     min_value=0, step=1),
                "team_size":       st.column_config.NumberColumn("Team Size",       min_value=0, step=1),
                "daily_avg":       st.column_config.NumberColumn("Daily Avg",       min_value=0, step=0.5),
                "start_date":      st.column_config.TextColumn("Start Date"),
                "target_date":     st.column_config.TextColumn("Target Date"),
                "status":          st.column_config.SelectboxColumn(
                    "Status", options=["Not Started","In Progress","At Risk","Completed","Planning Pending","On Track"]),
                "priority":        st.column_config.SelectboxColumn(
                    "Priority", options=["High","Medium","Low"]),
                "notes":           st.column_config.TextColumn("Notes"),
            },
            key="summary_editor",
        )
        if st.button("Save Changes", key="save_summary"):
            full = load_projects()
            er = edited_row.iloc[0]
            for col in edited_row.columns:
                if col in full.columns:
                    full.loc[full["id"] == sel_id, col] = er[col]
            save_projects(full)
            st.session_state.data_version += 1
            st.success("Saved.")
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# Tab 2 — Non-Automatable
# ══════════════════════════════════════════════════════════════════════════════
with tab_nonaut:
    section_title("Non-Automatable Test Cases")

    if df_non.empty:
        st.info("No non-automatable records for this project.")
    else:
        col_pie, col_tbl = st.columns([1, 1.5])
        with col_pie:
            fig_na = px.pie(
                df_non, names="module", values="count", hole=0.5,
                color_discrete_sequence=[
                    COLORS["primary"], COLORS["accent_blue"], COLORS["accent_teal"],
                    COLORS["accent_purple"], COLORS["soft_blue"], COLORS["muted_blue"],
                    COLORS["accent_cyan"], COLORS["lavender"],
                ],
                title=f"Non-Automatable ({non_cnt} cases)",
            )
            fig_na.update_layout(
                height=300, margin=dict(l=0,r=0,t=40,b=0),
                paper_bgcolor="rgba(0,0,0,0)",
                legend=dict(orientation="h", y=-0.2, x=0.5, xanchor="center", font_size=10),
                title_font=dict(size=14, color=COLORS["primary_dark"]),
            )
            st.plotly_chart(fig_na, use_container_width=True, config={"displayModeBar":False}, key="nonaut_pie")

        with col_tbl:
            st.dataframe(df_non, use_container_width=True, hide_index=True, height=300)

    st.markdown("---")
    section_title("Edit Non-Automatable Records")
    st.caption("✏️  Edit count, reason, or approach inline.")
    edited_na = st.data_editor(
        df_non if not df_non.empty else pd.DataFrame(
            columns=["project_id","module","count","reason","approach"]),
        use_container_width=True, num_rows="dynamic", hide_index=True,
        disabled=["project_id"],
        column_config={
            "count": st.column_config.NumberColumn("Count", min_value=0, step=1),
        },
        key="na_editor",
    )
    if st.button("Save Non-Auto Records"):
        try:
            ed = edited_na.copy()
            ed["project_id"] = sel_id
            ed["count"] = pd.to_numeric(ed["count"], errors="coerce").fillna(0).astype(int)
            save_non_automatable(sel_id, ed)
            # update total in projects
            full = load_projects()
            full.loc[full["id"]==sel_id, "non_automatable"] = int(ed["count"].sum())
            full.loc[full["id"]==sel_id, "automatable"] = (
                int(row["total_cases"]) - int(ed["count"].sum())
            )
            save_projects(full)
            st.session_state.data_version += 1
            st.success(f"Saved. Total non-automatable: {int(ed['count'].sum())}")
            st.rerun()
        except Exception as e:
            st.error(f"Save failed: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Tab 3 — Day-by-Day Plan
# ══════════════════════════════════════════════════════════════════════════════
with tab_plan:
    section_title("Day-by-Day Automation Implementation Plan")

    if df_plan.empty:
        st.info("No day-by-day plan defined for this project.")
    else:
        # Sprint Gantt from plan dates
        df_plan_gantt = df_plan.copy()
        df_plan_gantt["sprint"] = range(1, len(df_plan_gantt) + 1)
        st.plotly_chart(
            sprint_gantt(df_plan_gantt, str(row["name"]), st.session_state.dark_mode),
            use_container_width=True, config={"displayModeBar":False}, key="plan_gantt",
        )

        st.markdown("---")
        # Cumulative progress chart
        df_cum = plan_cumulative(df_plan)
        if not df_cum.empty:
            fig_cum = go.Figure()
            fig_cum.add_trace(go.Bar(
                x=df_cum["module"], y=df_cum["planned_cases"],
                name="Planned", marker_color=COLORS["accent_blue"],
                hovertemplate="<b>%{x}</b><br>Planned: %{y}<extra></extra>",
            ))
            fig_cum.add_trace(go.Bar(
                x=df_cum["module"], y=df_cum["actual_cases"],
                name="Actual", marker_color=COLORS["accent_teal"],
                hovertemplate="<b>%{x}</b><br>Actual: %{y}<extra></extra>",
            ))
            fig_cum.update_layout(
                title="Planned vs Actual by Module",
                barmode="group", height=300,
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(showgrid=False, tickangle=-30),
                yaxis=dict(gridcolor="rgba(96,173,245,0.15)", title="Test Cases"),
                legend=dict(orientation="h", y=1.1, x=0.5, xanchor="center"),
                font=dict(family="Satoshi, Arial, sans-serif"),
                margin=dict(l=10,r=10,t=48,b=80),
            )
            st.plotly_chart(fig_cum, use_container_width=True, config={"displayModeBar":False}, key="plan_bar")

        section_title("Edit Day-by-Day Plan")
        st.caption("✏️  Update Actual Cases as automation progresses. Status: Planned / In Progress / Done.")
        edited_plan = st.data_editor(
            df_plan,
            use_container_width=True, num_rows="dynamic", hide_index=True,
            disabled=["project_id"],
            column_config={
                "date":          st.column_config.DateColumn("Date"),
                "planned_cases": st.column_config.NumberColumn("Planned Cases", min_value=0, step=1),
                "actual_cases":  st.column_config.NumberColumn("Actual Cases",  min_value=0, step=1),
                "cumulative":    st.column_config.NumberColumn("Cumulative",     min_value=0, step=1),
                "status":        st.column_config.SelectboxColumn(
                    "Status", options=["Planned","In Progress","Done","Skipped"]),
            },
            key="plan_editor",
        )

        col_ps1, col_ps2, _ = st.columns([1, 1, 4])
        with col_ps1:
            if st.button("Save Plan", use_container_width=True):
                try:
                    ed = edited_plan.copy()
                    ed["project_id"] = sel_id
                    for c in ["planned_cases","actual_cases","cumulative"]:
                        ed[c] = pd.to_numeric(ed[c], errors="coerce").fillna(0).astype(int)
                    # recompute cumulative
                    ed = ed.sort_values("date")
                    ed["cumulative"] = ed["actual_cases"].cumsum()
                    save_day_plan(sel_id, ed)
                    # update automated total from cumulative
                    total_done = int(ed["actual_cases"].sum())
                    if total_done > 0:
                        full = load_projects()
                        full.loc[full["id"]==sel_id, "automated"] = total_done
                        save_projects(full)
                    st.session_state.data_version += 1
                    st.success("Plan saved!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Save failed: {e}")
        with col_ps2:
            st.download_button(
                "Export Plan CSV",
                df_plan.to_csv(index=False).encode(),
                f"{sel_id}_plan.csv", "text/csv",
                use_container_width=True,
            )


# ══════════════════════════════════════════════════════════════════════════════
# Tab 4 — Completion Plan
# ══════════════════════════════════════════════════════════════════════════════
with tab_comp:
    section_title("Project Completion Plan")

    # Summary cards from completion plan
    if not df_comp_row.empty:
        r = df_comp_row.iloc[0]
        kpi_row([
            {"label": "Total Cases",    "value": f"{int(r.get('total_cases',0)):,}"},
            {"label": "Automatable",    "value": f"{int(r.get('automatable',0)):,}"},
            {"label": "Duration",       "value": f"{r.get('duration_days','TBD')} days"},
            {"label": "Daily Avg",      "value": f"~{r.get('daily_avg','TBD')} cases/day"},
            {"label": "Expected Done",  "value": str(r.get("expected_completion","TBD"))},
        ])
        st.markdown("")

    # Full completion plan table — filtered to selected project
    st.dataframe(
        df_comp_row.rename(columns={c: c.replace("_"," ").title() for c in df_comp_row.columns}),
        use_container_width=True, hide_index=True,
    )

    st.markdown("---")
    section_title("Edit Completion Plan")
    edited_comp = st.data_editor(
        df_comp_row,
        use_container_width=True, hide_index=True,
        column_config={
            "project_id":          st.column_config.TextColumn("Project ID"),
            "name":                st.column_config.TextColumn("Name"),
            "total_cases":         st.column_config.NumberColumn("Total Cases", min_value=0, step=1),
            "automatable":         st.column_config.NumberColumn("Automatable", min_value=0, step=1),
            "duration_days":       st.column_config.NumberColumn("Duration (Days)", min_value=0, step=1),
            "daily_avg":           st.column_config.NumberColumn("Daily Avg", min_value=0, step=0.5),
            "start_date":          st.column_config.TextColumn("Start Date"),
            "expected_completion": st.column_config.TextColumn("Expected Completion"),
            "status":              st.column_config.SelectboxColumn(
                "Status", options=["On Track","At Risk","Delayed","Planning Pending","In Progress","Completed"]),
        },
        key="comp_editor",
    )
    if st.button("Save Completion Plan"):
        try:
            other = df_comp[df_comp["project_id"] != sel_id]
            merged = pd.concat([other, edited_comp], ignore_index=True)
            save_completion_plan(merged)
            st.session_state.data_version += 1
            st.success("Completion plan saved!")
            st.rerun()
        except Exception as e:
            st.error(f"Save failed: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# Tab 5 — Export
# ══════════════════════════════════════════════════════════════════════════════
with tab_export:
    section_title("Export Reports")
    st.caption("Download project data in multiple formats. For PDF: open HTML in browser → Ctrl+P → Save as PDF.")

    col_e1, col_e2, col_e3 = st.columns(3)
    with col_e1:
        st.download_button(
            f"{row['name']} — Excel",
            export_excel(df_proj[df_proj["id"]==sel_id], df_non, df_plan, df_comp_row if not df_comp_row.empty else pd.DataFrame()),
            f"{sel_id}_report_{date.today().isoformat()}.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
        )
    with col_e2:
        st.download_button(
            f"{row['name']} — PDF (HTML)",
            export_pdf_html(df_proj[df_proj["id"]==sel_id], df_non, df_plan).encode(),
            f"{sel_id}_report_{date.today().isoformat()}.html",
            "text/html",
            use_container_width=True,
        )
    with col_e3:
        st.download_button(
            "Plan CSV",
            df_plan.to_csv(index=False).encode(),
            f"{sel_id}_plan_{date.today().isoformat()}.csv",
            "text/csv",
            use_container_width=True,
        )

    st.markdown("---")
    section_title("Full Portfolio Export")
    col_f1, col_f2, _ = st.columns([1, 1, 3])
    with col_f1:
        st.download_button(
            "Full Portfolio Excel",
            export_excel(df_proj, df_non_all, df_plan_all, df_comp),
            f"automation_portfolio_{date.today().isoformat()}.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
        )
    with col_f2:
        st.download_button(
            "Full Portfolio PDF (HTML)",
            export_pdf_html(df_proj, df_non_all, df_plan_all).encode(),
            f"automation_portfolio_{date.today().isoformat()}.html",
            "text/html",
            use_container_width=True,
        )
