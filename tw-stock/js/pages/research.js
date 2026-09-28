// 個股研究：研究首頁（追蹤清單）、個股研究頁、AI 報告。

// ---------- 個股研究 ----------
let researchTimer;

function openResearch(code) {
  detail = null;
  if ($("#detail").open) $("#detail").close();
  state.tab = "research";
  state.rcode = code;
  syncControls();
  go();
  render();
}

async function renderResearch() {
  clearTimeout(researchTimer);
  return state.rcode ? renderResearchPage(state.rcode) : renderResearchIndex();
}

async function renderResearchIndex() {
  const w = await api("watchlist");
  view.innerHTML = `
    <div class="card"><h3>查詢個股</h3>
      <input id="researchSearch" type="search" placeholder="輸入代號或名稱，例如 3017 或 奇鋐" style="width:min(420px,100%)">
      <div id="researchHits" style="margin-top:8px"></div></div>
    <div class="card" style="margin-top:12px"><h3>追蹤清單 <span class="muted" style="font-weight:400">${w.rows.length} 檔</span></h3>
      ${!w.rows.length ? `<div class="muted">還沒有追蹤的股票。打開任一檔的研究頁，按「☆ 加入追蹤」。</div>` : `<div class="table-wrap"><table>
        <thead><tr><th>股票</th><th class="num">收盤</th><th class="num">漲跌</th><th class="num">月營收年增</th>
          <th class="num">FactSet 目標價</th><th class="num">主力跡象</th><th>AI 評等</th><th>近期更新</th></tr></thead>
        <tbody>${w.rows.map((r) => `<tr data-research="${esc(r.code)}">
          <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
          <td class="num">${r.close ?? "-"}</td><td class="num ${cls(r.chg_pct)}">${pct(r.chg_pct)}</td>
          <td class="num ${cls(r.revenue?.yoy_pct)}">${r.revenue ? `${pct(r.revenue.yoy_pct)} <small class="muted">${esc(r.revenue.ym.slice(2))}</small>` : "-"}</td>
          <td class="num">${r.factset?.factset_target ? `${num(r.factset.factset_target, 0)} <small class="${cls(r.upside_pct)}">${pct(r.upside_pct)}</small>` : "-"}</td>
          <td class="num">${r.score ?? "-"} / 7 ${r.warnings.length ? `<span class="badge warn" title="${esc(r.warnings.join("、"))}">⚠ ${r.warnings.length}</span>` : ""}</td>
          <td>${r.report ? `<span class="badge ${RATING_CLS[r.report.rating] || "kind"}">${esc(r.report.rating)}</span> <small class="muted">${esc(r.report.created_at.slice(5, 10))}</small>` : '<span class="muted">-</span>'}</td>
          <td>${r.updates.map((u) => `<span class="badge new">${esc(u)}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div>`}
      <div class="note">「近期更新」：5 天內公布新月營收、7 天內有新的 FactSet 調查、3 天內有重大訊息。</div></div>`;
  if (STATIC) {                              // 公開版：沒有搜尋 API，列出有收錄的股票
    const idx = (await api("research-index")) || [];
    $("#researchSearch").closest(".card").innerHTML = `<h3>公開版收錄的股票 <span class="muted" style="font-weight:400">${idx.length} 檔</span></h3>
      <div>${idx.map((x) => `<a class="chip" href="${link("research/" + x.code)}" data-research="${esc(x.code)}">${esc(x.code)} ${esc(x.name)}</a>`).join(" ")}</div>`;
    return;
  }
  let t;
  $("#researchSearch").addEventListener("input", (e) => {
    clearTimeout(t);
    const q = e.target.value.trim();
    t = setTimeout(async () => {
      if (!q) return ($("#researchHits").innerHTML = "");
      const r = await api("stocks", { q, limit: 10, order: "all" });
      $("#researchHits").innerHTML = r.rows.length ? r.rows.map((x) =>
        `<a class="chip" href="${link("research/" + x.code)}" data-research="${esc(x.code)}">${esc(x.code)} ${esc(x.name)}</a>`).join(" ")
        : `<span class="muted">找不到</span>`;
    }, 250);
  });
}

function peBandBar(b) {
  if (!b) return `<div class="muted">季報或行情資料不足，無法計算本益比區間</div>`;
  const span = b.max - b.min || 1, x = (v) => ((v - b.min) / span) * 100;
  return `<div class="band">
      <span class="band-iqr" style="left:${x(b.p25)}%;width:${x(b.p75) - x(b.p25)}%"></span>
      <span class="band-mid" style="left:${x(b.median)}%"></span>
      <span class="band-now" style="left:${Math.min(100, Math.max(0, x(b.current)))}%" title="目前 ${b.current} 倍"></span></div>
    <div class="band-labels"><span>${b.min}x</span><span>25%：${b.p25}x ｜ 中位數 ${b.median}x ｜ 75%：${b.p75}x</span><span>${b.max}x</span></div>
    <div class="note">近 ${b.days} 個交易日本益比（收盤價 ÷ 當時已公布的近四季 EPS）。紅線為目前 <b>${b.current} 倍</b>；灰色為中間 50% 區間。</div>`;
}

function reportHtml(d) {
  const job = d.job, ai = d.ai;
  const btn = (label) => ai.available
    ? `<button class="btn" data-generate="${esc(d.stock.code)}">${label}</button>
       <span class="muted" style="font-size:12px">使用 ${esc(ai.model)}＋網路搜尋，${esc(ai.cost_hint)}，需 1～3 分鐘</span>`
    : `<div class="note">⚠ ${esc(ai.reason)}</div>`;
  if (job?.status === "running")
    return `<div class="card report"><h3>AI 研究報告</h3><div class="empty">⏳ 報告產生中（${esc(job.started.slice(11))} 開始），約 1～3 分鐘，完成後會自動顯示…</div></div>`;
  const fail = job?.status === "failed" ? `<div class="note down">上次產生失敗：${esc(job.error)}</div>` : "";
  if (!d.report) return `<div class="card report"><h3>AI 研究報告</h3>${fail}
    <p class="muted">把下方的營收、季報、估值、同業、FactSet、籌碼資料交給 AI（${esc(ai.model)}），並讓它上網搜尋法說會、財測、券商目標價，整理成研究報告。</p>${btn("產生 AI 報告")}</div>`;
  const r = d.report.report, u = d.report.usage || {};
  const list = (xs) => (xs?.length ? `<ul class="hl">${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<div class="muted">無</div>`);
  const pts = (xs) => (xs?.length ? `<ul class="hl">${xs.map((x) => `<li>${esc(x.point)} <small class="muted">— ${esc(x.source)}</small></li>`).join("")}</ul>` : `<div class="muted">無</div>`);
  const v = r.valuation || {}, k = r.key_levels || {};
  return `<div class="card report">
    <div class="row-between"><h3>AI 研究報告 <span class="badge ${RATING_CLS[r.rating] || "kind"}" style="font-size:13px">${esc(r.rating)}</span></h3>
      <div>${d.reports.length > 1 ? `<select id="reportPick">${d.reports.map((x) => `<option value="${x.id}" ${x.id === d.report.id ? "selected" : ""}>${esc(x.created_at.replace("T", " ").slice(0, 16))}</option>`).join("")}</select>` : ""}</div></div>
    <div class="headline">${esc(r.headline)}</div>
    ${fail}
    <h4>三句話總結</h4>${list(r.summary)}
    <h4>催化劑</h4>${r.catalysts?.length ? `<table><tbody>${r.catalysts.map((c) => `<tr><td class="muted" style="white-space:nowrap">${esc(c.date)}</td><td>${esc(c.event)} <small class="muted">— ${esc(c.source)}</small></td></tr>`).join("")}</tbody></table>` : `<div class="muted">無</div>`}
    <div class="grid" style="margin-top:8px"><div><h4 class="up">多方觀點</h4>${pts(r.bull_points)}</div><div><h4 class="down">空方／謹慎觀點</h4>${pts(r.bear_points)}</div></div>
    <h4>機構觀點</h4>${r.analyst_views?.length ? `<div class="table-wrap"><table><thead><tr><th>機構</th><th>日期</th><th>評等</th><th class="num">目標價</th><th>說明</th></tr></thead><tbody>
      ${r.analyst_views.map((a) => `<tr><td>${esc(a.institution)}</td><td class="muted">${esc(a.date)}</td><td>${esc(a.rating)}</td><td class="num">${num(a.target_price, 1)}</td><td>${esc(a.note)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="muted">查無</div>`}
    <h4>估值判斷：<span class="${v.verdict === "便宜" ? "up" : v.verdict === "偏貴" ? "down" : ""}">${esc(v.verdict)}</span>
      ${v.fair_low != null ? `<span class="muted" style="font-weight:400">合理區間 ${num(v.fair_low, 0)}～${num(v.fair_high, 0)}（現價 ${d.close}）</span>` : ""}</h4>
    <p>${esc(v.explanation)} <small class="muted">— ${esc(v.method)}</small></p>
    <h4>情境</h4>${r.scenarios?.length ? `<div class="table-wrap"><table><thead><tr><th>情境</th><th class="num">價位</th><th class="num">相對現價</th><th>期間</th><th>條件</th></tr></thead><tbody>
      ${r.scenarios.map((s) => { const mid = s.price_low != null && s.price_high != null ? (s.price_low + s.price_high) / 2 : null;
        return `<tr><td><b>${esc(s.name)}</b></td><td class="num">${num(s.price_low, 0)}～${num(s.price_high, 0)}</td>
        <td class="num ${cls(mid - d.close)}">${mid && d.close ? pct((mid / d.close - 1) * 100) : "-"}</td><td class="muted">${esc(s.horizon)}</td><td>${esc(s.condition)}</td></tr>`; }).join("")}</tbody></table></div>` : ""}
    <h4>關鍵價位</h4><p>支撐 ${(k.support || []).map((x) => num(x, 1)).join("、") || "-"}　壓力 ${(k.resistance || []).map((x) => num(x, 1)).join("、") || "-"}
      ${k.invalidation != null ? `　<b>論點失效價 ${num(k.invalidation, 1)}</b>` : ""}<br><small class="muted">${esc(k.explanation)}</small></p>
    <h4>籌碼面</h4><p>${esc(r.chips_view)}</p>
    <div class="grid"><div><h4>風險</h4>${list(r.risks)}</div><div><h4>下一個驗證點</h4>${list(r.watch_items)}</div></div>
    <h4>資料來源</h4><ul class="sources">${[...(r.sources || []), ...(r.web_sources || [])].slice(0, 30).map((s) =>
      `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a>` : esc(s.title)} ${s.date ? `<small class="muted">${esc(s.date)}</small>` : ""}</li>`).join("")}</ul>
    <div class="note">由 ${esc(d.report.model)} 於 ${esc(d.report.created_at.replace("T", " "))} 產生（行情截至 ${esc(d.report.data_date)}）${u.estimated_usd != null ? `，估計費用 US$${u.estimated_usd}` : ""}。
      AI 可能出錯，重要數字請點資料來源核對。僅供研究參考，非投資建議。
      ${r.removed_sources ? `<br>⚠ AI 列出的來源中有 ${r.removed_sources} 個不在實際搜尋結果裡，已自動刪除；相關敘述請特別小心。` : ""}</div>
    <div style="margin-top:8px">${btn("重新產生")}</div></div>`;
}

async function renderResearchPage(code, reportId) {
  const d = await api(`research/${encodeURIComponent(code)}`, { report: reportId || "" });
  if (state.tab !== "research" || state.rcode !== code) return;
  if (!d) return (view.innerHTML = `<div class="empty">找不到股票 ${esc(code)}。<a href="${link("research")}" data-research="">回研究首頁</a></div>`);
  document.title = `${d.stock.code} ${d.stock.name} 研究｜${SITE}`;
  const m = d.metrics || {}, rev = d.revenue, lastRev = rev[rev.length - 1], q = d.quarters, lastQ = q[q.length - 1];
  const fs = d.factset[0], b = d.pe_band, fv = d.fair_value;
  const upside = fs?.factset_target && d.close ? (fs.factset_target / d.close - 1) * 100 : null;
  const kpi = (label, value, sub = "", c = "") => `<div class="card kpi"><div class="label">${label}</div><div class="value sm ${c}">${value}</div><div class="sub muted">${sub}</div></div>`;
  const revRows = rev.slice(-12).reverse();
  view.innerHTML = `
    <div class="row-between" style="margin-bottom:8px">
      <div><a href="${link("research")}" data-research="" class="muted">← 研究首頁</a>
        <h2 style="margin:4px 0">${esc(d.stock.name)} <span class="muted">${esc(d.stock.code)}</span>
          <small class="muted" style="font-size:13px">${esc(d.stock.industry_name || "")}</small></h2>
        <div><b style="font-size:20px">${d.close ?? "-"}</b> <span class="${cls(m.chg_1d)}">${pct(m.chg_1d)}</span>
          <small class="muted">${esc(d.date || "")} 收盤・一年區間 ${m.low_1y ?? "-"}～${m.high_1y ?? "-"}</small></div></div>
      <div><button class="btn ${d.watched ? "on" : ""}" data-watch="${esc(d.stock.code)}" data-watched="${d.watched ? 1 : 0}">${d.watched ? "★ 已追蹤" : "☆ 加入追蹤"}</button>
        <button class="btn" data-code="${esc(d.stock.code)}">K 線與籌碼</button></div></div>
    ${d.patterns?.length || d.chips.alerts.length ? `<div class="flags">${d.chips.alerts.map((a) => `<span class="badge warn">${ALERT_KIND[a.kind]} ${esc(a.date.slice(5))}</span>`).join("")}
      ${d.patterns.map((p) => `<span class="badge ${p.key === "distribution" || p.key === "surge_down" ? "down" : "up"}">${esc(p.text)}</span>`).join("")}</div>` : ""}
    <div class="kpis">
      ${kpi(`${lastRev ? esc(lastRev.ym) : ""} 月營收`, lastRev ? `${qianToYi(lastRev.revenue)} 億` : "-", lastRev ? `月增 ${pct(lastRev.mom_pct)}・年增 ${pct(lastRev.yoy_pct)}` : "尚無資料")}
      ${kpi("今年累計營收", lastRev ? `${qianToYi(lastRev.cum)} 億` : "-", lastRev ? `年增 ${pct(lastRev.cum_yoy_pct)}` : "", cls(lastRev?.cum_yoy_pct))}
      ${kpi(`${lastQ ? lastQ.period : ""} EPS`, lastQ ? num(lastQ.eps) : "-", lastQ ? `近四季 ${num(lastQ.ttm_eps)}・毛利率 ${num(lastQ.gross_margin)}%` : "尚無資料")}
      ${kpi("本益比", b ? `${b.current} 倍` : d.valuation?.pe ? `${d.valuation.pe} 倍` : "-", b ? `一年中位數 ${b.median} 倍` : "")}
      ${kpi("FactSet 目標價", fs?.factset_target ? num(fs.factset_target, 0) : "-", fs ? `${pct(upside)}・${fs.factset_analysts ?? "?"} 位分析師` : "尚無調查", cls(upside))}
      ${kpi("主力進場跡象", `${d.chips.score} / 7`, d.chips.warnings.length ? `⚠ ${d.chips.warnings.map((w) => w.label).join("、")}` : "無警示")}
    </div>
    <div id="reportBox">${reportHtml(d)}</div>
    <div class="grid grid-2" style="margin-top:12px">
      <div class="card"><h3>月營收 <span class="muted" style="font-weight:400">億元</span></h3>
        ${rev.length ? `${columns(rev.map((r) => ({ date: r.ym, v: r.revenue * 1000 })), "v")}
        <div class="table-wrap" style="margin-top:8px"><table><thead><tr><th>月份</th><th class="num">營收</th><th class="num">月增</th><th class="num">年增</th><th class="num">累計年增</th></tr></thead>
          <tbody>${revRows.map((r) => `<tr title="${esc(r.note || "")}"><td>${esc(r.ym)}</td><td class="num">${qianToYi(r.revenue)}</td>
            <td class="num ${cls(r.mom_pct)}">${pct(r.mom_pct)}</td><td class="num ${cls(r.yoy_pct)}">${pct(r.yoy_pct)}</td>
            <td class="num ${cls(r.cum_yoy_pct)}">${pct(r.cum_yoy_pct)}</td></tr>`).join("")}</tbody></table></div>
        ${lastRev?.note ? `<div class="note">公司說明（${esc(lastRev.ym)}）：${esc(lastRev.note)}</div>` : ""}` : `<div class="muted">尚無資料，請執行 <code>python -m twstock.fundamentals</code></div>`}</div>
      <div class="card"><h3>單季獲利</h3>
        ${q.length ? `<div class="table-wrap"><table><thead><tr><th>季度</th><th class="num">營收(億)</th><th class="num">毛利率</th><th class="num">營益率</th><th class="num">EPS</th><th class="num">EPS 年增</th><th class="num">近四季 EPS</th></tr></thead>
          <tbody>${q.slice().reverse().map((x) => `<tr><td>${x.period}</td><td class="num">${qianToYi(x.revenue)}</td>
            <td class="num">${x.gross_margin == null ? "-" : x.gross_margin + "%"}</td><td class="num">${x.op_margin == null ? "-" : x.op_margin + "%"}</td>
            <td class="num"><b>${num(x.eps)}</b></td><td class="num ${cls(x.eps_yoy_pct)}">${x.eps_yoy_pct == null ? "-" : pct(x.eps_yoy_pct)}</td>
            <td class="num">${num(x.ttm_eps)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="muted">尚無資料</div>`}
        <div class="note">單季數字由公開資訊觀測站的年度累計數字相減而來。</div></div>
      <div class="card"><h3>估值</h3>${peBandBar(b)}
        ${fv ? `<table style="margin-top:8px"><thead><tr><th>依據</th><th class="num">EPS</th><th class="num">${fv.multiples[0]}x</th><th class="num">${fv.multiples[1]}x</th><th class="num">${fv.multiples[2]}x</th></tr></thead><tbody>
          <tr><td>近四季 EPS</td><td class="num">${num(fv.trailing.eps)}</td>${fv.trailing.prices.map((p) => `<td class="num ${cls(p - d.close)}">${num(p, 0)}</td>`).join("")}</tr>
          ${fv.forward ? `<tr><td>FactSet ${fv.forward.year} 預估</td><td class="num">${num(fv.forward.eps)}</td>${fv.forward.prices.map((p) => `<td class="num ${cls(p - d.close)}">${num(p, 0)}</td>`).join("")}</tr>` : ""}
          </tbody></table><div class="note">合理價 = EPS × 近一年本益比的 25%／中位數／75%。紅色代表高於現價 ${d.close}。</div>` : ""}
        ${d.valuation ? `<div class="note">證交所 ${esc(d.valuation.date)}：本益比 ${d.valuation.pe ?? "-"}、股價淨值比 ${d.valuation.pb ?? "-"}、殖利率 ${d.valuation.dividend_yield ?? "-"}%</div>` : ""}</div>
      <div class="card"><h3>FactSet 分析師預估 ${d.news_refreshing ? '<small class="muted">（更新中…）</small>' : ""}</h3>
        ${d.factset.length ? `<div class="table-wrap"><table><thead><tr><th>日期</th><th class="num">EPS 預估</th><th class="num">區間</th><th class="num">目標價</th><th class="num">分析師</th></tr></thead>
          <tbody>${d.factset.map((f) => `<tr><td><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.date)}</a></td>
            <td class="num">${num(f.factset_eps)} <small class="muted">${f.factset_year || ""}</small></td>
            <td class="num muted">${f.factset_eps_low != null ? `${num(f.factset_eps_low)}～${num(f.factset_eps_high)}` : "-"}</td>
            <td class="num"><b>${num(f.factset_target, 0)}</b></td><td class="num">${f.factset_analysts ?? "-"}</td></tr>`).join("")}</tbody></table></div>`
          : `<div class="muted">${d.news_refreshing ? "正在從鉅亨網抓取…" : "鉅亨網近期沒有這檔的 FactSet 調查"}</div>`}</div>
    </div>
    <div class="card" style="margin-top:12px"><h3>同業比較 <span class="muted" style="font-weight:400">證交所產業分類「${esc(d.stock.industry_name || "")}」市值前 8 名</span></h3>
      ${d.peers.length ? `<div class="table-wrap"><table><thead><tr><th>股票</th><th class="num">收盤</th><th class="num">市值(億)</th><th class="num">本益比</th><th class="num">淨值比</th>
        <th class="num">殖利率</th><th class="num">近四季 EPS</th><th class="num">毛利率</th><th class="num">月營收年增</th><th class="num">累計年增</th><th class="num">60 日漲跌</th></tr></thead>
        <tbody>${d.peers.map((p) => `<tr data-research="${esc(p.code)}" class="${p.self ? "self" : ""}"><td class="name">${esc(p.name)}<small>${esc(p.code)}</small></td>
          <td class="num">${p.close}</td><td class="num">${yi(p.market_cap, 0)}</td><td class="num">${p.pe ?? "-"}</td><td class="num">${p.pb ?? "-"}</td>
          <td class="num">${p.dividend_yield == null ? "-" : p.dividend_yield + "%"}</td><td class="num">${num(p.ttm_eps)}</td>
          <td class="num">${p.gross_margin == null ? "-" : p.gross_margin + "%"}</td>
          <td class="num ${cls(p.revenue_yoy)}">${pct(p.revenue_yoy)}</td><td class="num ${cls(p.revenue_cum_yoy)}">${pct(p.revenue_cum_yoy)}</td>
          <td class="num ${cls(p.chg_60d)}">${pct(p.chg_60d)}</td></tr>`).join("")}</tbody></table></div>
        <div class="note">證交所產業分類比較粗，不一定是真正的競爭對手（例如散熱廠會被歸在電腦週邊）。AI 報告會另外上網找同業。</div>` : `<div class="muted">無</div>`}</div>
    <div class="grid grid-2" style="margin-top:12px">
      <div class="card"><h3>相關新聞 <span class="muted" style="font-weight:400">鉅亨網</span></h3>
        ${d.news.length ? `<ul class="news">${d.news.map((n) => `<li><small class="muted">${esc(n.date)}</small> <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a></li>`).join("")}</ul>`
          : `<div class="muted">${d.news_refreshing ? "正在抓取…" : "沒有新聞"}</div>`}</div>
      <div class="card"><h3>重大訊息</h3>
        ${d.announcements.length ? `<ul class="news">${d.announcements.map((a) => `<li><small class="muted">${esc(a.date)}</small> <span title="${esc(a.detail)}">${esc(a.subject)}</span></li>`).join("")}</ul>`
          : `<div class="muted">近期沒有（重大訊息從開始執行每日更新後累積）</div>`}</div>
      <div class="card"><h3>籌碼摘要</h3>
        <ul class="checks">${d.chips.checks.map((x) => `<li class="${x.ok ? "ok" : ""}">${x.ok ? "✓" : "·"} ${esc(x.label)}</li>`).join("")}
          ${d.chips.warnings.map((w) => `<li class="warn">⚠ ${esc(w.label)}</li>`).join("")}</ul>
        <div class="note">近 5 日主力集中度 ${d.chips.concentration_5d == null ? "-" : d.chips.concentration_5d + "%"}・
          持有的 ETF ${d.etf_holders.length} 檔。<a href="#" data-code="${esc(d.stock.code)}">看 K 線與完整籌碼 →</a></div></div>
      <div class="card"><h3>三大法人（近 10 日，張）</h3>
        ${d.inst_10d.length ? `<table><thead><tr><th>日期</th><th class="num">外資</th><th class="num">投信</th><th class="num">自營</th><th class="num">合計</th></tr></thead><tbody>
          ${d.inst_10d.slice().reverse().map((x) => `<tr><td class="muted">${esc(x.date.slice(5))}</td>${["foreign_net", "trust_net", "dealer_net", "total_net"].map((k) =>
            `<td class="num ${cls(x[k])}">${lots(x[k])}</td>`).join("")}</tr>`).join("")}</tbody></table>` : `<div class="muted">無</div>`}</div>
    </div>`;
  const pick = $("#reportPick");
  if (pick) pick.addEventListener("change", (e) => renderResearchPage(code, e.target.value));
  // 報告產生中或新聞更新中：幾秒後自動重新整理
  if (d.job?.status === "running" || d.news_refreshing)
    researchTimer = setTimeout(() => state.tab === "research" && state.rcode === code && !$("#detail").open && renderResearchPage(code), d.job?.status === "running" ? 8000 : 5000);
}

view.addEventListener("click", async (e) => {
  const r = e.target.closest("[data-research]");
  if (r) {
    e.preventDefault();
    if (r.dataset.research) return openResearch(r.dataset.research);
    return switchTab("research");
  }
  const w = e.target.closest("[data-watch]");
  if (w) {
    await fetch(`${BASE}api/watchlist/${encodeURIComponent(w.dataset.watch)}`, { method: w.dataset.watched === "1" ? "DELETE" : "POST" });
    return renderResearchPage(w.dataset.watch);
  }
  const g = e.target.closest("[data-generate]");
  if (g) {
    g.disabled = true;
    const res = await fetch(`${BASE}api/research/${encodeURIComponent(g.dataset.generate)}/generate`, { method: "POST" });
    if (!res.ok) { const j = await res.json(); g.disabled = false; return alert(j.error || "失敗"); }
    return renderResearchPage(g.dataset.generate);
  }
}, true);
