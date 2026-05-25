"""
Jira Executive Portfolio Dashboard
====================================
Single-page leadership dashboard — real worklogs · cost · manpower · completion
Run:  streamlit run jira_executive_portfolio_dashboard.py
"""

import os
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import streamlit as st
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth

load_dotenv()

# ── Constants ─────────────────────────────────────────────────────────────────

NOW              = datetime.now(timezone.utc)
SECS_PER_DAY     = 28800   # 8-hour work day
DONE_STATUSES    = {"done", "closed", "resolved", "complete", "completed"}
INPROG_STATUSES  = {"in progress", "in-progress", "in review", "review",
                    "testing", "dev in progress", "under review"}

ROLE_KEYWORDS: Dict[str, List[str]] = {
    "FW":         ["fw", "firmware", "embedded", "software", "sw", "backend", "frontend"],
    "HW":         ["hw", "hardware", "pcb", "electronics", "circuit", "schematic"],
    "Mechanical": ["mechanical", "mech", "design", "cad", "enclosure", "3d"],
    "Validation": ["validation", "validate", "v&v", "pvt", "system test"],
    "QA":         ["qa", "quality", "assurance", "qc", "testing"],
    "DevOps":     ["devops", "ci", "cd", "deployment", "infra", "infrastructure", "cloud"],
    "PM":         ["pm", "project manager", "scrum", "management"],
}
ALL_ROLES = list(ROLE_KEYWORDS.keys()) + ["Others"]

BUDGET_COLORS = {
    "Under Budget": "#34a853",
    "Near Limit":   "#ff9800",
    "Over Budget":  "#ea4335",
    "No Data":      "#9e9e9e",
}

# ── Page config ───────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Executive Portfolio Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Theme ─────────────────────────────────────────────────────────────────────

with st.sidebar:
    theme = st.radio("🎨 Theme", ["Light", "Dark"], horizontal=True, key="theme")

is_dark = (theme == "Dark")

LIGHT = dict(
    bg="#f4f6fb", card="#ffffff", border="#e2e8f0", shadow="0 2px 8px rgba(0,0,0,0.06)",
    text="#1a202c", sub="#718096", muted="#a0aec0", divider="#e2e8f0",
    bar="#edf2f7", info="#f7fafc", badge_bg="#ebf4ff", badge_txt="#3182ce",
    plotly_bg="white", plotly_grid="#e2e8f0", sidebar="#ffffff",
    header_bg="#1a365d", header_text="#ffffff",
    table_head="#2d3748", table_even="#f7fafc",
)
DARK = dict(
    bg="#0d1117", card="#161b22", border="#30363d", shadow="0 2px 8px rgba(0,0,0,0.4)",
    text="#e6edf3", sub="#8b949e", muted="#6e7681", divider="#30363d",
    bar="#21262d", info="#161b22", badge_bg="#1f3a5f", badge_txt="#58a6ff",
    plotly_bg="#161b22", plotly_grid="#30363d", sidebar="#161b22",
    header_bg="#0d1117", header_text="#e6edf3",
    table_head="#1c2128", table_even="#1c2128",
)
T = DARK if is_dark else LIGHT

