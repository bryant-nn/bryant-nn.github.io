// 個股視窗：K 線、籌碼面板、三大法人、持有的 ETF；視窗內的點擊。

// ---------- 籌碼面板 ----------
let chipsState = { data: null, range: 120, bdays: 5 };

function brokerTable(rows) {
  if (!rows.length) return `<div class="muted">無</div>`;
  return `<table><tbody>${rows.map((b) => `<tr>
    <td>${esc(b.name)}${b.day_trader ? ' <span class="badge warn">隔日沖</span>' : ""}</td>
    <td class="num ${cls(b.net)}">${lots(b.net)} 張</td><td class="num muted hide-sm">${b.days} 天</td></tr>`).join("")}</tbody></table>`;
}

function chipsHtml(c) {
  const m = c.metrics, h = c.holders_change, b = c.brokers[chipsState.bdays];
  const kl = c.kline.slice(-chipsState.range);
  return `
    ${c.alerts.length || c.patterns.length ? `<div class="flags">
      ${c.alerts.map((a) => `<span class="badge warn" title="${esc(a.reason || "")}">${ALERT_KIND[a.kind]} ${esc(a.date.slice(5))}${a.period ? "（" + esc(a.period) + "）" : ""}</span>`).join("")}
      ${c.patterns.map((p) => `<span class="badge ${p.key === "distribution" || p.key === "surge_down" ? "down" : "up"}">${esc(p.text)}</span>`).join("")}</div>` : ""}
    <div class="row-between"><h4>K 線</h4>${segHtml("data-kr", [[60, "3 月"], [120, "6 月"], [250, "1 年"]], chipsState.range)}</div>
    ${klineSvg(kl)}
    ${m ? `<div class="kpis" style="margin-top:10px">
      <div class="card kpi"><div class="label">成交金額</div><div class="value sm">${yi(m.value)} 億</div><div class="sub muted">20 日均 ${yi(m.avg20_value)} 億</div></div>
      <div class="card kpi"><div class="label">量能倍數</div><div class="value sm ${m.ratio20 >= 2.5 ? "up" : ""}">${m.ratio20}×</div><div class="sub muted">和前 20 日平均比</div></div>
      <div class="card kpi"><div class="label">一年百分位</div><div class="value sm">${(m.pct_rank * 100).toFixed(0)}</div><div class="sub muted">近 ${m.history_days} 日成交金額</div></div>
      <div class="card kpi"><div class="label">一年區間位置</div><div class="value sm">${m.pos_1y == null ? "-" : (m.pos_1y * 100).toFixed(0) + "%"}</div><div class="sub muted">${m.low_1y} ~ ${m.high_1y}</div></div>
    </div>` : ""}
    <h4>主力進場跡象 <span class="muted" style="font-weight:400">${c.score} / ${c.max_score} 項</span></h4>
    ${checkList(c.checks, c.warnings)}
    <div class="note">單一指標不能判斷主力動向，請綜合來看；分點資料只涵蓋每天買賣超前 15 名。</div>
    <div class="grid" style="margin-top:12px">
      <div class="card"><h3>千張大戶 ${h ? `<span class="muted" style="font-weight:400">${esc(h.date)}</span>` : ""}</h3>
        ${h ? `<table><tbody>
          <tr><td>千張大戶持股</td><td class="num"><b>${h.big_pct.toFixed(2)}%</b> ${h.big_pct_delta == null ? "" : wDelta(h.big_pct_delta)}</td></tr>
          <tr><td>千張大戶人數</td><td class="num">${h.big_holders.toLocaleString()}</td></tr>
          <tr><td>400 張以下人數</td><td class="num">${h.retail_holders.toLocaleString()} ${h.retail_delta == null ? "" : `<small class="${cls(-h.retail_delta)}">${h.retail_delta > 0 ? "+" : ""}${h.retail_delta.toLocaleString()}</small>`}</td></tr>
          <tr><td>總股東人數</td><td class="num">${h.total_holders.toLocaleString()}</td></tr></tbody></table>
          ${c.holders.length > 1 ? `<div class="muted" style="margin:8px 0 4px;font-size:12px">每週變化</div>
            <table><thead><tr><th>週</th><th class="num">千張持股</th><th class="num">400 張以下人數</th></tr></thead><tbody>
            ${c.holders.slice().reverse().slice(0, 8).map((x, i, a) => `<tr><td class="muted">${esc(x.date.slice(5))}</td>
              <td class="num">${x.big_pct.toFixed(2)}% ${a[i + 1] ? wDelta(+(x.big_pct - a[i + 1].big_pct).toFixed(2)) : ""}</td>
              <td class="num">${x.retail_holders.toLocaleString()}</td></tr>`).join("")}</tbody></table>`
            : `<div class="note">集保每週公布一次，累積兩週以上才看得到變化。</div>`}`
        : `<div class="muted">沒有集保資料，請執行 <code>python -m twstock.chips</code></div>`}</div>
      <div class="card"><div class="row-between"><h3>券商分點 ${b.concentration == null ? "" : `<span class="muted" style="font-weight:400">集中度 <b class="${cls(b.concentration)}">${b.concentration}%</b></span>`}</h3>
        ${segHtml("data-bd", [[1, "1 日"], [5, "5 日"], [20, "20 日"]], chipsState.bdays)}</div>
        ${!b.dates.length ? `<div class="muted">沒有分點資料（只抓成交金額前 300 名）</div>` : `
        <div class="muted" style="font-size:12px">${periodLabel(b.dates)}（${b.dates.length} 天）</div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">
          <div><div class="muted" style="font-size:12px">買超</div>${brokerTable(b.buy.slice(0, 8))}</div>
          <div><div class="muted" style="font-size:12px">賣超</div>${brokerTable(b.sell.slice(0, 8))}</div></div>`}
        ${c.branch_streaks.length ? `<div class="muted" style="margin-top:8px;font-size:12px">連續買超分點</div>
          <table><tbody>${c.branch_streaks.map((s) => `<tr><td>${esc(s.name)}${s.day_trader ? ' <span class="badge warn">隔日沖</span>' : ""}</td>
            <td class="num">連買 ${s.days} 天</td><td class="num up">${lots(s.net)} 張</td>
            <td class="num ${cls(s.rise_pct)}">${s.rise_pct == null ? "" : pct(s.rise_pct)}</td></tr>`).join("")}</tbody></table>` : ""}
      </div>
    </div>`;
}

