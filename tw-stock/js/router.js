// 網址與控制列：網址 ↔ 畫面狀態、上一頁／下一頁、分頁與篩選按鈕。

// ---------- 網址 ----------
// /                      每日摘要（也可以用 /summary）
// /stocks?days=5&investor=trust&order=sell&industry=半導體業&q=23
// /sectors?days=5&investor=foreign   /weights?days=1   /etf?days=5&kind=active   /signals
// /stock/2330            個股視窗      /etf/00981A    ETF 持股視窗
// 切換分頁、開關視窗會新增瀏覽紀錄（上一頁可回去）；切換篩選條件只更新網址，不新增紀錄。
const TABS = { summary: "每日摘要", stocks: "個股", sectors: "板塊", weights: "權值股", etf: "ETF 持股", signals: "主力訊號", quant: "量化選股", research: "個股研究" };
const DEFAULTS = { days: 1, inv: "total", order: "buy", industry: "", q: "", kind: "", rcode: "" };
const QS = { days: "days", inv: "investor", order: "order", industry: "industry", q: "q", kind: "kind" };
const TAB_FILTERS = { summary: [], signals: [], quant: [], research: [], stocks: ["days", "inv", "order", "industry", "q"],
                      sectors: ["days", "inv"], weights: ["days", "inv"], etf: ["days", "kind"] };
const SITE = "台股法人動向";
let detail = null;   // 開著的視窗 {type: "stock" | "etf", code}

function tabUrl() {
  const qs = new URLSearchParams();
  for (const k of TAB_FILTERS[state.tab]) if (state[k] !== DEFAULTS[k]) qs.set(QS[k], state[k]);
  const s = qs.toString();
  if (state.tab === "research") return link(state.rcode ? `research/${encodeURIComponent(state.rcode)}` : "research");
  return link(`${state.tab === "summary" ? "" : state.tab}${s ? "?" + s : ""}`);
}

function go({ push = true } = {}) {
  const url = detail ? link(`${detail.type}/${encodeURIComponent(detail.code)}`) : tabUrl();
  const st = { s: { ...state }, detail };
  const same = url === location.pathname + location.search;
  history[push && !same ? "pushState" : "replaceState"](st, "", url);
  if (!detail) document.title = `${TABS[state.tab]}｜${SITE}`;
}

function readUrl() {
  const rel = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : location.pathname.slice(1);
  const [first, second] = rel.split("/").filter(Boolean).map(decodeURIComponent);
  const qs = new URLSearchParams(location.search);
  Object.assign(state, DEFAULTS);
  for (const [k, q] of Object.entries(QS)) {
    if (!qs.has(q)) continue;
    state[k] = k === "days" ? Number(qs.get(q)) || 1 : qs.get(q);
  }
  detail = null;
  if ((first === "stock" || first === "etf") && second) {
    detail = { type: first, code: second };
    state.tab = first === "stock" ? "stocks" : "etf";   // 直接開連結時，視窗背後顯示的分頁
  } else {
    state.tab = first in TABS ? first : "summary";
    if (first === "research") state.rcode = second || "";
  }
}

function syncControls() {
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === state.tab));
  for (const [id, key, attr] of [["daysSeg", "days", "days"], ["invSeg", "inv", "inv"], ["orderSeg", "order", "order"], ["kindSeg", "kind", "kind"]])
    document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle("active", String(state[key]) === b.dataset[attr]));
  $("#industrySel").value = state.industry;
  $("#searchBox").value = state.q;
}

function openDetail() {
  if (!detail) return;
  (detail.type === "stock" ? showDetail : showEtf)(detail.code, { push: false });
}

// 上一頁／下一頁
window.addEventListener("popstate", (e) => {
  const before = tabUrl();
  if (e.state) {
    Object.assign(state, e.state.s);
    detail = e.state.detail;
  } else {
    readUrl();
  }
  syncControls();
  if (tabUrl() !== before) render();
  if (detail) openDetail();
  else if ($("#detail").open) $("#detail").close();
  if (!detail) document.title = `${TABS[state.tab]}｜${SITE}`;
});

// ---------- 控制列 ----------
function bindSeg(id, key, attr, cast = (x) => x) {
  document.querySelectorAll(`#${id} button`).forEach((b) =>
    b.addEventListener("click", () => {
      state[key] = cast(b.dataset[attr]);
      syncControls();
      go({ push: false });
      render();
    })
  );
}
bindSeg("daysSeg", "days", "days", Number);
bindSeg("invSeg", "inv", "inv");
bindSeg("orderSeg", "order", "order");
bindSeg("kindSeg", "kind", "kind");

function switchTab(tab) {
  if (tab === "research") state.rcode = "";   // 點分頁標籤回到研究首頁
  state.tab = tab;
  detail = null;
  syncControls();
  go();
  render();
}
document.querySelectorAll(".tabs a").forEach((a) =>
  a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;   // 讓「在新分頁開啟」照常運作
    e.preventDefault();
    switchTab(a.dataset.tab);
  })
);
$("#industrySel").addEventListener("change", (e) => { state.industry = e.target.value; go({ push: false }); render(); });
let searchTimer;
$("#searchBox").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.q = e.target.value.trim(); go({ push: false }); render(); }, 300);
});

function updateControls() {
  const c = $("#controls");
  c.classList.toggle("hidden", ["summary", "signals", "quant", "research"].includes(state.tab));
  c.classList.toggle("hide-order", state.tab !== "stocks");
  c.classList.toggle("hide-inv", state.tab === "etf");
  c.classList.toggle("hide-kind", state.tab !== "etf");
}
