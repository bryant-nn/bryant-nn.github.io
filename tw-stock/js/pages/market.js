// 個股排行、板塊、權值股。

async function renderStocks() {
  const r = await api("stocks", { days: state.days, investor: state.inv, order: state.order,
                                   industry: state.industry, q: state.q, limit: 100 });
  view.innerHTML = `<div class="card"><h3>${INV[state.inv]}${state.q ? "搜尋結果" : state.order === "buy" ? "買超排行" : "賣超排行"}
      <span class="muted" style="font-weight:400">${periodLabel(r.dates)}</span></h3>
      ${stockTable(r.rows, { inv: state.inv })}</div>`;
}

async function renderSectors() {
  const r = await api("sectors", { days: state.days });
  const key = `${state.inv}_amt`;
  const rows = r.rows.slice().sort((a, b) => (b[key] || 0) - (a[key] || 0));
  view.innerHTML = `<div class="grid">
    <div class="card"><h3>${INV[state.inv]}板塊買賣超（億）<span class="muted" style="font-weight:400"> ${periodLabel(r.dates)}</span></h3>
      ${divergingBars(rows, "industry", key)}
      <div class="muted" style="font-size:12px;margin-top:6px">點選板塊可查看個股</div></div>
    <div class="card"><h3>板塊明細</h3><div class="table-wrap"><table>
      <thead><tr><th>產業</th><th class="num">外資</th><th class="num">投信</th><th class="num">自營</th><th class="num">合計</th><th class="num">買/賣家數</th><th>買超前三</th></tr></thead>
      <tbody>${rows.map((s) => `<tr data-industry="${esc(s.industry)}">
        <td>${esc(s.industry)}</td>
        ${["foreign", "trust", "dealer", "total"].map((k) => `<td class="num ${cls(s[k + "_amt"])}">${yi(s[k + "_amt"], 1)}</td>`).join("")}
        <td class="num"><span class="up">${s.buy_count}</span>/<span class="down">${s.sell_count}</span></td>
        <td class="muted">${s.top_buy.map((t) => esc(t.name)).join("、")}</td></tr>`).join("")}</tbody></table></div></div>
  </div>`;
}

async function renderWeights() {
  const r = await api("weights", { days: state.days, top: 50 });
  const t = r.totals;
  const key = `${state.inv}_amt`;
  view.innerHTML = `
    ${t ? `<div class="kpis">
      <div class="card kpi"><div class="label">權值股 ${INV[state.inv]}買賣超</div>
        <div class="value ${cls(t.top[key])}">${signed(yi(t.top[key], 1))}<small> 億</small></div>
        <div class="sub muted">市值前 50 名，占上市總市值 ${t.top_weight_pct}%</div></div>
      <div class="card kpi"><div class="label">非權值股 ${INV[state.inv]}買賣超</div>
        <div class="value ${cls(t.others[key])}">${signed(yi(t.others[key], 1))}<small> 億</small></div>
        <div class="sub muted">${periodLabel(r.dates)}</div></div></div>` : ""}
    <div class="card"><h3>權值股（依市值排序）</h3>${stockTable(r.rows, { inv: state.inv, showRank: true, showWeight: true })}</div>`;
}