function notFound(what, why = "") {
  $("#detailTitle").textContent = what;
  $("#detailBody").innerHTML = `<div class="empty">找不到資料${why ? `<br><small>${esc(why)}</small>` : ""}</div>`;
  document.title = `${what}｜${SITE}`;
  if (!$("#detail").open) $("#detail").showModal();
}

async function showDetail(code, { push = true } = {}) {
  detail = { type: "stock", code };
  if (push) go();
  const [d, c] = await Promise.all([api(`stock/${encodeURIComponent(code)}`), api(`chips/${encodeURIComponent(code)}`)]);
  if (detail?.code !== code) return;   // 等待期間已經切到別的視窗
  if (!d) return notFound(`股票 ${code}`, STATIC ? "公開版只收錄權值股前 50 名、追蹤清單與有 AI 報告的股票" : "");
  chipsState.data = c;
  document.title = `${d.stock.code} ${d.stock.name}｜${SITE}`;
  $("#detailTitle").textContent = `${d.stock.code} ${d.stock.name}　${d.stock.market === "TPEX" ? "上櫃・" : ""}${d.stock.industry_name || ""}`;
  const rows = d.rows;
  const series = rows.map((x) => ({ date: x.date, v: (x.total_net || 0) * (x.close || 0) }));
  $("#detailBody").innerHTML = `<div class="row-between"><span></span>
      <a href="${link("research/" + code)}" data-open-research="${esc(code)}" class="btn">個股研究頁（營收、估值、AI 報告）→</a></div>
    <div id="chipsBox">${chipsHtml(c)}</div>
    <h4>三大法人</h4>${!rows.length ? `<div class="muted" style="margin:8px 0">沒有法人資料</div>` : `
    <div class="muted" style="margin:8px 0">近 ${rows.length} 日三大法人買賣超金額（估算，億）</div>
    ${columns(series, "v")}
    <div class="table-wrap" style="margin-top:12px"><table>
      <thead><tr><th>日期</th><th class="num">收盤</th><th class="num">外資</th><th class="num">投信</th><th class="num">自營</th><th class="num">合計(張)</th><th class="num">占量</th></tr></thead>
      <tbody>${rows.slice().reverse().map((x) => `<tr>
        <td>${x.date}</td><td class="num ${cls(x.change)}">${x.close ?? "-"}</td>
        ${["foreign_net", "trust_net", "dealer_net", "total_net"].map((k) => `<td class="num ${cls(x[k])}">${lots(x[k])}</td>`).join("")}
        <td class="num">${x.volume ? ((x.total_net / x.volume) * 100).toFixed(1) + "%" : "-"}</td></tr>`).join("")}</tbody></table></div>`}
    ${marginTable(d.margin)}
    ${etfHolders(d.etf)}`;
  if (!$("#detail").open) $("#detail").showModal();
  $("#detail").scrollTop = 0;
}
$("#detailClose").addEventListener("click", () => $("#detail").close());
// 按 ✕ 或 Esc 關閉視窗：網址回到背後的分頁（上一頁可以再打開）
$("#detail").addEventListener("close", () => {
  if (!detail) return;   // 上一頁造成的關閉，網址已經對了
  detail = null;
  go();
});
// 對話框裡點股票、點 ETF 可以互相跳轉
$("#detailBody").addEventListener("click", (e) => {
  const res = e.target.closest("[data-open-research]");
  if (res) { e.preventDefault(); return openResearch(res.dataset.openResearch); }
  const seg = e.target.closest("[data-kr],[data-bd]");
  if (seg) {
    if (seg.dataset.kr) chipsState.range = Number(seg.dataset.kr);
    if (seg.dataset.bd) chipsState.bdays = Number(seg.dataset.bd);
    $("#chipsBox").innerHTML = chipsHtml(chipsState.data);
    return;
  }
  const etf = e.target.closest("[data-etf]");
  if (etf) return showEtf(etf.dataset.etf);
  const tr = e.target.closest("[data-code]");
  if (tr) showDetail(tr.dataset.code);
});

