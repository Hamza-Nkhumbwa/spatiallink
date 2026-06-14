import { useState, useEffect, useRef, useCallback } from "react";

// ─── Mobile detection hook ────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ─── UTM Zone 36S → WGS84 LatLng ─────────────────────────────────────────────
// Proper Helmert / Bowring method for UTM Zone 36S
function utmToLatLng(easting, northing) {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const b = a * (1 - f);
  const e2 = 2 * f - f * f;
  const ep2 = e2 / (1 - e2);
  const k0 = 0.9996;
  const E0 = 500000;
  const N0 = 10000000; // Southern hemisphere false northing
  const lon0 = (36 - 1) * 6 - 180 + 3; // Zone 36 central meridian = 33°E

  const x = easting - E0;
  const y = northing - N0; // subtract false northing for southern hemisphere

  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu)
    + (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * mu);

  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
  const T1 = Math.tan(phi1) * Math.tan(phi1);
  const C1 = ep2 * Math.cos(phi1) * Math.cos(phi1);
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
  const D = x / (N1 * k0);

  const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
    D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D * D * D * D / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D * D * D * D * D * D / 720
  );

  const lon = lon0 * Math.PI / 180 + (
    D
    - (1 + 2 * T1 + C1) * D * D * D / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D * D * D * D * D / 120
  ) / Math.cos(phi1);

  return [lat * 180 / Math.PI, lon * 180 / Math.PI];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FARM_URLS = {
  "Farm 61": "https://hamza-nkhumbwa.github.io/galanwra/Farm61.geojson",
  "Farm 62": "https://hamza-nkhumbwa.github.io/galanwra/Farm62.geojson",
  "Farm 71": "https://hamza-nkhumbwa.github.io/galanwra/Farm71.geojson",
  "Farm 72": "https://hamza-nkhumbwa.github.io/galanwra/Farm72.geojson",
};
const ACTIVITY_CSV  = "https://hamza-nkhumbwa.github.io/galanwra/Activity.csv";
const PIE_CSV       = "https://hamza-nkhumbwa.github.io/galanwra/PieChat.csv";
const BAR_CSV       = "https://hamza-nkhumbwa.github.io/galanwra/Bargraph.csv";
const WEEK_CSV      = "https://hamza-nkhumbwa.github.io/galanwra/Week.csv";
const VILLAGES_URL  = "https://hamza-nkhumbwa.github.io/galanwra/Alumendavillages.geojson";
const DAMS_URL      = "https://hamza-nkhumbwa.github.io/galanwra/damz.geojson";
const ROUTES_URL    = "https://hamza-nkhumbwa.github.io/galanwra/routes.geojson";

const LULC_TILES = {
  "2005": "https://earthengine.googleapis.com/v1/projects/ee-gis-021-20/maps/bc79a77a7f5ad3ea9eddf2e583589073-9ec320f08d69f18715ff2ab1c2bd1eb8/tiles/{z}/{x}/{y}",
  "2015": "https://earthengine.googleapis.com/v1/projects/ee-gis-021-20/maps/dc191c4dd5c74646c729f082068f87c0-9516c087ca356ee5058eec98f0f80423/tiles/{z}/{x}/{y}",
  "2025": "https://earthengine.googleapis.com/v1/projects/ee-gis-021-20/maps/4f4b200fa2f5da6cdab0277a5a823391-f817d5c30779e32090fdef96d7082d23/tiles/{z}/{x}/{y}",
};
const LULC_COLORS = [
  { color:"#3264d6", label:"Water" },
  { color:"#98ff00", label:"Cropland" },
  { color:"#fd7912", label:"Built-up" },
  { color:"#212020", label:"Bare Soil" },
  { color:"#8c8e8c", label:"Impervious" },
  { color:"#3af7ee", label:"Wetland" },
  { color:"#7e5937", label:"Soil" },
  { color:"#006600", label:"Forest" },
  { color:"#eded51", label:"Grassland" },
];

// Security-intelligence color palette
const C = {
  bg:        "#060b14",
  surface:   "#0b1120",
  surfaceEl: "#0f1a2e",
  border:    "rgba(30,80,160,0.22)",
  borderHi:  "rgba(30,80,160,0.5)",
  accent:    "#1a56db",
  accentLt:  "#4d8af0",
  threat:    "#dc2626",
  threatLt:  "#f87171",
  warning:   "#d97706",
  warningLt: "#fbbf24",
  safe:      "#16a34a",
  safeLt:    "#4ade80",
  neutral:   "#64748b",
  text:      "#cbd5e1",
  textDim:   "rgba(148,163,184,0.5)",
  textMuted: "rgba(148,163,184,0.28)",
};

const FARM_COLORS = {
  "Farm 61": "#1a56db",
  "Farm 62": "#16a34a",
  "Farm 71": "#d97706",
  "Farm 72": "#7c3aed",
};
const ACTIVITY_TYPES = ["Select All","Intruders","Sweepers","Fish-Mongers","Fuel Mongers","Others"];
const DOWNLOAD_PASSWORD = "WWJD2026";

const LAYERS = [
  { id:"Fields",               icon:"grid" },
  { id:"Activity",             icon:"alert-triangle", badge:"LIVE" },
  { id:"Villages",             icon:"home" },
  { id:"Transition Statistics",icon:"bar-chart-2" },
  { id:"LULC Maps",            icon:"layers" },
  { id:"Dams-Pumps",           icon:"droplet" },
  { id:"Buffer Distance",      icon:"circle" },
  { id:"Hotspot Fields",       icon:"thermometer" },
  { id:"Theft Routes",         icon:"navigation" },
];

// ─── SVG Icon System (no emoji) ───────────────────────────────────────────────
const ICONS = {
  "grid": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  "alert-triangle": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  "home": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  "bar-chart-2": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  "layers": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  "droplet": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
  "circle": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5" strokeDasharray="2 2"/></svg>,
  "thermometer": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/></svg>,
  "navigation": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
  "map": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  "download": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  "lock": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  "check": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>,
  "x": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  "sun": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  "moon": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  "pie-chart": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>,
  "bar-chart": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  "activity": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  "scatter": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="7" cy="17" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/></svg>,
  "external-link": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  "target": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  "crosshair": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>,
  "route": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
};

