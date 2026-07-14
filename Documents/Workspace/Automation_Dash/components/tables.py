"""
Editable table components.
Primary: st-aggrid (streamlit-aggrid).
Fallback: st.data_editor (native Streamlit) if aggrid not installed.
"""

from __future__ import annotations

import pandas as pd
from typing import Optional
import streamlit as st

from utils.styles import COLORS

# ── AgGrid import with graceful fallback ───────────────────────────────────────

try:
    from st_aggrid import AgGrid, GridOptionsBuilder, GridUpdateMode, DataReturnMode, JsCode
    _HAS_AGGRID = True
except ImportError:
    _HAS_AGGRID = False


# ── AgGrid theme config ────────────────────────────────────────────────────────

_AG_CSS = {
    ".ag-root-wrapper":           {"border": "none !important",
                                   "border-radius": "12px !important",
                                   "overflow": "hidden"},
    ".ag-header":                  {"background-color": f"{COLORS['primary_dark']} !important",
                                    "color": "white !important",
                                    "font-family": "Satoshi, Arial, sans-serif !important",
                                    "font-weight": "700 !important",
                                    "font-size": "13px !important"},
    ".ag-header-cell-label":       {"color": "white !important"},
    ".ag-row-even":                {"background-color": f"{COLORS['bg_light']} !important"},
    ".ag-row-odd":                 {"background-color": f"{COLORS['white']} !important"},
    ".ag-row-hover":               {"background-color": "rgba(55,170,254,0.12) !important"},
    ".ag-cell":                    {"font-family": "Satoshi, Arial, sans-serif !important",
                                    "font-size": "13px !important",
                                    "color": f"{COLORS['body_text']} !important"},
    ".ag-cell-focus":              {"border-color": f"{COLORS['accent_blue']} !important"},
    ".ag-paging-panel":            {"border-top": f"1px solid {COLORS['border']} !important",
                                    "font-size": "12px !important"},
}


def _build_aggrid(df: pd.DataFrame, editable_cols: list[str],
                  height: int = 400) -> Optional[pd.DataFrame]:
    """Build and render an AgGrid. Returns edited DataFrame or None on fallback."""
    gb = GridOptionsBuilder.from_dataframe(df)
    gb.configure_default_column(
        editable=False, resizable=True, sortable=True, filter=True,
        wrapText=False, autoHeight=False,
    )
    for col in editable_cols:
        if col in df.columns:
            gb.configure_column(col, editable=True, cellStyle={"background": "rgba(55,170,254,0.07)"})

    gb.configure_pagination(paginationAutoPageSize=False, paginationPageSize=20)
    gb.configure_selection("single", use_checkbox=False)
    gb.configure_grid_options(domLayout="normal", rowHeight=36, headerHeight=40)

    grid_opts = gb.build()

    response = AgGrid(
        df,
        gridOptions        = grid_opts,
        data_return_mode   = DataReturnMode.FILTERED_AND_SORTED,
        update_mode        = GridUpdateMode.MODEL_CHANGED,
        fit_columns_on_grid_load=False,
        height             = height,
        custom_css         = _AG_CSS,
        allow_unsafe_jscode= True,
        theme              = "streamlit",
    )
    return pd.DataFrame(response["data"])


def _native_editor(df: pd.DataFrame, editable_cols: list[str],
                   height: int = 400) -> pd.DataFrame:
    disabled = [c for c in df.columns if c not in editable_cols]
    return st.data_editor(
        df, use_container_width=True, num_rows="dynamic",
        disabled=disabled, height=height,
        column_config={
            col: st.column_config.NumberColumn(min_value=0, step=1)
            for col in editable_cols
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col])
        },
    )


# ── Public table components ────────────────────────────────────────────────────

def progress_table(df_projects: pd.DataFrame, dark: bool = False) -> pd.DataFrame:
    """
    Portfolio summary table — editable automation counts.
    Returns updated DataFrame on change.
    """
    display_cols = [
        "name", "total_cases", "automated", "non_automatable", "in_progress",
        "pending", "coverage_pct", "velocity", "status", "schedule_status",
        "target_date", "forecast_date", "priority",
    ]
    avail = [c for c in display_cols if c in df_projects.columns]
    df_disp = df_projects[avail].copy()
    df_disp["coverage_pct"] = df_disp["coverage_pct"].round(1).astype(str) + "%"

    editable = ["automated", "non_automatable", "in_progress"]

    st.caption("✏️  Double-click cells in the shaded columns to edit progress inline.")
    if _HAS_AGGRID:
        result = _build_aggrid(df_disp, editable, height=420)
        return result if result is not None else df_disp
    else:
        return _native_editor(df_disp, editable, height=420)


def daily_progress_table(df_daily: pd.DataFrame) -> pd.DataFrame:
    """Editable daily progress table for a single project."""
    editable = ["planned", "actual"]
    st.caption("✏️  Update planned / actual values daily to keep forecasts accurate.")
    if _HAS_AGGRID:
        result = _build_aggrid(df_daily, editable, height=380)
        return result if result is not None else df_daily
    else:
        return _native_editor(df_daily, editable, height=380)


def non_auto_table(df_nonaut: pd.DataFrame) -> pd.DataFrame:
    """Editable non-automatable breakdown table."""
    editable = ["reason", "count"]
    st.caption("✏️  Add or update non-automatable reasons and counts.")
    if _HAS_AGGRID:
        result = _build_aggrid(df_nonaut, editable, height=280)
        return result if result is not None else df_nonaut
    else:
        return _native_editor(df_nonaut, editable, height=280)


def plan_table(plan_df: pd.DataFrame) -> None:
    """Read-only completion plan table (day-by-day)."""
    if plan_df.empty:
        st.info("No completion plan available — project may already be complete or target date has passed.")
        return

    display = plan_df.copy()
    display.columns = [c.replace("_", " ").title() for c in display.columns]
    st.dataframe(display, use_container_width=True, height=320)


def summary_stats_table(df_projects: pd.DataFrame) -> None:
    """Quick summary stats per project shown as a clean read-only table."""
    cols = ["name", "total_cases", "automated", "pending", "coverage_pct",
            "velocity", "schedule_status", "forecast_date"]
    avail = [c for c in cols if c in df_projects.columns]
    df_s  = df_projects[avail].copy()
    if "coverage_pct" in df_s.columns:
        df_s["coverage_pct"] = df_s["coverage_pct"].round(1).astype(str) + "%"
    if "velocity" in df_s.columns:
        df_s["velocity"] = df_s["velocity"].round(1).astype(str) + " /day"
    df_s.columns = [c.replace("_", " ").title() for c in df_s.columns]
    st.dataframe(df_s, use_container_width=True, hide_index=True)
