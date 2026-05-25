"""
Jira Project Dashboard — Streamlit
------------------------------------
Run:  streamlit run jira_streamlit.py
Credentials are read from .env (JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN).
"""

import os
import sys
from collections import Counter
from datetime import datetime, timezone, timedelta

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import streamlit as st
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth

load_dotenv()

JIRA_URL       = os.getenv("JIRA_URL", "https://grampower.atlassian.net")
JIRA_EMAIL     = os.getenv("JIRA_EMAIL", "lalit.tak@polarisgrids.com")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")

if not JIRA_EMAIL or not JIRA_API_TOKEN:
    st.error("Set JIRA_EMAIL and JIRA_API_TOKEN in your .env file.")
    sys.exit(1)

AUTH    = HTTPBasicAuth(JIRA_EMAIL, JIRA_API_TOKEN)
HEADERS = {"Accept": "application/json"}

DONE_STATUSES = {"done", "closed", "resolved", "complete", "completed"}

NOW = datetime.now(timezone.utc)


# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%d"):
        try:
            s = date_str[:26] + date_str[26:].replace(":", "")
            dt = datetime.strptime(s, fmt)
            # Ensure always timezone-aware
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            pass
    return None


def time_ago(dt: datetime | None) -> str:
    if not dt:
        return ""
    diff = NOW - dt.astimezone(timezone.utc)
    if diff.seconds < 60:
        return "just now"
    if diff.seconds < 3600:
        return f"{diff.seconds // 60} minutes ago"
    if diff.days == 0:
        return f"{diff.seconds // 3600} hours ago"
    if diff.days == 1:
        return "yesterday"
    return f"{diff.days} days ago"


# ── Data fetching ─────────────────────────────────────────────────────────────

@st.cache_data(ttl=0, show_spinner=False)
def fetch_all_issues(project_key: str, jira_url: str, _auth) -> list[dict]:
    issues, start_at = [], 0
    while True:
        resp = requests.get(
            f"{jira_url}/rest/api/3/search/jql",
            headers=HEADERS,
            auth=_auth,
            params={
                "jql": f"project = {project_key} ORDER BY created ASC",
                "startAt": start_at,
                "maxResults": 100,
                "fields": (
                    "summary,created,duedate,updated,status,issuetype,"
                    "assignee,priority,resolutiondate,customfield_10015,timeoriginalestimate,timespent,timeestimate"
                ),
                "expand": "changelog",
            },
            timeout=30,
        )
        if resp.status_code == 400:
            st.error(f"Project '{project_key}' not found or invalid key.")
            return []
        if resp.status_code == 401:
            st.error("Authentication failed. Check JIRA_EMAIL and JIRA_API_TOKEN.")
            return []
        if not resp.ok:
            st.error(f"Jira API error {resp.status_code}: {resp.text}")
            return []

        data  = resp.json()
        batch = data.get("issues", [])
        issues.extend(batch)
        total     = data.get("total", 0)
        start_at += len(batch)
        if start_at >= total or not batch:
            break
    return issues


# ── Processing ────────────────────────────────────────────────────────────────

