/**
 * 講師場次管理後台 (admin.js)
 * 負責新增場次、動態產出 QR Code 與投影連結、匯出 CSV 數據
 */

document.addEventListener("DOMContentLoaded", () => {
  const elSessionInput = document.getElementById("session-id-input");
  const elBtnCreate = document.getElementById("btn-create-session");
  const elQrDisplay = document.getElementById("admin-qr-code");
  const elStudentLink = document.getElementById("link-student");
  const elDashLink = document.getElementById("link-dashboard");
  const elBtnCopyStudent = document.getElementById("btn-copy-student");
  const elBtnCopyDash = document.getElementById("btn-copy-dash");
  const elBtnExportCsv = document.getElementById("btn-export-csv");
  const elBtnClear = document.getElementById("btn-clear-session");
  const elBtnGenerateDemo = document.getElementById("btn-generate-demo");
  const elRecentSessions = document.getElementById("recent-sessions-list");

  let currentSession = APP_CONFIG.getSessionId();
  elSessionInput.value = currentSession;

  // 1. 初始化更新連結與 QR Code
  updateSessionLinks(currentSession);
  renderRecentSessions();

  // 2. 建立/切換新場次
  elBtnCreate.addEventListener("click", () => {
    const newSession = elSessionInput.value.trim();
    if (!newSession) {
      alert("請輸入有效的場次代碼！");
      return;
    }
    currentSession = newSession;
    saveRecentSession(newSession);
    updateSessionLinks(newSession);
    renderRecentSessions();
  });

  // 3. 更新所有連結與 QR Code
  function updateSessionLinks(sessionId) {
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);
    const studentUrl = `${baseUrl}index.html?session=${sessionId}`;
    const dashUrl = `${baseUrl}dashboard.html?session=${sessionId}`;

    elStudentLink.value = studentUrl;
    elDashLink.value = dashUrl;

    // 重新繪製 QR Code
    if (elQrDisplay && window.QRCode) {
      elQrDisplay.innerHTML = "";
      new QRCode(elQrDisplay, {
        text: studentUrl,
        width: 180,
        height: 180,
        colorDark: "#020617",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }

  // 4. 複製按鈕
  elBtnCopyStudent.addEventListener("click", () => copyToClipboard(elStudentLink.value, "學員填寫端網址已複製！"));
  elBtnCopyDash.addEventListener("click", () => copyToClipboard(elDashLink.value, "講師大螢幕投影網址已複製！"));

  function copyToClipboard(text, msg) {
    navigator.clipboard.writeText(text).then(() => {
      alert(msg);
    });
  }

  // 5. 匯出 CSV 報表
  elBtnExportCsv.addEventListener("click", () => {
    const bridge = new DataBridge(currentSession);
    const list = bridge.getLocalSubmissions();
    if (list.length === 0) {
      alert("此場次目前尚無作答數據！");
      return;
    }

    const headers = ["ID", "場次代碼", "角色族群", "總分", "評級", "後頸扣分", "腰部扣分", "手腕扣分", "視覺扣分", "時間戳記"];
    const rows = list.map((item) => [
      item.id,
      item.sessionId,
      item.role,
      item.totalScore,
      item.tier,
      item.painPoints ? item.painPoints.neck : 0,
      item.painPoints ? item.painPoints.back : 0,
      item.painPoints ? item.painPoints.wrist : 0,
      item.painPoints ? item.painPoints.eye : 0,
      new Date(item.timestamp).toLocaleString()
    ]);

    let csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `人因工程報告_${currentSession}_${Date.now()}.csv`;
    a.click();
  });

  // 6. 清空場次數據
  elBtnClear.addEventListener("click", () => {
    if (confirm(`確定要清空場次【${currentSession}】的所有數據嗎？此動作無法復原。`)) {
      const bridge = new DataBridge(currentSession);
      bridge.clearCurrentSession();
      alert("已成功清空該場次數據！");
    }
  });

  // 7. 注入模擬數據
  elBtnGenerateDemo.addEventListener("click", () => {
    const bridge = new DataBridge(currentSession);
    bridge.generateDemoData(30);
    alert(`已為場次【${currentSession}】成功生成 30 筆模擬作答數據！可打開大螢幕看板檢視。`);
  });

  // 最近場次紀錄管理
  function saveRecentSession(sessionId) {
    let recents = getRecentSessions();
    if (!recents.includes(sessionId)) {
      recents.unshift(sessionId);
      if (recents.length > 8) recents.pop();
      localStorage.setItem("ergo_recent_sessions", JSON.stringify(recents));
    }
  }

  function getRecentSessions() {
    try {
      const data = localStorage.getItem("ergo_recent_sessions");
      return data ? JSON.parse(data) : ["demo_session"];
    } catch (e) {
      return ["demo_session"];
    }
  }

  function renderRecentSessions() {
    const recents = getRecentSessions();
    elRecentSessions.innerHTML = "";
    recents.forEach((sess) => {
      const chip = document.createElement("button");
      chip.className =
        "px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 hover:border-cyan-500 hover:text-cyan-300 transition-colors";
      chip.innerText = sess;
      chip.addEventListener("click", () => {
        elSessionInput.value = sess;
        currentSession = sess;
        updateSessionLinks(sess);
      });
      elRecentSessions.appendChild(chip);
    });
  }
});
