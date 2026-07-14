"""
Data loading layer — Option B: reads directly from Automation tracker.xlsx.

Flow:
  1. If tracker file exists and is newer than internal store → re-parse tracker → save to MAIN_FILE
  2. All load_* functions read from MAIN_FILE (openpyxl, stable format)
  3. save_* functions write back to MAIN_FILE (user overrides persist between tracker uploads)
  4. process_uploaded_file() detects tracker sheets → saves as TRACKER_FILE → triggers re-parse
"""

import io
import re
from pathlib import Path
from typing import Optional

import pandas as pd
import numpy as np

DATA_DIR      = Path(__file__).parent.parent / "data"
MAIN_FILE     = DATA_DIR / "automation_data.xlsx"
TRACKER_FILE  = DATA_DIR / "Automation tracker.xlsx"
UPLOAD_DIR    = DATA_DIR / "uploads"

DATA_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)

TRACKER_SHEETS = {"Firmware", "HES", "VEE", "Consumer_App", "Comms", "WFM"}

# ── Static metadata not stored in the tracker ──────────────────────────────────
_PROJECT_META = {
    "1p":           {"color": "#1645a4", "priority": "High",   "team_size": 1, "daily_avg": 8},
    "3p_wc":        {"color": "#02c9a8", "priority": "Medium", "team_size": 1, "daily_avg": 0},
    "3p_ltct":      {"color": "#37aafe", "priority": "Medium", "team_size": 1, "daily_avg": 0},
    "hes":          {"color": "#7c3aed", "priority": "High",   "team_size": 1, "daily_avg": 4},
    "vee":          {"color": "#0891b2", "priority": "High",   "team_size": 1, "daily_avg": 0},
    "consumer_app": {"color": "#db2777", "priority": "Medium", "team_size": 1, "daily_avg": 1},
    "comms":        {"color": "#ea580c", "priority": "High",   "team_size": 1, "daily_avg": 3},
    "wfm":          {"color": "#059669", "priority": "Medium", "team_size": 1, "daily_avg": 4},
}

_PROJ_NAMES = {
    "1p":           "1-Phase Meter Firmware",
    "3p_wc":        "3-Phase WC",
    "3p_ltct":      "3-Phase LTCT",
    "hes":          "HES (Gomati / Sangai)",
    "vee":          "VEE (Gomati / Sangai)",
    "consumer_app": "Consumer App (Gomati Android)",
    "comms":        "Comms (4G / RF / IMG / DCU)",
    "wfm":          "WFM Portal – Stage (UP)",
}

# Firmware sub-project definitions (total/automatable fixed from test plan)
_FIRMWARE_SUBS = [
    {"id": "1p",      "env_key": "1-Phase",     "total_cases": 523, "automatable": 393, "non_automatable": 130,
     "start_date": "2026-07-13", "target_date": "2026-08-31", "status": "In Progress"},
    {"id": "3p_wc",   "env_key": "3-Phase WC",  "total_cases": 454, "automatable": 454, "non_automatable": 0,
     "start_date": "TBD",        "target_date": "TBD",        "status": "Not Started"},
    {"id": "3p_ltct", "env_key": "3-Phase LTCT","total_cases": 455, "automatable": 455, "non_automatable": 0,
     "start_date": "TBD",        "target_date": "TBD",        "status": "Not Started"},
]

_SHEET_PID = {
    "HES": "hes", "VEE": "vee",
    "Consumer_App": "consumer_app", "Comms": "comms", "WFM": "wfm",
}


# ── Parsing helpers ────────────────────────────────────────────────────────────

def _parse_int(val) -> int:
    if val is None or (isinstance(val, float) and (val != val)):
        return 0
    try:
        return int(float(val))
    except Exception:
        m = re.search(r"\d+", str(val))
        return int(m.group()) if m else 0


def _parse_float(val) -> float:
    if val is None or (isinstance(val, float) and (val != val)):
        return 0.0
    try:
        return float(val)
    except Exception:
        m = re.search(r"[\d.]+", str(val))
        return float(m.group()) if m else 0.0


