/**
 * 講師大螢幕投影看板即時引擎 (dashboard.js)
 * 負責即時監聽資料庫、動態數字跳動動畫、Gauge 分數儀表盤、三大痛點排行與環境地雷統計
 */

document.addEventListener("DOMContentLoaded", () => {
  const sessionId = APP_CONFIG.getSessionId();
  const dataBridge = new DataBridge(sessionId);

  // DOM 元素
  const elSessionTitle = document.getElementById("dash-session-title");
  const elTotalCount = document.getElementById("dash-total-count");
  const elAvgScore = document.getElementById("dash-avg-score");
  const elStatusBadge = document.getElementById("dash-status-badge");
  const elStatusInsight = document.getElementById("dash-status-insight");
  const elRolePieContainer = document.getElementById("rolePieChart");
  const elPainRankList = document.getElementById("pain-rank-list");
  const elTrapsList = document.getElementById("traps-list");
  const elQrContainer = document.getElementById("qrcode-container");
  const elQrLink = document.getElementById("qr-target-link");

  // 初始化場次標題與 QR Code
  if (elSessionTitle) {
    elSessionTitle.innerText = `場次代碼：${sessionId}`;
  }

  // 動態生成學員填寫端 QR Code (包含當前 Host 與 session)
  const studentUrl = `${window.location.origin}${window.location.pathname.replace("dashboard.html", "index.html")}?session=${sessionId}`;
  if (elQrContainer && window.QRCode) {
    elQrContainer.innerHTML = "";
    new QRCode(elQrContainer, {
      text: studentUrl,
      width: 140,
      height: 140,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
  if (elQrLink) {
    elQrLink.innerText = studentUrl;
    elQrLink.href = studentUrl;
  }

  // Chart 實例
  let rolePieChart = null;

  // 監聽即時數據變更
  dataBridge.onDataChange((submissions) => {
    updateDashboard(submissions);
  });

  // 快捷鍵支援：按 'D' 注入模擬數據測試，按 'C' 清空
  window.addEventListener("keydown", (e) => {
    if (e.key === "D" || e.key === "d") {
      dataBridge.generateDemoData(25);
    } else if (e.key === "C" || e.key === "c") {
      if (confirm("確定要清空本場次數據嗎？")) {
        dataBridge.clearCurrentSession();
      }
    }
  });

  // 更新看板所有視圖
  function updateDashboard(list) {
    const total = list.length;
    animateValue(elTotalCount, parseInt(elTotalCount.innerText) || 0, total, 400);

    if (total === 0) {
      elAvgScore.innerText = "--";
      elStatusBadge.innerText = "等待學員連線中...";
      elStatusBadge.className = "px-3 py-1 rounded-full text-xs font-bold border border-slate-700 bg-slate-800 text-slate-400";
      elStatusInsight.innerText = "請全場掃描左側 QR Code，開始 60 秒身體伺服器檢測。";
      renderEmptyState();
      return;
    }

    // 1. 計算平均分數
    const sumScore = list.reduce((acc, cur) => acc + (cur.totalScore || 0), 0);
    const avg = Math.round((sumScore / total) * 10) / 10;
    elAvgScore.innerText = avg;

    // 狀態等級與洞察分析
    const tier = ERGO_CONFIG.scoreTiers.find((t) => avg >= t.min && avg <= t.max) || ERGO_CONFIG.scoreTiers[ERGO_CONFIG.scoreTiers.length - 1];
    elStatusBadge.innerText = tier.title;
    elStatusBadge.className = `px-3.5 py-1 rounded-full text-xs md:text-sm font-extrabold border ${tier.badgeColor}`;
    
    // 2. 統計痛點排行 (NMQ Dimensions)
    const painCounts = {
      "後頸與肩胛僵硬 (頸椎力矩超載)": 0,
      "腰椎骨盆酸痛 (下背懸空無支撐)": 0,
      "手腕手肘麻痛 (滑鼠手/重複施力)": 0,
      "眼睛乾澀與大腦昏沉 (視覺眩光/低能耗)": 0
    };

    list.forEach((sub) => {
      if (sub.painPoints) {
        if (sub.painPoints.neck > 0) painCounts["後頸與肩胛僵硬 (頸椎力矩超載)"]++;
        if (sub.painPoints.back > 0) painCounts["腰椎骨盆酸痛 (下背懸空無支撐)"]++;
        if (sub.painPoints.wrist > 0) painCounts["手腕手肘麻痛 (滑鼠手/重複施力)"]++;
        if (sub.painPoints.eye > 0) painCounts["眼睛乾澀與大腦昏沉 (視覺眩光/低能耗)"]++;
      }
    });

    const sortedPains = Object.entries(painCounts).sort((a, b) => b[1] - a[1]);

    // 渲染痛點排行榜
    elPainRankList.innerHTML = sortedPains
      .map(([name, count], idx) => {
        const percent = Math.round((count / total) * 100);
        const medals = ["🥇", "🥈", "🥉", "4."];
        const barColor = idx === 0 ? "bg-rose-500" : (idx === 1 ? "bg-orange-500" : "bg-amber-500");
        return `
        <div class="glass-panel p-3 rounded-xl border border-slate-700/60">
          <div class="flex items-center justify-between text-xs md:text-sm font-bold text-slate-200 mb-1.5">
            <span class="flex items-center gap-1.5 truncate">
              <span>${medals[idx]}</span>
              <span class="truncate">${name}</span>
            </span>
            <span class="text-cyan-400 font-extrabold flex-shrink-0">${percent}% (${count}人)</span>
          </div>
          <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div class="${barColor} h-full rounded-full transition-all duration-500" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
      })
      .join("");

    // 3. 講師即時洞察提詞
    const topPainName = sortedPains[0][0].split(" ")[0];
    const topPercent = Math.round((sortedPains[0][1] / total) * 100);
    elStatusInsight.innerHTML = `
      🚨 <strong class="text-rose-400">現場重大警訊：</strong> 全場有 <span class="text-cyan-400 font-bold">${topPercent}%</span> 的學員正承受「<strong>${topPainName}</strong>」的隱形算力漏水！平均身體折舊指數落在「${tier.subtitle}」。
    `;

    // 4. 統計環境三大地雷 (Traps)
    const trapCounts = {
      "螢幕過低/低頭烏龜頸": 0,
      "腰部無靠/手腕懸空": 0,
      "環境眩光刺眼反光": 0,
      "連續久坐超過2小時": 0
    };

    list.forEach((sub) => {
      if (sub.traps) {
        if (sub.traps.trap_screen) trapCounts["螢幕過低/低頭烏龜頸"]++;
        if (sub.traps.trap_chair) trapCounts["腰部無靠/手腕懸空"]++;
        if (sub.traps.trap_glare) trapCounts["環境眩光刺眼反光"]++;
        if (sub.traps.trap_sedentary) trapCounts["連續久坐超過2小時"]++;
      }
    });

    elTrapsList.innerHTML = Object.entries(trapCounts)
      .map(([name, count]) => {
        const percent = Math.round((count / total) * 100);
        return `
        <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs md:text-sm">
          <span class="text-slate-300 font-medium">${name}</span>
          <span class="font-bold text-amber-400">${percent}%</span>
        </div>
      `;
      })
      .join("");

    // 5. 渲染族群圓餅圖
    renderRolePieChart(list);
  }

  // 渲染族群圓餅圖
  function renderRolePieChart(list) {
    const ctx = elRolePieContainer;
    if (!ctx) return;

    const roleCounts = { office: 0, student: 0, standing: 0, technician: 0 };
    list.forEach((s) => {
      if (roleCounts[s.role] !== undefined) roleCounts[s.role]++;
    });

    const dataValues = [
      roleCounts.office,
      roleCounts.student,
      roleCounts.standing,
      roleCounts.technician
    ];

    if (rolePieChart) {
      rolePieChart.data.datasets[0].data = dataValues;
      rolePieChart.update();
      return;
    }

    rolePieChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["💼 辦公室白領", "🎓 課堂學生", "🏪 久站服務", "🏭 技術/重複職"],
        datasets: [
          {
            data: dataValues,
            backgroundColor: [
              "#06b6d4",
              "#10b981",
              "#f59e0b",
              "#8b5cf6"
            ],
            borderColor: "#0f172a",
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#94a3b8", font: { size: 11 } }
          }
        }
      }
    });
  }

  // 數字平滑滾動動畫
  function animateValue(obj, start, end, duration) {
    if (!obj || start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      obj.innerHTML = Math.floor(progress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  function renderEmptyState() {
    elPainRankList.innerHTML = `<div class="text-center py-6 text-slate-500 text-sm">尚無作答數據，等待連線...</div>`;
    elTrapsList.innerHTML = `<div class="text-center py-4 text-slate-500 text-xs">數據收集中...</div>`;
  }
});
