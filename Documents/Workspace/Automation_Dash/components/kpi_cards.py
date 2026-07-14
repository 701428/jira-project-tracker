"""
KPI card components — uses native st.metric() so no custom CSS required.
"""

import streamlit as st
from utils.styles import COLORS


def kpi_card(label: str, value: str, delta: str = "", delta_dir: str = "neutral",
             accent_color: str = "", icon: str = "") -> None:
    prefix = {"up": "+", "down": "▼ ", "neutral": ""}.get(delta_dir, "")
    delta_val = f"{prefix}{delta}" if delta else None
    st.metric(label=label, value=value, delta=delta_val)


def kpi_row(metrics: list) -> None:
    cols = st.columns(len(metrics))
    for col, m in zip(cols, metrics):
        with col:
            kpi_card(
                label        = m["label"],
                value        = m["value"],
                delta        = m.get("delta", ""),
                delta_dir    = m.get("delta_dir", "neutral"),
                accent_color = m.get("accent_color", ""),
                icon         = m.get("icon", ""),
            )


def portfolio_kpi_row(summary: dict, dark_mode: bool = False) -> None:
    cov = summary["coverage_pct"]
    metrics = [
        {"label": "Total Test Cases",    "value": f"{summary['total_cases']:,}",
         "delta": f"{summary['total_projects']} projects"},
        {"label": "Automated",           "value": f"{summary['total_auto']:,}",
         "delta": f"{summary['total_pending']:,} pending"},
        {"label": "Coverage",            "value": f"{cov:.1f}%",
         "delta": "of automatable cases"},
        {"label": "Non-Automatable",     "value": f"{summary['total_nonaut']:,}"},
        {"label": "Projects Completed",  "value": str(summary.get("completed", 0)),
         "delta": f"of {summary['total_projects']}"},
        {"label": "Not Started",         "value": str(summary.get("not_started", 0)),
         "delta": f"{summary.get('in_progress', 0)} in progress"},
    ]
    kpi_row(metrics)