def _parse_date(val) -> Optional[str]:
    if val is None:
        return None
    try:
        if isinstance(val, float) and val != val:
            return None
        ts = pd.to_datetime(val, errors="coerce")
        if pd.notna(ts):
            return ts.date().isoformat()
    except Exception:
        pass
    s = str(val).strip()
    return s if s.lower() not in ("nan", "nat", "none", "tbd", "") else None


def _safe_str(val) -> str:
    if val is None or (isinstance(val, float) and val != val):
        return ""
    return str(val).strip()


def _find_row(df: pd.DataFrame, keyword: str) -> Optional[int]:
    for i, val in enumerate(df.iloc[:, 0]):
        if isinstance(val, str) and keyword.lower() in val.lower():
            return i
    return None


def _rows_between(df: pd.DataFrame, start: Optional[int], end: Optional[int]) -> list:
    """Return raw rows from start+2 to end (exclusive), skipping all-NaN rows."""
    if start is None:
        return []
    data_start = start + 2
    data_end   = end if end is not None else len(df)
    rows = []
    for i in range(data_start, data_end):
        row = df.iloc[i]
        if not row.isna().all():
            rows.append(row.tolist())
    return rows


def _count_from_name(name: str) -> int:
    """Extract count from strings like 'TAP (54 Test Cases)' or 'NA (6 Test Cases)'."""
    m = re.search(r"\((\d+)\s*[Tt]est", name)
    if m:
        return int(m.group(1))
    # count comma-separated IDs as a proxy
    parts = [p.strip() for p in name.split(",") if p.strip()]
    return len(parts) if len(parts) > 1 else 1


# ── Core tracker parser ────────────────────────────────────────────────────────

def _parse_and_save_tracker(tracker_path: Path) -> None:
    """Parse all sheets from the tracker xlsx and write to MAIN_FILE."""
    xl = pd.ExcelFile(tracker_path)

    all_projects   = []
    all_non_auto   = []
    all_day_plan   = []
    all_completion= []

    for sheet in xl.sheet_names:
        if sheet not in TRACKER_SHEETS:
            continue

        df = xl.parse(sheet, header=None)

        # Locate section boundaries
        summary_row    = _find_row(df, "Automation Status Summary")
        nonaut_row     = _find_row(df, "Non-Automatable Test Cases")
        dayplan_row    = _find_row(df, "Day-by-Day Automation")
        completion_row = _find_row(df, "Project Completion Plan")

        na_rows   = _rows_between(df, nonaut_row,     dayplan_row)
        dp_rows   = _rows_between(df, dayplan_row,    completion_row)
        comp_rows = _rows_between(df, completion_row, None)

        if sheet == "Firmware":
            _parse_firmware_sheet(
                df, summary_row, na_rows, dp_rows, comp_rows,
                all_projects, all_non_auto, all_day_plan, all_completion,
            )
        else:
            _parse_single_sheet(
                sheet, df, summary_row, na_rows, dp_rows, comp_rows,
                all_projects, all_non_auto, all_day_plan, all_completion,
            )

    # Write parsed data to MAIN_FILE
    with pd.ExcelWriter(MAIN_FILE, engine="openpyxl") as writer:
        pd.DataFrame(all_projects).to_excel(   writer, sheet_name="Projects",        index=False)
        pd.DataFrame(all_non_auto).to_excel(   writer, sheet_name="Non_Automatable", index=False)
        pd.DataFrame(all_day_plan).to_excel(   writer, sheet_name="Day_Plan",        index=False)
        pd.DataFrame(all_completion).to_excel( writer, sheet_name="Completion_Plan", index=False)


