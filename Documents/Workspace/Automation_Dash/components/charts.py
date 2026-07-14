"""
All Plotly chart components. Each returns a go.Figure — caller uses st.plotly_chart().
Uses Polaris brand colors throughout.
"""

from datetime import date

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from utils.styles import COLORS

# ── Shared layout helpers ──────────────────────────────────────────────────────

_FONT = dict(family="Satoshi, Arial, sans-serif", color=COLORS["body_text"])

def _base_layout(title: str = "", dark: bool = False) -> dict:
    bg    = "#0d1b3e" if dark else "rgba(0,0,0,0)"
    paper = "#0d1b3e" if dark else "rgba(0,0,0,0)"
    grid  = "rgba(96,173,245,0.15)"
    txt   = "#c8d4f0"  if dark else COLORS["body_text"]
    return dict(
        title       = dict(text=title, font=dict(family="Satoshi,Arial,sans-serif",
                           size=16, color=COLORS["primary_dark"] if not dark else "#e8eef8")),
        font        = dict(family="Satoshi, Arial, sans-serif", color=txt),
        plot_bgcolor= bg,
        paper_bgcolor=paper,
        margin      = dict(l=10, r=10, t=40, b=10),
        xaxis       = dict(gridcolor=grid, showgrid=True, zeroline=False),
        yaxis       = dict(gridcolor=grid, showgrid=True, zeroline=False),
    )


_PALETTE = [
    COLORS["primary"], COLORS["accent_teal"], COLORS["accent_blue"],
    COLORS["accent_purple"], COLORS["link"], COLORS["accent_cyan"],
    COLORS["lavender"], COLORS["light_purple"], COLORS["warning"],
]


# ── Coverage donut ─────────────────────────────────────────────────────────────

def coverage_donut(df: pd.DataFrame, dark: bool = False) -> go.Figure:
    """Portfolio-level donut: Automated / Pending / Non-Automatable."""
    automated   = int(df["automated"].sum())
    non_auto    = int(df["non_automatable"].sum())
    pending     = max(int(df["total_cases"].sum()) - automated - non_auto, 0)

    fig = go.Figure(go.Pie(
        labels       = ["Automated", "Pending", "Non-Automatable"],
        values       = [automated, pending, non_auto],
        hole         = 0.68,
        marker_colors= [COLORS["accent_teal"], COLORS["accent_blue"], COLORS["soft_blue"]],
        textinfo     = "percent",
        textfont     = dict(size=12, family="Satoshi, Arial"),
        hovertemplate= "<b>%{label}</b><br>%{value:,} cases<br>%{percent}<extra></extra>",
    ))

    total_auto_pct = round(automated / max(automated + pending, 1) * 100, 1)
    fig.add_annotation(
        text    = f"<b>{total_auto_pct}%</b><br><span style='font-size:11px'>Coverage</span>",
        x=0.5, y=0.5, showarrow=False, font_size=18,
        font_color=COLORS["primary_dark"] if not dark else "#e8eef8",
        align="center",
    )
    layout = _base_layout("Coverage Distribution", dark)
    layout["legend"] = dict(orientation="h", y=-0.1, x=0.5, xanchor="center")
    fig.update_layout(**layout, showlegend=True, height=280)
    return fig


# ── Horizontal progress bar chart ─────────────────────────────────────────────

def progress_bar_chart(df: pd.DataFrame, dark: bool = False) -> go.Figure:
    """Horizontal bar chart showing coverage % per project."""
    df_s = df.sort_values("coverage_pct", ascending=True)
    colors = [
        COLORS["accent_teal"] if v >= 80
        else (COLORS["accent_blue"] if v >= 50 else COLORS["warning"])
        for v in df_s["coverage_pct"]
    ]
    fig = go.Figure()
    fig.add_trace(go.Bar(
        y              = df_s["name"],
        x              = df_s["coverage_pct"],
        orientation    = "h",
        marker_color   = colors,
        text           = [f"{v:.1f}%" for v in df_s["coverage_pct"]],
        textposition   = "outside",
        textfont       = dict(size=12, family="Satoshi, Arial"),
        hovertemplate  = "<b>%{y}</b><br>Coverage: %{x:.1f}%<extra></extra>",
    ))
    fig.add_vline(x=80, line_dash="dot", line_color=COLORS["accent_teal"],
                  annotation_text="80% target", annotation_position="top right",
                  annotation_font_size=11)
    layout = _base_layout("Coverage by Project", dark)
    layout["xaxis"].update(range=[0, 115], ticksuffix="%")
    layout["yaxis"].update(showgrid=False)
    fig.update_layout(**layout, height=320, bargap=0.35)
    return fig


# ── Portfolio stacked bar (total / automated / pending / non-auto) ─────────────