function Icon({ name, size = 14 }) {
  return (
    <span style={{ width: size, height: size, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      {ICONS[name] || ICONS["map"]}
    </span>
  );
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.replace(/^"|"$/g, "") ?? ""]));
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: {
    display:"flex", flexDirection:"column", height:"100vh",
    background:C.bg, fontFamily:"'IBM Plex Mono', 'Courier New', monospace",
    color:C.text, overflow:"hidden"
  },
  topbar: {
    height:48, background:C.surface, borderBottom:`1px solid ${C.border}`,
    display:"flex", alignItems:"center", padding:"0 16px", gap:12, flexShrink:0,
    boxShadow:"0 1px 0 rgba(30,80,160,0.15)"
  },
  logoMark: {
    width:28, height:28, background:`linear-gradient(135deg,${C.accent},#0b2045)`,
    borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center",
    border:`1px solid ${C.borderHi}`
  },
  logoText: { fontSize:13, fontWeight:700, color:"#fff", letterSpacing:"-0.5px" },
  logoSub: { fontSize:9, color:C.accentLt, letterSpacing:"2px", textTransform:"uppercase" },
  dividerV: { width:1, height:24, background:C.border },
  statusDot: {
    width:6, height:6, borderRadius:"50%", background:C.safeLt,
    boxShadow:`0 0 6px ${C.safe}`, animation:"blink 2s infinite"
  },
  statusText: { fontSize:10, color:C.textMuted, letterSpacing:"0.5px", textTransform:"uppercase" },
  body: { display:"flex", flex:1, overflow:"hidden" },
  sidebar: {
    width:210, background:C.surface, borderRight:`1px solid ${C.border}`,
    display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0
  },
  sidebarScroll: { flex:1, overflowY:"auto", padding:"6px 0" },
  sideLabel: {
    fontSize:9, letterSpacing:"2.5px", color:C.textMuted,
    padding:"14px 14px 5px", textTransform:"uppercase"
  },
  navItem: (active) => ({
    display:"flex", alignItems:"center", gap:9, padding:"8px 14px",
    cursor:"pointer", borderLeft:`2px solid ${active ? C.accent : "transparent"}`,
    background: active ? `rgba(26,86,219,0.12)` : "transparent",
    transition:"all 0.12s", userSelect:"none", position:"relative"
  }),
  navLabel: (active) => ({
    fontSize:11, color: active ? C.text : C.textDim,
    fontWeight: active ? 600 : 400, flex:1, letterSpacing:"0.2px"
  }),
  navBadge: {
    fontSize:8, padding:"1px 5px", borderRadius:2, fontWeight:700, letterSpacing:"0.5px",
    background:`rgba(220,38,38,0.18)`, color:C.threatLt,
    border:`0.5px solid rgba(220,38,38,0.35)`
  },
  mapPanel: { flex:1, position:"relative", overflow:"hidden" },
  rightPanel: {
    width:272, background:C.surface, borderLeft:`1px solid ${C.border}`,
    display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0
  },
  panelHeader: {
    padding:"10px 12px", borderBottom:`1px solid ${C.border}`,
    display:"flex", alignItems:"center", gap:7
  },
  panelTitle: { fontSize:10, fontWeight:700, color:C.accentLt, letterSpacing:"1.5px", textTransform:"uppercase" },
  panelBody: { flex:1, overflowY:"auto", padding:10 },
  section: {
    background:`rgba(15,26,46,0.6)`, border:`1px solid ${C.border}`,
    borderRadius:4, padding:10, marginBottom:8
  },
  sectionTitle: {
    fontSize:9, color:C.textMuted, letterSpacing:"2px",
    marginBottom:8, textTransform:"uppercase", fontWeight:600
  },
  select: {
    width:"100%", background:C.surfaceEl, border:`1px solid ${C.border}`,
    borderRadius:3, color:C.text, fontSize:11, padding:"6px 8px",
    marginBottom:6, outline:"none", cursor:"pointer",
    fontFamily:"inherit"
  },
  btn: (variant="default") => ({
    width:"100%", padding:"6px 10px", borderRadius:3, fontSize:10, fontWeight:600,
    cursor:"pointer", marginBottom:4, transition:"all 0.12s", letterSpacing:"0.5px",
    fontFamily:"inherit", textTransform:"uppercase",
    background:
      variant==="primary" ? C.accent :
      variant==="danger"  ? "rgba(220,38,38,0.14)" :
      variant==="success" ? "rgba(22,163,74,0.14)" :
      "rgba(255,255,255,0.04)",
    color:
      variant==="primary" ? "#fff" :
      variant==="danger"  ? C.threatLt :
      variant==="success" ? C.safeLt :
      C.textDim,
    border:
      variant==="primary" ? `1px solid ${C.accent}` :
      variant==="danger"  ? `1px solid rgba(220,38,38,0.3)` :
      variant==="success" ? `1px solid rgba(22,163,74,0.3)` :
      `1px solid ${C.border}`
  }),
  chip: (active, color = C.accent) => ({
    display:"inline-flex", alignItems:"center", gap:3, padding:"3px 8px",
    borderRadius:2, fontSize:9, cursor:"pointer", marginRight:3, marginBottom:3,
    border:`1px solid ${active ? color : C.border}`,
    background: active ? `${color}20` : "transparent",
    color: active ? color : C.textMuted, fontFamily:"inherit",
    textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600
  }),
  input: {
    width:"100%", background:C.surfaceEl, border:`1px solid ${C.border}`,
    borderRadius:3, color:C.text, fontSize:11, padding:"6px 8px",
    outline:"none", marginBottom:6, fontFamily:"inherit"
  },
  popup: {
    position:"absolute", background:C.surface,
    border:`1px solid ${C.borderHi}`, borderRadius:4, padding:12, zIndex:2000,
    minWidth:210, maxWidth:260, boxShadow:"0 12px 40px rgba(0,0,0,0.7)",
    fontSize:11, color:C.text
  },
  popupTitle: {
    fontSize:11, fontWeight:700, color:C.accentLt, marginBottom:8,
    paddingBottom:6, borderBottom:`1px solid ${C.border}`,
    letterSpacing:"0.5px", textTransform:"uppercase"
  },
  popupRow: { display:"flex", justifyContent:"space-between", marginBottom:3, gap:8 },
  popupKey: { color:C.textDim, flexShrink:0, fontSize:10 },
  popupVal: { color:C.text, textAlign:"right", wordBreak:"break-word", fontSize:10, fontWeight:500 },
  toast: {
    position:"fixed", bottom:18, right:18, background:C.surfaceEl,
    border:`1px solid ${C.borderHi}`, borderRadius:4, padding:"8px 14px",
    fontSize:11, color:C.accentLt, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.6)",
    letterSpacing:"0.3px"
  },
  slider: { width:"100%", accentColor:C.accent, marginBottom:4 },
  barContainer: { height:110, display:"flex", alignItems:"flex-end", gap:2, marginTop:6, overflow:"hidden" },
  barItem: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:1, minWidth:0 },
  barFill: (h, color) => ({
    width:"100%", height:h, background:color, borderRadius:"2px 2px 0 0", transition:"height 0.3s"
  }),
  barLabel: {
    fontSize:7, color:C.textMuted, writingMode:"vertical-lr",
    transform:"rotate(180deg)", maxHeight:36, overflow:"hidden", fontFamily:"inherit"
  },
  mapPlaceholder: {
    width:"100%", height:"100%", display:"flex", flexDirection:"column",
    alignItems:"center", justifyContent:"center", gap:10,
    background:`linear-gradient(135deg,${C.bg},${C.surface})`
  },
  // ── Mobile-specific ──
  mobileApp: {
    display:"flex", flexDirection:"column", height:"100vh",
    background:C.bg, fontFamily:"'IBM Plex Mono','Courier New',monospace",
    color:C.text, overflow:"hidden", position:"relative"
  },
  mobileTopbar: {
    height:50, background:C.surface, borderBottom:`1px solid ${C.border}`,
    display:"flex", alignItems:"center", padding:"0 12px", gap:10, flexShrink:0,
    boxShadow:"0 1px 0 rgba(30,80,160,0.15)"
  },
  mobileMapWrap: { flex:1, position:"relative", overflow:"hidden" },
  mobileSheet: (open) => ({
    position:"absolute", bottom:0, left:0, right:0, zIndex:900,
    background:C.surface, borderTop:`1px solid ${C.borderHi}`,
    borderRadius:"14px 14px 0 0",
    transform: open ? "translateY(0)" : "translateY(calc(100% - 48px))",
    transition:"transform 0.28s cubic-bezier(0.4,0,0.2,1)",
    maxHeight:"72vh", display:"flex", flexDirection:"column",
    boxShadow:"0 -4px 30px rgba(0,0,0,0.5)"
  }),
  sheetHandle: {
    height:48, display:"flex", alignItems:"center", justifyContent:"center",
    gap:8, cursor:"pointer", flexShrink:0, padding:"0 16px"
  },
  sheetHandleBar: {
    width:36, height:4, borderRadius:2, background:`rgba(148,163,184,0.3)`
  },
  sheetBody: { flex:1, overflowY:"auto", padding:"0 12px 12px" },
  mobileTabBar: {
    height:56, background:C.surface, borderTop:`1px solid ${C.border}`,
    display:"flex", alignItems:"stretch", flexShrink:0,
    boxShadow:"0 -1px 0 rgba(30,80,160,0.15)"
  },
  mobileTab: (active) => ({
    flex:1, display:"flex", flexDirection:"column", alignItems:"center",
    justifyContent:"center", gap:2, cursor:"pointer", padding:"4px 2px",
    borderTop:`2px solid ${active ? C.accent : "transparent"}`,
    background: active ? `rgba(26,86,219,0.08)` : "transparent",
    transition:"all 0.12s"
  }),
  mobileTabLabel: (active) => ({
    fontSize:8, color: active ? C.accentLt : C.textMuted,
    fontWeight: active ? 700 : 400, letterSpacing:"0.5px",
    textTransform:"uppercase", lineHeight:1
  }),
};