def _parse_firmware_sheet(df, summary_row, na_rows, dp_rows, comp_rows,
                           proj_out, na_out, plan_out, comp_out):
    for sp in _FIRMWARE_SUBS:
        pid     = sp["id"]
        env_key = sp["env_key"]
        meta    = _PROJECT_META[pid]

        # Filter day plan rows matching this sub-project's environment key
        sp_dp = [r for r in dp_rows
                 if _safe_str(r[1]).lower().startswith(env_key.lower()[:6])]

        # Compute automated from max cumulative where actual > 0
        automated = 0
        for r in sp_dp:
            if _parse_int(r[3]) > 0:
                automated = max(automated, _parse_int(r[4]))

        # Dates from completion plan (match env_key)
        start_date  = sp["start_date"]
        target_date = sp["target_date"]
        status      = sp["status"]
        for r in comp_rows:
            name_cell = _safe_str(r[0])
            if env_key.lower()[:6] in name_cell.lower():
                start_date  = _parse_date(r[4]) or sp["start_date"]
                target_date = _parse_date(r[5]) or sp["target_date"]
                break

        proj_out.append({
            "id":              pid,
            "name":            _PROJ_NAMES[pid],
            "total_cases":     sp["total_cases"],
            "automatable":     sp["automatable"],
            "non_automatable": sp["non_automatable"],
            "automated":       automated,
            "in_progress":     0,
            "team_size":       meta["team_size"],
            "start_date":      start_date,
            "target_date":     target_date,
            "daily_avg":       meta["daily_avg"],
            "status":          status,
            "priority":        meta["priority"],
            "color":           meta["color"],
            "notes":           "",
        })

        # Day plan
        for r in sp_dp:
            actual = _parse_int(r[3])
            plan_out.append({
                "project_id":    pid,
                "date":          _parse_date(r[0]) or _safe_str(r[0]),
                "module":        _safe_str(r[2]),
                "planned_cases": actual if actual > 0 else 0,
                "actual_cases":  actual,
                "cumulative":    _parse_int(r[4]),
                "assigned_to":   _safe_str(r[5]),
                "remarks":       _safe_str(r[6]) if len(r) > 6 else "",
                "status":        "Completed" if actual > 0 else "Planned",
            })

    # Non-automatable (all belong to 1-Phase)
    for r in na_rows:
        name = _safe_str(r[0])
        if not name or name.lower() in ("test case id", "nan"):
            continue
        na_out.append({
            "project_id": "1p",
            "module":     name,
            "count":      _count_from_name(name),
            "reason":     _safe_str(r[2]) if len(r) > 2 else "",
            "approach":   _safe_str(r[3]) if len(r) > 3 else "",
        })

    # Completion plan
    pid_lookup = {"1-phase": "1p", "3-phase wc": "3p_wc",
                  "3-phase ltct": "3p_ltct", "overall": "overall"}
    for r in comp_rows:
        name = _safe_str(r[0])
        if not name or name.lower() in ("project / environment", "nan"):
            continue
        pid = next((v for k, v in pid_lookup.items() if k in name.lower()), "firmware")
        comp_out.append({
            "project_id":          pid,
            "name":                name,
            "total_cases":         _parse_int(r[1]),
            "automatable":         _parse_int(r[1]),
            "duration_days":       _parse_int(r[2]),
            "daily_avg":           _parse_float(r[3]),
            "start_date":          _parse_date(r[4]) or _safe_str(r[4]),
            "expected_completion": _parse_date(r[5]) or _safe_str(r[5]),
            "status":              _safe_str(r[6]) if len(r) > 6 else "",
        })


