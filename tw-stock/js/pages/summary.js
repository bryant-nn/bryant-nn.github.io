// 每日摘要。

// ---------- 各頁 ----------
async function renderSummary() {
  const s = await api("summary");
  if (!s) return (view.innerHTML = `<div class="empty">資料庫還沒有資料，請先執行 <code>python -m twstock.ingest</code></div>`);
  const m = s.market || {};
  const kpi = (label, v, sub = "") => `<div class="card kpi"><div class="label">${label}</div>
      <div class="value ${cls(v)}">${v == null ? "-" : signed(yi(v, 1))}<small> 億</small></div><div class="sub">${sub}</div></div>`;
  const idx = s.index;
  view.innerHTML = `
    <div class="kpis">
      <div class="card kpi"><div class="label">加權指數 ${s.date}</div>
        <div class="value">${idx ? idx.close.toLocaleString() : "-"}</div>
        <div class="sub ${cls(idx?.change)}">${idx ? `${signed(idx.change.toFixed(2))}（${pct(idx.change_pct)}）` : ""}</div></div>
      ${kpi("外資", m.foreign)}${kpi("投信", m.trust)}${kpi("自營商", m.dealer)}${kpi("三大法人合計", m.total)}
    </div>
    <div class="grid">
      <div class="card"><h3>今日重點</h3><ul class="hl">${s.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>
      <div class="card"><h3>近 ${s.market_series.length} 日大盤法人買賣超（億）</h3>
        <div class="seg" id="seriesSeg">${["foreign", "trust", "dealer", "total"].map((k, i) =>
          `<button data-k="${k}" class="${i === 0 ? "active" : ""}">${INV[k]}</button>`).join("")}</div>
        <div id="seriesChart" style="margin-top:10px">${columns(s.market_series, "foreign")}</div></div>
    </div>
    <h3>${s.date} 法人買賣超排行</h3>
    <div class="grid">
      ${["foreign", "trust", "dealer"].map((inv) => `
        <div class="card"><h3>${INV[inv]}買超前 10</h3>${miniList(s.tops[inv].buy, inv)}</div>
        <div class="card"><h3>${INV[inv]}賣超前 10</h3>${miniList(s.tops[inv].sell, inv)}</div>`).join("")}
    </div>
    <div class="grid" style="margin-top:12px">
      <div class="card"><h3>板塊資金流向（三大法人）</h3>
        ${divergingBars([...s.sector_buy, ...s.sector_sell.slice().reverse()], "industry", "total_amt")}</div>
      <div class="card"><h3>投信連續買超</h3>${streakList(s.streaks.trust, "trust")}</div>
      <div class="card"><h3>外資連續買超</h3>${streakList(s.streaks.foreign, "foreign")}</div>
      <div class="card"><h3>法人買賣超占成交量比例最高</h3>
        <table><tbody>${s.heavy_ratio.map((r) => `<tr data-code="${esc(r.code)}">
          <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
          <td class="num ${cls(r.total_net)}">${lots(r.total_net)} 張</td>
          <td class="num ${cls(r.ratio)}">${r.ratio}%</td></tr>`).join("")}</tbody></table>
        <div class="muted" style="font-size:12px;margin-top:6px">成交金額 1 億以上；比例越高代表法人主導當日成交。</div></div>
    </div>
    ${s.etf ? `<h3>主動式 ETF 共識（${esc(s.etf.dates[s.etf.dates.length - 1])}）</h3>
    <div class="grid">
      <div class="card"><h3>多檔同時買進</h3>${consensusList(s.etf.consensus_buy, "buy_etfs")}</div>
      <div class="card"><h3>多檔同時賣出</h3>${consensusList(s.etf.consensus_sell, "sell_etfs")}</div>
    </div>` : ""}`;
  document.querySelectorAll("#seriesSeg button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#seriesSeg button").forEach((x) => x.classList.toggle("active", x === b));
    $("#seriesChart").innerHTML = columns(s.market_series, b.dataset.k);
  }));
}

function streakList(rows, inv) {
  if (!rows.length) return `<div class="muted">目前沒有連續 3 天以上買超的個股</div>`;
  return `<table><tbody>${rows.map((r) => `<tr data-code="${esc(r.code)}">
    <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
    <td>${streakBadge(r.streak)}</td>
    <td class="num ${cls(r[inv + "_amt"])}">${signed(yi(r[inv + "_amt"]))} 億</td></tr>`).join("")}</tbody></table>`;
}