def process_issues(issues: list[dict]) -> dict:
    earliest_created = None
    latest_due       = None
    latest_updated   = None

    status_counter   = Counter()
    type_counter     = Counter()
    assignee_counter = Counter()
    priority_counter = Counter()

    completed_7d = updated_7d = created_7d = due_soon_7d = 0
    rows         = []

    total_effort_days = 0
    planned_effort_days = 0
    completed_effort_days = 0
    inprogress_effort_days = 0
    activity     = []   # recent changelog entries

    seven_days_ago = NOW - timedelta(days=7)
    seven_days_fwd = NOW + timedelta(days=7)

    for issue in issues:
        f   = issue.get("fields", {})
        key = issue.get("key", "")

        created = parse_date(f.get("created"))
        if created:
            if earliest_created is None or created < earliest_created:
                earliest_created = created
            if created >= seven_days_ago:
                created_7d += 1

        due = parse_date(f.get("duedate"))
        if due:
            if latest_due is None or due > latest_due:
                latest_due = due
            if NOW <= due <= seven_days_fwd:
                due_soon_7d += 1

        updated = parse_date(f.get("updated"))
        if updated:
            if latest_updated is None or updated > latest_updated:
                latest_updated = updated
            if updated >= seven_days_ago:
                updated_7d += 1

        status   = (f.get("status")    or {}).get("name", "Unknown")
        itype    = (f.get("issuetype") or {}).get("name", "Unknown")
        assignee = (f.get("assignee")  or {}).get("displayName", "Unassigned")
        priority = (f.get("priority")  or {}).get("name", "None")

        orig_est = f.get("timeoriginalestimate") or 0
        spent_est = f.get("timespent") or 0

        orig_days = orig_est / 28800 if orig_est else 0
        spent_days = spent_est / 28800 if spent_est else 0

        total_effort_days += orig_days
        planned_effort_days += orig_days
        completed_effort_days += spent_days

        if "progress" in status.lower():
            inprogress_effort_days += orig_days

        status_counter[status]     += 1
        type_counter[itype]        += 1
        assignee_counter[assignee] += 1
        priority_counter[priority] += 1

        is_done = status.lower() in DONE_STATUSES
        if is_done:
            resolved = parse_date(f.get("resolutiondate"))
            if resolved and resolved >= seven_days_ago:
                completed_7d += 1

        # Start date: prefer customfield_10015, fallback to created
        start_dt = parse_date(f.get("customfield_10015")) or created
        end_dt   = due or updated

        rows.append({
            "Key":      key,
            "Summary":  f.get("summary", ""),
            "Type":     itype,
            "Status":   status,
            "Assignee": assignee,
            "Priority": priority,
            "Created":  created.strftime("%Y-%m-%d") if created else "",
            "Due Date": due.strftime("%Y-%m-%d") if due else "—",
            "Start":    start_dt,
            "End":      end_dt,
        })

        # Collect changelog entries
        for entry in (issue.get("changelog") or {}).get("histories", []):
            entry_dt = parse_date(entry.get("created"))
            if not entry_dt or entry_dt < seven_days_ago:
                continue
            author = (entry.get("author") or {}).get("displayName", "Someone")
            for item in entry.get("items", []):
                activity.append({
                    "dt":     entry_dt,
                    "author": author,
                    "field":  item.get("field", ""),
                    "key":    key,
                    "summary": f.get("summary", ""),
                    "status": status,
                })

    activity.sort(key=lambda x: x["dt"], reverse=True)

    return {
        "total":            len(issues),
        "completed_7d":     completed_7d,
        "updated_7d":       updated_7d,
        "created_7d":       created_7d,
        "due_soon_7d":      due_soon_7d,
        "earliest_created": earliest_created,
        "latest_due":       latest_due,
        "latest_updated":   latest_updated,
        "status_counter":   status_counter,
        "type_counter":     type_counter,
        "assignee_counter": assignee_counter,
        "priority_counter": priority_counter,
        "rows":             rows,
        "activity":         activity,
        "total_effort_days": round(total_effort_days,1),
        "planned_effort_days": round(planned_effort_days,1),
        "completed_effort_days": round(completed_effort_days,1),
        "inprogress_effort_days": round(inprogress_effort_days,1),
    }


# ── Page config ───────────────────────────────────────────────────────────────

st.set_page_config(page_title="Jira Dashboard", page_icon="📊", layout="wide")