def _parse_single_sheet(sheet, df, summary_row, na_rows, dp_rows, comp_rows,
                         proj_out, na_out, plan_out, comp_out):
    pid  = _SHEET_PID[sheet]
    meta = _PROJECT_META[pid]

    # Summary row → project numbers
    total = automated = non_auto = 0
    if summary_row is not None and summary_row + 2 < len(df):
        sr        = df.iloc[summary_row + 2]
        total     = _parse_int(sr.iloc[1])
        automated = _parse_int(sr.iloc[2])
        non_auto  = _parse_int(sr.iloc[4])

    automatable = max(0, total - non_auto)

    # Dates + status from completion plan
    start_date = target_date = ""
    status = "In Progress"
    for r in comp_rows:
        name = _safe_str(r[0])
        if not name or name.lower() in ("project / environment", "nan"):
            continue
        start_date  = _parse_date(r[4]) or _safe_str(r[4])
        target_date = _parse_date(r[5]) or _safe_str(r[5])
        raw_status = _safe_str(r[6]) if len(r) > 6 else ""
        if raw_status.lower() == "scheduled":
            status = "Not Started"
        elif raw_status:
            status = raw_status
        else:
            status = "In Progress"
        break

    proj_out.append({
        "id":              pid,
        "name":            _PROJ_NAMES[pid],
        "total_cases":     total,
        "automatable":     automatable,
        "non_automatable": non_auto,
        "automated":       automated,
        "in_progress":     0,
        "team_size":       meta["team_size"],
        "start_date":      start_date,
        "target_date":     target_date,
        "daily_avg":       meta["daily_avg"],
        "status":          status,
        "priority":        meta["priority"],
        "color":           meta["color"],
        "notes":           "",
    })

    # Non-automatable
    for r in na_rows:
        name = _safe_str(r[0])
        if not name or name.lower() in ("test case id", "nan"):
            continue
        na_out.append({
            "project_id": pid,
            "module":     name,
            "count":      _count_from_name(name),
            "reason":     _safe_str(r[2]) if len(r) > 2 else "",
            "approach":   _safe_str(r[3]) if len(r) > 3 else "",
        })

    # Day plan
    for r in dp_rows:
        if all(_safe_str(v) == "" for v in r[:5]):
            continue
        actual  = _parse_int(r[3])
        planned = actual if actual > 0 else 0
        plan_out.append({
            "project_id":    pid,
            "date":          _parse_date(r[0]) or _safe_str(r[0]),
            "module":        _safe_str(r[2]),
            "planned_cases": planned,
            "actual_cases":  actual,
            "cumulative":    _parse_int(r[4]),
            "assigned_to":   _safe_str(r[5]) if len(r) > 5 else "",
            "remarks":       _safe_str(r[6]) if len(r) > 6 else "",
            "status":        "Completed" if actual > 0 else "Planned",
        })

    # Completion plan
    for r in comp_rows:
        name = _safe_str(r[0])
        if not name or name.lower() in ("project / environment", "nan"):
            continue
        comp_out.append({
            "project_id":          pid,
            "name":                name,
            "total_cases":         _parse_int(r[1]),
            "automatable":         max(0, _parse_int(r[1]) - non_auto),
            "duration_days":       _parse_int(r[2]),
            "daily_avg":           _parse_float(r[3]),
            "start_date":          _parse_date(r[4]) or _safe_str(r[4]),
            "expected_completion": _parse_date(r[5]) or _safe_str(r[5]),
            "status":              _safe_str(r[6]) if len(r) > 6 else "",
        })


# ── Fallback defaults (used when no tracker file exists) ──────────────────────

