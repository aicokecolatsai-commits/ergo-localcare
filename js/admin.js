/**
 * 講師場次管理後台 (admin.js)
 * 負責新增場次、動態產出 QR Code 與投影連結、繁體中文 CSV 匯出與 Google 試算表多分頁 (Multi-Tab) 整合
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
  const elBtnSyncGSheet = document.getElementById("btn-sync-gsheet");
  const elBtnOpenGSheetModal = document.getElementById("btn-open-gsheet-modal");
  const elBtnClear = document.getElementById("btn-clear-session");
  const elBtnGenerateDemo = document.getElementById("btn-generate-demo");
  const elRecentSessions = document.getElementById("recent-sessions-list");

  // Google Sheet Webhook Modal & Elements
  const elModalGSheet = document.getElementById("modal-gsheet");
  const elBtnCloseGSheetModal = document.getElementById("btn-close-gsheet-modal");
  const elBtnModalDone = document.getElementById("btn-modal-done");
  const elInputGSheetWebhook = document.getElementById("input-gsheet-webhook");
  const elBtnSaveGSheetWebhook = document.getElementById("btn-save-gsheet-webhook");
  const elGasCodeBlock = document.getElementById("gas-code-block");
  const elBtnCopyGasCode = document.getElementById("btn-copy-gas-code");
  const elGSheetStatusBar = document.getElementById("gsheet-status-bar");
  const elGSheetUrlPreview = document.getElementById("gsheet-url-preview");
  const elBtnQuickSync = document.getElementById("btn-quick-sync");

  // Google Sheet Sync Success Modal
  const elModalSyncSuccess = document.getElementById("modal-sync-success");
  const elSyncSuccessTab = document.getElementById("sync-success-tab");
  const elSyncSuccessCount = document.getElementById("sync-success-count");
  const elSyncSuccessDesc = document.getElementById("sync-success-desc");
  const elSyncSuccessLink = document.getElementById("sync-success-link");
  const elBtnCloseSyncModal = document.getElementById("btn-close-sync-modal");

  let currentSession = APP_CONFIG.getSessionId();
  elSessionInput.value = currentSession;

  // 1. 初始化更新連結、QR Code 與 Google Sheet 連線狀態
  updateSessionLinks(currentSession);
  renderRecentSessions();
  initGSheetIntegration();

  // 2. 建立/切換新場次
  elBtnCreate.addEventListener("click", () => {
    const newSession = elSessionInput.value.trim();
    if (!newSession) {
      alert("請輸入有效的場次代碼！");
      return;
    }
    currentSession = newSession;
    try {
      localStorage.setItem("ergo_active_session", newSession);
    } catch (e) {}
    saveRecentSession(newSession);
    updateSessionLinks(newSession);
    renderRecentSessions();
  });

  // 3. 更新所有連結與 QR Code
  function updateSessionLinks(sessionId) {
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);
    const studentUrl = `${baseUrl}index.html?session=${encodeURIComponent(sessionId)}`;
    const dashUrl = `${baseUrl}dashboard.html?session=${encodeURIComponent(sessionId)}`;

    elStudentLink.value = studentUrl;
    elDashLink.value = dashUrl;

    const btnOpenStudent = document.getElementById("btn-open-student");
    if (btnOpenStudent) btnOpenStudent.href = studentUrl;

    const btnOpenDash = document.getElementById("btn-open-dash");
    if (btnOpenDash) btnOpenDash.href = dashUrl;

    const navGotoDash = document.getElementById("nav-goto-dashboard");
    if (navGotoDash) navGotoDash.href = dashUrl;

    const navGotoStudent = document.getElementById("nav-goto-student");
    if (navGotoStudent) navGotoStudent.href = studentUrl;

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

  // ==========================================
  // 5. 數據集建構器 (繁體中文表頭與在地化轉換)
  // ==========================================
  function buildSessionExportData(sessionId) {
    const bridge = new DataBridge(sessionId);
    const list = bridge.getLocalSubmissions();

    const headers = [
      "填答編號",
      "場次代碼",
      "作業型態",
      "健康總分",
      "風險燈號等級",
      "填答耗時(秒)",
      "作答品質標記",
      "高風險部位數(≥3分)",
      "曾就醫部位數",
      "慢性疼痛部位數(>30天)",
      "頸部(分)",
      "左肩(分)",
      "右肩(分)",
      "上背(分)",
      "左肘(分)",
      "右肘(分)",
      "下背/腰部(分)",
      "左手腕(分)",
      "右手腕(分)",
      "左臀/大腿(分)",
      "右臀/大腿(分)",
      "左膝(分)",
      "右膝(分)",
      "左腳踝(分)",
      "右腳踝(分)",
      "環境危害_螢幕高度不當",
      "環境危害_桌椅手腕支撐不足",
      "環境危害_螢幕或環境眩光",
      "環境危害_久坐超過2小時",
      "高風險部位評估明細",
      "填答時間"
    ];

    const roleNameMap = {
      office: "辦公室電腦作業族",
      student: "學生與長時研讀族",
      standing: "站立與移動服務族",
      repetitive_hand: "手部高頻重複施力族",
      material_handling: "人工搬運重體力族"
    };

    const tierNameMap = {
      tier_green: "🟢 綠燈 (健全優良)",
      tier_yellow: "🟡 黃燈 (輕度疲勞)",
      tier_orange: "🟠 橘燈 (中度負荷)",
      tier_red: "🔴 紅燈 (高危害需改善)"
    };

    const zoneNameMap = {
      neck: "頸部",
      shoulder_l: "左肩",
      shoulder_r: "右肩",
      upperback: "上背",
      elbow_l: "左肘",
      elbow_r: "右肘",
      lowerback: "下背/腰部",
      wrist_l: "左手腕",
      wrist_r: "右手腕",
      hip_l: "左臀/大腿",
      hip_r: "右臀/大腿",
      knee_l: "左膝",
      knee_r: "右膝",
      ankle_l: "左踝",
      ankle_r: "右踝"
    };

    let totalScoreSum = 0;
    const tierCounts = { green: 0, yellow: 0, orange: 0, red: 0 };

    const rows = list.map((item) => {
      const nmq = item.nmqData || {};
      const details = item.nmqDetails || {};
      const traps = item.traps || {};
      const duration = item.durationSeconds || 0;
      const isSpeedrun = duration < 8;
      const quality = item.qualityFlag === "Speedrun" || isSpeedrun ? "⚠️ 極速作答異常(<8秒)" : "正常有效";

      const score = Number(item.totalScore) || 0;
      totalScoreSum += score;
      if (item.tier === "tier_green") tierCounts.green++;
      else if (item.tier === "tier_yellow") tierCounts.yellow++;
      else if (item.tier === "tier_orange") tierCounts.orange++;
      else if (item.tier === "tier_red") tierCounts.red++;

      // 計算高風險部位與就醫天數統計
      let highRiskCount = 0;
      let medicalCount = 0;
      let chronicCount = 0;
      const summaryList = [];

      Object.keys(nmq).forEach((zk) => {
        const pScore = nmq[zk] || 0;
        if (pScore >= 3) {
          highRiskCount++;
          const d = details[zk] || {};
          const daysText = d.days === "gt30" ? "超過30天" : (d.days === "8to30" ? "8-30天" : "7天內");
          const medText = d.medical === "yes" ? "曾就醫" : "未就醫";
          if (d.medical === "yes") medicalCount++;
          if (d.days === "gt30") chronicCount++;
          summaryList.push(`${zoneNameMap[zk] || zk}(${pScore}分/${daysText}/${medText})`);
        }
      });

      const summaryStr = summaryList.length > 0 ? summaryList.join("; ") : "無高風險部位";
      const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString("zh-TW", { hour12: false }) : "-";

      return [
        item.id || "-",
        item.sessionId || sessionId,
        roleNameMap[item.role] || item.role || "未指定",
        score,
        tierNameMap[item.tier] || item.tier || "未知",
        duration,
        quality,
        highRiskCount,
        medicalCount,
        chronicCount,
        nmq.neck || 0,
        nmq.shoulder_l || 0,
        nmq.shoulder_r || 0,
        nmq.upperback || 0,
        nmq.elbow_l || 0,
        nmq.elbow_r || 0,
        nmq.lowerback || 0,
        nmq.wrist_l || 0,
        nmq.wrist_r || 0,
        nmq.hip_l || 0,
        nmq.hip_r || 0,
        nmq.knee_l || 0,
        nmq.knee_r || 0,
        nmq.ankle_l || 0,
        nmq.ankle_r || 0,
        traps.trap_screen ? "是" : "否",
        traps.trap_chair ? "是" : "否",
        traps.trap_glare ? "是" : "否",
        traps.trap_sedentary ? "是" : "否",
        summaryStr,
        dateStr
      ];
    });

    const avgScore = list.length > 0 ? (totalScoreSum / list.length).toFixed(1) : 0;

    return {
      headers,
      rows,
      count: list.length,
      summary: {
        avgScore,
        tierCounts
      }
    };
  }

  // ==========================================
  // 6. 匯出中文 CSV 報表
  // ==========================================
  elBtnExportCsv.addEventListener("click", () => {
    const { headers, rows, count } = buildSessionExportData(currentSession);
    if (count === 0) {
      alert("此場次目前尚無作答數據！");
      return;
    }

    const formatCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes(";")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = "\uFEFF" + [
      headers.map(formatCsvCell).join(","),
      ...rows.map(row => row.map(formatCsvCell).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `人因工程NMQ評估_${currentSession}_${Date.now()}.csv`;
    a.click();
  });

  // ==========================================
  // 7. 同步至 Google 試算表 (分頁)
  // ==========================================
  async function performGSheetSync(btnElement) {
    const webhookUrl = APP_CONFIG.getGSheetWebhook();
    if (!webhookUrl) {
      openGSheetModal();
      return;
    }

    const { headers, rows, count, summary } = buildSessionExportData(currentSession);
    if (count === 0) {
      alert("此場次目前尚無作答數據，請先由學員填寫或點選「生成 30 筆模擬數據」測試！");
      return;
    }

    const originalText = btnElement ? btnElement.innerHTML : "";
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.innerHTML = `<span>⏳</span> 同步傳輸中...`;
    }

    try {
      const payload = {
        action: "sync_session",
        sessionName: currentSession,
        headers: headers,
        rows: rows,
        summary: summary
      };

      // 使用 text/plain 避免觸發預檢 OPTIONS CORS 阻擋
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      let result = null;
      try {
        result = await response.json();
      } catch (e) {
        result = { status: "success" };
      }

      if (result && result.status === "error") {
        throw new Error(result.message || "Google Apps Script 執行錯誤");
      }

      showSyncSuccessModal(currentSession, count, result ? result.sheetUrl : null);

    } catch (err) {
      console.error("Google Sheet 同步失敗:", err);
      alert(`Google 試算表同步失敗！\n原因：${err.message}\n\n請檢查 Webhook 網址是否正確，以及 Google Apps Script 是否已設定存取權限為「所有人」。`);
    } finally {
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;
      }
    }
  }

  elBtnSyncGSheet.addEventListener("click", () => performGSheetSync(elBtnSyncGSheet));
  if (elBtnQuickSync) {
    elBtnQuickSync.addEventListener("click", () => performGSheetSync(elBtnQuickSync));
  }

  // ==========================================
  // 8. Google 試算表設定 Modal 與教學腳本
  // ==========================================
  const GAS_TEMPLATE_CODE = `/**
 * 【人因小管家】Google 試算表自動多分頁同步腳本
 * Noah / 蔡健儀 專屬人因研習數據中心
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var sessionName = (data.sessionName || "場次數據").toString().trim();
    // 試算表分頁名稱限制符號與長度
    sessionName = sessionName.replace(/[:\\/?*\\[\\]\\\\]/g, "_").substring(0, 80);
    
    // 1. 取得或新建該場次專屬分頁
    var sheet = ss.getSheetByName(sessionName);
    if (!sheet) {
      sheet = ss.insertSheet(sessionName);
    } else {
      sheet.clear(); // 覆蓋更新最新完整場次數據
    }
    
    // 2. 寫入總結資訊列 (Dashboard Summary)
    var summary = data.summary || {};
    var timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");
    
    sheet.appendRow(["📊 場次名稱", sessionName, "⏱️ 同步時間", timestamp, "👥 總填答人數", (data.rows ? data.rows.length : 0), "🎯 平均健康分", (summary.avgScore || "-")]);
    var summaryRange = sheet.getRange(1, 1, 1, 8);
    summaryRange.setBackground("#f0fdf4").setFontColor("#166534").setFontWeight("bold");
    sheet.appendRow([""]); // 空行
    
    // 3. 寫入繁體中文表頭
    var headers = data.headers || [];
    sheet.appendRow(headers);
    var headerRowIndex = 3;
    var headerRange = sheet.getRange(headerRowIndex, 1, 1, headers.length);
    headerRange.setBackground("#0f766e")
               .setFontColor("#ffffff")
               .setFontWeight("bold")
               .setHorizontalAlignment("center");
               
    sheet.setFrozenRows(headerRowIndex);
    
    // 4. 批次寫入學員作答數據
    if (data.rows && data.rows.length > 0) {
      sheet.getRange(headerRowIndex + 1, 1, data.rows.length, headers.length).setValues(data.rows);
      var dataRange = sheet.getRange(headerRowIndex + 1, 1, data.rows.length, headers.length);
      dataRange.setVerticalAlignment("middle");
    }
    
    // 5. 自動調整欄寬
    for (var c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
    
    var sheetId = sheet.getSheetId();
    var sheetUrl = ss.getUrl() + "#gid=" + sheetId;
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "成功同步 " + (data.rows ? data.rows.length : 0) + " 筆數據至分頁【" + sessionName + "】",
      sheetUrl: sheetUrl,
      sessionName: sessionName,
      totalRows: data.rows ? data.rows.length : 0
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

  function initGSheetIntegration() {
    if (elGasCodeBlock) {
      elGasCodeBlock.textContent = GAS_TEMPLATE_CODE;
    }
    const currentWebhook = APP_CONFIG.getGSheetWebhook();
    if (elInputGSheetWebhook) {
      elInputGSheetWebhook.value = currentWebhook;
    }
    renderGSheetStatus(currentWebhook);
  }

  function renderGSheetStatus(webhookUrl) {
    if (!elGSheetStatusBar) return;
    if (webhookUrl && webhookUrl.trim() !== "") {
      elGSheetStatusBar.classList.remove("hidden");
      if (elGSheetUrlPreview) {
        elGSheetUrlPreview.textContent = webhookUrl;
      }
    } else {
      elGSheetStatusBar.classList.add("hidden");
    }
  }

  function openGSheetModal() {
    elInputGSheetWebhook.value = APP_CONFIG.getGSheetWebhook();
    elModalGSheet.classList.remove("hidden");
  }

  function closeGSheetModal() {
    elModalGSheet.classList.add("hidden");
  }

  if (elBtnOpenGSheetModal) elBtnOpenGSheetModal.addEventListener("click", openGSheetModal);
  if (elBtnCloseGSheetModal) elBtnCloseGSheetModal.addEventListener("click", closeGSheetModal);
  if (elBtnModalDone) elBtnModalDone.addEventListener("click", closeGSheetModal);

  if (elBtnSaveGSheetWebhook) {
    elBtnSaveGSheetWebhook.addEventListener("click", () => {
      const url = elInputGSheetWebhook.value.trim();
      APP_CONFIG.setGSheetWebhook(url);
      renderGSheetStatus(url);
      alert(url ? "✅ Google Sheet Webhook 網址已成功儲存！" : "已清除 Google Sheet 連線設定。");
    });
  }

  if (elBtnCopyGasCode) {
    elBtnCopyGasCode.addEventListener("click", () => {
      copyToClipboard(GAS_TEMPLATE_CODE, "📋 Apps Script 程式碼已複製至剪貼簿！請前往 Google 試算表貼上。");
    });
  }

  function showSyncSuccessModal(sessionId, count, sheetUrl) {
    if (!elModalSyncSuccess) {
      alert(`🎉 成功同步 ${count} 筆數據至 Google 試算表分頁【${sessionId}】！`);
      return;
    }
    elSyncSuccessTab.textContent = sessionId;
    elSyncSuccessCount.textContent = count;
    elSyncSuccessDesc.textContent = `已成功將場次【${sessionId}】的繁體中文評估報表直送至您的 Google 試算表獨立分頁。`;
    if (sheetUrl) {
      elSyncSuccessLink.href = sheetUrl;
      elSyncSuccessLink.classList.remove("hidden");
    } else {
      elSyncSuccessLink.classList.add("hidden");
    }
    elModalSyncSuccess.classList.remove("hidden");
  }

  if (elBtnCloseSyncModal) {
    elBtnCloseSyncModal.addEventListener("click", () => {
      elModalSyncSuccess.classList.add("hidden");
    });
  }

  // ==========================================
  // 9. 清空場次數據
  // ==========================================
  elBtnClear.addEventListener("click", () => {
    if (confirm(`確定要清空場次【${currentSession}】的所有數據嗎？此動作無法復原。`)) {
      const bridge = new DataBridge(currentSession);
      bridge.clearCurrentSession();
      alert("已成功清空該場次數據！");
    }
  });

  // ==========================================
  // 10. 注入模擬數據
  // ==========================================
  elBtnGenerateDemo.addEventListener("click", () => {
    const bridge = new DataBridge(currentSession);
    bridge.generateDemoData(30);
    alert(`已為場次【${currentSession}】成功生成 30 筆模擬作答數據！可打開大螢幕看板檢視，或點擊「同步至 Google 試算表」測試。`);
  });

  // ==========================================
  // 11. 最近場次紀錄管理
  // ==========================================
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
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function renderRecentSessions() {
    const recents = getRecentSessions();
    elRecentSessions.innerHTML = "";
    if (recents.length === 0) {
      elRecentSessions.innerHTML = `<span class="text-xs text-slate-500">尚無最近場次紀錄</span>`;
      return;
    }
    recents.forEach((sess) => {
      const wrapper = document.createElement("div");
      wrapper.className = "inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 overflow-hidden text-xs shadow-xs";
      
      const btnSelect = document.createElement("button");
      btnSelect.className = "px-3 py-1.5 font-semibold text-slate-700 hover:text-sky-800 hover:bg-slate-200/60 transition-colors";
      btnSelect.innerText = sess;
      btnSelect.title = "切換至此場次";
      btnSelect.addEventListener("click", () => {
        elSessionInput.value = sess;
        currentSession = sess;
        updateSessionLinks(sess);
      });

      const btnDash = document.createElement("a");
      btnDash.className = "px-2 py-1.5 text-sky-700 hover:bg-sky-50 border-l border-slate-200 transition-colors font-bold";
      btnDash.title = "直開此場次大螢幕看板";
      btnDash.target = "_blank";
      btnDash.href = `dashboard.html?session=${encodeURIComponent(sess)}`;
      btnDash.innerText = "🖥️";

      wrapper.appendChild(btnSelect);
      wrapper.appendChild(btnDash);
      elRecentSessions.appendChild(wrapper);
    });
  }
});
