// 主力訊號分頁。

// ---------- 主力訊號 ----------
function patternList(rows) {
  if (!rows?.length) return `<div class="muted">無</div>`;
  return `<div class="table-wrap"><table><tbody>${rows.slice(0, 15).map((r) => `<tr data-code="${esc(r.code)}">
    <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
    <td class="num ${cls(r.chg_1d)}">${pct(r.chg_1d)}</td>
    <td class="num" title="成交金額 ÷ 20 日均量">${r.ratio20}×</td>
    <td class="num muted hide-sm" title="一年區間位置">${r.pos_1y == null ? "-" : (r.pos_1y * 100).toFixed(0) + "%"}</td>
    <td class="num hide-sm tags">${r.concentration == null ? "" : `<small class="${cls(r.concentration)}" title="近 5 日主力集中度">主力 ${r.concentration > 0 ? "+" : ""}${r.concentration}%</small>`}
      ${r.big_pct_delta == null ? "" : `<small class="${cls(r.big_pct_delta)}">大戶 ${r.big_pct_delta > 0 ? "+" : ""}${r.big_pct_delta}</small>`}</td></tr>`).join("")}</tbody></table></div>
    <div class="note">欄位：漲跌、量能倍數、一年區間位置、近 5 日主力集中度</div>`;
}

async function renderSignals() {
  const s = await api("signals");
  if (!s.date) return (view.innerHTML = `<div class="empty">資料庫還沒有資料，請先執行 <code>python -m twstock.ingest</code></div>`);
  const p = s.patterns || {};
  const warn = [];
  if (s.history_days < 60) warn.push(`K 線歷史只有 ${s.history_days} 天，量能比較不準。請執行 <code>python -m twstock.ingest --history 250</code> 回補一年。`);
  if (!s.broker_stocks) warn.push(`還沒有券商分點資料，請執行 <code>python -m twstock.chips</code>。`);
  if (!s.holders_date) warn.push(`還沒有集保資料，請執行 <code>python -m twstock.chips</code>。`);
  else if (!s.big_holders.up.length) warn.push(`集保資料只有一週（${esc(s.holders_date)}），下週更新後才看得到大戶增減。`);
  view.innerHTML = `
    <div class="card" style="margin-bottom:12px"><div class="muted" style="font-size:13px">
      行情 ${esc(s.date)}（${s.history_days} 天歷史）・大盤 10 日 ${pct(s.index_chg10)}・
      分點 ${s.broker_stocks} 檔 ${periodLabel(s.broker_dates)}・集保 ${esc(s.holders_date || "無")}</div>
      ${warn.map((w) => `<div class="note">⚠ ${w}</div>`).join("")}</div>
    <div class="card"><h3>主力進場跡象 <span class="muted" style="font-weight:400">符合 3 項以上（共 7 項）</span></h3>
      ${!s.smart_money.length ? `<div class="empty">目前沒有符合 3 項以上的股票</div>` : `<div class="table-wrap"><table>
        <thead><tr><th>股票</th><th class="num">符合</th><th class="num">收盤</th><th class="num">漲跌</th><th>符合項目</th><th>警示</th></tr></thead>
        <tbody>${s.smart_money.slice(0, 50).map((r) => `<tr data-code="${esc(r.code)}">
          <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
          <td class="num"><b>${r.score}</b></td><td class="num">${r.close}</td>
          <td class="num ${cls(r.chg_1d)}">${pct(r.chg_1d)}</td>
          <td class="etf-list">${r.passed.map(esc).join("、")}</td>
          <td class="etf-list down">${r.warnings.map(esc).join("、")}</td></tr>`).join("")}</tbody></table></div>`}
      <div class="note">七項：千張大戶比例上升、散戶人數減少、主力集中度、分點低檔（一年區間下半部）連買、法人連買、低檔量縮抗跌、主動式 ETF 加碼。只是跡象，不是買賣建議。</div></div>
    <div class="grid grid-2" style="margin-top:12px">
      <div class="card"><h3>爆量上漲</h3>${patternList(p.surge_up)}</div>
      <div class="card"><h3>爆量下跌</h3>${patternList(p.surge_down)}</div>
      <div class="card"><h3>疑似出貨 <span class="muted" style="font-weight:400">長上影／高檔爆量收黑</span></h3>${patternList(p.distribution)}</div>
      <div class="card"><h3>低檔量縮抗跌</h3>${patternList(p.quiet)}</div>
      <div class="card"><h3>帶量突破 <span class="muted" style="font-weight:400">創 20 日新高、收長紅</span></h3>${patternList(p.breakout)}</div>
      <div class="card"><h3>分點低檔連續買超 <span class="muted" style="font-weight:400">一年區間下半部、未急拉、排除隔日沖</span></h3>
        ${!s.branch_accum.length ? `<div class="muted">無</div>` : `<table><tbody>${s.branch_accum.slice(0, 15).map((r) => `<tr data-code="${esc(r.code)}">
          <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
          <td class="etf-list">${r.branches.map((b) => `${esc(b.name)} ${b.days} 天 ${lots(b.net)} 張`).join("<br>")}</td></tr>`).join("")}</tbody></table>`}</div>
      <div class="card"><h3>千張大戶比例增加</h3>${holderList(s.big_holders.up)}</div>
      <div class="card"><h3>千張大戶比例減少</h3>${holderList(s.big_holders.down)}</div>
    </div>
    <div class="card" style="margin-top:12px"><h3>注意股／處置股 <span class="muted" style="font-weight:400">近 14 天</span></h3>
      ${!s.alerts.length ? `<div class="muted">無</div>` : `<div class="table-wrap"><table>
        <thead><tr><th>日期</th><th>股票</th><th>類別</th><th>原因</th><th>處置期間</th></tr></thead>
        <tbody>${s.alerts.map((a) => `<tr data-code="${esc(a.code)}"><td class="muted">${esc(a.date)}</td>
          <td class="name">${esc(a.name)}<small>${esc(a.code)}</small></td>
          <td><span class="badge warn">${ALERT_KIND[a.kind]}</span></td>
          <td class="etf-list">${esc(a.reason)}</td><td class="muted">${esc(a.period || "")}</td></tr>`).join("")}</tbody></table></div>`}</div>`;
}

function holderList(rows) {
  if (!rows?.length) return `<div class="muted">資料不足兩週</div>`;
  return `<table><tbody>${rows.slice(0, 10).map((r) => `<tr data-code="${esc(r.code)}">
    <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
    <td class="num">${r.big_pct.toFixed(2)}%</td>
    <td class="num ${cls(r.big_pct_delta)}">${r.big_pct_delta > 0 ? "+" : ""}${r.big_pct_delta}</td>
    <td class="num muted hide-sm">散戶 ${r.retail_delta > 0 ? "+" : ""}${(r.retail_delta ?? 0).toLocaleString()}</td></tr>`).join("")}</tbody></table>`;
}
