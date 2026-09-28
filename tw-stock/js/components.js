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
      <td class="name">${esc(r.code)}<small>${esc(r.name)}</small></td>
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

function columns(series, key) {
  const max = Math.max(1, ...series.map((x) => Math.abs(x[key] || 0)));
  return `<div class="cols">${series.map((x) => {
      const v = x[key] || 0, h = (Math.abs(v) / max) * 100;
      return `<div class="c" title="${x.date} ${signed(yi(v, 1))} 億">
        <span style="height:${h}%;background:var(--${v >= 0 ? "up" : "down"})"></span></div>`;
    }).join("")}</div>
    <div class="cols-labels">${series.map((x) => `<span>${x.date.slice(5)}</span>`).join("")}</div>`;
}

// ---------- K 線 ----------
function klineSvg(kl) {
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
    ${labels.map(([i, d]) => `<text x="${x(i)}" y="${H + 13}" class="ax" text-anchor="middle">${d.slice(2, 7)}</text>`).join("")}
  </svg>
  <div class="legend"><span style="color:#e0a100">━ MA5</span><span style="color:#7c5cff">━ MA20</span><span style="color:#1f9bd1">━ MA60</span><span class="muted">下方為成交量</span></div>`;
}