st.markdown("""
<style>
    .kpi-card {
        background: #ffffff;
        border-radius: 10px;
        padding: 16px 20px;
        border: 1px solid #e8e8e8;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .kpi-label { font-size: 13px; color: #777; margin-top: 2px; }
    .kpi-value { font-size: 26px; font-weight: 700; color: #1a1a1a; }
    .kpi-icon  { font-size: 20px; }
    .section-card {
        background: #ffffff;
        border-radius: 10px;
        padding: 20px;
        border: 1px solid #e8e8e8;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        height: 100%;
    }
    .section-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
    .section-sub   { font-size: 12px; color: #888; margin-bottom: 14px; }
    .activity-item { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .activity-time { font-size: 11px; color: #aaa; margin-top: 2px; }
    .badge {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        background: #e8f0fe;
        color: #1a73e8;
        margin-left: 4px;
    }
    .dist-row { display: flex; align-items: center; margin-bottom: 10px; gap: 10px; }
    .dist-label { min-width: 130px; font-size: 13px; color: #333; }
    .dist-bar-bg { flex: 1; background: #f0f0f0; border-radius: 4px; height: 22px; position: relative; }
    .dist-bar-fill { height: 100%; border-radius: 4px; background: #4a90d9; display: flex;
                     align-items: center; padding-left: 8px; font-size: 12px;
                     font-weight: 600; color: white; }
    div[data-testid="stHorizontalBlock"] > div { padding: 4px 6px; }
</style>
""", unsafe_allow_html=True)


# ── Sidebar ───────────────────────────────────────────────────────────────────


with st.sidebar:
    st.markdown("## 📊 Jira Dashboard")
    st.markdown("---")

    jira_url = st.text_input(
        "Jira URL",
        value=os.getenv("JIRA_URL", "https://grampower.atlassian.net")
    ).strip()

    jira_email = st.text_input(
        "Jira Email",
        value=os.getenv("JIRA_EMAIL", "lalit.tak@polarisgrids.com")
    ).strip()

    jira_token = st.text_input(
        "Jira API Token",
        type="password",
        placeholder="Enter Jira API Token"
    ).strip()

    project_key = st.text_input(
        "Project Key",
        placeholder="e.g. LCBM"
    ).strip().upper()

    fetch_btn = st.button("Fetch / Refresh", type="primary", use_container_width=True)

    st.markdown("---")
    st.caption(f"Server: `{jira_url}`")

if not jira_url or not jira_email or not jira_token or not project_key:
    st.info("Enter Jira credentials and Project Key")
    st.stop()

AUTH = HTTPBasicAuth(jira_email, jira_token)
if not project_key:
    st.markdown("## 👋 Welcome to Jira Dashboard\nEnter a **Project Key** in the sidebar and click **Fetch / Refresh**.")
    st.stop()

with st.spinner(f"Fetching issues for **{project_key}**…"):
    issues = fetch_all_issues(project_key, jira_url, AUTH)
    st.sidebar.success(f"Fetched total issues: {len(issues)}")

if not issues:
    st.warning(f"No issues found for project `{project_key}`.")
    st.stop()

d = process_issues(issues)

# ── TOP PROJECT SUMMARY ─────────────────────────────────────────────────────

f_total = len(d["rows"])
f_done = sum(1 for r in d["rows"] if r["Status"].lower() in DONE_STATUSES)

start_str = d["earliest_created"].strftime("%b %d, %Y") if d["earliest_created"] else "N/A"
end_date = d["latest_due"] or d["latest_updated"]
end_str = end_date.strftime("%b %d, %Y") if end_date else "N/A"
pct_done = round(f_done / f_total * 100, 1) if f_total else 0

st.markdown(f'''
<div style="
background:#ffffff;
padding:18px 24px;
border-radius:12px;
border:1px solid #e6e6e6;
box-shadow:0 2px 6px rgba(0,0,0,0.05);
margin-bottom:20px;">
<h3 style="margin:0 0 14px 0;">📌 Project Summary</h3>

<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">

<div><div style="font-size:12px;color:#777">Project Progress</div>
<div style="font-size:28px;font-weight:700;color:#34a853">{pct_done}%</div></div>

<div><div style="font-size:12px;color:#777">Total Issues</div>
<div style="font-size:28px;font-weight:700">{f_total}</div></div>

<div><div style="font-size:12px;color:#777">Completed</div>
<div style="font-size:28px;font-weight:700;color:#34a853">{f_done}</div></div>

<div><div style="font-size:12px;color:#777">Planned Effort</div>
<div style="font-size:28px;font-weight:700">{d.get("planned_effort_days",0)} d</div></div>

<div><div style="font-size:12px;color:#777">Completed Effort</div>
<div style="font-size:28px;font-weight:700;color:#34a853">{d.get("completed_effort_days",0)} d</div></div>

<div><div style="font-size:12px;color:#777">In Progress</div>
<div style="font-size:28px;font-weight:700;color:#f57c00">{d.get("inprogress_effort_days",0)} d</div></div>

</div>

<div style="margin-top:12px;font-size:13px;color:#666">
📅 {start_str} → {end_str}
</div>
</div>
''', unsafe_allow_html=True)