def portfolio_stacked_bar(df: pd.DataFrame, dark: bool = False) -> go.Figure:
    fig = go.Figure()
    fig.add_trace(go.Bar(
        name          = "Automated",
        x             = df["name"],
        y             = df["automated"],
        marker_color  = COLORS["accent_teal"],
        hovertemplate = "<b>%{x}</b><br>Automated: %{y:,}<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        name          = "Pending",
        x             = df["name"],
        y             = df["pending"],
        marker_color  = COLORS["accent_blue"],
        hovertemplate = "<b>%{x}</b><br>Pending: %{y:,}<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        name          = "Non-Automatable",
        x             = df["name"],
        y             = df["non_automatable"],
        marker_color  = COLORS["soft_blue"],
        hovertemplate = "<b>%{x}</b><br>Non-Automatable: %{y:,}<extra></extra>",
    ))
    layout = _base_layout("Test Cases Breakdown", dark)
    layout["yaxis"]["title"] = "Test Cases"
    fig.update_layout(**layout, barmode="stack", height=340,
                      legend=dict(orientation="h", y=1.08, x=0.5, xanchor="center"))
    return fig


# ── Velocity trend (line chart) ────────────────────────────────────────────────

def velocity_trend(df_daily: pd.DataFrame, project_name: str = "",
                   dark: bool = False) -> go.Figure:
    """Planned vs actual cumulative automation trend."""
    if df_daily.empty:
        return go.Figure()
    df = df_daily.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x            = df["date"],
        y            = df["planned"],
        name         = "Planned",
        mode         = "lines",
        line         = dict(color=COLORS["soft_blue"], dash="dash", width=2),
        hovertemplate= "%{x|%d %b}<br>Planned: %{y:,}<extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x            = df["date"],
        y            = df["actual"],
        name         = "Actual",
        mode         = "lines+markers",
        line         = dict(color=COLORS["accent_teal"], width=2.5),
        marker       = dict(size=4, color=COLORS["accent_teal"]),
        fill         = "tonexty",
        fillcolor    = "rgba(2,201,168,0.08)",
        hovertemplate= "%{x|%d %b}<br>Actual: %{y:,}<extra></extra>",
    ))
    layout = _base_layout(f"Automation Trend — {project_name}", dark)
    layout["xaxis"]["title"] = "Date"
    layout["yaxis"]["title"] = "Cumulative Cases"
    fig.update_layout(**layout, height=320,
                      legend=dict(orientation="h", y=1.08, x=0.5, xanchor="center"))
    return fig


# ── Forecast chart ─────────────────────────────────────────────────────────────

def forecast_chart(row: pd.Series, df_daily: pd.DataFrame,
                   plan_df: pd.DataFrame, dark: bool = False) -> go.Figure:
    """Actual progress + ideal burnup + forecast extension."""
    fig = go.Figure()

    if not df_daily.empty:
        df_d = df_daily.copy()
        df_d["date"] = pd.to_datetime(df_d["date"])
        fig.add_trace(go.Scatter(
            x=df_d["date"], y=df_d["actual"], name="Actual",
            mode="lines+markers",
            line=dict(color=COLORS["accent_teal"], width=2.5),
            marker=dict(size=4),
            hovertemplate="%{x|%d %b}<br>Actual: %{y:,}<extra></extra>",
        ))

    if not plan_df.empty:
        pf = plan_df.copy()
        pf["date"] = pd.to_datetime(pf["date"])
        fig.add_trace(go.Scatter(
            x=pf["date"], y=pf["cumulative_plan"], name="Forecast",
            mode="lines", line=dict(color=COLORS["accent_blue"], dash="dot", width=2),
            hovertemplate="%{x|%d %b}<br>Forecast: %{y:,}<extra></extra>",
        ))

    # Target line
    target_val = int(row.get("automatable", row["total_cases"]))
    fig.add_hline(y=target_val, line_dash="dot", line_color=COLORS["accent_teal"],
                  annotation_text=f"Target: {target_val:,}", annotation_position="right",
                  annotation_font_size=11)

    # Target date vline
    fig.add_vline(x=str(row["target_date"]), line_dash="dash",
                  line_color=COLORS["warning"], opacity=0.7,
                  annotation_text="Target Date", annotation_font_size=10)

    layout = _base_layout("Completion Forecast", dark)
    layout["yaxis"]["title"] = "Cumulative Automated"
    layout["xaxis"]["title"] = "Date"
    fig.update_layout(**layout, height=340,
                      legend=dict(orientation="h", y=1.1, x=0.5, xanchor="center"))
    return fig


# ── Radar chart (project health) ──────────────────────────────────────────────

