"""
Business logic — all numerical derivations, separate from UI.
"""

from datetime import date, timedelta
from typing import Any

import pandas as pd


def coverage_pct(row: pd.Series) -> float:
    auto_tgt = int(row.get("automatable", int(row["total_cases"]) - int(row.get("non_automatable", 0))))
    if auto_tgt == 0:
        return 100.0
    return round(min(int(row["automated"]) / auto_tgt * 100, 100), 1)


def pending(row: pd.Series) -> int:
    auto_tgt = int(row.get("automatable", int(row["total_cases"]) - int(row.get("non_automatable", 0))))
    return max(auto_tgt - int(row["automated"]), 0)


def enrich_projects(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["coverage_pct"] = df.apply(coverage_pct, axis=1)
    df["pending"]      = df.apply(pending, axis=1)
    return df


def portfolio_summary(df: pd.DataFrame) -> dict[str, Any]:
    total_cases  = int(df["total_cases"].sum())
    total_auto   = int(df["automated"].sum())
    total_nonaut = int(df["non_automatable"].sum())
    total_auto_tgt = int(df["automatable"].sum()) if "automatable" in df.columns else total_cases - total_nonaut
    total_pending  = max(total_auto_tgt - total_auto, 0)
    coverage       = round(total_auto / total_auto_tgt * 100, 1) if total_auto_tgt else 0.0
    completed      = int((df["coverage_pct"] >= 100).sum()) if "coverage_pct" in df.columns else 0
    in_progress    = int((df["status"] == "In Progress").sum())
    not_started    = int((df["status"] == "Not Started").sum())
    return {
        "total_cases":    total_cases,
        "total_auto":     total_auto,
        "total_nonaut":   total_nonaut,
        "total_pending":  total_pending,
        "coverage_pct":   coverage,
        "completed":      completed,
        "in_progress":    in_progress,
        "not_started":    not_started,
        "total_projects": len(df),
        "total_auto_tgt": total_auto_tgt,
    }


def plan_cumulative(df_plan: pd.DataFrame) -> pd.DataFrame:
    """Add running cumulative_actual to plan rows, based on actual_cases."""
    if df_plan.empty:
        return df_plan
    df = df_plan.copy().sort_values("date")
    df["cumulative_actual"] = df["actual_cases"].cumsum()
    # planned cumulative = cumsum of planned_cases
    df["cumulative_planned"] = df["planned_cases"].cumsum()
    return df


def schedule_status_from_plan(row: pd.Series, df_plan: pd.DataFrame) -> str:
    """Derive schedule status from completion plan data."""
    status = str(row.get("status", "")).strip()
    if status in ("Completed", "Not Started", "Planning Pending"):
        return status
    if df_plan.empty:
        return status
    today     = date.today()
    past_rows = df_plan[pd.to_datetime(df_plan["date"], errors="coerce").dt.date <= today]
    if past_rows.empty:
        return "On Track"
    behind = (past_rows["actual_cases"] < past_rows["planned_cases"]).sum()
    return "At Risk" if behind > len(past_rows) * 0.3 else "On Track"
