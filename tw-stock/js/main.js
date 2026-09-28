// 進入點：依目前分頁畫出內容，並依網址初始化。必須最後載入。

async function render() {
  updateControls();
  view.innerHTML = `<div class="empty">載入中…</div>`;
  try {
    await { summary: renderSummary, stocks: renderStocks, sectors: renderSectors, weights: renderWeights, etf: renderEtf,
            signals: renderSignals, research: renderResearch }[state.tab]();
  } catch (err) {
    view.innerHTML = `<div class="empty">讀取失敗：${esc(err.message)}</div>`;
  }
}

(async function init() {
  const meta = await api("meta");
  $("#dataDate").textContent = (meta.latest ? `資料日期 ${meta.latest}` : "尚無資料")
    + (STATIC ? `・公開快照（${(CFG.exportedAt || "").replace("T", " ").slice(0, 16)} 匯出）` : "");
  if (STATIC) document.body.classList.add("static");
  meta.industries.forEach((n) => $("#industrySel").insertAdjacentHTML("beforeend", `<option>${esc(n)}</option>`));
  readUrl();
  syncControls();
  go({ push: false });
  render();
  openDetail();
})();
