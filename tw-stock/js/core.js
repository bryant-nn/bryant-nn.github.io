// 共用：狀態、API、格式化工具、常數。其他檔案都依賴這裡，必須最先載入。

const state = { tab: "summary", days: 1, inv: "total", order: "buy", industry: "", q: "", kind: "", rcode: "" };
const INV = { total: "三大法人", foreign: "外資", trust: "投信", dealer: "自營商" };
const $ = (s) => document.querySelector(s);
const view = $("#view");

// 部署方式：本機由 Python 伺服器提供即時 API；公開版（twstock export）在 index.html 設定
// window.TWSTOCK = {base: "/tw-stock/", static: true, exportedAt}，改讀預先匯出的 data/*.json。
const CFG = window.TWSTOCK || {};
const BASE = CFG.base || "/";
const STATIC = !!CFG.static;
const link = (p) => BASE + p.replace(/^\//, "");            // 站內網址（公開版會在 /tw-stock/ 底下）
// 靜態檔名：路徑＋排序過的參數；必須和 adapters/inbound/static_export.py 的 static_key 一致
const staticKey = (path, params) => {
  const qs = Object.entries(params).filter(([, v]) => v !== "" && v != null)
    .sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}-${v}`).join("_");
  return (path.replace(/\//g, "_") + (qs ? "__" + qs : "")).replace(/[^A-Za-z0-9_.=-]/g, "_");
};
const staticJson = (path, params) => fetch(`${BASE}data/${staticKey(path, params)}.json`).then((r) => (r.ok ? r.json() : null));
// 公開版：產業篩選、搜尋沒有預先匯出，改用「全部個股」清單在瀏覽器端篩選排序（規則同 read_model.inst_ranking）
async function staticStocks(p) {
  const all = await staticJson("stocks", { days: p.days, investor: p.investor, order: "all", limit: 5000 });
  if (!all) return null;
  const net = `${p.investor}_net`, amt = `${p.investor}_amt`, q = (p.q || "").trim();
  let rows = all.rows.filter((r) => (!p.industry || r.industry === p.industry)
    && (!q || r.code.startsWith(q) || (r.name || "").includes(q)));
  if (!q) rows = rows.filter((r) => (p.order === "sell" ? r[net] < 0 : r[net] > 0));
  rows.sort((a, b) => (p.order === "sell" ? a[amt] - b[amt] : b[amt] - a[amt]));
  return { ...all, rows: rows.slice(0, p.limit || 100) };
}
const api = (path, params = {}) => {
  if (STATIC && path === "stocks" && (params.industry || params.q)) return staticStocks(params);
  if (STATIC) return staticJson(path, params);
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  return fetch(`${BASE}api/${path}?${qs}`).then((r) => r.json());
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cls = (v) => (v > 0 ? "up" : v < 0 ? "down" : "");
const lots = (shares) => (shares == null ? "-" : Math.round(shares / 1000).toLocaleString());          // 股 -> 張
const yi = (v, d = 2) => (v == null ? "-" : (v / 1e8).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
const signed = (s) => (s.startsWith("-") || s === "-" ? s : "+" + s);
const pct = (v) => (v == null ? "-" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
const streakBadge = (n) => (!n ? "" : `<span class="badge ${cls(n)}">${n > 0 ? "連買" : "連賣"} ${Math.abs(n)} 天</span>`);
const periodLabel = (dates) => (!dates?.length ? "" : dates.length === 1 ? dates[0] : `${dates[0]} ~ ${dates[dates.length - 1]}`);
const ETF_TYPE = { new: "新增", add: "加碼", cut: "減碼", exit: "刪除" };
const typeBadge = (t) => (t ? `<span class="badge ${t}">${ETF_TYPE[t]}</span>` : "");
const kindBadge = (k) => `<span class="badge kind">${k === "active" ? "主動" : "被動"}</span>`;
const w2 = (v) => (v == null ? "-" : `${Number(v).toFixed(2)}%`);
const wDelta = (v) => (v == null || v === 0 ? "" : `<small class="${cls(v)}">${v > 0 ? "+" : ""}${v.toFixed(2)}</small>`);

const qianToYi = (v) => (v == null ? "-" : (v / 1e5).toLocaleString(undefined, { maximumFractionDigits: 2 }));   // 千元 -> 億
const num = (v, d = 2) => (v == null ? "-" : Number(v).toLocaleString(undefined, { maximumFractionDigits: d }));
const RATING_CLS = { 偏多: "up", 中性偏多: "up", 中性: "", 中性偏空: "down", 偏空: "down" };
const PATTERN = { surge_up: "爆量上漲", surge_down: "爆量下跌", distribution: "疑似出貨", quiet: "低檔量縮抗跌", breakout: "帶量突破" };
const ALERT_KIND = { attention: "注意股", repeat: "連續注意", disposition: "處置股" };
const segHtml = (attr, opts, cur) => `<div class="seg">${opts.map(([v, l]) =>
  `<button ${attr}="${v}" class="${String(v) === String(cur) ? "active" : ""}">${l}</button>`).join("")}</div>`;
