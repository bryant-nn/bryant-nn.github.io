// 進入點：依目前分頁畫出內容，並依網址初始化。必須最後載入。

async function render() {
  updateControls();
  view.innerHTML = `<div class="empty">載入中…</div>`;
  try {
    await { summary: renderSummary, stocks: renderStocks, sectors: renderSectors, weights: renderWeights, etf: renderEtf,
            signals: renderSignals, quant: renderQuant, smart: renderSmart, lab: renderLab, research: renderResearch }[state.tab]();
  } catch (err) {
    view.innerHTML = `<div class="empty">讀取失敗：${esc(err.message)}</div>`;
  }
}

(async function init() {
  const meta = await api("meta");
  $("#dataDate").textContent = (meta.latest ? `資料日期 ${meta.latest}` : "尚無資料")
    + (STATIC ? `・公開快照（${(CFG.exportedAt || "").replace("T", " ").slice(0, 16)} 匯出）` : "");
  if (STATIC) document.body.classList.add("static");
  showRunStatus();
  meta.industries.forEach((n) => $("#industrySel").insertAdjacentHTML("beforeend", `<option>${esc(n)}</option>`));
  readUrl();
  syncControls();
  go({ push: false });
  render();
  openDetail();
})();

// 頁首的「資料更新狀態」：最近一次 twstock daily 的結果，點一下看每個步驟
async function showRunStatus() {
  const r = (await api("status"))?.run;
  if (!r) return;
  const icon = { ok: "✓", warn: "⚠", fail: "✗" }[r.status] || "";
  const el = document.createElement("a");
  el.href = "#";
  el.className = `run-status ${r.status}`;
  el.textContent = `更新 ${icon} ${r.finished_at.slice(5, 16).replace("T", " ")}`;
  el.title = r.status === "ok" ? "最近一次每日更新全部成功" : "最近一次每日更新有問題，點一下看詳情";
  el.addEventListener("click", (e) => {
    e.preventDefault();
    $("#detailTitle").textContent = `每日更新　${r.started_at.replace("T", " ")}`;
    $("#detailBody").innerHTML = `<table><tbody>${r.steps.map((s) => `<tr>
      <td>${{ ok: "✓", warn: "⚠", fail: "✗" }[s.status]}</td><td>${esc(s.name)}</td><td class="num muted">${s.seconds} 秒</td></tr>
      ${s.status !== "ok" ? `<tr><td></td><td colspan="2" class="note">${s.messages.filter((m) => /^[⚠✗]|失敗|停止/.test(m)).map(esc).join("<br>")}</td></tr>` : ""}`).join("")}
      </tbody></table>`;
    if (!$("#detail").open) $("#detail").showModal();
  });
  $("#dataDate").after(el);
}