def _create_sample_excel() -> None:
    """Seed automation_data.xlsx from hardcoded defaults."""
    rows_proj = [
        {"id":"1p",           "name":"1-Phase Meter Firmware",    "total_cases":523, "automatable":393,"non_automatable":130,"automated":0,"in_progress":0,"team_size":1,"start_date":"2026-07-13","target_date":"2026-08-31","daily_avg":8, "status":"In Progress","priority":"High",  "color":"#1645a4","notes":"Assigned to Saloni Sisodiya."},
        {"id":"3p_wc",        "name":"3-Phase WC",                "total_cases":454, "automatable":454,"non_automatable":0,  "automated":0,"in_progress":0,"team_size":1,"start_date":"2026-09-01","target_date":"2026-12-31","daily_avg":0, "status":"Not Started","priority":"Medium","color":"#02c9a8","notes":"Automation planning pending."},
        {"id":"3p_ltct",      "name":"3-Phase LTCT",              "total_cases":455, "automatable":455,"non_automatable":0,  "automated":0,"in_progress":0,"team_size":1,"start_date":"2026-09-01","target_date":"2026-12-31","daily_avg":0, "status":"Not Started","priority":"Medium","color":"#37aafe","notes":"Automation planning pending."},
        {"id":"hes",          "name":"HES (Gomati / Sangai)",     "total_cases":336, "automatable":330,"non_automatable":6,  "automated":180,"in_progress":0,"team_size":1,"start_date":"2026-06-19","target_date":"2026-08-07","daily_avg":4,"status":"In Progress","priority":"High","color":"#7c3aed","notes":"Assigned to Arpit Jain."},
        {"id":"vee",          "name":"VEE (Gomati / Sangai)",     "total_cases":812, "automatable":584,"non_automatable":228,"automated":0,"in_progress":0,"team_size":1,"start_date":"2026-07-10","target_date":"2026-08-31","daily_avg":0, "status":"In Progress","priority":"High","color":"#0891b2","notes":"MDMS V1 stopped; updating for new DB."},
        {"id":"consumer_app", "name":"Consumer App (Gomati Android)","total_cases":81,"automatable":81,"non_automatable":0, "automated":2,"in_progress":0,"team_size":1,"start_date":"2026-07-03","target_date":"2026-09-30","daily_avg":1, "status":"In Progress","priority":"Medium","color":"#db2777","notes":"Assigned to Komal Singhal."},
        {"id":"comms",        "name":"Comms (4G / RF / IMG / DCU)","total_cases":86,"automatable":60,"non_automatable":26, "automated":20,"in_progress":0,"team_size":1,"start_date":"2026-07-07","target_date":"2026-07-24","daily_avg":3, "status":"In Progress","priority":"High","color":"#ea580c","notes":"Assigned to Saloni Sisodiya."},
        {"id":"wfm",          "name":"WFM Portal – Stage (UP)",  "total_cases":249, "automatable":243,"non_automatable":6,  "automated":103,"in_progress":0,"team_size":1,"start_date":"2026-08-06","target_date":"2026-10-30","daily_avg":4,"status":"Not Started","priority":"Medium","color":"#059669","notes":"Assigned to Shruti Singh."},
    ]
    rows_comp = [
        {"project_id":"1p",      "name":"1-Phase Meter Firmware","total_cases":523,"automatable":393,"duration_days":50,"daily_avg":8,"start_date":"2026-07-13","expected_completion":"2026-08-31","status":"On Track"},
        {"project_id":"3p_wc",   "name":"3-Phase WC",           "total_cases":454,"automatable":454,"duration_days":0, "daily_avg":0,"start_date":"TBD",       "expected_completion":"TBD",        "status":"Planning Pending"},
        {"project_id":"3p_ltct", "name":"3-Phase LTCT",         "total_cases":455,"automatable":455,"duration_days":0, "daily_avg":0,"start_date":"TBD",       "expected_completion":"TBD",        "status":"Planning Pending"},
        {"project_id":"hes",     "name":"HES (Gomati/Sangai)",  "total_cases":336,"automatable":330,"duration_days":50,"daily_avg":4,"start_date":"2026-06-19","expected_completion":"2026-08-07", "status":"On Track"},
        {"project_id":"vee",     "name":"VEE (Gomati/Sangai)",  "total_cases":812,"automatable":584,"duration_days":45,"daily_avg":0,"start_date":"2026-07-10","expected_completion":"2026-08-31", "status":"In Progress"},
        {"project_id":"consumer_app","name":"Consumer App",     "total_cases":81, "automatable":81, "duration_days":89,"daily_avg":1,"start_date":"2026-07-03","expected_completion":"2026-09-30", "status":"On Track"},
        {"project_id":"comms",   "name":"Comms (4G/RF/IMG/DCU)","total_cases":86,"automatable":60, "duration_days":18,"daily_avg":3,"start_date":"2026-07-07","expected_completion":"2026-07-24", "status":"On Track"},
        {"project_id":"wfm",     "name":"WFM Portal Overall",   "total_cases":243,"automatable":243,"duration_days":84,"daily_avg":4,"start_date":"2026-08-06","expected_completion":"2026-10-30", "status":"Scheduled"},
    ]
    with pd.ExcelWriter(MAIN_FILE, engine="openpyxl") as writer:
        pd.DataFrame(rows_proj).to_excel( writer, sheet_name="Projects",        index=False)
        pd.DataFrame(columns=["project_id","module","count","reason","approach"]
            ).to_excel(writer, sheet_name="Non_Automatable", index=False)
        pd.DataFrame(columns=["project_id","date","module","planned_cases","actual_cases",
                               "cumulative","assigned_to","remarks","status"]
            ).to_excel(writer, sheet_name="Day_Plan",        index=False)
        pd.DataFrame(rows_comp).to_excel( writer, sheet_name="Completion_Plan", index=False)


