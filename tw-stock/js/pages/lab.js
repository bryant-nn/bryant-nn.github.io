// 訊號實驗室：自己組條件 → 回測（5／20／60 日）＋今天符合條件的股票。條件存在網址，可以加書籤或分享。

let labMeta = null;
const LAB_OPS = [">", ">=", "<", "<="];

function labParse(qs) {
  const p = new URLSearchParams(qs);
  const conds = p.getAll("c").map((c) => c.match(/^([a-z0-9_]+)(>=|<=|>|<)(-?[\d.]+)$/)).filter(Boolean).map((m) => ({ f: m[1], op: m[2], v: m[3] }));
  return { conds, first: p.get("first") !== "0", market: p.get("market") || "all" };
}
function labQuery({ conds, first, market }) {
  const p = new URLSearchParams();
  conds.forEach((c) => p.append("c", `${c.f}${c.op}${c.v}`));
  if (!first) p.set("first", "0");
  if (market !== "all") p.set("market", market);
  return p.toString();
}

async function renderLab() {
  if (STATIC) return (view.innerHTML = `<div class="empty">訊號實驗室需要即時計算，只能在本機網站使用。</div>`);
  labMeta = labMeta || (await api("lab-features"));
  const q = labParse(state.labq);
  if (!q.conds.length) q.conds = [{ f: "trust_streak", op: ">=", v: "3" }, { f: "rev_yoy", op: ">", v: "30" }];
  const groups = [...new Set(labMeta.features.map((f) => f.group))];
  const select = (cur) => `<select data-lab="f">${groups.map((g) => `<optgroup label="${esc(g)}">${labMeta.features.filter((f) => f.group === g)
    .map((f) => `<option value="${f.key}"${f.key === cur ? " selected" : ""}>${esc(f.name)}${f.unit ? `（${esc(f.unit)}）` : ""}</option>`).join("")}</optgroup>`).join("")}</select>`;
  const row = (c, i) => `<div class="lab-row" data-i="${i}">${i ? '<span class="muted">而且</span>' : '<span class="muted">條件</span>'}
    ${select(c.f)}<select data-lab="op">${LAB_OPS.map((o) => `<option${o === c.op ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>
    <input data-lab="v" type="number" step="any" value="${esc(c.v)}"><button class="btn" data-lab-del="${i}" title="刪除">✕</button></div>`;
  view.innerHTML = `<div class="card"><h3>訊號實驗室 <span class="muted" style="font-weight:400">自己組條件，看歷史上出現後的表現</span></h3>
      <div class="muted" style="margin-bottom:8px">範例：${labMeta.presets.map((p, i) => `<span class="chip preset" data-preset="${i}">${esc(p.name)}</span>`).join(" ")}</div>
      <div id="labRows">${q.conds.map(row).join("")}</div>
      <div class="lab-row"><button class="btn" id="labAdd">＋ 加條件</button>
        <label><input type="checkbox" id="labFirst"${q.first ? " checked" : ""}> 只算條件「剛成立」那天</label>
        <select id="labMarket">${[["all", "上市＋上櫃"], ["TWSE", "只看上市"], ["TPEX", "只看上櫃"]].map(([v, l]) => `<option value="${v}"${v === q.market ? " selected" : ""}>${l}</option>`).join("")}</select>
        <button class="btn primary" id="labRun">開始回測</button></div>
      <div class="note">只用當天以前、已公布的資料；隔天開盤買、持有 N 日收盤賣，還原權息、扣 0.585% 交易成本，和全市場比較。只看成交金額 1 億以上。</div></div>
    <div id="labResult"><div class="empty">計算中…（第一次用到技術指標約需 10 秒）</div></div>`;

  const read = () => ({
    conds: [...document.querySelectorAll("#labRows .lab-row")].map((r) => ({
      f: r.querySelector('[data-lab="f"]').value, op: r.querySelector('[data-lab="op"]').value, v: r.querySelector('[data-lab="v"]').value || "0" })),
    first: $("#labFirst").checked, market: $("#labMarket").value });
  const apply = (qq, push = true) => { state.labq = labQuery(qq); go({ push }); renderLab(); };
  $("#labRun").onclick = () => apply(read());
  $("#labAdd").onclick = () => {                     // 只加一列，按「開始回測」才計算
    const rows = $("#labRows");
    if (rows.children.length >= 6) return;
    rows.insertAdjacentHTML("beforeend", row({ f: "chg_20", op: ">", v: "10" }, rows.children.length));
    const last = rows.lastElementChild;
    last.querySelector('[data-lab="f"]').onchange = (e) => {
      last.querySelector('[data-lab="v"]').value = labMeta.features.find((x) => x.key === e.target.value).example; };
    last.querySelector("[data-lab-del]").onclick = () => last.remove();
  };
  view.querySelectorAll("[data-lab-del]").forEach((b) => (b.onclick = () => { const r = read(); r.conds.splice(Number(b.dataset.labDel), 1);
    if (r.conds.length) apply(r); }));
  view.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => {
    const p = labMeta.presets[Number(b.dataset.preset)];
    apply({ conds: p.conditions.map((t) => { const m = t.match(/^([a-z0-9_]+)(>=|<=|>|<)(-?[\d.]+)$/); return { f: m[1], op: m[2], v: m[3] }; }), first: true, market: "all" });
  }));
  view.querySelectorAll('[data-lab="f"]').forEach((s) => (s.onchange = () => {
    const f = labMeta.features.find((x) => x.key === s.value); s.closest(".lab-row").querySelector('[data-lab="v"]').value = f.example; }));

  if (!state.labq) { state.labq = labQuery(q); go({ push: false }); }
  let res;
  try {
    res = await fetch(`${BASE}api/lab?${labQuery(q)}`).then(apiJson);
  } catch (err) {
    res = { error: err.message };
  }
  if (state.tab !== "lab") return;
  $("#labResult").innerHTML = labResultHtml(res);
}

function labResultHtml(r) {
  if (r.error) return `<div class="empty">${esc(r.error)}</div>`;
  const vcls = (v) => (v?.startsWith("有效") ? "up" : v?.startsWith("反向") ? "down" : "kind");
  const FN = Object.fromEntries(labMeta.features.map((f) => [f.key, f]));
  return `<div class="card" style="margin-top:12px"><h3>回測結果 <span class="muted" style="font-weight:400">${esc(r.start)} ~ ${esc(r.end)}・${esc(r.conditions.map((c) => c.text).join("　且　"))}</span></h3>
      ${!r.events ? `<div class="empty">歷史上沒有符合條件的事件，試著放寬條件。</div>` : `
      <table><thead><tr><th>持有</th><th class="num">次數／訊號日</th><th class="num">平均報酬</th><th class="num">勝率</th><th class="num">超額報酬</th><th class="num">跑贏大盤比例</th><th>結論</th></tr></thead><tbody>
      ${r.results.map((x) => !x.n ? `<tr><td>${x.horizon} 日</td><td colspan="6" class="muted">資料不足</td></tr>` : `<tr><td>${x.horizon} 日</td>
        <td class="num">${x.n.toLocaleString()}<small class="muted"> / ${x.days} 天</small></td><td class="num ${cls(x.mean)}">${pct(x.mean)}</td>
        <td class="num">${x.win}%</td><td class="num ${cls(x.excess)}"><b>${pct(x.excess)}</b></td><td class="num">${x.excess_win}%</td>
        <td><span class="badge ${vcls(x.verdict)}">${esc(x.verdict)}</span> <small class="muted">t=${x.t}</small></td></tr>`).join("")}</tbody></table>
      <div class="note">|t| ≥ 2 且至少 20 個訊號日才判定有效或反向。條件組合越多，越容易「碰巧」有效（過度擬合）：看到有效時，最好換一段期間或相近條件再確認。</div>`}</div>
    <div class="grid" style="margin-top:12px">
      <div class="card"><h3>今天符合條件 <span class="muted" style="font-weight:400">${esc(r.end)}・${r.today.length} 檔</span></h3>
        ${r.today.length ? `<table><thead><tr><th>股票</th><th class="num">收盤</th><th class="num">漲跌</th>${r.conditions.map((c) => `<th class="num">${esc(FN[c.f].name.slice(0, 10))}</th>`).join("")}</tr></thead><tbody>
          ${r.today.map((t) => `<tr data-code="${esc(t.code)}"><td class="name">${esc(t.code)}${otcTag(t.market)}<small>${esc(t.name)}</small></td>
            <td class="num">${t.close}</td><td class="num ${cls(t.chg_1)}">${pct(t.chg_1)}</td>
            ${r.conditions.map((c) => `<td class="num">${t.values[c.f] ?? "-"}</td>`).join("")}</tr>`).join("")}</tbody></table>` : `<div class="muted">今天沒有符合條件的股票</div>`}</div>
      <div class="card"><h3>最近的歷史事件</h3>
        ${r.recent.length ? `<table><thead><tr><th>日期</th><th>股票</th><th class="num">5 日超額</th><th class="num">20 日超額</th><th class="num">60 日超額</th></tr></thead><tbody>
          ${r.recent.map((e) => `<tr data-code="${esc(e.code)}"><td class="muted">${esc(e.date)}</td><td class="name">${esc(e.code)}<small>${esc(e.name)}</small></td>
            ${[5, 20, 60].map((h) => `<td class="num ${cls(e["excess" + h])}">${e["excess" + h] == null ? "未滿" : pct(e["excess" + h])}</td>`).join("")}</tr>`).join("")}</tbody></table>` : `<div class="muted">無</div>`}</div>
    </div>`;
}
