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
  labMeta = labMeta || (STATIC ? await labLoadMeta() : await api("lab-features"));
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
    <div id="labResult"><div class="empty">計算中…（${STATIC ? "第一次使用要下載約 10 MB 歷史資料，之後會快取" : "第一次用到技術指標約需 10 秒"}）</div></div>`;

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
    res = STATIC ? await labStatic(q) : await fetch(`${BASE}api/lab?${labQuery(q)}`).then(apiJson);   // 公開版在瀏覽器裡算
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

// ---------- 公開版：在瀏覽器裡回測（規則同 application/lab.py、domain/backtest.py） ----------
// 資料由 twstock/adapters/inbound/static_lab.py 匯出：data/lab/<欄位>/<YYYY-MM>.bin
// （特徵 Float64、報酬 r*/x* Float32、_date／_stock Uint16）
let labStaticMeta = null;
const labColCache = {};

async function labLoadMeta() {
  labStaticMeta = labStaticMeta || (await fetch(`${BASE}data/lab/meta.json`).then((r) => r.json()));
  return labStaticMeta;
}

function labCol(meta, col) {
  if (!labColCache[col]) {
    const T = col.startsWith("_") ? Uint16Array : /^[rx]\d+$/.test(col) ? Float32Array : Float64Array;
    labColCache[col] = Promise.all(meta.months.map((m) => fetch(`${BASE}data/lab/${col}/${m}.bin`).then((r) => r.arrayBuffer())))
      .then((bufs) => {
        const parts = bufs.map((b) => new T(b));
        const out = new T(parts.reduce((a, p) => a + p.length, 0));
        let o = 0;
        for (const p of parts) { out.set(p, o); o += p.length; }
        return out;
      });
  }
  return labColCache[col];
}

const LAB_FNS = { ">": (a, b) => a > b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, "<=": (a, b) => a <= b };

function labRound(x, d = 2) { return Math.round(x * 10 ** d) / 10 ** d; }

function labSummarize(rets, exc, dates) {
  const n = rets.length;
  if (!n) return { n: 0, days: 0 };
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const byDay = new Map();
  dates.forEach((d, i) => { if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(exc[i]); });
  const daily = [...byDay.values()].map(mean);
  const md = mean(daily);
  const sd = daily.length > 1 ? Math.sqrt(daily.reduce((s, x) => s + (x - md) ** 2, 0) / (daily.length - 1)) : 0;
  const t = sd ? md / (sd / Math.sqrt(daily.length)) : 0;
  const sorted = [...rets].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const meanEx = mean(exc);
  const verdict = n < 30 || daily.length < 20 ? "樣本不足"
    : t >= 2 && meanEx > 0 ? "有效：出現後跑贏大盤" : t <= -2 && meanEx < 0 ? "反向：出現後跑輸大盤" : "沒有明顯效果";
  return { days: daily.length, n, mean: labRound(mean(rets)), median: labRound(median), win: labRound((rets.filter((r) => r > 0).length / n) * 100, 1),
           excess: labRound(meanEx), excess_win: labRound((exc.filter((e) => e > 0).length / n) * 100, 1), t: labRound(t), verdict };
}

async function labStatic(q) {
  const meta = await labLoadMeta();
  const conds = q.conds.map((c) => ({ f: c.f, op: c.op, v: Number(c.v) }));
  const H = meta.horizons;
  const need = ["_date", "_stock", "_prev", ...new Set(conds.map((c) => c.f)), ...H.map((h) => "r" + h), ...H.map((h) => "x" + h)];
  const cols = Object.fromEntries(await Promise.all(need.map(async (c) => [c, await labCol(meta, c)])));
  const D = cols._date, S = cols._stock, P = cols._prev, last = meta.dates.length - 1;
  const matchedAt = new Map();          // 股票 -> 最近一次符合條件的日期索引
  const ev = Object.fromEntries(H.map((h) => [h, { d: [], r: [], x: [] }]));
  const today = [], recent = [];
  let events = 0;
  for (let k = 0; k < D.length; k++) {
    const d = D[k], s = S[k];
    const st = meta.stocks[s];
    if (q.market !== "all" && st.market !== q.market) continue;
    let ok = true;
    for (const c of conds) { const x = cols[c.f][k]; if (Number.isNaN(x) || !LAB_FNS[c.op](x, c.v)) { ok = false; break; } }
    if (!ok) continue;
    const wasMatched = matchedAt.get(s) === P[k];             // 這檔股票前一筆行情也符合條件
    matchedAt.set(s, d);
    if (q.first && wasMatched) continue;                     // 只算條件「剛成立」那天
    if (d === last) {
      const lq = meta.last_quotes[s] || [];
      today.push({ code: st.code, name: st.name, industry: st.industry, market: st.market, close: lq[0], chg_1: lq[1] == null ? null : labRound(lq[1]),
                   values: Object.fromEntries(conds.map((c) => [c.f, Number.isNaN(cols[c.f][k]) ? null : labRound(cols[c.f][k])])) });
      continue;
    }
    events++;
    const e = { date: meta.dates[d], code: st.code, name: st.name };
    for (const h of H) {
      const r = cols["r" + h][k], x = cols["x" + h][k];
      if (!Number.isNaN(r) && !Number.isNaN(x)) { ev[h].d.push(d); ev[h].r.push(r); ev[h].x.push(x); e["excess" + h] = labRound(x); }
    }
    recent.push(e);
  }
  const FN = Object.fromEntries(meta.features.map((f) => [f.key, f]));
  recent.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return {
    conditions: conds.map((c) => ({ ...c, text: `${FN[c.f].name} ${c.op} ${c.v}${FN[c.f].unit}` })),
    first_only: q.first, market: q.market, start: meta.start, end: meta.last, events,
    results: H.map((h) => ({ ...labSummarize(ev[h].r, ev[h].x, ev[h].d), horizon: h })),
    today: today.sort((a, b) => (a.code < b.code ? -1 : 1)), recent: recent.slice(0, 40),
  };
}