# ── Public API ─────────────────────────────────────────────────────────────────

def ensure_data_file() -> None:
    """
    Sync strategy:
      - If TRACKER_FILE exists and is newer than MAIN_FILE → re-parse tracker
      - Else if MAIN_FILE missing → seed from defaults
    """
    if TRACKER_FILE.exists() and TRACKER_FILE.stat().st_size > 1024:
        tracker_mtime  = TRACKER_FILE.stat().st_mtime
        internal_mtime = MAIN_FILE.stat().st_mtime if MAIN_FILE.exists() else 0
        if tracker_mtime > internal_mtime:
            try:
                _parse_and_save_tracker(TRACKER_FILE)
            except Exception:
                if not MAIN_FILE.exists():
                    _create_sample_excel()
    elif not MAIN_FILE.exists():
        _create_sample_excel()


def _safe_date(v) -> str:
    """Return ISO date string, 'TBD' for unparseable/missing, never NaT."""
    if v is None or v is pd.NaT:
        return "TBD"
    s = str(v).strip()
    if not s or s.upper() in ("TBD", "NAN", "NAT", "NONE", "N/A"):
        return "TBD"
    try:
        ts = pd.to_datetime(v, errors="coerce")
        if pd.notna(ts):
            return ts.date().isoformat()
    except Exception:
        pass
    return s


def load_projects() -> pd.DataFrame:
    ensure_data_file()
    df = pd.read_excel(MAIN_FILE, sheet_name="Projects")
    for col in ("start_date", "target_date"):
        if col in df.columns:
            df[col] = df[col].apply(_safe_date)
    if "status" in df.columns:
        df["status"] = df["status"].fillna("In Progress").replace("", "In Progress")
    return df


def save_projects(df: pd.DataFrame) -> None:
    ensure_data_file()
    with pd.ExcelWriter(MAIN_FILE, engine="openpyxl", mode="a",
                        if_sheet_exists="replace") as writer:
        df.to_excel(writer, sheet_name="Projects", index=False)


def load_non_automatable(project_id: Optional[str] = None) -> pd.DataFrame:
    ensure_data_file()
    df = pd.read_excel(MAIN_FILE, sheet_name="Non_Automatable")
    if project_id:
        df = df[df["project_id"] == project_id].reset_index(drop=True)
    return df


def save_non_automatable(project_id: str, df: pd.DataFrame) -> None:
    ensure_data_file()
    all_df  = pd.read_excel(MAIN_FILE, sheet_name="Non_Automatable")
    other   = all_df[all_df["project_id"] != project_id]
    updated = pd.concat([other, df], ignore_index=True)
    with pd.ExcelWriter(MAIN_FILE, engine="openpyxl", mode="a",
                        if_sheet_exists="replace") as writer:
        updated.to_excel(writer, sheet_name="Non_Automatable", index=False)


def load_day_plan(project_id: Optional[str] = None) -> pd.DataFrame:
    ensure_data_file()
    df = pd.read_excel(MAIN_FILE, sheet_name="Day_Plan")
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date
    if project_id:
        df = df[df["project_id"] == project_id].reset_index(drop=True)
    return df


def save_day_plan(project_id: str, df: pd.DataFrame) -> None:
    ensure_data_file()
    all_df  = pd.read_excel(MAIN_FILE, sheet_name="Day_Plan")
    other   = all_df[all_df["project_id"] != project_id]
    updated = pd.concat([other, df], ignore_index=True)
    with pd.ExcelWriter(MAIN_FILE, engine="openpyxl", mode="a",
                        if_sheet_exists="replace") as writer:
        updated.to_excel(writer, sheet_name="Day_Plan", index=False)


def load_completion_plan() -> pd.DataFrame:
    ensure_data_file()
    return pd.read_excel(MAIN_FILE, sheet_name="Completion_Plan")


def save_completion_plan(df: pd.DataFrame) -> None:
    ensure_data_file()
    with pd.ExcelWriter(MAIN_FILE, engine="openpyxl", mode="a",
                        if_sheet_exists="replace") as writer:
        df.to_excel(writer, sheet_name="Completion_Plan", index=False)