view.addEventListener("click", (e) => {
  const etf = e.target.closest("[data-etf]");
  if (etf) return showEtf(etf.dataset.etf);
  const tr = e.target.closest("[data-code]");
  if (tr) return showDetail(tr.dataset.code);
  const ind = e.target.closest("[data-industry]");
  if (ind && !STATIC) {                     // 公開版沒有匯出各產業的篩選結果
    state.industry = ind.dataset.industry;
    switchTab("stocks");
  }
});

// 融資融券（張）：餘額、增減、券資比
function marginTable(rows) {
  if (!rows?.length) return "";
  const n = (v) => (v == null ? "-" : v.toLocaleString());
  const d = (v) => (v == null ? "-" : `${v > 0 ? "+" : ""}${v.toLocaleString()}`);
  const first = rows[0], last = rows[rows.length - 1];
  const mChg = last.margin_balance - first.margin_balance + first.margin_change;
  return `<h4>融資融券 <span class="muted" style="font-weight:400">近 ${rows.length} 日融資 <span class="${cls(mChg)}">${d(mChg)}</span> 張</span></h4>
    <div class="table-wrap"><table>
      <thead><tr><th>日期</th><th class="num">收盤</th><th class="num">融資餘額</th><th class="num">融資增減</th>
        <th class="num">融券餘額</th><th class="num">融券增減</th><th class="num">券資比</th><th class="num hide-sm">資券相抵</th></tr></thead>
      <tbody>${rows.slice().reverse().map((x) => `<tr><td>${x.date}</td><td class="num">${x.close ?? "-"}</td>
        <td class="num">${n(x.margin_balance)}</td><td class="num ${cls(x.margin_change)}">${d(x.margin_change)}</td>
        <td class="num">${n(x.short_balance)}</td><td class="num ${cls(x.short_change)}">${d(x.short_change)}</td>
        <td class="num">${x.short_ratio == null ? "-" : x.short_ratio + "%"}</td><td class="num hide-sm">${n(x.offset_qty)}</td></tr>`).join("")}
      </tbody></table></div>
    <div class="note">單位：張。融資增加代表散戶用借錢買進；券資比高時，軋空的可能性較大。</div>`;
}
