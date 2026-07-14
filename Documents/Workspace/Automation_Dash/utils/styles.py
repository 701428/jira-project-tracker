"""
Polaris Grids Design Token CSS injection for Streamlit.
All values sourced from polarisgrids_design_tokens.md.
"""

import streamlit as st


COLORS = {
    "primary_dark":  "#0a3690",
    "primary":       "#1645a4",
    "primary_mid":   "#144bbd",
    "link":          "#3959ff",
    "accent_blue":   "#37aafe",
    "accent_teal":   "#02c9a8",
    "accent_cyan":   "#11abbe",
    "accent_purple": "#6573f2",
    "light_purple":  "#b5bfff",
    "lavender":      "#abc7ff",
    "body_text":     "#464e5f",
    "muted_blue":    "#384c77",
    "soft_blue":     "#6c86bc",
    "bg_light":      "#f7fafc",
    "bg_blue":       "#ebf4fb",
    "bg_dark":       "#032c7e",
    "white":         "#ffffff",
    "danger":        "#e53e3e",
    "warning":       "#f6ad55",
    "success":       "#02c9a8",
    "border":        "rgba(96,173,245,0.3)",
}

DARK_COLORS = {
    "bg_light":  "#0d1b3e",
    "bg_blue":   "#0f2152",
    "bg_dark":   "#060e24",
    "white":     "#e8eef8",
    "body_text": "#c8d4f0",
    "soft_blue": "#8da4d4",
    "border":    "rgba(55,170,254,0.2)",
}


def sidebar_logo(dark_mode: bool = False) -> None:
    """Pin the Polaris Grids logo to the very top of the sidebar using st.logo()."""
    from pathlib import Path
    static = Path(__file__).parent.parent / "static"
    light_logo = static / "logo-dark.svg"   # navy — for light sidebar
    dark_logo  = static / "logo.svg"         # white — for dark sidebar
    if not light_logo.exists():
        return
    # st.logo() places the image above the page-nav links
    try:
        st.logo(
            str(light_logo),
            icon_image=str(dark_logo if dark_mode else light_logo),
        )
    except Exception:
        pass  # older Streamlit versions may not support st.logo()


def inject_css(dark_mode: bool = False) -> None:
    bg        = DARK_COLORS["bg_light"]  if dark_mode else COLORS["bg_light"]
    card_bg   = DARK_COLORS["bg_blue"]   if dark_mode else COLORS["white"]
    card_alt  = DARK_COLORS["bg_dark"]   if dark_mode else COLORS["bg_blue"]
    text      = DARK_COLORS["body_text"] if dark_mode else COLORS["body_text"]
    soft      = DARK_COLORS["soft_blue"] if dark_mode else COLORS["soft_blue"]
    border    = DARK_COLORS["border"]    if dark_mode else COLORS["border"]

    st.markdown(
        '<link href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap" rel="stylesheet">',
        unsafe_allow_html=True,
    )
    st.markdown("""
<style>
/* Stack logo and subtitle vertically, no extra gap */
[data-testid="stSidebarHeader"] {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0 !important;
    padding-bottom: 2px !important;
    padding-top: 0.75rem !important;
}
[data-testid="stSidebarNav"] {
    padding-top: 0 !important;
    margin-top: 0 !important;
}
[data-testid="stSidebarHeader"]::after {
    content: "Automation Dashboard";
    display: block;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #6c86bc;
    padding: 0 0 4px 2px;
    margin-top: -2px;
}
/* Keep collapse button at top-right */
[data-testid="stSidebarHeader"] button {
    position: absolute;
    right: 0.75rem;
    top: 0.75rem;
}
</style>
""", unsafe_allow_html=True)


def page_header(title: str, subtitle: str = "", icon: str = "") -> None:
    prefix = f"{icon} " if icon else ""
    st.title(f"{prefix}{title}")
    if subtitle:
        st.caption(subtitle)
    st.divider()


def section_title(text: str) -> None:
    st.subheader(text)


def badge(text: str, variant: str = "blue") -> str:
    return f'<span class="badge badge-{variant}">{text}</span>'


def status_badge(status: str) -> str:
    mapping = {
        "Completed":   ("green",  "Completed"),
        "In Progress": ("blue",   "In Progress"),
        "Not Started": ("grey",   "Not Started"),
        "At Risk":     ("orange", "At Risk"),
        "Delayed":     ("red",    "Delayed"),
    }
    variant, label = mapping.get(status, ("grey", status))
    return badge(label, variant)