def process_uploaded_file(uploaded_file):
    """
    Accept the Automation tracker.xlsx (multi-section sheets) OR
    the dashboard's own format (Projects / Non_Automatable / Day_Plan / Completion_Plan).
    """
    try:
        suffix = Path(uploaded_file.name).suffix.lower()

        if suffix == ".csv":
            df = pd.read_csv(uploaded_file)
            if "automated" in df.columns and "id" in df.columns:
                existing = load_projects()
                for _, row in df.iterrows():
                    pid = str(row.get("id", "")).strip()
                    if pid in existing["id"].values:
                        for col in ["automated", "in_progress", "non_automatable", "status", "notes"]:
                            if col in row and col in existing.columns:
                                existing.loc[existing["id"] == pid, col] = row[col]
                save_projects(existing)
                return True, f"Updated {len(df)} project rows from CSV."
            return False, "CSV must have 'id' and 'automated' columns."

        xl = pd.ExcelFile(uploaded_file)

        # ── Detect tracker format ─────────────────────────────────────────────
        if TRACKER_SHEETS & set(xl.sheet_names):
            # getvalue() always returns full bytes regardless of read position
            if hasattr(uploaded_file, "getvalue"):
                raw = uploaded_file.getvalue()
            else:
                uploaded_file.seek(0)
                raw = uploaded_file.read()
            with open(TRACKER_FILE, "wb") as f:
                f.write(raw)
            _parse_and_save_tracker(TRACKER_FILE)
            sheets_found = sorted(TRACKER_SHEETS & set(xl.sheet_names))
            return True, f"✅ Tracker imported ({', '.join(sheets_found)}). Dashboard updated from live data."

        # ── Dashboard internal format ─────────────────────────────────────────
        internal_sheets = {"Projects", "Non_Automatable", "Day_Plan", "Completion_Plan"}
        msgs = []
        for sheet in xl.sheet_names:
            if sheet in internal_sheets:
                df = xl.parse(sheet)
                with pd.ExcelWriter(MAIN_FILE, engine="openpyxl", mode="a",
                                    if_sheet_exists="replace") as writer:
                    df.to_excel(writer, sheet_name=sheet, index=False)
                msgs.append(f"{sheet}: {len(df)} rows")
        if msgs:
            return True, "Imported: " + " | ".join(msgs)
        return False, (
            f"No matching sheets found. Sheets in file: {xl.sheet_names}. "
            f"Expected one of: {sorted(TRACKER_SHEETS)} or {sorted(internal_sheets)}."
        )

    except Exception as e:
        return False, f"Import failed: {e}"


def get_tracker_download() -> bytes:
    """
    Return the tracker xlsx for download.
    If the original uploaded tracker exists, serve it directly (preserves all formatting).
    Otherwise reconstruct from internal data in the same multi-sheet structure.
    """
    if TRACKER_FILE.exists() and TRACKER_FILE.stat().st_size > 1024:
        return TRACKER_FILE.read_bytes()

    # Reconstruct from internal data
    ensure_data_file()
    proj   = pd.read_excel(MAIN_FILE, sheet_name="Projects")
    non    = pd.read_excel(MAIN_FILE, sheet_name="Non_Automatable")
    plan   = pd.read_excel(MAIN_FILE, sheet_name="Day_Plan")
    comp   = pd.read_excel(MAIN_FILE, sheet_name="Completion_Plan")

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        # --- Firmware sheet ---
        fw_proj  = proj[proj["id"].isin(["1p","3p_wc","3p_ltct"])]
        fw_non   = non[non["project_id"] == "1p"]
        fw_plan  = plan[plan["project_id"].isin(["1p","3p_wc","3p_ltct"])]
        fw_comp  = comp[comp["project_id"].isin(["1p","3p_wc","3p_ltct","overall","firmware"])]
        _write_tracker_sheet(writer, "Firmware", fw_proj, fw_non, fw_plan, fw_comp)

        # --- Single-project sheets ---
        for sheet, pid in _SHEET_PID.items():
            sp = proj[proj["id"] == pid]
            sn = non[non["project_id"] == pid]
            sd = plan[plan["project_id"] == pid]
            sc = comp[comp["project_id"] == pid]
            _write_tracker_sheet(writer, sheet, sp, sn, sd, sc)

    return buf.getvalue()


