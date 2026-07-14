"""
Gantt / timeline chart for project implementation schedules.
Uses Plotly timeline (px.timeline) — production-ready.
"""

from datetime import date, timedelta

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from utils.styles import COLORS


_STATUS_COLORS = {
    "Completed":   COLORS["accent_teal"],
    "In Progress": COLORS["accent_blue"],
    "At Risk":     "#f6ad55",
    "Delayed":     COLORS["danger"],
    "Not Started": COLORS["soft_blue"],
    "No Data":     COLORS["soft_blue"],
}


def project_gantt(df: pd.DataFrame, dark: bool = False) -> go.Figure:
    """
    Full portfolio Gantt chart.
    df must have: name, start_date, target_date, schedule_status, coverage_pct, forecast_date.
    """
    rows = []
    for _, row in df.iterrows():
        try:
            start  = pd.Timestamp(row["start_date"])
            target = pd.Timestamp(row["target_date"])
        except Exception:
            continue  # skip rows with TBD / unparseable dates
        sched  = str(row.get("schedule_status", row.get("status", "In Progress")))
        fc     = row.get("forecast_date")
        cov    = float(row.get("coverage_pct", 0))

        rows.append({
            "Project":    str(row["name"]),
            "Start":      start,
            "Finish":     target,
            "Status":     sched,
            "Coverage":   f"{cov:.1f}%",
            "Forecast":   str(fc) if fc else "—",
            "Type":       "Planned",
        })
        # Add forecast bar if delayed
        if fc and isinstance(fc, date) and fc > row["target_date"]:
            rows.append({
                "Project":  str(row["name"]),
                "Start":    target,
                "Finish":   pd.Timestamp(fc),
                "Status":   "Delayed",
                "Coverage": f"{cov:.1f}%",
                "Forecast": str(fc),
                "Type":     "Overrun",
            })

    if not rows:
        return go.Figure()

    gdf = pd.DataFrame(rows)

    color_map = {
        status: color for status, color in _STATUS_COLORS.items()
    }
    color_map["Overrun"] = "#e53e3e"

    fig = px.timeline(
        gdf,
        x_start         = "Start",
        x_end           = "Finish",
        y               = "Project",
        color           = "Status",
        color_discrete_map = color_map,
        hover_data      = {"Coverage": True, "Forecast": True, "Type": True,
                           "Start": "|%d %b %Y", "Finish": "|%d %b %Y"},
        labels          = {"Status": "Status"},
    )

    # Today line
    fig.add_vline(
        x           = pd.Timestamp(date.today()).timestamp() * 1000,
        line_dash   = "solid",
        line_color  = COLORS["warning"],
        line_width  = 2,
        opacity     = 0.9,
        annotation_text     = "Today",
        annotation_position = "top",
        annotation_font_size= 11,
        annotation_font_color=COLORS["warning"],
    )

    bg    = "#0d1b3e" if dark else "rgba(0,0,0,0)"
    txt   = "#c8d4f0" if dark else COLORS["body_text"]
    grid  = "rgba(96,173,245,0.15)"

    fig.update_layout(
        title        = dict(
            text     = "Implementation Timeline",
            font     = dict(family="Satoshi, Arial, sans-serif", size=16,
                            color=COLORS["primary_dark"] if not dark else "#e8eef8"),
        ),
        font         = dict(family="Satoshi, Arial, sans-serif", color=txt),
        plot_bgcolor = bg,
        paper_bgcolor= bg,
        margin       = dict(l=10, r=10, t=48, b=20),
        height       = max(300, len(df) * 48 + 80),
        xaxis        = dict(
            showgrid   = True,
            gridcolor  = grid,
            tickformat = "%b %Y",
            title      = "",
        ),
        yaxis        = dict(showgrid=False, title="", autorange="reversed"),
        legend       = dict(
            orientation = "h", y=1.06, x=0.5, xanchor="center",
            bgcolor     = "rgba(0,0,0,0)", font_size=12,
        ),
    )

    # Style bars
    for trace in fig.data:
        trace.update(
            marker_line_color = "rgba(255,255,255,0.4)",
            marker_line_width = 0.5,
            opacity           = 0.88,
        )

    return fig


def sprint_gantt(plan_df: pd.DataFrame, project_name: str,
                 dark: bool = False) -> go.Figure:
    """
    Per-project sprint-level Gantt from the day-by-day plan.
    plan_df: columns date, daily_target, cumulative_plan, sprint.
    """
    if plan_df.empty:
        return go.Figure()

    plan_df = plan_df.copy()
    plan_df["date"] = pd.to_datetime(plan_df["date"])
    groups = plan_df.groupby("sprint")

    rows = []
    cases_col = "planned_cases" if "planned_cases" in plan_df.columns else "daily_target"
    cum_col   = "cumulative_planned" if "cumulative_planned" in plan_df.columns else (
                "cumulative" if "cumulative" in plan_df.columns else "cumulative_plan")

    for sprint_num, grp in groups:
        start  = grp["date"].min()
        finish = grp["date"].max() + pd.Timedelta(days=1)
        cases  = grp[cases_col].sum() if cases_col in grp.columns else 0
        cum_end = int(grp[cum_col].max()) if cum_col in grp.columns else 0
        rows.append({
            "Sprint":       f"Sprint {sprint_num}",
            "Start":        start,
            "Finish":       finish,
            "Cases":        round(cases),
            "CumulativeEnd": cum_end,
        })

    sdf = pd.DataFrame(rows)
    if sdf.empty:
        return go.Figure()

    palette = [COLORS["primary"], COLORS["accent_teal"], COLORS["accent_blue"],
               COLORS["accent_purple"], COLORS["link"], COLORS["accent_cyan"]]
    colors  = [palette[i % len(palette)] for i in range(len(sdf))]

    fig = px.timeline(
        sdf,
        x_start   = "Start",
        x_end     = "Finish",
        y         = "Sprint",
        color     = "Sprint",
        color_discrete_sequence=colors,
        hover_data= {"Cases": True, "CumulativeEnd": True,
                     "Start": "|%d %b %Y", "Finish": "|%d %b %Y"},
        title     = f"{project_name} — Sprint Plan",
    )

    fig.add_vline(
        x=pd.Timestamp(date.today()).timestamp() * 1000, line_dash="solid",
        line_color=COLORS["warning"], line_width=2,
        annotation_text="Today", annotation_position="top",
        annotation_font_size=10,
    )

    bg  = "#0d1b3e" if dark else "rgba(0,0,0,0)"
    txt = "#c8d4f0" if dark else COLORS["body_text"]
    fig.update_layout(
        font         = dict(family="Satoshi, Arial, sans-serif", color=txt),
        plot_bgcolor = bg, paper_bgcolor=bg,
        margin       = dict(l=10, r=10, t=48, b=10),
        height       = max(220, len(sdf) * 44 + 80),
        xaxis        = dict(showgrid=True, gridcolor="rgba(96,173,245,0.15)",
                            tickformat="%d %b", title=""),
        yaxis        = dict(showgrid=False, title="", autorange="reversed"),
        showlegend   = False,
    )
    return fig
