"""
Export utilities: formatted Excel report and print-ready HTML (→ PDF via browser).
"""

import io
import datetime as _dt
from datetime import date

import pandas as pd


def _to_str_col(series: pd.Series) -> pd.Series:
    """Stringify a date/datetime Series, replacing any null-like with ''."""
    def _fmt(v):
        if v is None or v is pd.NaT:
            return ""
        try:
            if pd.isnull(v):
                return ""
        except Exception:
            pass
        try:
            return v.strftime("%Y-%m-%d")
        except Exception:
            return str(v)[:10] if str(v) not in ("NaT", "None", "nan") else ""
    return series.apply(_fmt)


def _safe_df(df: pd.DataFrame) -> list:
    """
    Return df as a plain Python list-of-lists with every date/null made safe.
    All datetime64 and object columns containing date-like values are converted
    to ISO strings so xlsxwriter never receives a NaT or datetime object.
    """
    df = df.copy()
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime("%Y-%m-%d").fillna("").replace("NaT", "")
        elif df[col].dtype == object:
            sample = df[col].dropna()
            if not sample.empty and isinstance(sample.iloc[0], (_dt.date, _dt.datetime, pd.Timestamp)):
                df[col] = _to_str_col(df[col])
            else:
                # Catch any stray NaT/NaN in object columns
                df[col] = df[col].apply(
                    lambda v: "" if (v is None or v is pd.NaT) else
                              _to_str_col(pd.Series([v])).iloc[0]
                              if isinstance(v, (_dt.date, _dt.datetime, pd.Timestamp))
                              else ("" if isinstance(v, float) and (v != v) else v)
                )
    return df.values.tolist()


def export_excel(df_projects: pd.DataFrame, df_non_auto: pd.DataFrame,
                 df_plan: pd.DataFrame, df_completion: pd.DataFrame) -> bytes:
    import xlsxwriter as _xl

    buf = io.BytesIO()
    wb  = _xl.Workbook(buf, {"nan_inf_to_errors": True, "in_memory": True})

    hdr  = wb.add_format({"bold":True,"font_color":"#ffffff","bg_color":"#0a3690",
                           "border":1,"font_name":"Arial","font_size":10,"valign":"vcenter"})
    cell = wb.add_format({"border":1,"font_name":"Arial","font_size":9})
    alt  = wb.add_format({"border":1,"bg_color":"#ebf4fb","font_name":"Arial","font_size":9})
    title= wb.add_format({"bold":True,"font_size":14,"font_color":"#0a3690","font_name":"Arial"})
    sub  = wb.add_format({"italic":True,"font_size":9,"font_color":"#6c86bc","font_name":"Arial"})

    def write_sheet(df: pd.DataFrame, name: str, widths: list) -> None:
        ws = wb.add_worksheet(name)
        ws.write(0, 0, f"Polaris Grids — {name}", title)
        ws.write(1, 0, f"Generated: {date.today().isoformat()}", sub)
        for ci, w in enumerate(widths):
            ws.set_column(ci, ci, w)
        cols = list(df.columns)
        for ci, col in enumerate(cols):
            ws.write(2, ci, str(col), hdr)
        for ri, row_vals in enumerate(_safe_df(df), 3):
            fmt = alt if ri % 2 == 0 else cell
            for ci, val in enumerate(row_vals):
                try:
                    ws.write(ri, ci, val, fmt)
                except Exception:
                    try:
                        safe = "" if (val is None or val is pd.NaT) else str(val)[:30]
                        if safe in ("NaT", "nan", "None"):
                            safe = ""
                        ws.write_string(ri, ci, safe, fmt)
                    except Exception:
                        ws.write_string(ri, ci, "", fmt)

    proj_cols = ["name","total_cases","automatable","non_automatable","automated",
                 "pending","coverage_pct","status","priority","start_date","target_date","notes"]
    avail = [c for c in proj_cols if c in df_projects.columns]
    write_sheet(df_projects[avail], "Projects Summary", [24,12,12,16,12,12,12,14,10,12,12,40])

    if not df_non_auto.empty:
        write_sheet(df_non_auto, "Non-Automatable", [14,24,10,40,20])

    if not df_plan.empty:
        write_sheet(df_plan, "Day-by-Day Plan", [14,12,30,14,14,14,20,30,14])

    if not df_completion.empty:
        write_sheet(df_completion, "Completion Plan", [14,24,12,12,12,10,12,20,16])

    wb.close()
    return buf.getvalue()


