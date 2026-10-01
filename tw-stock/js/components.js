// 共用畫面元件：個股表格、排行、長條圖、柱狀圖、K 線。

// ---------- 共用元件 ----------
function stockTable(rows, { inv, showRank = false, showWeight = false } = {}) {
  if (!rows.length) return `<div class="empty">沒有資料</div>`;
  const amtKey = `${inv}_amt`;
  return `<div class="table-wrap"><table>
    <thead><tr>
      ${showRank ? "<th>#</th>" : ""}
      <th>股票</th><th class="hide-sm">產業</th>
      ${showWeight ? '<th class="num">權重</th>' : ""}
      <th class="num">收盤</th><th class="num">漲跌</th>
      <th class="num hide-sm">外資(張)</th><th class="num hide-sm">投信(張)</th><th class="num hide-sm">自營(張)</th>
      <th class="num">${INV[inv]}(張)</th><th class="num">${INV[inv]}金額(億)</th>
      <th class="num hide-sm">占成交量</th><th>連續</th>
    </tr></thead><tbody>
    ${rows.map((r) => `<tr data-code="${esc(r.code)}">
      ${showRank ? `<td>${r.rank}</td>` : ""}
      <td class="name">${esc(r.code)}${otcTag(r.market)}<small>${esc(r.name)}</small></td>
      <td class="hide-sm muted">${esc(r.industry)}</td>
      ${showWeight ? `<td class="num">${r.weight_pct.toFixed(2)}%</td>` : ""}
      <td class="num">${r.close ?? "-"}</td>
      <td class="num ${cls(r.change)}">${pct(r.change_pct)}</td>
      <td class="num hide-sm ${cls(r.foreign_net)}">${lots(r.foreign_net)}</td>
      <td class="num hide-sm ${cls(r.trust_net)}">${lots(r.trust_net)}</td>
      <td class="num hide-sm ${cls(r.dealer_net)}">${lots(r.dealer_net)}</td>
      <td class="num ${cls(r[inv + "_net"])}"><b>${lots(r[inv + "_net"])}</b></td>
      <td class="num ${cls(r[amtKey])}">${yi(r[amtKey])}</td>
      <td class="num hide-sm">${r.net_to_volume_pct == null ? "-" : r.net_to_volume_pct + "%"}</td>
      <td>${streakBadge(r.streak)}</td>
    </tr>`).join("")}
    </tbody></table></div>`;
}

function miniList(rows, inv) {
  if (!rows.length) return `<div class="muted">無</div>`;
  return `<table><tbody>${rows.map((r, i) => `<tr data-code="${esc(r.code)}">
      <td class="muted">${i + 1}</td><td class="name">${esc(r.name)}<small>${esc(r.code)}</small></td>
      <td class="num ${cls(r[inv + "_net"])}">${lots(r[inv + "_net"])} 張</td>
      <td class="num ${cls(r[inv + "_amt"])}">${signed(yi(r[inv + "_amt"]))} 億</td></tr>`).join("")}</tbody></table>`;
}

function divergingBars(items, labelKey, valueKey, fmt = (v) => signed(yi(v, 1)) + " 億") {
  const max = Math.max(1, ...items.map((x) => Math.abs(x[valueKey] || 0)));
  return items.map((x) => {
    const v = x[valueKey] || 0, w = (Math.abs(v) / max) * 50;
    return `<div class="bar-row" data-industry="${esc(x[labelKey])}">
      <span>${esc(x[labelKey])}</span>
      <span class="bar-track"><span class="bar ${v >= 0 ? "pos" : "neg"}" style="width:${w}%"></span></span>
      <span class="num ${cls(v)}">${fmt(v)}</span></div>`;
  }).join("");
}

function columns(series, key, fmt = (v) => `${signed(yi(v, 1))} 億`) {
  const max = Math.max(1, ...series.map((x) => Math.abs(x[key] || 0)));
  return `<div class="cols">${series.map((x) => {
      const v = x[key] || 0, h = (Math.abs(v) / max) * 100;
      return `<div class="c" title="${x.date} ${fmt(v)}">
        <span style="height:${h}%;background:var(--${v >= 0 ? "up" : "down"})"></span></div>`;
    }).join("")}</div>
    <div class="cols-labels">${series.map((x) => `<span>${x.date.slice(5)}</span>`).join("")}</div>`;
}

