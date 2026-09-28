// ETF 持股分頁、ETF 視窗、個股的持有 ETF 區塊。

// ---------- ETF ----------
function consensusList(rows, key) {
  if (!rows?.length) return `<div class="muted">無</div>`;
  return `<table><tbody>${rows.slice(0, 10).map((a) => `<tr data-code="${esc(a.code)}">
    <td class="name">${esc(a.name)}<small>${esc(a.code)}</small></td>
    <td class="num"><b>${a[key].length}</b> 檔</td>
    <td class="num ${cls(a.adj_amt)}">${signed(yi(a.adj_amt))} 億</td>
    <td class="etf-list hide-sm">${a[key].map(esc).join("、")}</td></tr>`).join("")}</tbody></table>`;
}

function flowList(rows) {
  if (!rows?.length) return `<div class="muted">無</div>`;
  return `<table><tbody>${rows.slice(0, 10).map((a, i) => `<tr data-code="${esc(a.code)}">
    <td class="muted">${i + 1}</td><td class="name">${esc(a.name)}<small>${esc(a.code)}</small></td>
    <td class="num ${cls(a.net_shares)}">${lots(a.net_shares)} 張</td>
    <td class="num ${cls(a.net_amt)}">${signed(yi(a.net_amt))} 億</td></tr>`).join("")}</tbody></table>`;
}

function eventTable(rows, { showEtf = true, showStock = true } = {}) {
  if (!rows?.length) return `<div class="empty">沒有加減碼</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>日期</th>${showEtf ? "<th>ETF</th>" : ""}${showStock ? "<th>股票</th>" : ""}<th>動作</th>
      <th class="num">實際(張)</th><th class="num hide-sm">扣申贖(張)</th><th class="num">金額(億)</th><th class="num">權重</th></tr></thead>
    <tbody>${rows.map((r) => `<tr data-code="${esc(r.code)}">
      <td class="muted">${esc(r.date.slice(5))}</td>
      ${showEtf ? `<td class="name">${esc(r.etf_name)}<small>${esc(r.etf_code)}</small></td>` : ""}
      ${showStock ? `<td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>` : ""}
      <td>${typeBadge(r.type)}</td>
      <td class="num ${cls(r.delta)}">${lots(r.delta)}</td>
      <td class="num hide-sm ${cls(r.adj_delta)}">${lots(r.adj_delta)}</td>
      <td class="num ${cls(r.adj_amount)}">${yi(r.adj_amount)}</td>
      <td class="num">${w2(r.prev_weight)} → ${w2(r.weight)}</td></tr>`).join("")}</tbody></table></div>`;
}

async function renderEtf() {
  const [f, list] = await Promise.all([api("etf-flows", { days: state.days, kind: state.kind }), api("etfs", { kind: state.kind })]);
  if (!list.rows.length) return (view.innerHTML = `<div class="empty">還沒有 ETF 持股資料，請執行 <code>python -m twstock.etf --days 20</code></div>`);
  const t = f.totals || {};
  const kpi = (label, v, sub) => `<div class="card kpi"><div class="label">${label}</div>
      <div class="value ${cls(v)}">${v == null ? "-" : signed(yi(v, 1))}<small> 億</small></div><div class="sub muted">${sub}</div></div>`;
  view.innerHTML = `
    <div class="kpis">
      ${state.kind !== "passive" ? kpi("主動式 ETF 實際買賣", t.active, "含申購買回造成的買賣") : ""}
      ${state.kind !== "active" ? kpi("被動式 ETF 實際買賣", t.passive, "幾乎全來自申購買回") : ""}
      <div class="card kpi"><div class="label">加減碼事件</div><div class="value">${t.events ?? 0}<small> 筆</small></div>
        <div class="sub muted">${periodLabel(f.dates)}</div></div>
    </div>
    <div class="grid grid-2">
      <div class="card"><h3>ETF 加碼／新增 <span class="muted" style="font-weight:400">依檔數排序</span></h3>${consensusList(f.consensus_buy, "buy_etfs")}
        <div class="note">新增或加碼的 ETF 檔數；金額為扣除申購買回後的主動調整。</div></div>
      <div class="card"><h3>ETF 減碼／刪除 <span class="muted" style="font-weight:400">依檔數排序</span></h3>${consensusList(f.consensus_sell, "sell_etfs")}</div>
    </div>
    <div class="grid grid-2" style="margin-top:12px">
      <div class="card"><h3>ETF 實際買進最多</h3>${flowList(f.flow_buy)}
        <div class="note">含申購買回造成的被動買賣，也就是 ETF 在市場上真正買進的量。</div></div>
      <div class="card"><h3>ETF 實際賣出最多</h3>${flowList(f.flow_sell)}</div>
    </div>
    <div class="card" style="margin-top:12px"><h3>加減碼明細 <span class="muted" style="font-weight:400">依金額排序</span></h3>
      ${eventTable(f.events.slice(0, 100))}
      <div class="note">加碼／減碼：扣除申購買回後，持股股數變動 5% 以上。「實際」為持股股數實際增減，「扣申贖」為經理人主動調整的部分。</div></div>
    <div class="card" style="margin-top:12px"><h3>ETF 列表 <span class="muted" style="font-weight:400">點選查看完整持股</span></h3>
      <div class="table-wrap"><table>
        <thead><tr><th>ETF</th><th>類型</th><th>持股日</th><th class="num">規模(億)</th><th class="num">單位數變化</th>
          <th class="num hide-sm">持股數</th><th class="num">加減碼</th><th class="num">實際買賣(億)</th></tr></thead>
        <tbody>${list.rows.map((e) => `<tr data-etf="${esc(e.etf_code)}">
          <td class="name">${esc(e.etf_name)}<small>${esc(e.etf_code)}</small></td>
          <td>${kindBadge(e.kind)}</td><td class="muted">${esc(e.date)}</td>
          <td class="num">${e.aum ? yi(e.aum, 0) : "-"}</td>
          <td class="num ${cls(e.units_chg_pct)}">${pct(e.units_chg_pct)}</td>
          <td class="num hide-sm">${e.holdings}</td><td class="num">${e.events || ""}</td>
          <td class="num ${cls(e.net_amt)}">${yi(e.net_amt)}</td></tr>`).join("")}</tbody></table></div>
      <div class="note">單位數變化：正值代表投資人申購（資金流入），負值代表買回（資金流出）。</div></div>`;
}