st.markdown(f"""
<style>
  .stApp,[data-testid="stAppViewContainer"]{{background:{T['bg']}!important}}
  [data-testid="stSidebar"]{{background:{T['sidebar']}!important}}
  [data-testid="stSidebar"] *{{color:{T['text']}!important}}
  h1,h2,h3,h4,h5,h6,.stMarkdown p,label{{color:{T['text']}!important}}
  .stCaption{{color:{T['sub']}!important}}

  /* KPI cards */
  .kpi{{background:{T['card']};border:1px solid {T['border']};border-radius:12px;
        padding:16px 20px;box-shadow:{T['shadow']};}}
  .kpi-icon{{font-size:22px;margin-bottom:4px}}
  .kpi-val{{font-size:28px;font-weight:800;line-height:1.1;color:{T['text']}}}
  .kpi-lbl{{font-size:12px;color:{T['sub']};margin-top:3px}}

  /* Section cards */
  .card{{background:{T['card']};border:1px solid {T['border']};border-radius:12px;
         padding:20px;box-shadow:{T['shadow']};margin-bottom:16px}}
  .card-title{{font-size:15px;font-weight:700;color:{T['text']};margin-bottom:4px}}
  .card-sub{{font-size:12px;color:{T['sub']};margin-bottom:14px}}

  /* Portfolio table */
  .ptable{{width:100%;border-collapse:collapse;font-size:13px}}
  .ptable th{{background:{T['table_head']};color:#ffffff;padding:10px 12px;
              text-align:left;font-size:12px;font-weight:600;white-space:nowrap}}
  .ptable td{{padding:10px 12px;border-bottom:1px solid {T['divider']};
              color:{T['text']};vertical-align:middle}}
  .ptable tr:nth-child(even) td{{background:{T['table_even']}}}
  .ptable tr:hover td{{background:{T['bar']}}}

  /* Badges */
  .badge{{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700}}

  /* Tabs */
  .stTabs [data-baseweb="tab-list"]{{background:{T['card']};border-radius:8px;
    padding:4px;border:1px solid {T['border']}}}
  .stTabs [data-baseweb="tab"]{{color:{T['sub']}!important;border-radius:6px}}
  .stTabs [aria-selected="true"]{{background:{T['bg']}!important;color:{T['text']}!important}}

  /* Inputs */
  .stTextInput input,.stTextArea textarea,.stNumberInput input{{
    background:{T['card']}!important;color:{T['text']}!important;
    border-color:{T['border']}!important}}
  .stRadio label,.stCheckbox label{{color:{T['text']}!important}}

  div[data-testid="stHorizontalBlock"]>div{{padding:3px 5px}}
</style>
""", unsafe_allow_html=True)

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_date(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try:
            val = s[:26] + s[26:].replace(":", "")
            dt  = datetime.strptime(val, fmt)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None


def days(seconds: float) -> float:
    return round(seconds / SECS_PER_DAY, 2) if seconds else 0.0


def fmt_days(d: float) -> str:
    return f"{d:.1f}d"


def fmt_inr(amount: float) -> str:
    if amount >= 1_00_00_000:
        return f"₹{amount/1_00_00_000:.2f}Cr"
    if amount >= 1_00_000:
        return f"₹{amount/1_00_000:.2f}L"
    return f"₹{int(amount):,}"


def classify_role(labels: List[str], components: List[str],
                  assignee: str, custom: Dict[str, str]) -> str:
    if assignee in custom:
        return custom[assignee]
    tokens = [t.lower() for t in labels + components + [assignee]]
    for role, keys in ROLE_KEYWORDS.items():
        if any(k in tok for tok in tokens for k in keys):
            return role
    return "Others"


def budget_status(actual: float, forecast: float, planned: float) -> Tuple[str, str]:
    if planned <= 0:
        ratio = forecast / actual if actual else 0
        if actual == 0:
            return "No Data", BUDGET_COLORS["No Data"]
        if forecast <= actual * 1.05:
            return "Under Budget", BUDGET_COLORS["Under Budget"]
        if forecast <= actual * 1.20:
            return "Near Limit", BUDGET_COLORS["Near Limit"]
        return "Over Budget", BUDGET_COLORS["Over Budget"]
    if forecast <= planned * 1.05:
        return "Under Budget", BUDGET_COLORS["Under Budget"]
    if forecast <= planned * 1.20:
        return "Near Limit", BUDGET_COLORS["Near Limit"]
    return "Over Budget", BUDGET_COLORS["Over Budget"]


def pill(label: str, color: str, bg: str = "") -> str:
    bg = bg or color + "22"
    return (f'<span class="badge" style="background:{bg};color:{color}">{label}</span>')


# ── Jira fetch ────────────────────────────────────────────────────────────────

@st.cache_data(ttl=300, show_spinner=False)
def fetch_issues(project_key: str, jira_url: str, _auth) -> List[dict]:
    """
    Fetch ONLY top-level / parent issues (exclude sub-task issue types).
    Use aggregatetimespent on each — Jira automatically rolls up all child
    work item effort (including Next-gen child issues linked via parent),
    so we get the same number as Jira UI's 'Include child work items'.
    Fetching subtasks separately would double-count their effort.
    """
    issues, start = [], 0
    fields = (
        "summary,created,duedate,updated,status,issuetype,assignee,priority,"
        "resolutiondate,customfield_10015,customfield_10016,customfield_10020,"
        "timeoriginalestimate,timespent,timeestimate,"
        "labels,components,fixVersions,parent,subtasks,"
        "aggregatetimespent,aggregatetimeoriginalestimate,aggregatetimeestimate"
    )
    # Exclude sub-task issue types → aggregatetimespent on parents already
    # includes all child work item effort, matching the Jira UI checkbox.
    jql = (
        f"project = {project_key} "
        f"AND issuetype not in subTaskIssueTypes() "
        f"ORDER BY created ASC"
    )
    while True:
        resp = requests.get(
            f"{jira_url}/rest/api/3/search/jql",
            headers={"Accept": "application/json"},
            auth=_auth,
            params={"jql": jql, "startAt": start, "maxResults": 100,
                    "fields": fields, "expand": "changelog"},
            timeout=30,
        )
        if resp.status_code == 400:
            st.error(f"Project '{project_key}' not found.")
            return []
        if resp.status_code == 401:
            st.error("Auth failed — check email/token.")
            return []
        if not resp.ok:
            st.error(f"Jira {resp.status_code}: {resp.text[:200]}")
            return []
        data   = resp.json()
        batch  = data.get("issues", [])
        issues.extend(batch)
        start += len(batch)
        if start >= data.get("total", 0) or not batch:
            break
    return issues


@st.cache_data(ttl=300, show_spinner=False)
def fetch_worklogs(issue_key: str, jira_url: str, _auth) -> List[dict]:
    """Fetch individual worklogs for a single issue (used for per-user breakdown)."""
    resp = requests.get(
        f"{jira_url}/rest/api/3/issue/{issue_key}/worklog",
        headers={"Accept": "application/json"},
        auth=_auth,
        timeout=15,
    )
    if not resp.ok:
        return []
    return resp.json().get("worklogs", [])


# ── Processing ────────────────────────────────────────────────────────────────

def process_project(issues: List[dict], project_key: str,
                    role_rates: Dict[str, float], default_rate: float,
                    custom_role_map: Dict[str, str]) -> dict:
    """
    Aggregate all metrics for a single project.
    Primary metric = timespent (actual logged effort from Jira worklogs).
    Completion % = logged / (logged + remaining) × 100
    """
    total_logged_s    = 0   # timespent seconds
    total_remaining_s = 0   # timeestimate seconds
    total_original_s  = 0   # timeoriginalestimate seconds

    no_time_logged    = 0   # issues with zero timespent
    no_estimate       = 0   # issues with zero original estimate

    # Per-assignee accumulators
    assignee_logged:     Dict[str, float] = defaultdict(float)
    assignee_remaining:  Dict[str, float] = defaultdict(float)
    assignee_role:       Dict[str, str]   = {}

    # Per-role accumulators
    role_logged:    Dict[str, float] = defaultdict(float)
    role_remaining: Dict[str, float] = defaultdict(float)

    status_counts:   Dict[str, int]   = defaultdict(int)
    type_counts:     Dict[str, int]   = defaultdict(int)

    earliest_start: Optional[datetime] = None
    latest_due:     Optional[datetime] = None
    latest_updated: Optional[datetime] = None

    rows = []

    for iss in issues:
        f   = iss.get("fields", {}) or {}
        key = iss.get("key", "")

        # ── Dates ──────────────────────────────────────────────────
        created  = parse_date(f.get("created"))
        due      = parse_date(f.get("duedate"))
        updated  = parse_date(f.get("updated"))
        start_dt = parse_date(f.get("customfield_10015")) or created

        if start_dt:
            if earliest_start is None or start_dt < earliest_start:
                earliest_start = start_dt
        if due:
            if latest_due is None or due > latest_due:
                latest_due = due
        if updated:
            if latest_updated is None or updated > latest_updated:
                latest_updated = updated

        # ── Core fields ────────────────────────────────────────────
        status   = (f.get("status")    or {}).get("name", "Unknown")
        itype    = (f.get("issuetype") or {}).get("name", "Unknown")
        assignee = (f.get("assignee")  or {}).get("displayName", "Unassigned")
        priority = (f.get("priority")  or {}).get("name", "None")
        labels   = f.get("labels")     or []
        comps    = [c.get("name","") for c in (f.get("components") or [])]
        sprint_raw = f.get("customfield_10020") or []
        sprint = ""
        if isinstance(sprint_raw, list) and sprint_raw:
            last = sprint_raw[-1]
            sprint = last.get("name","") if isinstance(last, dict) else ""

        # ── Time tracking ──────────────────────────────────────────
        # Always use aggregate fields — Jira rolls up ALL child work item
        # effort (including Next-gen parent-linked children, not just sub-tasks).
        # This matches the Jira UI "Include child work items" checkbox exactly.
        # No double-count risk because we no longer fetch subtasks separately.
        logged_s    = f.get("aggregatetimespent")            or f.get("timespent")            or 0
        remaining_s = f.get("aggregatetimeestimate")         or f.get("timeestimate")         or 0
        original_s  = f.get("aggregatetimeoriginalestimate") or f.get("timeoriginalestimate") or 0

        logged_d    = days(logged_s)
        remaining_d = days(remaining_s)
        original_d  = days(original_s)

        # All fetched issues are non-subtask (JQL excludes subTaskIssueTypes).
        # Each issue's aggregate includes its children → just sum directly.
        total_logged_s    += logged_s
        total_remaining_s += remaining_s
        total_original_s  += original_s

        if logged_s == 0:
            no_time_logged += 1
        if original_s == 0:
            no_estimate += 1

        # ── Role ──────────────────────────────────────────────────
        role = classify_role(labels, comps, assignee, custom_role_map)
        if assignee not in assignee_role:
            assignee_role[assignee] = role

        # ── Status flags ──────────────────────────────────────────
        is_done   = status.lower() in DONE_STATUSES
        is_inprog = status.lower() in INPROG_STATUSES or "progress" in status.lower()
        is_delayed = not is_done and due and due < NOW

        # ── Accumulate per-assignee / per-role ────────────────────
        if assignee != "Unassigned":
            assignee_logged[assignee]    += logged_d
            assignee_remaining[assignee] += remaining_d
            role_logged[role]            += logged_d
            role_remaining[role]         += remaining_d

        status_counts[status] += 1
        type_counts[itype]    += 1

        rows.append({
            "key":        key,
            "summary":    f.get("summary",""),
            "type":       itype,
            "status":     status,
            "assignee":   assignee,
            "role":       role,
            "priority":   priority,
            "sprint":     sprint,
            "labels":     ", ".join(labels),
            "start":      start_dt,
            "due":        due,
            "logged_d":   logged_d,
            "remaining_d":remaining_d,
            "original_d": original_d,
            "is_done":    is_done,
            "is_inprog":  is_inprog,
            "is_delayed": is_delayed,
            "no_logged":  logged_s == 0,
        })

    # ── Project-level totals ───────────────────────────────────────────────────
    total_logged_d    = days(total_logged_s)
    total_remaining_d = days(total_remaining_s)
    total_original_d  = days(total_original_s)

    # Completion % = logged / (logged + remaining) × 100
    denom        = total_logged_d + total_remaining_d
    progress_pct = round(total_logged_d / denom * 100, 1) if denom else 0.0

    # Forecast end date (simple linear projection)
    forecast_end: Optional[datetime] = None
    if earliest_start and progress_pct > 0:
        elapsed_days = (NOW - earliest_start).days
        total_days_est = elapsed_days / (progress_pct / 100) if progress_pct else 0
        forecast_end = earliest_start + timedelta(days=total_days_est)

    # ── Cost calculation ──────────────────────────────────────────────────────
    actual_cost   = 0.0
    forecast_cost = 0.0
    role_cost:    Dict[str, float] = defaultdict(float)

    for role, ld in role_logged.items():
        rate = role_rates.get(role, default_rate)
        c    = ld * rate
        actual_cost      += c
        role_cost[role]  += c

    for role, rd in role_remaining.items():
        rate          = role_rates.get(role, default_rate)
        forecast_cost += rd * rate

    forecast_total = actual_cost + forecast_cost

    # Dedicated manpower = assignees with any logged work (grouped by role)
    active_assignees = {a for a, ld in assignee_logged.items() if ld > 0}
    manpower_by_role: Dict[str, int] = defaultdict(int)
    for a in active_assignees:
        manpower_by_role[assignee_role.get(a, "Others")] += 1

    b_label, b_color = budget_status(actual_cost, forecast_total,
                                     total_original_d * default_rate)

    return {
        "project_key":      project_key,
        "issues":           len(issues),
        "rows":             rows,
        # Effort
        "total_logged_d":     total_logged_d,
        "total_remaining_d":  total_remaining_d,
        "total_original_d":   total_original_d,
        "no_time_logged":     no_time_logged,
        "no_estimate":        no_estimate,
        "progress_pct":       progress_pct,
        # Dates
        "earliest_start":     earliest_start,
        "latest_due":         latest_due,
        "latest_updated":     latest_updated,
        "forecast_end":       forecast_end,
        # Assignees / roles
        "assignee_logged":    dict(assignee_logged),
        "assignee_remaining": dict(assignee_remaining),
        "assignee_role":      assignee_role,
        "role_logged":        dict(role_logged),
        "role_remaining":     dict(role_remaining),
        "manpower_by_role":   dict(manpower_by_role),
        "active_assignees":   active_assignees,
        "total_manpower":     len(active_assignees),
        # Cost
        "actual_cost":        actual_cost,
        "forecast_cost":      forecast_total,
        "remaining_cost":     forecast_cost,
        "role_cost":          dict(role_cost),
        # Status
        "budget_label":       b_label,
        "budget_color":       b_color,
        "status_counts":      dict(status_counts),
        "type_counts":        dict(type_counts),
    }


# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("## 📊 Executive Portfolio")
    st.markdown("---")

    jira_url = st.text_input(
        "Jira URL",
        value=os.getenv("JIRA_URL", "https://grampower.atlassian.net"),
    ).strip()

    jira_email = st.text_input(
        "Jira Email",
        value=os.getenv("JIRA_EMAIL", "lalit.tak@polarisgrids.com"),
    ).strip()

    jira_token = st.text_input(
        "API Token", type="password",
        value=os.getenv("JIRA_API_TOKEN", ""),
    ).strip()

    st.markdown("---")
    st.markdown("#### Projects")
    project_keys_raw = st.text_input(
        "Project Keys (comma-separated)",
        placeholder="LCBM, ABC, XYZ",
    ).strip().upper()

    client_names_raw = st.text_area(
        "Project → Client (one per line)",
        placeholder="LCBM=Polaris Grids\nABC=Client B",
        height=80,
    )

    st.markdown("---")
    st.markdown("#### Cost Rate (₹/day)")

    default_rate = st.number_input("Rate per Person per Day", 0, 50000, 2900, 100)

    # Single flat rate applied to all roles
    role_rates: Dict[str, float] = {role: default_rate for role in ALL_ROLES}

    st.markdown("---")
    st.markdown("#### Resource Mapping")
    custom_map_raw = st.text_area(
        "Assignee=Role (one per line)",
        placeholder="John Doe=FW\nJane Smith=HW",
        height=80,
    )

    fetch_btn = st.button("🔄 Fetch / Refresh", type="primary", use_container_width=True)
    st.markdown("---")
    st.caption(f"Server: `{jira_url}`")

# ── Parse sidebar inputs ──────────────────────────────────────────────────────

project_keys = [k.strip() for k in project_keys_raw.split(",") if k.strip()]

client_map: Dict[str, str] = {}
for line in client_names_raw.splitlines():
    if "=" in line:
        pk, _, cl = line.partition("=")
        client_map[pk.strip().upper()] = cl.strip()

custom_role_map: Dict[str, str] = {}
for line in custom_map_raw.splitlines():
    if "=" in line:
        name, _, role = line.partition("=")
        if role.strip() in ALL_ROLES:
            custom_role_map[name.strip()] = role.strip()

if not jira_url or not jira_email or not jira_token or not project_keys:
    st.info("👈 Enter Jira credentials and at least one **Project Key**, then click **Fetch / Refresh**.")
    st.stop()

AUTH = HTTPBasicAuth(jira_email, jira_token)

# ── Fetch all projects ────────────────────────────────────────────────────────

all_projects: Dict[str, dict] = {}
fetch_errors = []

progress_bar = st.progress(0, text="Loading projects…")
for i, pk in enumerate(project_keys):
    progress_bar.progress((i) / len(project_keys), text=f"Fetching {pk}…")
    with st.spinner(f"Fetching {pk}…"):
        issues = fetch_issues(pk, jira_url, AUTH)
    if issues:
        all_projects[pk] = process_project(
            issues, pk, role_rates, default_rate, custom_role_map
        )
    else:
        fetch_errors.append(pk)
progress_bar.progress(1.0, text="Done")
progress_bar.empty()

if fetch_errors:
    st.warning(f"No data for: {', '.join(fetch_errors)}")

if not all_projects:
    st.error("No data loaded. Check credentials and project keys.")
    st.stop()

st.sidebar.success(f"✅ {sum(p['issues'] for p in all_projects.values())} issues across {len(all_projects)} project(s)")

# ── Portfolio aggregates ──────────────────────────────────────────────────────

total_logged_all    = sum(p["total_logged_d"]    for p in all_projects.values())
total_remaining_all = sum(p["total_remaining_d"] for p in all_projects.values())
total_actual_cost   = sum(p["actual_cost"]        for p in all_projects.values())
total_forecast_cost = sum(p["forecast_cost"]      for p in all_projects.values())
total_issues        = sum(p["issues"]             for p in all_projects.values())
total_manpower      = len({a for p in all_projects.values() for a in p["active_assignees"]})
denom_all           = total_logged_all + total_remaining_all
overall_pct         = round(total_logged_all / denom_all * 100, 1) if denom_all else 0.0

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE HEADER
# ═══════════════════════════════════════════════════════════════════════════════

hbg = T["header_bg"]; htx = T["header_text"]
st.markdown(f"""
<div style="background:{hbg};padding:20px 28px;border-radius:12px;margin-bottom:20px;
            border:1px solid {T['border']}">
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
    <div>
      <div style="font-size:11px;color:{'#8b949e' if is_dark else '#90cdf4'};
                  text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">
        Executive Portfolio Dashboard
      </div>
      <div style="font-size:26px;font-weight:800;color:{htx}">
        Jira Project Intelligence
      </div>
      <div style="font-size:13px;color:{'#8b949e' if is_dark else '#bee3f8'};margin-top:4px">
        {len(all_projects)} Project(s) &nbsp;·&nbsp; {total_issues} Issues &nbsp;·&nbsp;
        {total_manpower} Contributors &nbsp;·&nbsp;
        As of {NOW.strftime("%b %d, %Y %H:%M")} UTC
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:{'#8b949e' if is_dark else '#90cdf4'}">PORTFOLIO PROGRESS</div>
      <div style="font-size:50px;font-weight:900;color:{htx};line-height:1">{overall_pct}%</div>
      <div style="background:rgba(255,255,255,0.15);border-radius:6px;height:8px;width:200px;margin-top:6px">
        <div style="background:{'#48bb78' if overall_pct>=80 else ('#ed8936' if overall_pct>=50 else '#fc8181')};
                    height:100%;border-radius:6px;width:{min(overall_pct,100)}%"></div>
      </div>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — EXECUTIVE KPI CARDS
# ═══════════════════════════════════════════════════════════════════════════════

def kpi(col, icon, val, lbl, color=None):
    c = color or T["text"]
    col.markdown(f"""
    <div class="kpi">
      <div class="kpi-icon">{icon}</div>
      <div class="kpi-val" style="color:{c}">{val}</div>
      <div class="kpi-lbl">{lbl}</div>
    </div>""", unsafe_allow_html=True)

c1,c2,c3,c4,c5,c6,c7,c8 = st.columns(8)
kpi(c1, "🗂",  len(all_projects),             "Total Projects")
kpi(c2, "👥",  total_manpower,                 "Total Resources",  "#3182ce")
kpi(c3, "⏱",  fmt_days(total_logged_all),      "Total Logged Days","#38a169")
kpi(c4, "🕐",  fmt_days(total_remaining_all),  "Remaining Days",   "#dd6b20")
kpi(c5, "📊",  f"{overall_pct}%",              "Overall Progress", "#805ad5")
kpi(c6, "💸",  fmt_inr(total_actual_cost),     "Cost Burned",      "#e53e3e")
kpi(c7, "🔮",  fmt_inr(total_forecast_cost),   "Forecast Final Cost","#d69e2e")
kpi(c8, "📋",  total_issues,                   "Total Issues")

st.markdown("<div style='margin-top:20px'></div>", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — EXECUTIVE PORTFOLIO TABLE
# ═══════════════════════════════════════════════════════════════════════════════

def manpower_str(mp: dict) -> str:
    parts = [f"{r}: {n}" for r, n in sorted(mp.items()) if n > 0]
    return "<br>".join(parts) if parts else "—"

# Build every piece as one string — single st.markdown call avoids tag-stripping
_rows_html = ""
for idx, (pk, p) in enumerate(all_projects.items(), 1):
    client   = client_map.get(pk, "—")
    start_s  = p["earliest_start"].strftime("%b %d, %Y") if p["earliest_start"] else "—"
    due_dt   = p["latest_due"] or p["latest_updated"]
    due_s    = due_dt.strftime("%b %d, %Y") if due_dt else "—"
    fore_s   = p["forecast_end"].strftime("%b %d, %Y") if p["forecast_end"] else "—"
    end_cell = (f'{due_s}<br><small style="color:{T["sub"]}">Forecast: {fore_s}</small>'
                if p["forecast_end"] else due_s)
    mp_html      = manpower_str(p["manpower_by_role"])
    bc, bl       = p["budget_color"], p["budget_label"]
    pct          = p["progress_pct"]
    bar_col      = "#48bb78" if pct >= 80 else ("#ed8936" if pct >= 50 else "#fc8181")
    pct_bar      = (
        f'<div style="display:flex;align-items:center;gap:8px">'
        f'<div style="flex:1;background:{T["bar"]};border-radius:4px;height:10px">'
        f'<div style="background:{bar_col};height:100%;border-radius:4px;width:{min(pct,100)}%">'
        f'</div></div>'
        f'<span style="font-weight:700;color:{T["text"]};font-size:13px">{pct}%</span></div>'
    )
    badge = f'<span style="background:{bc}22;color:{bc};padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700">{bl}</span>'

    _rows_html += f"""
    <tr>
      <td style="color:{T['sub']};font-size:12px">{idx}</td>
      <td><b style="color:{T['text']}">{pk}</b></td>
      <td style="color:{T['sub']}">{client}</td>
      <td style="color:{T['text']};white-space:nowrap">{start_s}</td>
      <td style="white-space:nowrap;color:{T['text']}">{end_cell}</td>
      <td style="font-size:12px;color:{T['text']}">{mp_html}</td>
      <td style="font-weight:600;color:#38a169">{fmt_days(p['total_logged_d'])}</td>
      <td style="font-weight:600;color:#dd6b20">{fmt_days(p['total_remaining_d'])}</td>
      <td style="font-weight:600;color:{T['text']}">{fmt_inr(p['actual_cost'])}</td>
      <td style="font-weight:600;color:#d69e2e">{fmt_inr(p['forecast_cost'])}</td>
      <td>{badge}</td>
      <td style="min-width:140px">{pct_bar}</td>
    </tr>"""

total_mp = sum(p["total_manpower"] for p in all_projects.values())
_total_row = f"""
    <tr style="border-top:2px solid {T['border']};font-weight:700;background:{T['bar']}">
      <td colspan="5" style="padding:10px 12px;color:{T['text']}">PORTFOLIO TOTAL</td>
      <td style="color:{T['text']}">{total_mp} resources</td>
      <td style="color:#38a169">{fmt_days(total_logged_all)}</td>
      <td style="color:#dd6b20">{fmt_days(total_remaining_all)}</td>
      <td style="color:{T['text']}">{fmt_inr(total_actual_cost)}</td>
      <td style="color:#d69e2e">{fmt_inr(total_forecast_cost)}</td>
      <td>—</td>
      <td style="color:#805ad5;font-weight:800">{overall_pct}%</td>
    </tr>"""

st.markdown(f"""
<div style="background:{T['card']};border:1px solid {T['border']};border-radius:12px;
            padding:20px;box-shadow:{T['shadow']};margin-bottom:16px">
  <div style="font-size:15px;font-weight:700;color:{T['text']};margin-bottom:4px">
    📋 Executive Portfolio Summary
  </div>
  <div style="font-size:12px;color:{T['sub']};margin-bottom:14px">
    Auto-populated from Jira actual worklogs &amp; time tracking &nbsp;·&nbsp; Live data
  </div>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:{T['table_head']}">
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">#</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">Project</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">Client</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">Start Date</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">End / Forecast</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">Manpower</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">Logged Days</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">Remaining</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">Actual Cost</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">Forecast Cost</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">Budget Status</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px">% Completed</th>
        </tr>
      </thead>
      <tbody>{_rows_html}{_total_row}</tbody>
    </table>
  </div>
</div>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TABS for detail sections
# ═══════════════════════════════════════════════════════════════════════════════

tab_time, tab_resource, tab_cost, tab_timeline, tab_issues = st.tabs([
    "⏱ Time Tracking",
    "👥 Resources",
    "💰 Cost Analytics",
    "📅 Timeline",
    "🗂 Issues",
])


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — TIME TRACKING ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

with tab_time:
    # Project selector
    sel_pk = st.selectbox("Select Project", options=list(all_projects.keys()), key="tt_proj")
    p = all_projects[sel_pk]

    st.markdown("<div style='margin-top:8px'></div>", unsafe_allow_html=True)

    # Time KPIs
    t1,t2,t3,t4,t5 = st.columns(5)
    kpi(t1, "✅", fmt_days(p["total_logged_d"]),    "Total Logged",     "#38a169")
    kpi(t2, "🕐", fmt_days(p["total_remaining_d"]), "Remaining",        "#dd6b20")
    kpi(t3, "📋", fmt_days(p["total_original_d"]),  "Original Estimate","#3182ce")
    kpi(t4, "🚫", p["no_time_logged"],              "No Time Logged",   "#e53e3e")
    kpi(t5, "📊", f"{p['progress_pct']}%",          "Completion %",     "#805ad5")

    st.markdown("<div style='margin-top:16px'></div>", unsafe_allow_html=True)

    col_a, col_b = st.columns(2, gap="medium")

    with col_a:
        # Logged vs Remaining donut
        fig_tt = go.Figure(go.Pie(
            labels=["Logged", "Remaining"],
            values=[p["total_logged_d"], p["total_remaining_d"]],
            hole=0.65,
            marker_colors=["#38a169","#dd6b20"],
            textinfo="none",
        ))
        fig_tt.update_layout(
            title=dict(text="Logged vs Remaining", font=dict(color=T["text"], size=14)),
            annotations=[dict(
                text=f"<b>{p['progress_pct']}%</b><br><span style='font-size:10px'>done</span>",
                x=0.5, y=0.5, font_size=16, showarrow=False,
                font=dict(color=T["text"]),
            )],
            showlegend=True,
            legend=dict(font=dict(color=T["text"])),
            margin=dict(t=40,b=10,l=10,r=10),
            height=280,
            paper_bgcolor=T["card"],
            plot_bgcolor=T["plotly_bg"],
        )
        st.plotly_chart(fig_tt, use_container_width=True)

    with col_b:
        # Planned vs Logged vs Remaining bar
        fig_bar = go.Figure()
        fig_bar.add_trace(go.Bar(name="Original Est.",
            x=["Effort"], y=[p["total_original_d"]], marker_color="#3182ce"))
        fig_bar.add_trace(go.Bar(name="Logged",
            x=["Effort"], y=[p["total_logged_d"]], marker_color="#38a169"))
        fig_bar.add_trace(go.Bar(name="Remaining",
            x=["Effort"], y=[p["total_remaining_d"]], marker_color="#dd6b20"))
        fig_bar.update_layout(
            title=dict(text="Planned vs Actual vs Remaining (days)",
                       font=dict(color=T["text"], size=14)),
            barmode="group", height=280,
            margin=dict(t=40,b=10,l=0,r=0),
            plot_bgcolor=T["plotly_bg"],
            paper_bgcolor=T["card"],
            yaxis=dict(title="Days", gridcolor=T["plotly_grid"],
                       tickfont=dict(color=T["sub"])),
            xaxis=dict(tickfont=dict(color=T["sub"])),
            legend=dict(font=dict(color=T["text"])),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    st.markdown("<div style='margin-top:8px'></div>", unsafe_allow_html=True)

    # No-time-logged issues table
    no_log_rows = [r for r in p["rows"] if r["no_logged"]]
    if no_log_rows:
        st.markdown(f"""
        <div class="card">
          <div class="card-title">🚫 Issues with No Time Logged ({len(no_log_rows)})</div>
          <div class="card-sub">These issues have zero timespent — ensure worklogs are added</div>
        </div>""", unsafe_allow_html=True)
        nl_df = pd.DataFrame([{
            "Key":       r["key"],
            "Summary":   r["summary"][:60],
            "Status":    r["status"],
            "Assignee":  r["assignee"],
            "Est Days":  r["original_d"],
            "Remaining": r["remaining_d"],
        } for r in no_log_rows])
        st.dataframe(nl_df, use_container_width=True, hide_index=True)

    # Per-sprint time breakdown
    sprint_data: Dict[str, dict] = defaultdict(lambda: {"logged":0.0,"remaining":0.0,"n":0})
    for r in p["rows"]:
        sp = r["sprint"] or "Backlog"
        sprint_data[sp]["logged"]    += r["logged_d"]
        sprint_data[sp]["remaining"] += r["remaining_d"]
        sprint_data[sp]["n"]         += 1

    if len(sprint_data) > 1:
        st.markdown("#### Sprint / Release Breakdown")
        sp_df = pd.DataFrame([{
            "Sprint":      sp,
            "Issues":      v["n"],
            "Logged Days": round(v["logged"],1),
            "Remaining":   round(v["remaining"],1),
            "Progress %":  f"{round(v['logged']/(v['logged']+v['remaining'])*100,1) if (v['logged']+v['remaining']) else 0}%",
        } for sp, v in sprint_data.items()])
        st.dataframe(sp_df, use_container_width=True, hide_index=True)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — RESOURCE ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

with tab_resource:
    sel_pk2 = st.selectbox("Select Project", list(all_projects.keys()), key="res_proj")
    p = all_projects[sel_pk2]

    st.markdown("<div style='margin-top:8px'></div>", unsafe_allow_html=True)

    col_r1, col_r2 = st.columns(2, gap="medium")

    with col_r1:
        # Role-wise logged days bar
        roles_with_data = [(r, v) for r, v in p["role_logged"].items() if v > 0]
        if roles_with_data:
            roles_s, vals_s = zip(*sorted(roles_with_data, key=lambda x: -x[1]))
            rem_vals = [p["role_remaining"].get(r, 0) for r in roles_s]
            fig_role = go.Figure()
            fig_role.add_trace(go.Bar(name="Logged",    x=list(roles_s), y=list(vals_s),
                                      marker_color="#38a169"))
            fig_role.add_trace(go.Bar(name="Remaining", x=list(roles_s), y=rem_vals,
                                      marker_color="#dd6b20"))
            fig_role.update_layout(
                title=dict(text="Effort by Role (days)", font=dict(color=T["text"],size=14)),
                barmode="stack", height=300,
                margin=dict(t=40,b=10,l=0,r=0),
                plot_bgcolor=T["plotly_bg"], paper_bgcolor=T["card"],
                yaxis=dict(gridcolor=T["plotly_grid"], tickfont=dict(color=T["sub"])),
                xaxis=dict(tickfont=dict(color=T["sub"])),
                legend=dict(font=dict(color=T["text"])),
            )
            st.plotly_chart(fig_role, use_container_width=True)

    with col_r2:
        # Headcount pie
        mp = p["manpower_by_role"]
        if mp:
            fig_mp = go.Figure(go.Pie(
                labels=list(mp.keys()), values=list(mp.values()),
                hole=0.5, textinfo="label+percent",
                textfont=dict(color=T["text"]),
            ))
            fig_mp.update_layout(
                title=dict(text="Manpower by Role", font=dict(color=T["text"],size=14)),
                height=300, margin=dict(t=40,b=10,l=10,r=10),
                paper_bgcolor=T["card"],
                legend=dict(font=dict(color=T["text"])),
            )
            st.plotly_chart(fig_mp, use_container_width=True)

    st.markdown("#### Resource Detail Table")

    # Per-assignee table
    res_rows = []
    for assignee, logged in sorted(p["assignee_logged"].items(), key=lambda x: -x[1]):
        role     = p["assignee_role"].get(assignee, "Others")
        rate     = role_rates.get(role, default_rate)
        remaining = p["assignee_remaining"].get(assignee, 0)
        cost     = logged * rate
        denom_a  = logged + remaining
        util     = round(logged / denom_a * 100, 1) if denom_a else 0
        res_rows.append({
            "Assignee":      assignee,
            "Role":          role,
            "Logged Days":   round(logged, 1),
            "Remaining Days":round(remaining, 1),
            "Rate (₹/day)":  f"₹{int(rate):,}",
            "Cost Burned":   fmt_inr(cost),
            "Utilization %": f"{util}%",
        })

    if res_rows:
        st.dataframe(pd.DataFrame(res_rows), use_container_width=True, hide_index=True)

    # Cross-project resource view
    if len(all_projects) > 1:
        st.markdown("#### Cross-Project Resource View")
        cross: Dict[str, dict] = defaultdict(lambda: {"logged":0.0,"remaining":0.0,"projects":set()})
        for pk2, proj in all_projects.items():
            for a, ld in proj["assignee_logged"].items():
                cross[a]["logged"]    += ld
                cross[a]["remaining"] += proj["assignee_remaining"].get(a, 0)
                cross[a]["projects"].add(pk2)

        cross_rows = []
        for a, v in sorted(cross.items(), key=lambda x: -x[1]["logged"]):
            cross_rows.append({
                "Assignee":    a,
                "Logged Days": round(v["logged"],1),
                "Remaining":   round(v["remaining"],1),
                "Projects":    ", ".join(sorted(v["projects"])),
            })
        if cross_rows:
            st.dataframe(pd.DataFrame(cross_rows), use_container_width=True, hide_index=True)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — COST ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

with tab_cost:
    st.markdown("#### Cost Calculation Basis")
    st.markdown(f"""
    <div style="background:{T['info']};border-left:4px solid #3182ce;padding:10px 16px;
                border-radius:0 8px 8px 0;font-size:13px;color:{T['text']};margin-bottom:16px">
      <b>Actual Cost</b> = Logged Days × Role Rate &nbsp;|&nbsp;
      <b>Forecast Final Cost</b> = Actual Cost + Remaining Days × Role Rate &nbsp;|&nbsp;
      <b>Rates:</b>
      {" · ".join(f"{r}: ₹{int(role_rates.get(r,default_rate)):,}/day" for r in ALL_ROLES if r!="Others")}
    </div>
    """, unsafe_allow_html=True)

    # Cost KPIs
    ck1, ck2, ck3, ck4 = st.columns(4)
    kpi(ck1, "💸", fmt_inr(total_actual_cost),            "Total Actual Cost",    "#e53e3e")
    kpi(ck2, "🔮", fmt_inr(total_forecast_cost),          "Forecast Final Cost",  "#d69e2e")
    kpi(ck3, "🏦", fmt_inr(total_forecast_cost - total_actual_cost), "Remaining Cost", "#dd6b20")
    burn_pct = round(total_actual_cost / total_forecast_cost * 100, 1) if total_forecast_cost else 0
    kpi(ck4, "📈", f"{burn_pct}%",                        "Cost Burn %",          "#e53e3e")

    st.markdown("<div style='margin-top:16px'></div>", unsafe_allow_html=True)

    col_c1, col_c2 = st.columns(2, gap="medium")

    with col_c1:
        # Cost by project bar
        proj_names  = list(all_projects.keys())
        actual_costs = [all_projects[pk]["actual_cost"]   for pk in proj_names]
        fore_costs   = [all_projects[pk]["forecast_cost"] for pk in proj_names]
        fig_cost_proj = go.Figure()
        fig_cost_proj.add_trace(go.Bar(name="Actual Cost",    x=proj_names, y=actual_costs,
                                       marker_color="#e53e3e",
                                       text=[fmt_inr(v) for v in actual_costs],
                                       textposition="outside",
                                       textfont=dict(color=T["text"])))
        fig_cost_proj.add_trace(go.Bar(name="Forecast Total", x=proj_names, y=fore_costs,
                                       marker_color="#d69e2e",
                                       text=[fmt_inr(v) for v in fore_costs],
                                       textposition="outside",
                                       textfont=dict(color=T["text"])))
        fig_cost_proj.update_layout(
            title=dict(text="Cost by Project (₹)", font=dict(color=T["text"],size=14)),
            barmode="group", height=300,
            margin=dict(t=50,b=10,l=0,r=0),
            plot_bgcolor=T["plotly_bg"], paper_bgcolor=T["card"],
            yaxis=dict(gridcolor=T["plotly_grid"], tickfont=dict(color=T["sub"])),
            xaxis=dict(tickfont=dict(color=T["sub"])),
            legend=dict(font=dict(color=T["text"])),
        )
        st.plotly_chart(fig_cost_proj, use_container_width=True)

    with col_c2:
        # Cost by role (portfolio-level)
        role_cost_all: Dict[str, float] = defaultdict(float)
        for proj in all_projects.values():
            for role, cost in proj["role_cost"].items():
                role_cost_all[role] += cost
        if role_cost_all:
            roles_c = [r for r,v in role_cost_all.items() if v > 0]
            vals_c  = [role_cost_all[r] for r in roles_c]
            fig_role_cost = go.Figure(go.Pie(
                labels=roles_c, values=vals_c, hole=0.5,
                textinfo="label+percent",
                textfont=dict(color=T["text"]),
            ))
            fig_role_cost.update_layout(
                title=dict(text="Cost by Role", font=dict(color=T["text"],size=14)),
                height=300, margin=dict(t=40,b=10,l=10,r=10),
                paper_bgcolor=T["card"],
                legend=dict(font=dict(color=T["text"])),
            )
            st.plotly_chart(fig_role_cost, use_container_width=True)

    # Detailed cost table per project
    st.markdown("#### Project Cost Breakdown")
    cost_table_rows = []
    for pk, proj in all_projects.items():
        cost_table_rows.append({
            "Project":          pk,
            "Client":           client_map.get(pk, "—"),
            "Logged Days":      round(proj["total_logged_d"], 1),
            "Remaining Days":   round(proj["total_remaining_d"], 1),
            "Actual Cost":      fmt_inr(proj["actual_cost"]),
            "Remaining Cost":   fmt_inr(proj["remaining_cost"]),
            "Forecast Total":   fmt_inr(proj["forecast_cost"]),
            "Budget Status":    proj["budget_label"],
            "Completion %":     f"{proj['progress_pct']}%",
        })
    st.dataframe(pd.DataFrame(cost_table_rows), use_container_width=True, hide_index=True)

    # Per-role cost breakdown per project
    st.markdown("#### Role-wise Cost Detail")
    role_detail_rows = []
    for pk, proj in all_projects.items():
        for role, cost in sorted(proj["role_cost"].items(), key=lambda x: -x[1]):
            rate     = role_rates.get(role, default_rate)
            ld       = proj["role_logged"].get(role, 0)
            rd       = proj["role_remaining"].get(role, 0)
            rem_cost = rd * rate
            role_detail_rows.append({
                "Project":   pk,
                "Role":      role,
                "Rate ₹/day":f"₹{int(rate):,}",
                "Logged d":  round(ld, 1),
                "Rem d":     round(rd, 1),
                "Actual ₹":  fmt_inr(cost),
                "Forecast ₹":fmt_inr(cost + rem_cost),
            })
    if role_detail_rows:
        st.dataframe(pd.DataFrame(role_detail_rows), use_container_width=True, hide_index=True)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — TIMELINE (GANTT)
# ═══════════════════════════════════════════════════════════════════════════════

with tab_timeline:
    sel_pk3 = st.selectbox("Select Project", list(all_projects.keys()), key="gantt_proj")
    p       = all_projects[sel_pk3]

    color_by = st.selectbox("Colour by", ["Status","Assignee","Role","Type"], index=0)

    gantt_rows = [
        r for r in p["rows"]
        if r["start"] and r["due"] and r["start"] <= r["due"]
    ]
    no_date_cnt = len(p["rows"]) - len(gantt_rows)

    if not gantt_rows:
        st.info("Issues need both a Start Date and Due Date for the Gantt chart.")
    else:
        def naive(dt: datetime) -> datetime:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)

        gantt_df = pd.DataFrame([{
            "Task":     f"{r['key']}: {r['summary'][:45]}",
            "Start":    naive(r["start"]),
            "End":      naive(r["due"]),
            "Status":   r["status"],
            "Assignee": r["assignee"],
            "Role":     r["role"],
            "Type":     r["type"],
        } for r in gantt_rows])

        gantt_df["Start"] = pd.to_datetime(gantt_df["Start"])
        gantt_df["End"]   = pd.to_datetime(gantt_df["End"])

        fig_g = px.timeline(
            gantt_df, x_start="Start", x_end="End", y="Task",
            color=color_by,
            hover_data=["Status","Assignee","Role"],
            color_discrete_sequence=px.colors.qualitative.Set2,
        )
        fig_g.update_yaxes(autorange="reversed")

        today_s = NOW.astimezone(timezone.utc).replace(tzinfo=None).strftime("%Y-%m-%d %H:%M:%S")
        fig_g.add_shape(type="line", x0=today_s, x1=today_s, y0=0, y1=1, yref="paper",
                        line=dict(color="#fc8181", dash="dash", width=2))
        fig_g.add_annotation(x=today_s, y=1, yref="paper", text="Today",
                             showarrow=False, font=dict(color="#fc8181", size=12),
                             xanchor="left", yanchor="bottom")

        if p["forecast_end"]:
            fore_s = naive(p["forecast_end"]).strftime("%Y-%m-%d %H:%M:%S")
            fig_g.add_shape(type="line", x0=fore_s, x1=fore_s, y0=0, y1=1, yref="paper",
                            line=dict(color="#d69e2e", dash="dot", width=2))
            fig_g.add_annotation(x=fore_s, y=0.95, yref="paper", text="Forecast End",
                                 showarrow=False, font=dict(color="#d69e2e", size=11),
                                 xanchor="left", yanchor="bottom")

        fig_g.update_layout(
            height=max(400, len(gantt_df) * 28 + 80),
            margin=dict(l=10, r=10, t=30, b=10),
            xaxis_title="", yaxis_title="",
            plot_bgcolor=T["plotly_bg"], paper_bgcolor=T["card"],
            xaxis=dict(showgrid=True, gridcolor=T["plotly_grid"],
                       tickfont=dict(color=T["sub"])),
            yaxis=dict(tickfont=dict(color=T["sub"])),
            legend=dict(orientation="h", y=-0.06, font=dict(color=T["text"])),
        )
        st.plotly_chart(fig_g, use_container_width=True)
        if no_date_cnt:
            st.caption(f"ℹ️ {no_date_cnt} issue(s) hidden — missing start or due date.")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — ISSUES TABLE
# ═══════════════════════════════════════════════════════════════════════════════

with tab_issues:
    sel_pk4 = st.selectbox("Select Project", list(all_projects.keys()), key="iss_proj")
    p       = all_projects[sel_pk4]

    col_s1, col_s2, col_s3 = st.columns([3,1,1])
    with col_s1:
        search = st.text_input("🔍 Search key / summary / assignee", placeholder="Type to filter…")
    with col_s2:
        show_no_log = st.checkbox("🚫 No logged time", False)
    with col_s3:
        show_delayed = st.checkbox("⚠️ Delayed only", False)

    table = p["rows"]
    if search:
        s = search.lower()
        table = [r for r in table
                 if s in r["key"].lower() or s in r["summary"].lower()
                 or s in r["assignee"].lower()]
    if show_no_log:
        table = [r for r in table if r["no_logged"]]
    if show_delayed:
        table = [r for r in table if r["is_delayed"]]

    display = pd.DataFrame([{
        "Key":          r["key"],
        "Summary":      r["summary"][:65],
        "Type":         r["type"],
        "Status":       r["status"],
        "Assignee":     r["assignee"],
        "Role":         r["role"],
        "Sprint":       r["sprint"],
        "Est Days":     r["original_d"],
        "Logged Days":  r["logged_d"],
        "Remaining":    r["remaining_d"],
        "Due Date":     r["due"].strftime("%Y-%m-%d") if r["due"] else "—",
        "Delayed":      "⚠️" if r["is_delayed"] else "",
        "No Log":       "🚫" if r["no_logged"] else "",
    } for r in table])

    st.dataframe(display, use_container_width=True, hide_index=True,
                 column_config={
                     "Est Days":    st.column_config.NumberColumn(format="%.1f"),
                     "Logged Days": st.column_config.NumberColumn(format="%.1f"),
                     "Remaining":   st.column_config.NumberColumn(format="%.1f"),
                 })
    st.caption(f"Showing **{len(table)}** of **{p['issues']}** issues")

    if table:
        csv = display.to_csv(index=False).encode("utf-8")
        st.download_button("⬇️ Export CSV", csv,
                           f"{sel_pk4}_issues.csv", "text/csv")
