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
  const [s, bt] = await Promise.all([api("signals"), api("backtest")]);
  const run = bt?.run;
  // 各訊號 20 天的回測結論，放在清單標題旁邊
  const bt20 = Object.fromEntries((run?.results || []).filter((r) => r.horizon === 20).map((r) => [r.signal, r]));
  const btTag = (key) => {
    const r = bt20[key];
    if (!r || !r.n) return "";
    const c = r.verdict.startsWith("有效") ? "up" : r.verdict.startsWith("反向") ? "down" : "kind";
    return ` <span class="badge ${c}" title="回測：出現後 20 天平均超額報酬 ${r.excess}%（${r.n} 次、${r.days} 個訊號日）">回測：${esc(r.verdict.split("：")[0])}</span>`;
  };
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
    <div class="card"><h3>主力進場跡象 <span class="muted" style="font-weight:400">符合 3 項以上（共 5 項計分）</span></h3>
      ${!s.smart_money.length ? `<div class="empty">目前沒有符合 3 項以上的股票${!s.big_holders.up.length
        ? "<br><small>集保資料還不滿兩週，「千張大戶比例上升」「散戶人數減少」暫時無法成立，現在最多只能拿 3 分；下週集保更新後才會完整。</small>" : ""}</div>` : `<div class="table-wrap"><table>
        <thead><tr><th>股票</th><th class="num">符合</th><th class="num">收盤</th><th class="num">漲跌</th><th>符合項目</th><th>警示</th></tr></thead>
        <tbody>${s.smart_money.slice(0, 50).map((r) => `<tr data-code="${esc(r.code)}">
          <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
          <td class="num"><b>${r.score}</b></td><td class="num">${r.close}</td>
          <td class="num ${cls(r.chg_1d)}">${pct(r.chg_1d)}</td>
          <td class="etf-list">${r.passed.map(esc).join("、")}</td>
          <td class="etf-list down">${r.warnings.map(esc).join("、")}</td></tr>`).join("")}</tbody></table></div>`}
      <div class="note">計分 5 項：千張大戶比例上升、散戶人數減少、主力集中度、分點低檔連買、主動式 ETF 加碼。依一年回測修正：「低檔量縮抗跌」出現後跑輸大盤，改列警示；「法人連買」短期跑輸大盤，改為不計分。只是跡象，不是買賣建議。</div></div>
    <div class="grid grid-2" style="margin-top:12px">
      <div class="card"><h3>爆量上漲${btTag("surge_up")}</h3>${patternList(p.surge_up)}</div>
      <div class="card"><h3>爆量下跌${btTag("surge_down")}</h3>${patternList(p.surge_down)}</div>
      <div class="card"><h3>疑似出貨${btTag("distribution")} <span class="muted" style="font-weight:400">長上影／高檔爆量收黑</span></h3>${patternList(p.distribution)}</div>
      <div class="card"><h3>低檔量縮抗跌${btTag("quiet")}</h3>${patternList(p.quiet)}</div>
      <div class="card"><h3>帶量突破${btTag("breakout")} <span class="muted" style="font-weight:400">創 20 日新高、收長紅</span></h3>${patternList(p.breakout)}</div>
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
          <td class="etf-list">${esc(a.reason)}</td><td class="muted">${esc(a.period || "")}</td></tr>`).join("")}</tbody></table></div>`}</div>
    ${backtestCard(run)}`;
}

function holderList(rows) {
  if (!rows?.length) return `<div class="muted">資料不足兩週</div>`;
  return `<table><tbody>${rows.slice(0, 10).map((r) => `<tr data-code="${esc(r.code)}">
    <td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
    <td class="num">${r.big_pct.toFixed(2)}%</td>
    <td class="num ${cls(r.big_pct_delta)}">${r.big_pct_delta > 0 ? "+" : ""}${r.big_pct_delta}</td>
    <td class="num muted hide-sm">散戶 ${r.retail_delta > 0 ? "+" : ""}${(r.retail_delta ?? 0).toLocaleString()}</td></tr>`).join("")}</tbody></table>`;
}

// 訊號回測表：每個訊號出現後 5／20／60 天的表現（twstock backtest）
function backtestCard(run) {
  if (!run) return `<div class="card" style="margin-top:12px"><h3>訊號回測</h3><div class="muted">還沒有回測結果：執行 <code>twstock backtest</code></div></div>`;
  const rows = run.results.filter((r) => r.signal !== "market");
  const mkt = Object.fromEntries(run.results.filter((r) => r.signal === "market").map((r) => [r.horizon, r]));
  const vcls = (v) => (v.startsWith("有效") ? "up" : v.startsWith("反向") ? "down" : "kind");
  const cell = (r) => !r.n ? `<td class="num muted" colspan="5">沒有事件</td>` : `
    <td class="num">${r.n.toLocaleString()}<small class="muted"> / ${r.days} 天</small></td>
    <td class="num ${cls(r.mean)}">${pct(r.mean)}</td><td class="num">${r.win}%</td>
    <td class="num ${cls(r.excess)}"><b>${pct(r.excess)}</b></td>
    <td><span class="badge ${vcls(r.verdict)}">${esc(r.verdict)}</span> <small class="muted">t=${r.t}</small></td>`;
  return `<div class="card" style="margin-top:12px"><h3>訊號回測 <span class="muted" style="font-weight:400">${esc(run.start_date)} ~ ${esc(run.end_date)}・規則版本 ${esc(run.version)}</span></h3>
    <div class="table-wrap"><table>
      <thead><tr><th>訊號</th><th class="num">持有</th><th class="num">次數／訊號日</th><th class="num">平均報酬</th><th class="num">勝率</th><th class="num">超額報酬</th><th>結論</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${r.horizon} 天</td>${cell(r)}</tr>`).join("")}
        ${[5, 20, 60].filter((h) => mkt[h]).map((h) => `<tr class="muted"><td>全市場平均（對照）</td><td class="num">${h} 天</td>
          <td class="num">${mkt[h].n.toLocaleString()}</td><td class="num">${pct(mkt[h].mean)}</td><td class="num">${mkt[h].win}%</td><td></td><td></td></tr>`).join("")}</tbody></table></div>
    <div class="note">訊號日收盤後才知道訊號，隔天開盤買進、持有 N 天收盤賣出；價格還原權息，已扣手續費與證交稅（0.585%）。
      超額報酬＝和同一天進出的全市場平均相比。t 值按訊號日計算（同一天多檔只算一次）；|t| ≥ 2 且至少 20 個訊號日才判定有效或反向。
      只有一年資料、而且這一年大盤大漲，結論換個市況可能就不成立。</div></div>`;
}