def export_pdf_html(df_projects: pd.DataFrame, df_non_auto: pd.DataFrame,
                    df_plan: pd.DataFrame) -> str:
    today = date.today().isoformat()

    # Projects table rows
    proj_rows = ""
    for _, r in df_projects.iterrows():
        cov   = float(r.get("coverage_pct", 0))
        color = "#02c9a8" if cov >= 80 else ("#37aafe" if cov >= 40 else "#f6ad55")
        proj_rows += f"""
        <tr>
          <td><b>{r['name']}</b></td>
          <td>{int(r['total_cases']):,}</td>
          <td>{int(r.get('automatable', r['total_cases'])):,}</td>
          <td>{int(r.get('non_automatable',0)):,}</td>
          <td>{int(r['automated']):,}</td>
          <td>{int(r.get('pending',0)):,}</td>
          <td>
            <div style="background:#ebf4fb;border-radius:25px;height:10px">
              <div style="background:{color};border-radius:25px;height:10px;width:{min(cov,100):.0f}%"></div>
            </div>
            <small>{cov:.1f}%</small>
          </td>
          <td>{r.get('target_date','')}</td>
          <td>{r.get('status','')}</td>
        </tr>"""

    # Non-auto rows
    na_rows = ""
    for _, r in df_non_auto.iterrows():
        na_rows += f"<tr><td>{r.get('project_id','')}</td><td>{r.get('module','')}</td><td>{int(r.get('count',0))}</td><td>{r.get('reason','')}</td><td>{r.get('approach','')}</td></tr>"

    # Plan rows (first 20)
    plan_rows = ""
    for _, r in df_plan.head(20).iterrows():
        plan_rows += f"<tr><td>{r.get('date','')}</td><td>{r.get('project_id','')}</td><td>{r.get('module','')}</td><td>{int(r.get('planned_cases',0))}</td><td>{int(r.get('actual_cases',0))}</td><td>{r.get('assigned_to','')}</td><td>{r.get('status','')}</td></tr>"

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Automation Report — {today}</title>
<style>
  @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,700,900&display=swap');
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'Satoshi',Arial,sans-serif;color:#464e5f;background:#f7fafc;padding:32px}}
  .cover{{background:linear-gradient(238deg,#0a3690 0%,#1645a4 100%);color:white;border-radius:12px;padding:36px;margin-bottom:28px}}
  .cover h1{{font-size:28px;font-weight:900;letter-spacing:-0.44px}}
  .cover p{{font-size:14px;opacity:.8;margin-top:6px}}
  .kpi-row{{display:flex;gap:14px;margin-bottom:24px}}
  .kpi{{flex:1;background:white;border-radius:10px;padding:18px 22px;border:1px solid rgba(96,173,245,.3)}}
  .kpi-label{{font-size:11px;font-weight:500;color:#6c86bc;text-transform:uppercase;letter-spacing:.8px}}
  .kpi-value{{font-size:28px;font-weight:900;color:#0a3690;margin-top:4px}}
  h2{{font-size:18px;font-weight:700;color:#0a3690;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid rgba(96,173,245,.3)}}
  table{{width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;font-size:12px;margin-bottom:24px}}
  thead tr{{background:#0a3690;color:white}}
  th{{padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px}}
  td{{padding:9px 12px;border-bottom:1px solid rgba(96,173,245,.15)}}
  tr:nth-child(even) td{{background:#f7fafc}}
  .footer{{margin-top:32px;font-size:11px;color:#6c86bc;text-align:center}}
  @media print{{body{{padding:16px}}.cover{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}thead tr{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}}}
</style></head><body>
  <div class="cover">
    <h1>🤖 Automation Status Report</h1>
    <p>Polaris Grids — Automation Status| {today}</p>
  </div>
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Total Cases</div><div class="kpi-value">{int(df_projects['total_cases'].sum()):,}</div></div>
    <div class="kpi"><div class="kpi-label">Automatable</div><div class="kpi-value">{int(df_projects.get('automatable',df_projects['total_cases']).sum()):,}</div></div>
    <div class="kpi"><div class="kpi-label">Automated</div><div class="kpi-value">{int(df_projects['automated'].sum()):,}</div></div>
    <div class="kpi"><div class="kpi-label">Projects</div><div class="kpi-value">{len(df_projects)}</div></div>
  </div>
  <h2>Project Summary</h2>
  <table><thead><tr><th>Project</th><th>Total</th><th>Automatable</th><th>Non-Auto</th><th>Automated</th><th>Pending</th><th>Coverage</th><th>Target</th><th>Status</th></tr></thead>
  <tbody>{proj_rows}</tbody></table>
  <h2>Non-Automatable Test Cases</h2>
  <table><thead><tr><th>Project</th><th>Module</th><th>Count</th><th>Reason</th><th>Approach</th></tr></thead>
  <tbody>{na_rows}</tbody></table>
  <h2>Day-by-Day Automation Plan (first 20 entries)</h2>
  <table><thead><tr><th>Date</th><th>Project</th><th>Module</th><th>Planned</th><th>Actual</th><th>Assigned To</th><th>Status</th></tr></thead>
  <tbody>{plan_rows}</tbody></table>
  <div class="footer">Polaris Grids Automation Dashboard · {today} · Confidential</div>
</body></html>"""