# ── Filters in sidebar ────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("### Filters")
    sel_status   = st.multiselect("Status",   sorted(d["status_counter"].keys()),   default=list(d["status_counter"].keys()))
    sel_assignee = st.multiselect("Assignee", sorted(d["assignee_counter"].keys()), default=list(d["assignee_counter"].keys()))
    sel_type     = st.multiselect("Type",     sorted(d["type_counter"].keys()),     default=list(d["type_counter"].keys()))

filtered_rows = [
    r for r in d["rows"]
    if r["Status"] in sel_status
    and r["Assignee"] in sel_assignee
    and r["Type"] in sel_type
]
f_total = len(filtered_rows)
f_done  = sum(1 for r in filtered_rows if r["Status"].lower() in DONE_STATUSES)

# ── Tabs ──────────────────────────────────────────────────────────────────────

st.markdown(f"### 📋 [{project_key}] Project Dashboard")
tab_summary, tab_gantt, tab_issues = st.tabs(["📊 Summary", "📅 Gantt / Timeline", "🗂 Issues"])


# ════════════════════════════════════════════════════════
#  TAB 1 — SUMMARY
# ════════════════════════════════════════════════════════

with tab_summary:

    # ── KPI cards ─────────────────────────────────────────
    k1, k2, k3, k4 = st.columns(4)

    def kpi(col, icon, value, label, colour="#1a73e8"):
        col.markdown(f"""
        <div class="kpi-card">
            <span class="kpi-icon">{icon}</span>
            <div class="kpi-value" style="color:{colour}">{value}</div>
            <div class="kpi-label">{label}</div>
        </div>""", unsafe_allow_html=True)

    kpi(k1, "✅", d["completed_7d"], "completed<br>in the last 7 days", "#34a853")
    kpi(k2, "✏️", d["updated_7d"],   "updated<br>in the last 7 days",   "#1a73e8")
    kpi(k3, "🆕", d["created_7d"],   "created<br>in the last 7 days",   "#ff6d00")
    kpi(k4, "⏰", d["due_soon_7d"],  "due soon<br>in the next 7 days",  "#ea4335")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Row: Status overview + Recent activity ────────────
    col_status, col_activity = st.columns([1, 1], gap="medium")

    with col_status:
        st.markdown('<div class="section-card">', unsafe_allow_html=True)
        st.markdown('<div class="section-title">Status overview</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">A snapshot of the status of your work items.</div>', unsafe_allow_html=True)

        status_f = Counter(r["Status"] for r in filtered_rows)
        labels   = list(status_f.keys())
        values   = list(status_f.values())

        STATUS_COLOURS = {
            "To Do":       "#8bc34a",
            "In Progress": "#2196f3",
            "Done":        "#9c27b0",
            "Closed":      "#607d8b",
            "Resolved":    "#00bcd4",
        }
        colours = [STATUS_COLOURS.get(l, "#bdbdbd") for l in labels]

        fig_donut = go.Figure(go.Pie(
            labels=labels,
            values=values,
            hole=0.65,
            marker_colors=colours,
            textinfo="none",
        ))
        fig_donut.update_layout(
            annotations=[dict(
                text=f"<b>{f_total}</b><br><span style='font-size:11px'>Total work item...</span>",
                x=0.5, y=0.5, font_size=16, showarrow=False
            )],
            showlegend=True,
            legend=dict(orientation="v", x=1, y=0.5),
            margin=dict(t=10, b=10, l=10, r=10),
            height=260,
        )
        st.plotly_chart(fig_donut, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with col_activity:
        st.markdown('<div class="section-card">', unsafe_allow_html=True)
        st.markdown('<div class="section-title">Recent activity</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">Stay up to date with what\'s happening across the project.</div>', unsafe_allow_html=True)

        activity = d["activity"]
        if not activity:
            st.caption("No recent activity in the last 7 days.")
        else:
            # Group by day
            shown, last_day = 0, None
            for act in activity[:20]:
                day_label = act["dt"].astimezone(timezone.utc).strftime("%Y-%m-%d")
                today_str = NOW.strftime("%Y-%m-%d")
                yest_str  = (NOW - timedelta(days=1)).strftime("%Y-%m-%d")

                if day_label != last_day:
                    label = "Today" if day_label == today_str else ("Yesterday" if day_label == yest_str else day_label)
                    st.markdown(f"**{label}**")
                    last_day = day_label

                badge = f'<span class="badge">{act["status"]}</span>'
                st.markdown(
                    f'<div class="activity-item">'
                    f'<b>{act["author"]}</b> updated field <i>"{act["field"]}"</i> on '
                    f'<b>{act["key"]}</b>: {act["summary"][:35]}… {badge}'
                    f'<div class="activity-time">{time_ago(act["dt"])}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
                shown += 1
                if shown >= 8:
                    break

        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Row: Priority breakdown + Types of work ───────────
    col_pri, col_types = st.columns([1, 1], gap="medium")

    with col_pri:
        st.markdown('<div class="section-card">', unsafe_allow_html=True)
        st.markdown('<div class="section-title">Priority breakdown</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">A holistic view of how work is being prioritised.</div>', unsafe_allow_html=True)

        pri_f = Counter(r["Priority"] for r in filtered_rows)
        order = ["Highest", "High", "Medium", "Low", "Lowest", "None"]
        pri_sorted = {k: pri_f[k] for k in order if k in pri_f}

        PRI_COLOURS = {
            "Highest": "#d32f2f",
            "High":    "#f57c00",
            "Medium":  "#9e9e9e",
            "Low":     "#9e9e9e",
            "Lowest":  "#9e9e9e",
            "None":    "#bdbdbd",
        }
        fig_pri = go.Figure(go.Bar(
            x=list(pri_sorted.keys()),
            y=list(pri_sorted.values()),
            marker_color=[PRI_COLOURS.get(k, "#9e9e9e") for k in pri_sorted],
            text=list(pri_sorted.values()),
            textposition="outside",
        ))
        fig_pri.update_layout(
            margin=dict(t=10, b=10, l=0, r=0),
            height=240,
            xaxis=dict(title=""),
            yaxis=dict(title="", showgrid=True, gridcolor="#f0f0f0"),
            plot_bgcolor="white",
        )
        st.plotly_chart(fig_pri, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)

    with col_types:
        st.markdown('<div class="section-card">', unsafe_allow_html=True)
        st.markdown('<div class="section-title">Types of work</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">A breakdown of work items by their types.</div>', unsafe_allow_html=True)

        type_f = Counter(r["Type"] for r in filtered_rows)
        total_t = sum(type_f.values()) or 1

        type_icons = {"Workstream": "🔗", "Task": "☑️", "Sub-task": "🔹", "Bug": "🐛", "Story": "📖", "Epic": "⚡"}

        st.markdown(
            "<div style='display:flex;font-size:12px;font-weight:600;color:#888;margin-bottom:8px'>"
            "<span style='flex:1'>Type</span><span style='flex:2'>Distribution</span></div>",
            unsafe_allow_html=True,
        )
        for tname, count in type_f.most_common():
            pct = int(count / total_t * 100)
            icon = type_icons.get(tname, "📌")
            st.markdown(f"""
            <div class="dist-row">
                <div class="dist-label">{icon} {tname}</div>
                <div class="dist-bar-bg">
                    <div class="dist-bar-fill" style="width:{max(pct,4)}%">{pct}%</div>
                </div>
            </div>""", unsafe_allow_html=True)

        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Row: Team workload ────────────────────────────────
    col_team, col_spacer = st.columns([1, 1], gap="medium")

    with col_team:
        st.markdown('<div class="section-card">', unsafe_allow_html=True)
        st.markdown('<div class="section-title">Team workload</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">Monitor the capacity of your team.</div>', unsafe_allow_html=True)

        assignee_f = Counter(r["Assignee"] for r in filtered_rows)
        total_a    = sum(assignee_f.values()) or 1

        st.markdown(
            "<div style='display:flex;font-size:12px;font-weight:600;color:#888;margin-bottom:8px'>"
            "<span style='flex:1'>Assignee</span><span style='flex:2'>Work distribution</span></div>",
            unsafe_allow_html=True,
        )

        ASSIGNEE_COLOURS = ["#4a90d9", "#7b68ee", "#34a853", "#ff6d00", "#ea4335", "#00bcd4"]
        for i, (aname, count) in enumerate(assignee_f.most_common()):
            pct   = int(count / total_a * 100)
            colour = ASSIGNEE_COLOURS[i % len(ASSIGNEE_COLOURS)]
            initials = "".join(w[0].upper() for w in aname.split()[:2]) if aname != "Unassigned" else "?"
            avatar = (
                f'<span style="background:{colour};color:white;border-radius:50%;'
                f'width:24px;height:24px;display:inline-flex;align-items:center;'
                f'justify-content:center;font-size:10px;font-weight:700">{initials}</span>'
            )
            st.markdown(f"""
            <div class="dist-row">
                <div class="dist-label" style="display:flex;align-items:center;gap:6px">
                    {avatar} <span style="font-size:13px">{aname[:18]}</span>
                </div>
                <div class="dist-bar-bg">
                    <div class="dist-bar-fill" style="width:{max(pct,4)}%;background:{colour}">{pct}%</div>
                </div>
            </div>""", unsafe_allow_html=True)

        st.markdown('</div>', unsafe_allow_html=True)

    with col_spacer:
        start_str = d["earliest_created"].strftime("%b %d, %Y") if d["earliest_created"] else "N/A"
        end_date  = d["latest_due"] or d["latest_updated"]
        end_str   = end_date.strftime("%b %d, %Y") if end_date else "N/A"
        pct_done  = round(f_done / f_total * 100, 1) if f_total else 0

        st.markdown(f"""
        <div class="section-card">
            <div class="section-title">📌 Project Summary</div>
            <div class="section-sub">Jira progress and effort overview</div>
            <table style="width:100%;font-size:13px;border-collapse:collapse">
                <tr style="border-bottom:1px solid #f0f0f0">
                    <td style="padding:8px 0;color:#777">📅 Start Date</td>
                    <td style="text-align:right;font-weight:600">{start_str}</td>
                </tr>
                <tr style="border-bottom:1px solid #f0f0f0">
                    <td style="padding:8px 0;color:#777">🏁 End Date</td>
                    <td style="text-align:right;font-weight:600">{end_str}</td>
                </tr>
                <tr style="border-bottom:1px solid #f0f0f0">
                    <td style="padding:8px 0;color:#777">📊 Task Completion</td>
                    <td style="text-align:right;font-weight:700;color:#34a853">{pct_done}%</td>
                </tr>
                <tr style="border-bottom:1px solid #f0f0f0">
                    <td style="padding:8px 0;color:#777">🗓 Total Effort</td>
                    <td style="text-align:right;font-weight:600">{d['total_effort_days']} days</td>
                </tr>
                <tr style="border-bottom:1px solid #f0f0f0">
                    <td style="padding:8px 0;color:#777">📋 Planned</td>
                    <td style="text-align:right;font-weight:600">{d['planned_effort_days']} days</td>
                </tr>
                <tr style="border-bottom:1px solid #f0f0f0">
                    <td style="padding:8px 0;color:#777">✅ Completed</td>
                    <td style="text-align:right;font-weight:600;color:#34a853">{d['completed_effort_days']} days</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;color:#777">🔄 In Progress</td>
                    <td style="text-align:right;font-weight:600;color:#f57c00">{d['inprogress_effort_days']} days</td>
                </tr>
            </table>
        </div>
        """, unsafe_allow_html=True)

# ════════════════════════════════════════════════════════
#  TAB 2 — GANTT / TIMELINE
# ════════════════════════════════════════════════════════

with tab_gantt:
    st.markdown("### 📅 Project Timeline (Gantt Chart)")

    gantt_rows = [
        r for r in filtered_rows
        if r["Start"] and r["End"] and r["Start"] <= r["End"]
    ]

    if not gantt_rows:
        st.info(
            "Not enough date data to render a Gantt chart. "
            "Issues need a **Start Date** (or created date) and a **Due Date**."
        )
    else:
        color_by = st.selectbox("Colour by", ["Status", "Assignee", "Type", "Priority"], index=0)

        def to_utc_naive(dt: datetime) -> datetime:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)

        gantt_records = [
            {
                "Task":     f"{r['Key']}: {r['Summary'][:45]}…" if len(r['Summary']) > 45 else f"{r['Key']}: {r['Summary']}",
                "Key":      r["Key"],
                "Start":    to_utc_naive(r["Start"]),
                "End":      to_utc_naive(r["End"]),
                "Status":   r["Status"],
                "Assignee": r["Assignee"],
                "Type":     r["Type"],
                "Priority": r["Priority"],
            }
            for r in gantt_rows
        ]

        gantt_df = pd.DataFrame(gantt_records)
        gantt_df["Start"] = pd.to_datetime(gantt_df["Start"])
        gantt_df["End"]   = pd.to_datetime(gantt_df["End"])

        fig_gantt = px.timeline(
            gantt_df,
            x_start="Start",
            x_end="End",
            y="Task",
            color=color_by,
            hover_data=["Key", "Status", "Assignee", "Priority"],
            color_discrete_sequence=px.colors.qualitative.Set2,
        )
        fig_gantt.update_yaxes(autorange="reversed")
        today_str = NOW.astimezone(timezone.utc).replace(tzinfo=None).strftime("%Y-%m-%d %H:%M:%S")
        fig_gantt.add_shape(
            type="line",
            x0=today_str, x1=today_str,
            y0=0, y1=1,
            yref="paper",
            line=dict(color="red", dash="dash", width=2),
        )
        fig_gantt.add_annotation(
            x=today_str, y=1, yref="paper",
            text="Today", showarrow=False,
            font=dict(color="red", size=12),
            xanchor="left", yanchor="bottom",
        )
        proj_start = to_utc_naive(d["earliest_created"]) if d["earliest_created"] else gantt_df["Start"].min()
        proj_end   = to_utc_naive(d["latest_due"] or d["latest_updated"]) if (d["latest_due"] or d["latest_updated"]) else gantt_df["End"].max()

        fig_gantt.update_layout(
            height=max(400, len(gantt_df) * 32 + 80),
            margin=dict(l=10, r=10, t=30, b=10),
            xaxis_title="",
            yaxis_title="",
            legend=dict(orientation="h", y=-0.08),
            plot_bgcolor="white",
            xaxis=dict(
                showgrid=True,
                gridcolor="#f0f0f0",
                range=[
                    proj_start.strftime("%Y-%m-%d"),
                    proj_end.strftime("%Y-%m-%d"),
                ],
            ),
        )
        st.plotly_chart(fig_gantt, use_container_width=True)

        issues_no_dates = len(filtered_rows) - len(gantt_rows)
        if issues_no_dates:
            st.caption(f"ℹ️ {issues_no_dates} issue(s) hidden — missing start or due date.")


# ════════════════════════════════════════════════════════
#  TAB 3 — ISSUES TABLE
# ════════════════════════════════════════════════════════

with tab_issues:
    st.markdown("### 🗂 All Issues")

    search = st.text_input("🔍 Search by key or summary", placeholder="Type to filter…")
    table  = filtered_rows
    if search:
        s     = search.lower()
        table = [r for r in filtered_rows if s in r["Key"].lower() or s in r["Summary"].lower()]

    display_cols = ["Key", "Summary", "Type", "Status", "Priority", "Assignee", "Created", "Due Date"]
    st.dataframe(
        [{k: r[k] for k in display_cols} for r in table],
        use_container_width=True,
        hide_index=True,
    )
    st.caption(f"Showing {len(table)} of {f_total} issues")