// ─── Leaflet Map ──────────────────────────────────────────────────────────────
function LeafletMap({ activeLayer, farmData, activityData, villageData, damData,
                      routeData, lulcVisible, lulcOpacity, bufferPoint, bufferRadius,
                      mapRef, onMapClick }) {
  const containerRef = useRef(null);
  const leafletRef   = useRef(null);
  const layersRef    = useRef({});
  const [popup, setPopup] = useState(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || leafletRef.current) return;
    const L = window.L;
    if (!L) return;
    const map = L.map(containerRef.current, { center:[-16.38205, 34.89256], zoom:14, zoomControl:false });
    L.control.zoom({ position:"bottomright" }).addTo(map);
    L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains:["mt0","mt1","mt2","mt3"], attribution:"© Google", maxZoom:21
    }).addTo(map);
    map.on("click", e => onMapClick && onMapClick(e.latlng));
    leafletRef.current = map;
    if (mapRef) mapRef.current = map;
    return () => { map.remove(); leafletRef.current = null; };
  }, []);

  // Farm GeoJSON
  useEffect(() => {
    const L = window.L, map = leafletRef.current;
    if (!L || !map) return;
    Object.values(layersRef.current.farms || {}).forEach(l => map.removeLayer(l));
    layersRef.current.farms = {};
    if (activeLayer !== "Fields" || !farmData.length) return;
    farmData.forEach(({ name, geojson }) => {
      const color = FARM_COLORS[name] || C.accent;
      const layer = L.geoJSON(geojson, {
        style: { color, weight:1.5, fillColor:color, fillOpacity:0.2, dashArray:null },
        onEachFeature: (feature, lyr) => {
          const p = feature.properties || {};
          const id = p.ID || p.id || "—";
          const area = p["Area(ha)"] || p.area || p.AREA || "—";
          lyr.on("click", () => setPopup({ type:"field", name, id, area }));
          lyr.on("mouseover", () => setPopup({ type:"field", name, id, area }));
        }
      }).addTo(map);
      layersRef.current.farms[name] = layer;
    });
    if (farmData.length) {
      try {
        const allLayers = Object.values(layersRef.current.farms);
        const group = L.featureGroup(allLayers);
        map.fitBounds(group.getBounds(), { padding:[30,30] });
      } catch(e){}
    }
  }, [farmData, activeLayer]);

  // Activity markers
  useEffect(() => {
    const L = window.L, map = leafletRef.current;
    if (!L || !map) return;
    (layersRef.current.activities || []).forEach(l => map.removeLayer(l));
    layersRef.current.activities = [];
    if (activeLayer !== "Activity" || !activityData.length) return;
    const markers = activityData.map(row => {
      const e = parseFloat(row.Eastings), n = parseFloat(row.Northings);
      if (isNaN(e) || isNaN(n)) return null;
      const [lat, lng] = utmToLatLng(e, n);
      if (lat < -25 || lat > 0 || lng < 25 || lng > 45) return null; // sanity check for Malawi region
      const isNight = (row["Day/Night"] || "").toLowerCase().includes("night");
      const isIntruder = (row.Activity || "").toLowerCase().includes("intrud");
      const col = isIntruder ? C.threat : isNight ? "#7c3aed" : C.warning;
      const icon = L.divIcon({
        html:`<div style="width:10px;height:10px;background:${col};border:1.5px solid ${isNight?"#a78bfa":isIntruder?C.threatLt:C.warningLt};border-radius:50%;box-shadow:0 0 8px ${col}80"></div>`,
        iconSize:[10,10], className:""
      });
      const fields = ["Farm","Field","Eastings","Northings","Crop/Feature","Crop Age","Activity","Date","Time","Day/Night","Frequency","Rate"];
      const m = L.marker([lat, lng], { icon }).addTo(map);
      m.on("click", () => setPopup({ type:"activity", data: fields.map(f => ({ key:f, val:row[f]||"—" })) }));
      return m;
    }).filter(Boolean);
    layersRef.current.activities = markers;
    if (markers.length) {
      try { map.fitBounds(L.featureGroup(markers).getBounds(), { padding:[40,40] }); } catch(e){}
    }
  }, [activityData, activeLayer]);

  // Village markers
  useEffect(() => {
    const L = window.L, map = leafletRef.current;
    if (!L || !map) return;
    (layersRef.current.villages || []).forEach(l => map.removeLayer(l));
    layersRef.current.villages = [];
    if (activeLayer !== "Villages" || !villageData?.features) return;
    const markers = villageData.features.map(f => {
      const p = f.properties;
      const e = parseFloat(p.UTMEAST), n = parseFloat(p.UTMNORTH);
      if (isNaN(e) || isNaN(n)) return null;
      const [lat, lng] = utmToLatLng(e, n);
      if (lat < -25 || lat > 0 || lng < 25 || lng > 45) return null;
      const icon = L.divIcon({
        html:`<div style="width:11px;height:11px;background:${C.accentLt};border:1.5px solid #fff;border-radius:2px;transform:rotate(45deg)"></div>`,
        iconSize:[11,11], iconAnchor:[5,5], className:""
      });
      const m = L.marker([lat, lng], { icon }).addTo(map);
      m.on("click", () => setPopup({ type:"village", data:[
        { key:"Name",     val:p.NAME     },
        { key:"TA",       val:p.TANAME   },
        { key:"District", val:p.DISTRICT },
        { key:"Easting",  val:p.UTMEAST  },
        { key:"Northing", val:p.UTMNORTH },
      ]}));
      return m;
    }).filter(Boolean);
    layersRef.current.villages = markers;
    if (markers.length) {
      try { map.fitBounds(L.featureGroup(markers).getBounds(), { padding:[40,40] }); } catch(e){}
    }
  }, [villageData, activeLayer]);

  // Dam markers — supports Point + Polygon + MultiPolygon centroids
  useEffect(() => {
    const L = window.L, map = leafletRef.current;
    if (!L || !map) return;
    (layersRef.current.dams || []).forEach(l => map.removeLayer(l));
    layersRef.current.dams = [];
    if (!damData?.features) return; // show dams regardless of active tab
    const markers = damData.features.map(f => {
      const geom = f.geometry;
      if (!geom) return null;
      let lat, lng;
      if (geom.type === "Point") {
        [lng, lat] = geom.coordinates;
      } else if (geom.type === "Polygon") {
        // centroid of outer ring
        const ring = geom.coordinates[0];
        lng = ring.reduce((s,c) => s + c[0], 0) / ring.length;
        lat = ring.reduce((s,c) => s + c[1], 0) / ring.length;
      } else if (geom.type === "MultiPolygon") {
        const ring = geom.coordinates[0][0];
        lng = ring.reduce((s,c) => s + c[0], 0) / ring.length;
        lat = ring.reduce((s,c) => s + c[1], 0) / ring.length;
      } else return null;

      // If coordinates look like UTM (large numbers), convert
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        const conv = utmToLatLng(lng, lat); // easting=lng col, northing=lat col in raw geojson x,y
        [lat, lng] = conv;
      }
      if (lat < -25 || lat > 0 || lng < 25 || lng > 45) return null;

      const icon = L.divIcon({
        html:`<div style="width:14px;height:14px;background:#1a56db;border:2px solid #4d8af0;border-radius:3px;display:flex;align-items:center;justify-content:center"></div>`,
        iconSize:[14,14], iconAnchor:[7,7], className:""
      });
      const p = f.properties;
      const m = L.marker([lat, lng], { icon }).addTo(map);
      m.on("click", () => setPopup({ type:"dam", id: p.ID || p.id || p.Name || p.name || "—" }));
      return m;
    }).filter(Boolean);
    layersRef.current.dams = markers;
    if (markers.length && activeLayer === "Dams-Pumps") {
      try { map.fitBounds(L.featureGroup(markers).getBounds(), { padding:[40,40] }); } catch(e){}
    }
  }, [damData, activeLayer]);

  // Routes layer
  useEffect(() => {
    const L = window.L, map = leafletRef.current;
    if (!L || !map) return;
    if (layersRef.current.routes) map.removeLayer(layersRef.current.routes);
    layersRef.current.routes = null;
    if (activeLayer !== "Theft Routes" || !routeData) return;
    layersRef.current.routes = L.geoJSON(routeData, {
      style: { color:C.threat, weight:2.5, dashArray:"8 4", opacity:0.9 }
    }).addTo(map);
  }, [routeData, activeLayer]);

  // LULC tile layers
  useEffect(() => {
    const L = window.L, map = leafletRef.current;
    if (!L || !map) return;
    Object.values(layersRef.current.lulc || {}).forEach(l => map.removeLayer(l));
    layersRef.current.lulc = {};
    if (activeLayer !== "LULC Maps") return;
    Object.entries(lulcVisible).forEach(([yr, vis]) => {
      if (!vis) return;
      layersRef.current.lulc[yr] = L.tileLayer(LULC_TILES[yr], {
        opacity: lulcOpacity[yr] || 0.85, maxZoom:18
      }).addTo(map);
    });
  }, [lulcVisible, lulcOpacity, activeLayer]);

  // Buffer circle — always draw when bufferPoint is set, regardless of tab
  useEffect(() => {
    const L = window.L, map = leafletRef.current;
    if (!L || !map) return;
    if (layersRef.current.bufferCircle) { map.removeLayer(layersRef.current.bufferCircle); layersRef.current.bufferCircle = null; }
    if (layersRef.current.bufferMarker) { map.removeLayer(layersRef.current.bufferMarker); layersRef.current.bufferMarker = null; }
    if (!bufferPoint) return;
    layersRef.current.bufferCircle = L.circle([bufferPoint.lat, bufferPoint.lng], {
      radius: bufferRadius,
      color: C.warning, weight:2, dashArray:"6 3",
      fillColor: C.warning, fillOpacity:0.08
    }).addTo(map);
    layersRef.current.bufferMarker = L.circleMarker([bufferPoint.lat, bufferPoint.lng], {
      radius:4, color:C.warningLt, fillColor:C.warning, fillOpacity:1, weight:2
    }).addTo(map);
    setPopup({ type:"buffer", radius:bufferRadius, lat:bufferPoint.lat.toFixed(5), lng:bufferPoint.lng.toFixed(5) });
  }, [bufferPoint, bufferRadius]);

  return (
    <div style={{ width:"100%", height:"100%", position:"relative" }}>
      <div ref={containerRef} style={{ width:"100%", height:"100%" }} />
      {popup && (
        <div style={{ ...S.popup, top:56, left:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:0 }}>
            <div style={S.popupTitle}>
              { popup.type==="field"    ? `FIELD — ${popup.name}` :
                popup.type==="activity" ? "ACTIVITY RECORD" :
                popup.type==="village"  ? "VILLAGE" :
                popup.type==="dam"      ? "DAM / PUMP" :
                popup.type==="buffer"   ? "BUFFER ZONE" : "INFO" }
            </div>
            <button onClick={() => setPopup(null)} style={{ background:"none", border:"none", color:C.textDim, cursor:"pointer", padding:2 }}>
              <Icon name="x" size={12}/>
            </button>
          </div>
          {popup.type==="field" && <>
            <div style={S.popupRow}><span style={S.popupKey}>Field ID</span><span style={S.popupVal}>{popup.id}</span></div>
            <div style={S.popupRow}><span style={S.popupKey}>Area (ha)</span><span style={S.popupVal}>{popup.area}</span></div>
          </>}
          {(popup.type==="activity" || popup.type==="village") && popup.data.map(({ key, val }) => (
            <div key={key} style={S.popupRow}>
              <span style={S.popupKey}>{key}</span>
              <span style={S.popupVal}>{val}</span>
            </div>
          ))}
          {popup.type==="dam" && (
            <div style={S.popupRow}><span style={S.popupKey}>Dam ID</span><span style={S.popupVal}>{popup.id}</span></div>
          )}
          {popup.type==="buffer" && <>
            <div style={S.popupRow}><span style={S.popupKey}>Radius</span><span style={S.popupVal}>{popup.radius} m</span></div>
            <div style={S.popupRow}><span style={S.popupKey}>Latitude</span><span style={S.popupVal}>{popup.lat}</span></div>
            <div style={S.popupRow}><span style={S.popupKey}>Longitude</span><span style={S.popupVal}>{popup.lng}</span></div>
          </>}
        </div>
      )}
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function PieChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    const ChartJS = window.Chart;
    if (!ChartJS) return;

    const grouped = {};
    data.forEach(d => {
      const act = d.Activity || d.activity || "Other";
      grouped[act] = (grouped[act] || 0) + (parseFloat(d.Frequency) || 1);
    });
    const labels = Object.keys(grouped);
    const values = Object.values(grouped);
    const colors = [C.accent,"#16a34a",C.warning,C.threat,"#7c3aed","#3af7ee","#ec4899","#fd7912","#8c8e8c"];

    if (chartRef.current) { try { chartRef.current.destroy(); } catch(e){} }
    chartRef.current = new ChartJS(canvasRef.current.getContext("2d"), {
      type: "pie",
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderColor: C.surface, borderWidth: 2 }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: C.textDim, font: { size: 9, family: "'IBM Plex Mono', monospace" }, boxWidth: 10, padding: 6 }
          },
          title: { display: true, text: "Activity Distribution", color: C.accentLt, font: { size: 10, family: "'IBM Plex Mono', monospace" } }
        }
      }
    });
    return () => { if (chartRef.current) { try { chartRef.current.destroy(); } catch(e){} } };
  }, [data]);

  if (!data.length) return <div style={{color:C.textMuted,fontSize:10,textAlign:"center",padding:8}}>Loading…</div>;
  return <canvas ref={canvasRef} style={{ maxHeight:200 }}/>;
}

