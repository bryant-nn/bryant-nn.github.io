// 聰明錢：主動式 ETF 經理人、券商分點「買進之後真的會漲嗎」。

async function renderSmart() {
  const r = await api("smart");
  if (!r) return (view.innerHTML = `<div class="empty">還沒有結果：每日例行工作會自動計算（或執行 <code>twstock daily</code>）</div>`);
  const vcls = (v) => (v?.startsWith("有效") ? "up" : v?.startsWith("反向") ? "down" : "kind");
  const cell = (s) => (!s || !s.n ? `<td class="num muted">-</td><td></td>` :
    `<td class="num ${cls(s.excess)}"><b>${pct(s.excess)}</b><small class="muted"> ${s.n} 次</small></td>
     <td><span class="badge ${vcls(s.verdict)}">${esc(s.verdict.split("：")[0])}</span> <small class="muted">t=${s.t}</small></td>`);
  const b = r.branches;
  const brRows = (rows) => rows.map((x) => `<tr><td class="nowrap"><b>${esc(x.name)}</b>${x.day_trader ? ' <span class="badge warn">隔日沖</span>' : ""}</td>
    <td class="num nowrap">${x.events}<small class="muted"> / ${x.stocks} 檔</small></td>${cell(x.s5)}${cell(x.s20)}</tr>`).join("");
  const verdict = b.pass_t2 > b.expected_by_chance * 2 && b.pass_strict
    ? "通過門檻的分點明顯多於碰巧預期，前幾名可能真的有選股力。"
    : `通過門檻的分點（${b.pass_t2} 個）和純靠運氣預期的數量（約 ${b.expected_by_chance} 個）差距不大、也沒有分點通過 t ≥ 3，<b>目前還不能說找到了真正的聰明錢</b>，排名僅供參考。`;
  view.innerHTML = `
    <div class="card"><h3>主動式 ETF 經理人：加碼之後真的會漲嗎？ <span class="muted" style="font-weight:400">${esc(r.etf.first || "")} ～ ${esc(r.date)}</span></h3>
      <div class="table-wrap"><table><thead><tr><th>ETF</th><th class="num">新增／加碼後 5 日超額</th><th>結論</th>
        <th class="num">20 日超額</th><th>結論</th><th class="num">減碼／刪除後 5 日超額</th><th></th></tr></thead><tbody>
        ${r.etf.etfs.map((e) => `<tr><td><b>${esc(e.etf_name)}</b> <small class="muted">${esc(e.etf_code)}</small></td>
          ${cell(e.buy[5])}${cell(e.buy[20])}${cell(e.sell[5])}</tr>`).join("")}</tbody></table></div>
      <div class="note">持股日的下一個交易日才當作「知道了」（持股通常隔天公布），再隔天開盤買進，和同日全市場比較、扣交易成本。
        加碼已扣除申購買回造成的被動增減。資料只有約兩個月，20 日的次數更少，結論要保守看。</div></div>

    <div class="card" style="margin-top:12px"><h3>券商分點：大量買超之後真的會漲嗎？ <span class="muted" style="font-weight:400">${esc(b.dates[0] || "")} ～ ${esc(b.dates[1] || "")}・${b.days} 個交易日</span></h3>
      <div class="kpis">
        <div class="card kpi"><div class="label">檢驗的分點</div><div class="value">${b.tested}</div><div class="sub">至少 ${b.rules.min_events} 次大量買超</div></div>
        <div class="card kpi"><div class="label">5 日 t ≥ 2（跑贏）</div><div class="value up">${b.pass_t2}</div><div class="sub">純靠運氣預期約 ${b.expected_by_chance} 個</div></div>
        <div class="card kpi"><div class="label">5 日 t ≥ 3（嚴格）</div><div class="value">${b.pass_strict}</div><div class="sub">多重檢定下較可信</div></div>
        <div class="card kpi"><div class="label">5 日 t ≤ −2（跑輸）</div><div class="value down">${b.fail_t2}</div><div class="sub">買了反而跌</div></div>
      </div>
      <div class="note" style="margin-bottom:10px">${verdict}</div>
      <div class="grid">
        <div><h4>買超後表現最好</h4><div class="table-wrap"><table><thead><tr><th>分點</th><th class="num">次數</th><th class="num">5 日超額</th><th></th><th class="num">20 日超額</th><th></th></tr></thead>
          <tbody>${brRows(b.top.slice(0, 15))}</tbody></table></div></div>
        <div><h4>買超後表現最差</h4><div class="table-wrap"><table><thead><tr><th>分點</th><th class="num">次數</th><th class="num">5 日超額</th><th></th><th class="num">20 日超額</th><th></th></tr></thead>
          <tbody>${brRows(b.bottom.slice(0, 15))}</tbody></table></div></div>
      </div>
      <div class="note">大量買超＝單日買超 ≥ ${b.rules.min_shares / 1000} 張且 ≥ 當日成交量 ${b.rules.min_ratio}%；分點資料收盤後公布，隔天開盤買進。
        只涵蓋每天成交金額前 300 名的股票、各列前 15 大分點。同時檢驗幾百個分點，純靠運氣也會有約 2.5% 通過 t ≥ 2。</div></div>`;
}
