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

  // 5. 匯出標準化 NMQ 人因工程 CSV 報表
  elBtnExportCsv.addEventListener("click", () => {
    const bridge = new DataBridge(currentSession);
    const list = bridge.getLocalSubmissions();
    if (list.length === 0) {
      alert("此場次目前尚無作答數據！");
      return;
    }

    const headers = [
      "Submission_ID",
      "Session_ID",
      "Role",
      "Total_Score",
      "Tier",
      "Duration_Sec",
      "Quality_Flag",
      "NMQ_HighRisk_Count",
      "NMQ_Medical_Count",
      "NMQ_Chronic_Count",
      "NMQ_Neck",
      "NMQ_Shoulder_L",
      "NMQ_Shoulder_R",
      "NMQ_UpperBack",
      "NMQ_Elbow_L",
      "NMQ_Elbow_R",
      "NMQ_LowerBack",
      "NMQ_Wrist_L",
      "NMQ_Wrist_R",
      "NMQ_Hip_L",
      "NMQ_Hip_R",
      "NMQ_Knee_L",
      "NMQ_Knee_R",
      "NMQ_Ankle_L",
      "NMQ_Ankle_R",
      "Trap_ScreenHeight",
      "Trap_ChairWristSupport",
      "Trap_EnvironmentGlare",
      "Trap_SedentaryOver2Hours",
      "NMQ_HighRisk_Summary",
      "Timestamp"
    ];

    const rows = list.map((item) => {
      const nmq = item.nmqData || {};
      const details = item.nmqDetails || {};
      const traps = item.traps || {};
      const duration = item.durationSeconds || 0;
      const quality = item.qualityFlag || (duration < 8 ? "Speedrun" : "Valid");

      // 計算高風險部位與就醫天數統計
      let highRiskCount = 0;
      let medicalCount = 0;
      let chronicCount = 0;
      const summaryList = [];

      const zoneNameMap = {
        neck: "頸部",
        shoulder_l: "左肩",
        shoulder_r: "右肩",
        upperback: "上背",
        elbow_l: "左肘",
        elbow_r: "右肘",
        lowerback: "下背",
        wrist_l: "左腕",
        wrist_r: "右腕",
        hip_l: "左臀",
        hip_r: "右臀",
        knee_l: "左膝",
        knee_r: "右膝",
        ankle_l: "左踝",
        ankle_r: "右踝"
      };

      Object.keys(nmq).forEach((zk) => {
        const score = nmq[zk] || 0;
        if (score >= 3) {
          highRiskCount++;
          const d = details[zk] || {};
          const daysText = d.days === "gt30" ? ">30天" : (d.days === "8to30" ? "8-30天" : "<7天");
          const medText = d.medical === "yes" ? "曾就醫" : "未就醫";
          if (d.medical === "yes") medicalCount++;
          if (d.days === "gt30") chronicCount++;
          summaryList.push(`${zoneNameMap[zk] || zk}(${score}分/${daysText}/${medText})`);
        }
      });

      const summaryStr = summaryList.length > 0 ? `"${summaryList.join("; ")}"` : '""';

      return [
        item.id,
        item.sessionId,
        item.role,
        item.totalScore,
        item.tier,
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
        traps.trap_screen ? 1 : 0,
        traps.trap_chair ? 1 : 0,
        traps.trap_glare ? 1 : 0,
        traps.trap_sedentary ? 1 : 0,
        summaryStr,
        new Date(item.timestamp).toLocaleString()
      ];
    });

    let csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NMQ人因工程評估數據_${currentSession}_${Date.now()}.csv`;
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