// ---------- K 線 ----------
function klineSvg(kl, ind = "") {
  if (kl.length < 2) return `<div class="muted">K 線資料不足，請執行 <code>python -m twstock.ingest --history 250</code></div>`;
  const W = 900, PH = 240, VH = 70, GAP = 8, H = PH + GAP + VH, L = 48, R = 8, n = kl.length;
  const hi = Math.max(...kl.map((k) => k.high)), lo = Math.min(...kl.map((k) => k.low));
  const vmax = Math.max(1, ...kl.map((k) => k.volume || 0));
  const x = (i) => L + ((i + 0.5) * (W - L - R)) / n, bw = Math.max(1, ((W - L - R) / n) * 0.7);
  const y = (p) => 6 + ((hi - p) / (hi - lo || 1)) * (PH - 12);
  const col = (k) => (k.close >= k.open ? "var(--up)" : "var(--down)");
  const line = (key, color) => {
    const pts = kl.map((k, i) => (k[key] == null ? null : `${x(i).toFixed(1)},${y(k[key]).toFixed(1)}`)).filter(Boolean);
    return pts.length > 1 ? `<polyline fill="none" stroke="${color}" stroke-width="1.2" points="${pts.join(" ")}"/>` : "";
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + (hi - lo) * t);
  const labels = kl.map((k, i) => [i, k.date]).filter(([i], j) => j % Math.ceil(n / 6) === 0);
  return `<svg class="kline" viewBox="0 0 ${W} ${H + 16}" preserveAspectRatio="none" role="img" aria-label="K 線圖">
    ${ticks.map((p) => `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" class="grid-l"/>
      <text x="${L - 4}" y="${y(p) + 3}" class="ax" text-anchor="end">${p >= 100 ? p.toFixed(0) : p.toFixed(1)}</text>`).join("")}
    ${kl.map((k, i) => `<g><title>${k.date} 開${k.open} 高${k.high} 低${k.low} 收${k.close}　量 ${lots(k.volume)} 張　${yi(k.value)} 億</title>
      <line x1="${x(i)}" x2="${x(i)}" y1="${y(k.high)}" y2="${y(k.low)}" stroke="${col(k)}"/>
      <rect x="${x(i) - bw / 2}" y="${Math.min(y(k.open), y(k.close))}" width="${bw}" height="${Math.max(1, Math.abs(y(k.open) - y(k.close)))}" fill="${col(k)}"/>
      <rect x="${x(i) - bw / 2}" y="${H - ((k.volume || 0) / vmax) * VH}" width="${bw}" height="${((k.volume || 0) / vmax) * VH}" fill="${col(k)}" opacity=".55"/></g>`).join("")}
    ${line("ma5", "#e0a100")}${line("ma20", "#7c5cff")}${line("ma60", "#1f9bd1")}
    ${ind === "bb" ? line("bb_up", "#9aa4b2") + line("bb_dn", "#9aa4b2") : ""}
    ${labels.map(([i, d]) => `<text x="${x(i)}" y="${H + 13}" class="ax" text-anchor="middle">${d.slice(2, 7)}</text>`).join("")}
  </svg>
  <div class="legend"><span style="color:#e0a100">━ MA5</span><span style="color:#7c5cff">━ MA20</span><span style="color:#1f9bd1">━ MA60</span><span class="muted">價格已還原權息・下方為成交量</span></div>`;
}

// 主力進場跡象清單：✓ 計分項目、ⓘ 不計分項目，旁邊標出最近一次回測的結論
const EVIDENCE_CLS = { 有效: "up", 反向: "down", 未證實: "kind", 樣本不足: "kind", 尚無法回測: "kind" };
function checkList(checks, warnings) {
  const ev = (x) => (x.evidence ? ` <span class="badge ${EVIDENCE_CLS[x.evidence] || "kind"}" title="最近一次回測">${esc(x.evidence)}</span>` : "");
  return `<ul class="checks">${checks.map((x) => x.role === "info"
      ? `<li class="info">ⓘ ${esc(x.label)}${x.ok ? "（符合）" : ""}${ev(x)}<br><small class="muted">${esc(x.note)}</small></li>`
      : `<li class="${x.ok ? "ok" : ""}">${x.ok ? "✓" : "·"} ${esc(x.label)}${ev(x)}</li>`).join("")}
    ${warnings.map((w) => `<li class="warn">⚠ ${esc(w.label)}</li>`).join("")}</ul>`;
}

// 上櫃股票的小標記
const otcTag = (market) => (market === "TPEX" ? ` <span class="badge kind" title="上櫃">櫃</span>` : "");