def project_radar(df: pd.DataFrame, dark: bool = False) -> go.Figure:
    """Radar chart comparing projects on 5 dimensions."""
    from utils.calculations import coverage_pct, pending

    categories = ["Coverage%", "Team Size", "Velocity", "Progress", "On-Time Risk"]
    fig = go.Figure()

    for _, row in df.iterrows():
        cov   = min(float(row.get("coverage_pct", 0)), 100)
        team  = min(int(row.get("team_size", 1)) * 20, 100)
        vel   = min(float(row.get("velocity", 0)) * 10, 100)
        prog  = cov
        risk  = 100 - (30 if row.get("schedule_status") == "Delayed"
                       else (15 if row.get("schedule_status") == "At Risk" else 0))

        fig.add_trace(go.Scatterpolar(
            r     = [cov, team, vel, prog, risk, cov],
            theta = categories + [categories[0]],
            name  = str(row["name"]),
            fill  = "toself", opacity=0.25,
            line  = dict(width=2),
        ))

    layout = _base_layout("Project Health Radar", dark)
    layout.pop("xaxis", None)
    layout.pop("yaxis", None)
    fig.update_layout(**layout, height=360,
                      polar=dict(
                          radialaxis=dict(visible=True, range=[0,100]),
                          bgcolor="rgba(0,0,0,0)",
                      ),
                      legend=dict(orientation="h", y=-0.15, x=0.5, xanchor="center"))
    return fig


# ── Burndown chart ─────────────────────────────────────────────────────────────

def burndown_chart(row: pd.Series, df_daily: pd.DataFrame, burn_df: pd.DataFrame,
                   dark: bool = False) -> go.Figure:
    fig = go.Figure()
    auto_tgt = int(row.get("automatable", row["total_cases"]))

    if not burn_df.empty:
        bd = burn_df.copy()
        bd["date"] = pd.to_datetime(bd["date"])
        fig.add_trace(go.Scatter(
            x=bd["date"], y=bd["ideal_remaining"], name="Ideal Burndown",
            mode="lines", line=dict(color=COLORS["soft_blue"], dash="dash", width=1.5),
        ))

    if not df_daily.empty:
        dd = df_daily.copy()
        dd["date"]      = pd.to_datetime(dd["date"])
        dd["remaining"] = auto_tgt - dd["actual"]
        dd = dd[dd["remaining"] >= 0]
        fig.add_trace(go.Scatter(
            x=dd["date"], y=dd["remaining"], name="Actual Remaining",
            mode="lines+markers", line=dict(color=COLORS["accent_teal"], width=2.5),
            marker=dict(size=4),
            fill="tozeroy", fillcolor="rgba(2,201,168,0.07)",
        ))

    layout = _base_layout("Burndown Chart", dark)
    layout["yaxis"]["title"] = "Cases Remaining"
    layout["xaxis"]["title"] = "Date"
    fig.update_layout(**layout, height=300,
                      legend=dict(orientation="h", y=1.1, x=0.5, xanchor="center"))
    return fig


# ── Velocity histogram ─────────────────────────────────────────────────────────

def velocity_histogram(df_daily: pd.DataFrame, dark: bool = False) -> go.Figure:
    if df_daily.empty:
        return go.Figure()
    deltas = df_daily.sort_values("date")["actual"].diff().dropna()
    deltas = deltas[deltas > 0]
    if deltas.empty:
        return go.Figure()

    fig = go.Figure(go.Histogram(
        x=deltas, nbinsx=15,
        marker_color=COLORS["accent_blue"],
        marker_line=dict(color=COLORS["white"], width=1),
        hovertemplate="Daily cases: %{x}<br>Days: %{y}<extra></extra>",
    ))
    layout = _base_layout("Daily Velocity Distribution", dark)
    layout["xaxis"]["title"] = "Cases per Day"
    layout["yaxis"]["title"] = "Frequency"
    fig.update_layout(**layout, height=260, bargap=0.05)
    return fig


# ── Multi-project progress timeline (portfolio view) ──────────────────────────

def portfolio_timeline_lines(df: pd.DataFrame, daily_all: pd.DataFrame,
                              dark: bool = False) -> go.Figure:
    """Small multiples line of coverage % over time for all projects."""
    fig = go.Figure()
    for i, (_, row) in enumerate(df.iterrows()):
        d = daily_all[daily_all["project_id"] == row["id"]].copy()
        if d.empty:
            continue
        d["date"]    = pd.to_datetime(d["date"])
        auto_tgt     = max(int(row["total_cases"]) - int(row["non_automatable"]), 1)
        d["cov_pct"] = d["actual"] / auto_tgt * 100

        fig.add_trace(go.Scatter(
            x=d["date"], y=d["cov_pct"],
            name=str(row["name"]),
            mode="lines",
            line=dict(width=2, color=_PALETTE[i % len(_PALETTE)]),
            hovertemplate=f"<b>{row['name']}</b><br>%{{x|%d %b}}<br>%{{y:.1f}}%<extra></extra>",
        ))

    fig.add_hline(y=80, line_dash="dot", line_color=COLORS["accent_teal"],
                  annotation_text="80% target", annotation_font_size=10)
    layout = _base_layout("Portfolio Coverage Trend", dark)
    layout["yaxis"].update(title="Coverage %", ticksuffix="%", range=[0,105])
    layout["xaxis"]["title"] = "Date"
    fig.update_layout(**layout, height=360,
                      legend=dict(orientation="h", y=-0.2, x=0.5, xanchor="center",
                                  font_size=11))
    return fig