function MiniBarChart({ data, type="bar" }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    const ChartJS = window.Chart;
    if (!ChartJS) return;

    const subset = data.slice(0, 14);
    const labels = subset.map(d => d.Field || "");
    const values = subset.map(d => parseFloat(d.Frequency) || 0);
    const barColors = [C.accent,"#16a34a",C.warning,C.threat,"#7c3aed","#3af7ee","#ec4899","#fd7912","#8c8e8c"];
    const colArr = subset.map((_, i) => barColors[i % barColors.length]);

    if (chartRef.current) { try { chartRef.current.destroy(); } catch(e){} }

    const commonOpts = {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Field vs Avg Frequency", color: C.accentLt, font: { size: 9, family: "'IBM Plex Mono', monospace" } }
      },
      scales: {
        x: { ticks: { color: C.textMuted, font: { size: 8 }, maxRotation: 45 }, grid: { color: "rgba(30,80,160,0.1)" } },
        y: { ticks: { color: C.textMuted, font: { size: 8 } }, grid: { color: "rgba(30,80,160,0.1)" } }
      }
    };

    let cfg;
    if (type === "bar") {
      cfg = {
        type: "bar",
        data: { labels, datasets: [{ data: values, backgroundColor: colArr, borderRadius: 2, borderSkipped: false }] },
        options: commonOpts
      };
    } else if (type === "line") {
      cfg = {
        type: "line",
        data: { labels, datasets: [{ data: values, borderColor: C.accent, backgroundColor: C.accent + "30", fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: C.accentLt }] },
        options: commonOpts
      };
    } else {
      // scatter
      cfg = {
        type: "scatter",
        data: { datasets: [{ data: subset.map((d, i) => ({ x: i, y: parseFloat(d.Frequency) || 0, label: d.Field })),
          backgroundColor: colArr, pointRadius: 6, pointHoverRadius: 8 }] },
        options: {
          ...commonOpts,
          scales: {
            x: { ticks: { color: C.textMuted, font: { size: 8 }, callback: (v) => labels[v] || v }, grid: { color: "rgba(30,80,160,0.1)" } },
            y: { ticks: { color: C.textMuted, font: { size: 8 } }, grid: { color: "rgba(30,80,160,0.1)" } }
          }
        }
      };
    }

    chartRef.current = new ChartJS(canvasRef.current.getContext("2d"), cfg);
    return () => { if (chartRef.current) { try { chartRef.current.destroy(); } catch(e){} } };
  }, [data, type]);

  if (!data.length) return <div style={{color:C.textMuted,fontSize:10,textAlign:"center",padding:8}}>Loading…</div>;
  return <canvas ref={canvasRef} style={{ maxHeight:180 }}/>;
}