def _write_tracker_sheet(writer, sheet_name, proj_df, non_df, plan_df, comp_df):
    """Write one sheet in the 4-section tracker format."""
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    wb = writer.book
    ws = wb.create_sheet(sheet_name)

    hdr_fill  = PatternFill("solid", fgColor="0A3690")
    hdr_font  = Font(bold=True, color="FFFFFF", name="Calibri", size=11)
    sec_fill  = PatternFill("solid", fgColor="1645A4")
    sec_font  = Font(bold=True, color="FFFFFF", name="Calibri", size=11)
    bold_font = Font(bold=True, name="Calibri", size=10)
    norm_font = Font(name="Calibri", size=10)

    row = 1

    def _write_section_header(title):
        nonlocal row
        ws.cell(row, 1, title).font = sec_font
        ws.cell(row, 1).fill = sec_fill
        ws.cell(row, 1).alignment = Alignment(horizontal="center")
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=8)
        row += 1

    def _write_df(df, col_names):
        nonlocal row
        for ci, col in enumerate(col_names, 1):
            c = ws.cell(row, ci, col)
            c.font = hdr_font
            c.fill = hdr_fill
        row += 1
        for _, r in df.iterrows():
            for ci, col in enumerate(col_names, 1):
                val = r.get(col, "")
                if val is None or (isinstance(val, float) and val != val):
                    val = ""
                ws.cell(row, ci, val).font = norm_font
            row += 1
        row += 1  # blank separator

    # 1. Automation Status Summary
    _write_section_header("Automation Status Summary")
    summary_cols = ["id","name","total_cases","automatable","non_automatable","automated","in_progress","status"]
    avail = [c for c in summary_cols if c in proj_df.columns]
    _write_df(proj_df[avail], avail)

    # 2. Non-Automatable Test Cases
    _write_section_header("Non-Automatable Test Cases")
    na_cols = ["module","count","reason","approach"]
    avail_na = [c for c in na_cols if c in non_df.columns]
    _write_df(non_df[avail_na] if avail_na else non_df, avail_na or list(non_df.columns))

    # 3. Day-by-Day Automation Plan
    _write_section_header("Day-by-Day Automation Plan")
    dp_cols = ["date","project_id","module","actual_cases","cumulative","assigned_to","remarks","status"]
    avail_dp = [c for c in dp_cols if c in plan_df.columns]
    _write_df(plan_df[avail_dp] if avail_dp else plan_df, avail_dp or list(plan_df.columns))

    # 4. Project Completion Plan
    _write_section_header("Project Completion Plan")
    cp_cols = ["project_id","name","total_cases","automatable","duration_days","daily_avg",
               "start_date","expected_completion","status"]
    avail_cp = [c for c in cp_cols if c in comp_df.columns]
    _write_df(comp_df[avail_cp] if avail_cp else comp_df, avail_cp or list(comp_df.columns))

    # Auto-width columns
    for col_cells in ws.columns:
        max_len = max((len(str(c.value or "")) for c in col_cells), default=8)
        ws.column_dimensions[get_column_letter(col_cells[0].column)].width = min(max_len + 4, 40)


def get_template_excel() -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        pd.DataFrame(columns=["id","name","total_cases","automatable","non_automatable",
                               "automated","in_progress","team_size","start_date",
                               "target_date","daily_avg","status","priority","color","notes"]
            ).to_excel(writer, sheet_name="Projects", index=False)
        pd.DataFrame(columns=["project_id","module","count","reason","approach"]
            ).to_excel(writer, sheet_name="Non_Automatable", index=False)
        pd.DataFrame(columns=["project_id","date","module","planned_cases","actual_cases",
                               "cumulative","assigned_to","remarks","status"]
            ).to_excel(writer, sheet_name="Day_Plan", index=False)
        pd.DataFrame(columns=["project_id","name","total_cases","automatable","duration_days",
                               "daily_avg","start_date","expected_completion","status"]
            ).to_excel(writer, sheet_name="Completion_Plan", index=False)
    return buf.getvalue()
