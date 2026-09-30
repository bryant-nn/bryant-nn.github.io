// 量化選股：多因子研究（因子預測力、樣本外績效）、今日多因子排名、AI 建議追蹤。

async function renderQuant() {
  const q = await api("quant");
  const f = q?.factors;
  if (!f) return (view.innerHTML = `<div class="empty">還沒有多因子研究結果：執行 <code>twstock factors</code>（每日例行也會自動跑）</div>`);
  const g = f.schemes[f.default_scheme];
  const vcls = (v) => (v.startsWith("有效") ? "up" : v.startsWith("反向") ? "down" : "kind");
  const FN = Object.fromEntries(f.factors.map((x) => [x.key, x.name]));
  view.innerHTML = `
    <div class="card" style="margin-bottom:12px"><h3>今日多因子排名 <span class="muted" style="font-weight:400">${esc(f.date)}・評分 ${f.universe} 檔（成交金額 1 億以上）</span></h3>
      <div class="muted" style="margin-bottom:8px">使用的因子：${Object.keys(f.weights).map((k) => `<span class="badge kind">${esc(FN[k] || k)}</span>`).join(" ") || "目前沒有證據足夠的因子"}</div>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>股票</th><th class="hide-sm">產業</th><th class="num">收盤</th><th class="num">分數</th>
        ${Object.keys(f.weights).map((k) => `<th class="num">${esc(FN[k] || k)}</th>`).join("")}</tr></thead><tbody>
        ${f.top.map((r, i) => `<tr data-code="${esc(r.code)}"><td>${i + 1}</td><td class="name">${esc(r.code)}${otcTag(r.market)}<small>${esc(r.name)}</small></td>
          <td class="hide-sm muted">${esc(r.industry)}</td><td class="num">${r.close}</td><td class="num"><b>${r.score.toFixed(2)}</b></td>
          ${Object.keys(f.weights).map((k) => `<td class="num">${r.raw[k] == null ? "-" : num(r.raw[k], 1)}${k.startsWith("rev_") ? "%" : ""}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>
      <div class="note">分數是各因子標準化後依歷史預測力加權。這是統計排名，不是買進建議；樣本外表現見下方。</div></div>

    <div class="grid">
      <div class="card"><h3>綜合分數的樣本外表現 <span class="muted" style="font-weight:400">每 ${f.step} 個交易日選一次、持有 ${f.horizon} 日</span></h3>
        <table><thead><tr><th>做法</th><th class="num">期數</th><th class="num">前 20%</th><th class="num">全市場</th><th class="num">超額</th><th class="num">跑贏期數</th><th>結論</th></tr></thead><tbody>
          ${Object.entries(f.schemes).map(([k, s]) => `<tr${k === f.default_scheme ? ' style="font-weight:600"' : ""}><td>${esc(s.name)}${k === f.default_scheme ? "（目前採用）" : ""}</td>
            <td class="num">${s.periods}</td><td class="num ${cls(s.top)}">${pct(s.top)}</td><td class="num ${cls(s.all)}">${pct(s.all)}</td>
            <td class="num ${cls(s.excess)}"><b>${pct(s.excess)}</b></td><td class="num">${s.win ?? "-"}%</td>
            <td><span class="badge ${vcls(s.verdict)}">${esc(s.verdict)}</span> <small class="muted">t=${s.t ?? "-"}</small></td></tr>`).join("")}
        </tbody></table>
        ${g.series.length ? `<div style="margin-top:10px">${columns(g.series.map((x) => ({ date: x.date, v: x.top - x.all })), "v", (v) => pct(v))}</div>
          <div class="muted" style="font-size:12px">每一期「前 20% − 全市場」的超額報酬（目前採用的做法）</div>` : ""}
        <div class="note">樣本外：每一期的權重只用「當時已經知道結果」的歷史決定，不偷看未來。
          只有一年資料、期數少且持有期重疊，t 值已按重疊折減；|t| ≥ 2 且至少 8 期才判定有效。</div></div>
      <div class="card"><h3>各因子的預測力（IC）</h3>
        <table><thead><tr><th>因子</th><th class="num">平均 IC</th><th class="num">t 值</th><th class="num">正相關期數</th><th class="num">覆蓋</th></tr></thead><tbody>
          ${f.factors.map((x) => `<tr${x.key in f.weights ? ' style="font-weight:600"' : ""}><td>${esc(x.name)}${x.key in f.weights ? " ✓" : ""}</td>
            <td class="num ${cls(x.ic)}">${x.ic ?? "-"}</td><td class="num">${x.t ?? "-"}</td><td class="num">${x.hit ?? "-"}%</td><td class="num">${x.coverage}%</td></tr>`).join("")}
        </tbody></table>
        <div class="note">IC＝因子排名與之後 ${f.horizon} 日報酬排名的相關係數（−1～1），正數代表因子越高、之後越會漲。✓＝通過證據門檻、目前被採用。</div></div>
    </div>
    ${trackCard(q.track)}`;
}

function trackCard(t) {
  const s = t.summary, calls = t.calls;
  const SRC = { report: "AI 報告", committee: "研究會議" };
  return `<div class="card" style="margin-top:12px"><h3>AI 建議追蹤 <span class="muted" style="font-weight:400">共 ${s.total} 次，${s.n} 次已滿 ${s.horizon} 日</span></h3>
    ${s.n ? `<div class="kpis">
      <div class="card kpi"><div class="label">看多後 ${s.horizon} 日超額</div><div class="value ${cls(s.bull_excess)}">${pct(s.bull_excess)}</div><div class="sub">${s.bull_n} 次</div></div>
      <div class="card kpi"><div class="label">看空後 ${s.horizon} 日超額</div><div class="value ${cls(s.bear_excess)}">${pct(s.bear_excess)}</div><div class="sub">${s.bear_n} 次</div></div>
      <div class="card kpi"><div class="label">方向正確率</div><div class="value">${s.hit ?? "-"}%</div><div class="sub">看多跑贏／看空跑輸大盤的比例</div></div></div>` : ""}
    ${calls.length ? `<div class="table-wrap"><table><thead><tr><th>日期</th><th>股票</th><th>來源</th><th>結論</th>
      <th class="num">5 日超額</th><th class="num">20 日超額</th><th class="num">60 日超額</th></tr></thead><tbody>
      ${calls.slice().reverse().map((c) => `<tr><td>${esc(c.date)}</td><td class="name">${esc(c.code)}<small>${esc(c.name || "")}</small></td>
        <td class="muted">${SRC[c.source]}</td><td><span class="badge ${STANCE_CLS[c.stance] || "kind"}">${esc(c.stance || "-")}</span></td>
        ${[5, 20, 60].map((h) => `<td class="num ${cls(c["excess" + h])}">${c["excess" + h] == null ? "未滿" : pct(c["excess" + h])}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>` : `<div class="muted">還沒有 AI 建議。到「個股研究」產生報告或召開研究會議後，這裡會自動追蹤實際表現。</div>`}
    <div class="note">從資料日隔天開盤買進、持有 N 日，扣交易成本，和同一天進出的全市場平均比較。追蹤結果也會提供給下一次的研究會議參考。</div></div>`;
}