// 期貨選擇權法人與融資餘額（每日摘要）
function derivativesCard(d) {
  if (!d || (!d.futures.length && !d.margin.length)) return "";
  const f = d.futures, last = f[f.length - 1], prev = f[f.length - 2];
  const o = d.options[d.options.length - 1];
  const m = d.margin[d.margin.length - 1];
  const oi = (v) => (v == null ? "-" : `${v > 0 ? "+" : ""}${v.toLocaleString()}`);
  const chg = (a, b, k) => (a && b && a[k] != null && b[k] != null ? a[k] - b[k] : null);
  const kpi = (label, v, unit, sub) => `<div class="card kpi"><div class="label">${label}</div>
      <div class="value ${cls(v)}">${v == null ? "-" : oi(v)}<small> ${unit}</small></div><div class="sub">${sub}</div></div>`;
  const fc = chg(last, prev, "foreign");
  return `<h3>期貨選擇權與融資 <span class="muted" style="font-weight:400">${esc(last?.date || m?.date || "")}</span></h3>
    <div class="kpis">
      ${last ? kpi("外資台指期淨未平倉", last.foreign, "口",
        `較前日 <span class="${cls(fc)}">${oi(fc)}</span>｜約當大台（含小台、微台）${oi(last.foreign_equiv)}`) : ""}
      ${last ? kpi("投信台指期淨未平倉", last.trust, "口", `自營商 ${oi(last.dealer)}`) : ""}
      ${o ? `<div class="card kpi"><div class="label">外資臺指選擇權淨未平倉</div>
        <div class="value" style="font-size:18px">買權 <span class="${cls(o.call_oi)}">${oi(o.call_oi)}</span>／賣權 <span class="${cls(o.put_oi)}">${oi(o.put_oi)}</span><small> 口</small></div>
        <div class="sub">淨金額 買權 ${signed(qianToYi(o.call_amt))} 億、賣權 ${signed(qianToYi(o.put_amt))} 億</div></div>` : ""}
      ${m ? `<div class="card kpi"><div class="label">上市融資餘額</div>
        <div class="value">${yi(m.amount, 0)}<small> 億</small></div>
        <div class="sub">較前日 <span class="${cls(m.change)}">${m.change == null ? "-" : signed(yi(m.change, 1))} 億</span></div></div>` : ""}
    </div>
    ${f.length > 2 ? `<div class="card" style="margin-bottom:12px"><h3>外資台指期淨未平倉每日增減（口）</h3>
      ${columns(f.slice(1).map((x, i) => ({ date: x.date, v: x.foreign - f[i].foreign })), "v", (v) => oi(v) + " 口")}
      <div class="note">淨未平倉＝多單口數－空單口數，目前 ${oi(last.foreign)} 口；負數代表淨空單（常用來避險現貨部位，不一定是看空）。
        紅色＝空單減少或多單增加。</div></div>` : ""}`;
}

// 技術指標副圖：KD、RSI、MACD（布林通道畫在主圖）
const IND = { kd: "KD(9)", rsi: "RSI(14)", macd: "MACD(12,26,9)", bb: "布林通道(20,2)" };
function indicatorSvg(kl, ind) {
  if (!ind || ind === "bb" || kl.length < 2) return ind === "bb" ? `<div class="legend"><span style="color:#9aa4b2">━ 布林上下軌（20 日均線 ± 2 倍標準差，畫在 K 線上）</span></div>` : "";
  const W = 900, H = 110, L = 48, R = 8, n = kl.length;
  const x = (i) => L + ((i + 0.5) * (W - L - R)) / n;
  const keys = { kd: ["k", "d"], rsi: ["rsi"], macd: ["dif", "macd"] }[ind];
  const vals = kl.flatMap((k) => [...keys, ...(ind === "macd" ? ["hist"] : [])].map((key) => k[key])).filter((v) => v != null);
  if (!vals.length) return `<div class="muted">資料不足</div>`;
  let hi = Math.max(...vals), lo = Math.min(...vals);
  if (ind !== "macd") { hi = 100; lo = 0; }
  const y = (v) => 4 + ((hi - v) / (hi - lo || 1)) * (H - 8);
  const colors = ["#e0a100", "#7c5cff"];
  const poly = (key, c) => { const pts = kl.map((k, i) => (k[key] == null ? null : `${x(i).toFixed(1)},${y(k[key]).toFixed(1)}`)).filter(Boolean);
    return pts.length > 1 ? `<polyline fill="none" stroke="${c}" stroke-width="1.2" points="${pts.join(" ")}"/>` : ""; };
  const bw = Math.max(1, ((W - L - R) / n) * 0.6);
  const bars = ind === "macd" ? kl.map((k, i) => (k.hist == null ? "" : `<rect x="${x(i) - bw / 2}" y="${Math.min(y(0), y(k.hist))}" width="${bw}" height="${Math.max(1, Math.abs(y(k.hist) - y(0)))}" fill="var(--${k.hist >= 0 ? "up" : "down"})" opacity=".6"/>`)).join("") : "";
  const guides = ind === "macd" ? [0] : ind === "rsi" ? [30, 70] : [20, 80];
  const last = kl[kl.length - 1];
  return `<svg class="kline sub" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${IND[ind]}">
    ${guides.map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" class="grid-l"/><text x="${L - 4}" y="${y(g) + 3}" class="ax" text-anchor="end">${g}</text>`).join("")}
    ${bars}${keys.map((k, j) => poly(k, colors[j])).join("")}</svg>
    <div class="legend">${keys.map((k, j) => `<span style="color:${colors[j]}">━ ${k.toUpperCase()} ${last[k] == null ? "-" : num(last[k], 2)}</span>`).join("")}
      ${ind === "macd" ? `<span class="muted">柱狀＝DIF−MACD</span>` : ""}</div>`;
}