async function showEtf(code, { push = true } = {}) {
  detail = { type: "etf", code };
  if (push) go();
  const d = await api(`etf/${encodeURIComponent(code)}`, { date: "" });
  if (detail?.code !== code) return;   // 等待期間已經切到別的視窗
  if (!d) return notFound(`ETF ${code}`, STATIC ? "公開版沒有收錄這檔 ETF" : "");
  const s = d.snapshot;
  document.title = `${d.etf.code} ${d.etf.name}｜${SITE}`;
  $("#detailTitle").textContent = `${d.etf.code} ${d.etf.name}　${d.etf.issuer || ""}${d.etf.kind === "active" ? "（主動式）" : "（被動式）"}`;
  // 申購買回金額 ≈ 單位數增減 × 每單位淨值
  const h = d.history;
  const unitChg = h.slice(1).map((x, i) => ({ date: x.date, v: x.units && h[i].units && x.nav ? (x.units - h[i].units) * x.nav : 0 }));
  $("#detailBody").innerHTML = !s ? `<div class="empty">沒有資料</div>` : `
    <div class="kpis" style="margin-top:8px">
      <div class="card kpi"><div class="label">持股日</div><div class="value" style="font-size:16px">${esc(s.date)}</div></div>
      <div class="card kpi"><div class="label">規模</div><div class="value" style="font-size:16px">${s.aum ? yi(s.aum, 0) + " 億" : "-"}</div></div>
      <div class="card kpi"><div class="label">單位數變化</div><div class="value ${cls(s.units_chg_pct)}" style="font-size:16px">${pct(s.units_chg_pct)}</div></div>
    </div>
    ${unitChg.length > 1 ? `<div class="muted" style="margin:8px 0">近 ${unitChg.length} 日申購買回金額（億，估算；紅＝資金流入）</div>${columns(unitChg, "v")}` : ""}
    <div class="table-wrap" style="margin-top:12px"><table>
      <thead><tr><th>股票</th><th class="num">權重</th><th class="num">持有(張)</th><th class="num">增減(張)</th><th>動作</th></tr></thead>
      <tbody>${d.rows.map((r) => `<tr data-code="${esc(r.code)}">
        <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
        <td class="num">${w2(r.weight)} ${wDelta(r.weight_delta)}</td>
        <td class="num">${lots(r.shares)}</td>
        <td class="num ${cls(r.delta)}">${r.delta ? lots(r.delta) : ""}</td>
        <td>${typeBadge(r.type)}</td></tr>`).join("")}</tbody></table></div>`;
  if (!$("#detail").open) $("#detail").showModal();
  $("#detail").scrollTop = 0;
}

function etfHolders(e) {
  if (!e || (!e.holders.length && !e.events.length)) return "";
  return `<h4 style="margin:16px 0 6px">持有的 ETF（${e.holders.length} 檔）</h4>
    ${e.holders.length ? `<div class="table-wrap"><table>
      <thead><tr><th>ETF</th><th>類型</th><th class="num">權重</th><th class="num">持有(張)</th><th class="num">最近增減</th><th>持股日</th></tr></thead>
      <tbody>${e.holders.map((h) => `<tr data-etf="${esc(h.etf_code)}">
        <td class="name">${esc(h.etf_name)}<small>${esc(h.etf_code)}</small></td><td>${kindBadge(h.kind)}</td>
        <td class="num">${w2(h.weight)}</td><td class="num">${lots(h.shares)}</td>
        <td class="num ${cls(h.delta)}">${h.delta ? lots(h.delta) : ""} ${typeBadge(h.type)}</td>
        <td class="muted">${esc(h.date)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${e.events.length ? `<h4 style="margin:16px 0 6px">近期 ETF 加減碼</h4>${eventTable(e.events, { showStock: false })}` : ""}`;
}