// ─── Panel Components ─────────────────────────────────────────────────────────
function FieldsPanel({ farmData, setFarmData, toast }) {
  const [selected, setSelected] = useState("");
  const [dlFarm, setDlFarm] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState(false);

  const loadFarm = async (name) => {
    setSelected(name);
    if (!name) { setFarmData([]); return; }
    if (name === "Select All") {
      const all = await Promise.all(
        Object.entries(FARM_URLS).map(async ([n, url]) => {
          const r = await fetch(url); const g = await r.json(); return { name:n, geojson:g };
        })
      );
      setFarmData(all);
    } else if (FARM_URLS[name]) {
      const r = await fetch(FARM_URLS[name]); const g = await r.json();
      setFarmData([{ name, geojson:g }]);
    }
  };

  const doDownload = () => {
    if (pwd !== DOWNLOAD_PASSWORD) { setPwdError(true); return; }
    const target = dlFarm === "Select All" ? farmData : farmData.filter(f => f.name === dlFarm);
    if (!target.length) { toast("Load the farm first"); return; }
    target.forEach(({ name, geojson }) => {
      const blob = new Blob([JSON.stringify(geojson)], { type:"application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `${name.replace(" ","")}.geojson`; a.click();
    });
    toast("Download started — " + dlFarm);
    setDownloading(false); setPwd(""); setPwdError(false);
  };

  return (
    <div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Select Farm</div>
        <select style={S.select} value={selected} onChange={e => loadFarm(e.target.value)}>
          <option value="">— Choose Farm —</option>
          {Object.keys(FARM_URLS).map(n => <option key={n}>{n}</option>)}
          <option value="Select All">Select All</option>
        </select>
        {farmData.length > 0 && (
          <div style={{ fontSize:10, color:C.safeLt, marginTop:3, display:"flex", alignItems:"center", gap:4 }}>
            <Icon name="check" size={10}/> {farmData.length} farm(s) loaded
          </div>
        )}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Farm Legend</div>
        {Object.entries(FARM_COLORS).map(([n, col]) => (
          <div key={n} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <div style={{ width:10, height:10, background:col, borderRadius:2, border:`1px solid ${col}80` }}/>
            <span style={{ fontSize:10, color:C.textDim }}>{n}</span>
          </div>
        ))}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Download GeoJSON</div>
        <select style={S.select} value={dlFarm} onChange={e => setDlFarm(e.target.value)}>
          <option value="">— Select Farm —</option>
          {Object.keys(FARM_URLS).map(n => <option key={n}>{n}</option>)}
          <option value="Select All">All Farms</option>
        </select>
        <button style={S.btn("primary")} onClick={() => setDownloading(true)}>
          Download GeoJSON
        </button>
        {downloading && (
          <div style={{ marginTop:6 }}>
            <div style={{ fontSize:10, color:C.textDim, marginBottom:4, display:"flex", alignItems:"center", gap:4 }}>
              <Icon name="lock" size={10}/> Authorization required
            </div>
            <input type="password" placeholder="Enter access code…" style={{
              ...S.input, borderColor: pwdError ? C.threat : C.border
            }} value={pwd} onChange={e => { setPwd(e.target.value); setPwdError(false); }}/>
            {pwdError && <div style={{ color:C.threatLt, fontSize:10, marginBottom:4 }}>Invalid access code</div>}
            <div style={{ display:"flex", gap:5 }}>
              <button style={{ ...S.btn("success"), marginBottom:0 }} onClick={doDownload}>Confirm</button>
              <button style={{ ...S.btn("danger"), marginBottom:0 }} onClick={() => { setDownloading(false); setPwd(""); setPwdError(false); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityPanel({ activityData, setActivityData, pieData, setPieData, barData, setBarData }) {
  const [actType, setActType] = useState("Select All");
  const [dayNight, setDayNight] = useState("All");
  const [graphType, setGraphType] = useState("bar");

  useEffect(() => {
    fetch(ACTIVITY_CSV).then(r => r.text()).then(t => setActivityData(parseCSV(t))).catch(() => {});
    fetch(PIE_CSV).then(r => r.text()).then(t => setPieData(parseCSV(t))).catch(() => {});
    fetch(BAR_CSV).then(r => r.text()).then(t => setBarData(parseCSV(t))).catch(() => {});
  }, []);

  const filtered = activityData.filter(d => {
    const typeMatch = actType === "Select All" || (d.Activity || "").toLowerCase().includes(actType.toLowerCase().split("-")[0]);
    const dnMatch = dayNight === "All" || (d["Day/Night"] || "").toLowerCase() === dayNight.toLowerCase();
    return typeMatch && dnMatch;
  });

  // pass filtered data up for map rendering via a side-effect
  useEffect(() => {
    // re-render the parent's activityData to trigger map update — we rely on the parent state
  }, [filtered]);

  return (
    <div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Activity Type</div>
        <select style={S.select} value={actType} onChange={e => setActType(e.target.value)}>
          {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:4 }}>
          {["All","Day","Night"].map(d => (
            <span key={d} style={S.chip(dayNight === d, d==="Night" ? "#7c3aed" : d==="Day" ? C.warning : C.accent)}
              onClick={() => setDayNight(d)}>
              <Icon name={d==="Night" ? "moon" : d==="Day" ? "sun" : "activity"} size={8}/> {d}
            </span>
          ))}
        </div>
        <div style={{ fontSize:9, color:C.textMuted, marginTop:4 }}>{filtered.length} records</div>
      </div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Activity Distribution</div>
        <PieChart data={pieData}/>
      </div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Field vs Frequency</div>
        <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginBottom:6 }}>
          {[["bar","bar-chart"],["scatter","scatter"],["line","activity"]].map(([t, ic]) => (
            <span key={t} style={S.chip(graphType === t)} onClick={() => setGraphType(t)}>
              <Icon name={ic} size={8}/> {t}
            </span>
          ))}
        </div>
        <MiniBarChart data={barData} type={graphType}/>
      </div>
    </div>
  );
}

function VillagesPanel({ villageData, setVillageData }) {
  const [selected, setSelected] = useState("");
  const names = villageData?.features?.map(f => f.properties?.NAME || "Unknown") || [];

  useEffect(() => {
    fetch(VILLAGES_URL).then(r => r.json()).then(setVillageData).catch(() => {});
  }, []);

  return (
    <div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Select Village</div>
        <select style={S.select} value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Select Village —</option>
          {names.map(n => <option key={n}>{n}</option>)}
        </select>
        {selected && (
          <div style={{ fontSize:9, color:C.safeLt, marginTop:3, display:"flex", alignItems:"center", gap:4 }}>
            <Icon name="check" size={10}/> {selected} shown on map
          </div>
        )}
      </div>
      <div style={S.section}>
        <div style={S.sectionTitle}>All Villages ({names.length})</div>
        <div style={{ maxHeight:190, overflowY:"auto" }}>
          {names.map(n => (
            <div key={n} style={{
              fontSize:10, color:selected===n ? C.accentLt : C.textDim,
              padding:"4px 0", borderBottom:`1px solid ${C.border}`,
              cursor:"pointer", transition:"color 0.1s"
            }} onClick={() => setSelected(n)}>{n}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LulcPanel({ lulcVisible, setLulcVisible, lulcOpacity, setLulcOpacity }) {
  return (
    <div>
      <div style={S.section}>
        <div style={S.sectionTitle}>LULC Years</div>
        {["2005","2015","2025"].map(yr => (
          <div key={yr} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <input type="checkbox" checked={!!lulcVisible[yr]}
                onChange={e => setLulcVisible(v => ({ ...v, [yr]:e.target.checked }))}
                style={{ accentColor:C.accent }}/>
              <span style={{ fontSize:11, color:C.textDim, fontWeight:600 }}>{yr}</span>
            </div>
            {lulcVisible[yr] && (
              <div>
                <div style={{ fontSize:9, color:C.textMuted, marginBottom:2 }}>
                  Opacity: {Math.round((lulcOpacity[yr] || 0.85) * 100)}%
                </div>
                <input type="range" min={0} max={1} step={0.05} style={S.slider}
                  value={lulcOpacity[yr] || 0.85}
                  onChange={e => setLulcOpacity(o => ({ ...o, [yr]:parseFloat(e.target.value) }))}/>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Legend</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          {LULC_COLORS.map(({ color, label }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:9, height:9, background:color, borderRadius:1, flexShrink:0 }}/>
              <span style={{ fontSize:9, color:C.textDim }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BufferPanel({ bufferRadius, setBufferRadius, bufferPoint, setBufferPoint }) {
  return (
    <div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Buffer Radius</div>
        <div style={{ display:"flex", gap:4, marginBottom:8 }}>
          {[500, 1000, 2000].map(r => (
            <span key={r} style={{
              ...S.chip(bufferRadius === r, C.warning), flex:1, justifyContent:"center"
            }} onClick={() => setBufferRadius(r)}>
              {r}m
            </span>
          ))}
        </div>
        <div style={{ fontSize:9, color:C.textMuted, lineHeight:1.7, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
          1. Select radius above<br/>
          2. Click anywhere on the map<br/>
          3. Buffer zone renders at point
        </div>
        {bufferPoint && (
          <div style={{ marginTop:8, padding:6, background:`rgba(217,119,6,0.08)`, borderRadius:3, border:`1px solid rgba(217,119,6,0.2)` }}>
            <div style={{ fontSize:9, color:C.warningLt, marginBottom:3, fontWeight:600 }}>ACTIVE BUFFER</div>
            <div style={{ fontSize:9, color:C.textDim }}>Lat: {bufferPoint.lat.toFixed(5)}</div>
            <div style={{ fontSize:9, color:C.textDim }}>Lng: {bufferPoint.lng.toFixed(5)}</div>
            <div style={{ fontSize:9, color:C.textDim }}>Radius: {bufferRadius}m</div>
          </div>
        )}
        {bufferPoint && (
          <button style={{ ...S.btn("danger"), marginTop:6 }} onClick={() => setBufferPoint(null)}>
            Clear Buffer
          </button>
        )}
      </div>
    </div>
  );
}

function HotspotPanel() {
  const [weekData, setWeekData] = useState([]);
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    fetch(WEEK_CSV).then(r => r.text()).then(t => setWeekData(parseCSV(t))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !weekData.length) return;
    const ChartJS = window.Chart;
    if (!ChartJS) return;

    const labels = weekData.map(d => d.Field || "");
    const values = weekData.map(d => parseFloat(d.Frequency) || 0);
    const max = Math.max(...values, 1);
    const bgColors = values.map(v => {
      const heat = v / max;
      return heat > 0.7 ? C.threat : heat > 0.4 ? C.warning : C.safe;
    });

    if (chartRef.current) { try { chartRef.current.destroy(); } catch(e){} }
    chartRef.current = new ChartJS(canvasRef.current.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: bgColors, borderRadius: 3, borderSkipped: false }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Weekly Hotspot Fields", color: C.accentLt, font: { size: 10, family: "'IBM Plex Mono', monospace" } }
        },
        scales: {
          x: { ticks: { color: C.textMuted, font: { size: 8 }, maxRotation: 45 }, grid: { color: "rgba(30,80,160,0.1)" } },
          y: { ticks: { color: C.textMuted, font: { size: 8 } }, grid: { color: "rgba(30,80,160,0.1)" } }
        }
      }
    });
    return () => { if (chartRef.current) { try { chartRef.current.destroy(); } catch(e){} } };
  }, [weekData]);

  return (
    <div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Weekly Hotspot Fields</div>
        {weekData.length ? (
          <canvas ref={canvasRef} style={{ maxHeight:200 }}/>
        ) : (
          <div style={{ color:C.textMuted, fontSize:10, textAlign:"center", padding:8 }}>Loading…</div>
        )}
        <div style={{ marginTop:8, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
          {weekData.slice(0, 6).map((d, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:10, padding:"3px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.textDim }}>{d.Field}</span>
              <span style={{ color: parseFloat(d.Frequency) > 5 ? C.threatLt : C.warningLt, fontWeight:700 }}>
                {d.Frequency}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...S.section, background:`rgba(220,38,38,0.04)`, borderColor:`rgba(220,38,38,0.18)` }}>
        <div style={{ fontSize:9, color:`rgba(220,38,38,0.6)` }}>Updates weekly via GitHub CSV</div>
      </div>
    </div>
  );
}

// ─── Mobile App Layout ────────────────────────────────────────────────────────
// Bottom-tab navigation with slide-up panel sheet over the map
const MOBILE_TABS = [
  { id:"Fields",         icon:"grid",          label:"Fields" },
  { id:"Activity",       icon:"alert-triangle", label:"Activity" },
  { id:"Villages",       icon:"home",          label:"Villages" },
  { id:"LULC Maps",      icon:"layers",        label:"LULC" },
  { id:"More",           icon:"crosshair",     label:"More" },
];
const MORE_LAYERS = ["Dams-Pumps","Buffer Distance","Hotspot Fields","Theft Routes","Transition Statistics"];

function MobileApp({
  activeLayer, setActiveLayer, farmData, setFarmData,
  activityData, setActivityData, pieData, setPieData, barData, setBarData,
  villageData, setVillageData, damData, routeData,
  lulcVisible, setLulcVisible, lulcOpacity, setLulcOpacity,
  bufferRadius, setBufferRadius, bufferPoint, setBufferPoint,
  leafletReady, showToast, mapRef
}) {
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [mobileTab, setMobileTab]   = useState("Fields");
  const [moreOpen,  setMoreOpen]    = useState(false);

  const handleTab = (id) => {
    if (id === "More") { setMoreOpen(o => !o); return; }
    setMoreOpen(false);
    setMobileTab(id);
    setActiveLayer(id);
    setSheetOpen(true);
  };

  const handleMorePick = (id) => {
    setMoreOpen(false);
    if (id === "Transition Statistics") {
      window.open("https://hamza-nkhumbwa.github.io/galanwra/Transiton.html", "_blank");
      return;
    }
    setMobileTab(id);
    setActiveLayer(id);
    setSheetOpen(true);
  };

  const renderPanel = () => {
    switch(activeLayer) {
      case "Fields":    return <FieldsPanel farmData={farmData} setFarmData={setFarmData} toast={showToast}/>;
      case "Activity":  return <ActivityPanel activityData={activityData} setActivityData={setActivityData} pieData={pieData} setPieData={setPieData} barData={barData} setBarData={setBarData}/>;
      case "Villages":  return <VillagesPanel villageData={villageData} setVillageData={setVillageData}/>;
      case "LULC Maps": return <LulcPanel lulcVisible={lulcVisible} setLulcVisible={setLulcVisible} lulcOpacity={lulcOpacity} setLulcOpacity={setLulcOpacity}/>;
      case "Dams-Pumps": return (
        <div style={S.section}>
          <div style={S.sectionTitle}>Dams and Pumps</div>
          <div style={{ fontSize:11, color:C.textDim, lineHeight:1.8 }}>Tap a dam marker on the map to view its ID.</div>
          {damData && <div style={{ fontSize:10, color:C.safeLt, marginTop:6 }}>{damData.features?.length || 0} dams loaded</div>}
        </div>
      );
      case "Buffer Distance": return <BufferPanel bufferRadius={bufferRadius} setBufferRadius={setBufferRadius} bufferPoint={bufferPoint} setBufferPoint={setBufferPoint}/>;
      case "Hotspot Fields":  return <HotspotPanel/>;
      case "Theft Routes": return (
        <div style={S.section}>
          <div style={S.sectionTitle}>Theft Routes</div>
          <div style={{ fontSize:11, color:C.textDim, lineHeight:1.8 }}>Known intruder routes displayed on the map.</div>
          {routeData && <div style={{ fontSize:10, color:C.threatLt, marginTop:6 }}>{routeData.features?.length || 0} routes loaded</div>}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div style={S.mobileApp}>
      {/* Mobile topbar */}
      <div style={S.mobileTopbar}>
        <div style={S.logoMark}><Icon name="crosshair" size={13}/></div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#fff", letterSpacing:"-0.3px" }}>
            GALANWRA <span style={{color:C.accentLt}}>GIS</span>
          </div>
          <div style={{ fontSize:8, color:C.textMuted, letterSpacing:"1.5px" }}>ESTATE INTELLIGENCE</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={S.statusDot}/>
          <img src="https://hamza-nkhumbwa.github.io/galanwra/wwjdlogo.png"
            style={{ height:28, objectFit:"contain", opacity:0.9 }}
            onError={e => { e.target.style.display="none"; }} alt="WWJD"/>
        </div>
      </div>

      {/* Map fills remaining space */}
      <div style={S.mobileMapWrap}>
        {leafletReady ? (
          <LeafletMap
            activeLayer={activeLayer}
            farmData={farmData}
            activityData={activityData}
            villageData={villageData}
            damData={damData}
            routeData={routeData}
            lulcVisible={lulcVisible}
            lulcOpacity={lulcOpacity}
            bufferPoint={bufferPoint}
            bufferRadius={bufferRadius}
            mapRef={mapRef}
            onMapClick={(latlng) => {
              if (activeLayer === "Buffer Distance") setBufferPoint(latlng);
            }}
          />
        ) : (
          <div style={S.mapPlaceholder}>
            <Icon name="map" size={28}/>
            <div style={{ fontSize:10, color:C.textMuted }}>LOADING MAP…</div>
          </div>
        )}

        {/* Earth animation */}
        <div style={{
          position:"absolute", bottom:70, right:10, zIndex:800,
          width:52, height:52, borderRadius:"50%", overflow:"hidden",
          border:`1.5px solid ${C.borderHi}`,
          boxShadow:`0 0 14px rgba(26,86,219,0.4)`, pointerEvents:"none"
        }}>
          <video autoPlay loop muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover" }}
            onError={e => { e.target.parentElement.style.display="none"; }}>
            <source src="https://hamza-nkhumbwa.github.io/datasets/earth.mp4" type="video/mp4"/>
          </video>
        </div>

        {/* Slide-up panel sheet */}
        <div style={S.mobileSheet(sheetOpen)}>
          {/* Drag handle — tap to toggle */}
          <div style={S.sheetHandle} onClick={() => setSheetOpen(o => !o)}>
            <div style={S.sheetHandleBar}/>
            <span style={{ fontSize:9, color:C.accentLt, letterSpacing:"1px", textTransform:"uppercase" }}>
              {sheetOpen ? "Hide" : activeLayer}
            </span>
            <div style={S.sheetHandleBar}/>
          </div>
          <div style={S.sheetBody}>{renderPanel()}</div>
        </div>

        {/* More picker overlay */}
        {moreOpen && (
          <div style={{
            position:"absolute", bottom:56, right:0, left:0, zIndex:950,
            background:C.surface, borderTop:`1px solid ${C.borderHi}`,
            padding:"8px 0"
          }}>
            {MORE_LAYERS.map(id => (
              <div key={id} onClick={() => handleMorePick(id)} style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
                cursor:"pointer", borderBottom:`1px solid ${C.border}`
              }}>
                <span style={{ color:C.accentLt, display:"flex" }}>
                  <Icon name={LAYERS.find(l => l.id === id)?.icon || "map"} size={13}/>
                </span>
                <span style={{ fontSize:11, color:C.text }}>{id}</span>
                {id === "Transition Statistics" && (
                  <span style={{ color:C.textMuted, display:"flex", marginLeft:"auto" }}>
                    <Icon name="external-link" size={10}/>
                  </span>
                )}
              </div>
            ))}
            <div onClick={() => setMoreOpen(false)} style={{ padding:"10px 16px", fontSize:10, color:C.textMuted, textAlign:"center", cursor:"pointer" }}>
              CLOSE
            </div>
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div style={S.mobileTabBar}>
        {MOBILE_TABS.map(({ id, icon, label }) => {
          const isActive = (id === "More") ? moreOpen : (mobileTab === id && !moreOpen);
          return (
            <div key={id} style={S.mobileTab(isActive)} onClick={() => handleTab(id)}>
              <span style={{ color: isActive ? C.accentLt : C.neutral, display:"flex" }}>
                <Icon name={icon} size={16}/>
              </span>
              <span style={S.mobileTabLabel(isActive)}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [activeLayer, setActiveLayer] = useState("Fields");
  const [farmData,     setFarmData]     = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [pieData,      setPieData]      = useState([]);
  const [barData,      setBarData]      = useState([]);
  const [villageData,  setVillageData]  = useState(null);
  const [damData,      setDamData]      = useState(null);
  const [routeData,    setRouteData]    = useState(null);
  const [lulcVisible,  setLulcVisible]  = useState({"2005":false,"2015":false,"2025":false});
  const [lulcOpacity,  setLulcOpacity]  = useState({"2005":0.85,"2015":0.85,"2025":0.85});
  const [bufferRadius, setBufferRadius] = useState(500);
  const [bufferPoint,  setBufferPoint]  = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [chartReady,   setChartReady]   = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [toast, setToast] = useState(null);
  const mapRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  // Load Leaflet + Chart.js together
  useEffect(() => {
    let leafletDone = !!window.L;
    let chartDone   = !!window.Chart;

    const tryFinish = () => {
      if (leafletDone && chartDone) {
        setLeafletReady(true);
        setChartReady(true);
        setTimeout(() => setLoading(false), 900);
      }
    };

    if (!window.L) {
      const css = document.createElement("link");
      css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      js.onload = () => { leafletDone = true; tryFinish(); };
      document.head.appendChild(js);
    }

    if (!window.Chart) {
      const js = document.createElement("script");
      js.src = "https://cdn.jsdelivr.net/npm/chart.js";
      js.onload = () => { chartDone = true; tryFinish(); };
      document.head.appendChild(js);
    }

    tryFinish();
  }, []);

  // Always pre-load dams
  useEffect(() => {
    if (!damData) fetch(DAMS_URL).then(r => r.json()).then(setDamData).catch(() => {});
  }, []);

  // Load routes when active
  useEffect(() => {
    if (activeLayer === "Theft Routes" && !routeData)
      fetch(ROUTES_URL).then(r => r.json()).then(setRouteData).catch(() => {});
  }, [activeLayer]);

  const handleLayerClick = (id) => {
    if (id === "Transition Statistics") {
      window.open("https://hamza-nkhumbwa.github.io/galanwra/Transiton.html", "_blank");
      return;
    }
    setActiveLayer(id);
  };

  const sharedProps = {
    activeLayer, setActiveLayer, farmData, setFarmData,
    activityData, setActivityData, pieData, setPieData, barData, setBarData,
    villageData, setVillageData, damData, routeData,
    lulcVisible, setLulcVisible, lulcOpacity, setLulcOpacity,
    bufferRadius, setBufferRadius, bufferPoint, setBufferPoint,
    leafletReady, showToast, mapRef
  };

  const renderPanel = () => {
    switch(activeLayer) {
      case "Fields":    return <FieldsPanel farmData={farmData} setFarmData={setFarmData} toast={showToast}/>;
      case "Activity":  return <ActivityPanel activityData={activityData} setActivityData={setActivityData} pieData={pieData} setPieData={setPieData} barData={barData} setBarData={setBarData}/>;
      case "Villages":  return <VillagesPanel villageData={villageData} setVillageData={setVillageData}/>;
      case "LULC Maps": return <LulcPanel lulcVisible={lulcVisible} setLulcVisible={setLulcVisible} lulcOpacity={lulcOpacity} setLulcOpacity={setLulcOpacity}/>;
      case "Dams-Pumps": return (
        <div style={S.section}>
          <div style={S.sectionTitle}>Dams and Pumps</div>
          <div style={{ fontSize:10, color:C.textDim, lineHeight:1.8 }}>Click a dam marker on the map to view its ID and details.</div>
          {damData && <div style={{ fontSize:9, color:C.safeLt, marginTop:6, display:"flex", alignItems:"center", gap:4 }}><Icon name="check" size={9}/> {damData.features?.length || 0} dams loaded</div>}
        </div>
      );
      case "Buffer Distance": return <BufferPanel bufferRadius={bufferRadius} setBufferRadius={setBufferRadius} bufferPoint={bufferPoint} setBufferPoint={setBufferPoint}/>;
      case "Hotspot Fields":  return <HotspotPanel/>;
      case "Theft Routes": return (
        <div style={S.section}>
          <div style={S.sectionTitle}>Theft Routes</div>
          <div style={{ fontSize:10, color:C.textDim, lineHeight:1.8 }}>Known intruder routes displayed on the map. Routes are sourced from GeoJSON field intelligence.</div>
          {routeData && <div style={{ fontSize:9, color:C.threatLt, marginTop:6, display:"flex", alignItems:"center", gap:4 }}><Icon name="alert-triangle" size={9}/> {routeData.features?.length || 0} routes loaded</div>}
        </div>
      );
      default: return null;
    }
  };

  const globalStyles = (
    <>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeOut { 0%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
        @keyframes scanline { 0%{top:0%} 100%{top:100%} }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(30,80,160,0.4);border-radius:2px}
        * { box-sizing:border-box; }
        html,body { margin:0; padding:0; overflow:hidden; }
        .leaflet-container { background:${C.bg} !important; }
        .leaflet-control-zoom a { background:${C.surfaceEl} !important; color:${C.text} !important; border-color:${C.border} !important; font-family:inherit !important; }
        .leaflet-control-attribution { background:rgba(6,11,20,0.7) !important; color:${C.textMuted} !important; font-size:8px !important; font-family:inherit !important; }
        input[type=range] { accent-color:${C.accent}; }
        select option { background:${C.surfaceEl}; color:${C.text}; }
      `}</style>
    </>
  );

  const loadingScreen = loading && (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:C.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:20
    }}>
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{
          position:"absolute", left:0, right:0, height:2,
          background:`linear-gradient(transparent,${C.accentLt}30,transparent)`,
          animation:"scanline 2.2s linear infinite"
        }}/>
      </div>
      <img src="https://hamza-nkhumbwa.github.io/galanwra/wwjdlogo.png"
        style={{ height:72, objectFit:"contain", opacity:0.95 }}
        onError={e => { e.target.style.display="none"; }} alt="WWJD"/>
      <div style={{
        width:56, height:56, borderRadius:"50%",
        border:`2px solid ${C.border}`,
        borderTop:`2px solid ${C.accentLt}`,
        animation:"spin 0.9s linear infinite"
      }}/>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:"2px" }}>
          GALANWRA <span style={{color:C.accentLt}}>GIS</span>
        </div>
        <div style={{ fontSize:9, color:C.textMuted, letterSpacing:"3px", marginTop:4 }}>
          ESTATE INTELLIGENCE SYSTEM
        </div>
      </div>
      <div style={{ display:"flex", gap:6, marginTop:4 }}>
        {["LEAFLET","CHARTJS","TILES"].map((lbl, i) => (
          <div key={lbl} style={{
            fontSize:8, padding:"3px 8px", borderRadius:2, letterSpacing:"1px",
            background:`rgba(26,86,219,0.12)`, border:`1px solid ${C.borderHi}`,
            color:C.accentLt, animation:`blink ${1.2 + i * 0.3}s infinite`
          }}>{lbl}</div>
        ))}
      </div>
    </div>
  );

  // ── MOBILE LAYOUT ──
  if (isMobile) {
    return (
      <>
        {globalStyles}
        {loadingScreen}
        <MobileApp {...sharedProps}/>
        {toast && <div style={S.toast}>{toast}</div>}
      </>
    );
  }

  // ── DESKTOP LAYOUT ──
  return (
    <div style={S.app}>
      {globalStyles}
      {loadingScreen}

      {/* TOPBAR */}
      <div style={S.topbar}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={S.logoMark}><Icon name="crosshair" size={14}/></div>
          <div>
            <div style={S.logoText}>GALANWRA <span style={{color:C.accentLt}}>GIS</span></div>
            <div style={S.logoSub}>Estate Intelligence</div>
          </div>
        </div>
        <div style={S.dividerV}/>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={S.statusDot}/>
          <span style={S.statusText}>Live · Illovo Sugar · Malawi</span>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:10, color:C.textMuted, letterSpacing:"0.5px" }}>UTM Zone 36S · WGS84</span>
          <div style={S.dividerV}/>
          <span style={{ fontSize:10, color:C.textMuted, fontFamily:"inherit" }}>{new Date().toLocaleTimeString()}</span>
          <div style={S.dividerV}/>
          <img src="https://hamza-nkhumbwa.github.io/galanwra/wwjdlogo.png"
            style={{ height:34, width:"auto", objectFit:"contain", borderRadius:3, opacity:0.92 }}
            onError={e => { e.target.style.display="none"; }} alt="WWJD"/>
        </div>
      </div>

      <div style={S.body}>
        {/* SIDEBAR */}
        <div style={S.sidebar}>
          <div style={S.sidebarScroll}>
            <div style={S.sideLabel}>Layers</div>
            {LAYERS.map(({ id, icon, badge }) => (
              <div key={id} style={S.navItem(activeLayer === id)} onClick={() => handleLayerClick(id)}>
                <span style={{ color: activeLayer===id ? C.accentLt : C.neutral, display:"flex" }}>
                  <Icon name={icon} size={13}/>
                </span>
                <span style={S.navLabel(activeLayer === id)}>{id}</span>
                {badge && <span style={S.navBadge}>{badge}</span>}
                {id === "Transition Statistics" && (
                  <span style={{ color:C.textMuted, display:"flex" }}>
                    <Icon name="external-link" size={10}/>
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding:"10px 14px", borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:9, color:C.textMuted }}>Worldwide Joint Discoverers</div>
            <div style={{ fontSize:9, color:`rgba(148,163,184,0.18)` }}>Sub-contractor · Illovo Sugar</div>
          </div>
        </div>

        {/* MAP */}
        <div style={S.mapPanel}>
          {leafletReady ? (
            <LeafletMap
              activeLayer={activeLayer}
              farmData={farmData}
              activityData={activityData}
              villageData={villageData}
              damData={damData}
              routeData={routeData}
              lulcVisible={lulcVisible}
              lulcOpacity={lulcOpacity}
              bufferPoint={bufferPoint}
              bufferRadius={bufferRadius}
              mapRef={mapRef}
              onMapClick={(latlng) => {
                if (activeLayer === "Buffer Distance") setBufferPoint(latlng);
              }}
            />
          ) : (
            <div style={S.mapPlaceholder}>
              <Icon name="map" size={32}/>
              <div style={{ fontSize:11, color:C.textMuted, letterSpacing:"1px" }}>INITIALIZING MAP ENGINE…</div>
            </div>
          )}
          {/* Earth animation */}
          <div style={{
            position:"absolute", bottom:14, right:14, zIndex:800,
            width:72, height:72, borderRadius:"50%", overflow:"hidden",
            border:`1.5px solid ${C.borderHi}`,
            boxShadow:`0 0 18px rgba(26,86,219,0.4), 0 0 6px rgba(26,86,219,0.2)`,
            pointerEvents:"none"
          }}>
            <video autoPlay loop muted playsInline
              style={{ width:"100%", height:"100%", objectFit:"cover" }}
              onError={e => { e.target.parentElement.style.display="none"; }}>
              <source src="https://hamza-nkhumbwa.github.io/datasets/earth.mp4" type="video/mp4"/>
            </video>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={S.rightPanel}>
          <div style={S.panelHeader}>
            <span style={{ color:C.accentLt, display:"flex" }}>
              <Icon name={LAYERS.find(l => l.id === activeLayer)?.icon || "map"} size={12}/>
            </span>
            <div style={S.panelTitle}>{activeLayer}</div>
          </div>
          <div style={S.panelBody}>{renderPanel()}</div>
        </div>
      </div>

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}
