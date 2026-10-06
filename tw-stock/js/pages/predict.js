// 預測選股：LightGBM 預測「未來 20 日跑贏全市場」的機率；樣本外績效、和只看營收比較、機率準不準、今日排行與原因。

async function renderPredict() {
  if (STATIC) return (view.innerHTML = `<div class="empty">預測選股只在本機網站提供。</div>`);
  const r = await api("predict");
  if (!r || r.empty) return (view.innerHTML = `<div class="empty">${esc(r?.reason || "還沒有預測結果")}</div>`);
  const s = r.summary;
  const vcls = s.verdict.startsWith("有效") ? "up" : s.verdict.startsWith("反向") ? "down" : "kind";
  const tval = (t) => (t == null ? "" : `<small class="muted"> t=${t}</small>`);
  view.innerHTML = `
    <div class="card"><h3>預測選股 <span class="muted" style="font-weight:400">${esc(r.model)}・預測未來 ${r.horizon} 個交易日跑贏全市場的機率・${esc(r.date)}</span></h3>
      <div class="kpis">
        <div class="card kpi"><div class="label">樣本外結論</div><div class="value" style="font-size:18px"><span class="badge ${vcls}">${esc(s.verdict)}</span></div>
          <div class="sub">${s.periods} 期（${esc(s.first || "-")} ～ ${esc(s.last || "-")}）</div></div>
        <div class="card kpi"><div class="label">模型前 20% 每期超額</div><div class="value ${cls(s.model_excess)}">${pct(s.model_excess)}</div>
          <div class="sub">跑贏期數 ${s.model_win ?? "-"}%${tval(s.model_t)}</div></div>
        <div class="card kpi"><div class="label">對照：只看月營收前 20%</div><div class="value ${cls(s.base_excess)}">${pct(s.base_excess)}</div>
          <div class="sub">模型多贏 ${pct(s.vs_base)}${tval(s.vs_base_t)}</div></div>
        <div class="card kpi"><div class="label">AUC（0.5＝亂猜）</div><div class="value">${s.auc ?? "-"}</div><div class="sub">每期等級相關 ${s.ic ?? "-"}</div></div>
      </div>
      ${r.series.length ? `<div class="muted" style="font-size:12px;margin-top:8px">每期「前 20% − 全市場」的超額報酬（模型）</div>
        ${columns(r.series.map((x) => ({ date: x.date, v: x.model })), "v", (v) => pct(v))}` : ""}
      <div class="note">每個月只用當時已揭曉答案的資料重新訓練、預測下個月，所以上面全部是樣本外結果。
        模型參數固定、沒有用測試資料調整。只有在樣本外明顯跑贏全市場（t ≥ 2、至少 12 期）時才算有效。</div></div>

    <div class="grid" style="margin-top:12px">
      <div class="card"><h3>機率準不準？</h3>
        <table><thead><tr><th>預測機率（分 5 組）</th><th class="num">實際跑贏比例</th><th class="num">平均超額</th><th class="num">樣本</th></tr></thead><tbody>
          ${r.calibration.map((c) => `<tr><td>${c.predicted}%</td><td class="num">${c.actual}%</td><td class="num ${cls(c.excess)}">${pct(c.excess)}</td><td class="num">${c.n.toLocaleString()}</td></tr>`).join("")}
        </tbody></table>
        <div class="note">好的模型：預測機率越高，實際跑贏的比例也越高，而且兩者接近。如果高機率組反而表現較差，代表模型目前不可信。</div></div>
      <div class="card"><h3>模型最看重的特徵</h3>
        <table><tbody>${r.importance.map((x) => `<tr><td>${esc(x.name)}</td><td class="num">${x.share}%</td></tr>`).join("")}</tbody></table></div>
    </div>

    <div class="card" style="margin-top:12px"><h3>今日預測排行 <span class="muted" style="font-weight:400">${esc(r.date)}・評分 ${r.universe} 檔（成交金額 1 億以上）</span></h3>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>股票</th><th class="hide-sm">產業</th><th class="num">跑贏機率</th><th>主要原因（↑ 提高、↓ 降低機率）</th></tr></thead><tbody>
        ${r.top.map((x, i) => `<tr data-code="${esc(x.code)}"><td>${i + 1}</td><td class="name">${esc(x.code)}${otcTag(x.market)}<small>${esc(x.name)}</small></td>
          <td class="hide-sm muted">${esc(x.industry)}</td><td class="num"><b>${x.prob}%</b></td>
          <td style="font-size:12px">${x.reasons.map((y) => `<span class="${y.push > 0 ? "up" : "down"}">${y.push > 0 ? "↑" : "↓"} ${esc(y.name)} ${num(y.value, 2)}${esc(y.unit)}</span>`).join("　")}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="note">機率是模型的統計估計，不是買賣建議；樣本外結論不是「有效」時，這份排行僅供觀察。</div></div>`;
}
