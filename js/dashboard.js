/**
 * 講師大螢幕投影看板即時引擎 (dashboard.js) - 升級版
 * 整合全場 NMQ 向量人體熱力圖、左右側單側負載對稱性分析與即時排行
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
  const elAsymmetryList = document.getElementById("asymmetry-list");
  const elTrapsList = document.getElementById("traps-list");
  const elQrContainer = document.getElementById("qrcode-container");
  const elQrLink = document.getElementById("qr-target-link");

  let dashBodyMap = null;
  let rolePieChart = null;

  if (elSessionTitle) {
    elSessionTitle.innerText = `場次代碼：${sessionId}`;
  }

  // 初始化大螢幕人體圖
  dashBodyMap = new BodyMapComponent({
    containerId: "dash-heatmap-container",
    interactive: false
  });

  // 生成 QR Code
  const studentUrl = `${window.location.origin}${window.location.pathname.replace("dashboard.html", "index.html").replace("dashboard", "")}?session=${sessionId}`;
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
      elStatusBadge.className = "px-3 py-0.5 rounded-full text-xs font-semibold border border-slate-700 bg-slate-800 text-slate-400";
      elStatusInsight.innerText = "請全場掃描左側 QR Code，開始 60 秒工作站人因檢核。";
      renderEmptyState();
      return;
    }

    // 1. 計算平均分數
    const sumScore = list.reduce((acc, cur) => acc + (cur.totalScore || 0), 0);
    const avg = Math.round((sumScore / total) * 10) / 10;
    elAvgScore.innerText = avg;

    const tier = ERGO_CONFIG.scoreTiers.find((t) => avg >= t.min && avg <= t.max) || ERGO_CONFIG.scoreTiers[ERGO_CONFIG.scoreTiers.length - 1];
    elStatusBadge.innerText = tier.title;
    elStatusBadge.className = `px-3 py-0.5 rounded-full text-xs font-bold border ${tier.badgeColor}`;

    // 2. 統計 15 個 NMQ 解剖區域的受影響人數與百分比
    const zoneCounts = {};
    NMQ_ZONES.forEach((z) => (zoneCounts[z.id] = 0));

    list.forEach((sub) => {
      if (sub.nmqData) {
        Object.keys(sub.nmqData).forEach((zid) => {
          if (sub.nmqData[zid] && sub.nmqData[zid] > 0) {
            zoneCounts[zid] = (zoneCounts[zid] || 0) + 1;
          }
        });
      }
    });

    const percentages = {};
    NMQ_ZONES.forEach((z) => {
      percentages[z.id] = Math.round(((zoneCounts[z.id] || 0) / total) * 100);
    });

    // 更新大螢幕人體熱力圖
    if (dashBodyMap) {
      dashBodyMap.setAggregateHeatmap(percentages);
    }

    // 3. 左右側單側負載對稱性分析
    renderAsymmetry(percentages);

    // 4. 全場前三大痛點部位排行
    renderTopPains(zoneCounts, total);

    // 5. 講師即時洞察提詞
    const sortedZones = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1]);
    const topZoneObj = NMQ_ZONES.find((z) => z.id === sortedZones[0][0]);
    const topName = topZoneObj ? topZoneObj.name : "頸肩部";
    const topPercent = Math.round((sortedZones[0][1] / total) * 100);
    elStatusInsight.innerHTML = `
      🚨 <strong class="text-rose-400">現場統計警示：</strong> 全場高達 <span class="text-sky-400 font-bold">${topPercent}%</span> 的學員在「<strong>${topName}</strong>」出現顯著過載！整體作業風險落在「${tier.subtitle}」。
    `;

    // 6. 工作站環境盲點 (Traps)
    renderTraps(list, total);

    // 7. 族群分佈圓餅圖
    renderRolePieChart(list);
  }

  // 渲染左右側負載對照
  function renderAsymmetry(percentages) {
    const pairs = [
      { name: "肩部負載", leftId: "shoulder_l", rightId: "shoulder_r", note: "滑鼠 / 單肩揹負" },
      { name: "手腕負載", leftId: "wrist_l", rightId: "wrist_r", note: "滑鼠手 vs 鍵盤手" },
      { name: "下肢膝踝", leftId: "knee_l", rightId: "knee_r", note: "站姿重心單側傾斜" }
    ];

    elAsymmetryList.innerHTML = pairs
      .map((p) => {
        const lVal = percentages[p.leftId] || 0;
        const rVal = percentages[p.rightId] || 0;
        const diff = Math.abs(rVal - lVal);
        const diffLabel = diff >= 20 ? `<span class="text-[10px] text-rose-400 font-bold">⚠️ 顯著單側失衡 (${diff}%)</span>` : "";

        return `
        <div class="p-2 rounded-lg bg-slate-850 border border-[#30363d] text-xs">
          <div class="flex items-center justify-between mb-1 text-slate-300 font-medium">
            <span>${p.name} <span class="text-[10px] text-slate-500">(${p.note})</span></span>
            ${diffLabel}
          </div>
          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <div class="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded">
              <span class="text-slate-400">左側 (L):</span>
              <span class="font-bold text-sky-400">${lVal}%</span>
            </div>
            <div class="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded">
              <span class="text-slate-400">右側 (R):</span>
              <span class="font-bold text-sky-400">${rVal}%</span>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // 渲染三大痛點
  function renderTopPains(zoneCounts, total) {
    const sorted = Object.entries(zoneCounts)
      .filter(([id, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (sorted.length === 0) {
      elPainRankList.innerHTML = `<div class="text-center py-2 text-slate-500 text-xs">尚無顯著酸痛通報</div>`;
      return;
    }

    elPainRankList.innerHTML = sorted
      .map(([id, count], idx) => {
        const zone = NMQ_ZONES.find((z) => z.id === id);
        const name = zone ? zone.name : id;
        const pct = Math.round((count / total) * 100);
        const barColor = idx === 0 ? "bg-rose-500" : (idx === 1 ? "bg-orange-500" : "bg-amber-500");

        return `
        <div class="flex items-center justify-between text-xs p-1.5 rounded bg-slate-900/60">
          <span class="text-slate-300 font-semibold flex items-center gap-1.5">
            <span class="font-mono text-slate-500">${idx + 1}.</span>
            <span>${name}</span>
          </span>
          <span class="font-bold text-sky-400">${pct}% (${count}人)</span>
        </div>
      `;
      })
      .join("");
  }

  // 渲染環境盲點
  function renderTraps(list, total) {
    const trapCounts = {
      "螢幕過低 / 視線低頭前傾": 0,
      "腰背懸空 / 手臂無支撐": 0,
      "作業環境刺眼反光 / 眩光": 0,
      "連續久坐或維持同一姿勢逾2小時": 0
    };

    list.forEach((sub) => {
      if (sub.traps) {
        if (sub.traps.trap_screen) trapCounts["螢幕過低 / 視線低頭前傾"]++;
        if (sub.traps.trap_chair) trapCounts["腰背懸空 / 手臂無支撐"]++;
        if (sub.traps.trap_glare) trapCounts["作業環境刺眼反光 / 眩光"]++;
        if (sub.traps.trap_sedentary) trapCounts["連續久坐或維持同一姿勢逾2小時"]++;
      }
    });

    elTrapsList.innerHTML = Object.entries(trapCounts)
      .map(([name, count]) => {
        const percent = Math.round((count / total) * 100);
        return `
        <div class="flex items-center justify-between p-2 rounded bg-slate-850 border border-[#30363d] text-xs">
          <span class="text-slate-300">${name}</span>
          <span class="font-bold text-amber-400">${percent}%</span>
        </div>
      `;
      })
      .join("");
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
        labels: ["電腦久坐族", "學生研讀族", "站立服務族", "技術操作族"],
        datasets: [
          {
            data: dataValues,
            backgroundColor: ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa"],
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
    elPainRankList.innerHTML = `<div class="text-center py-2 text-slate-500 text-xs">尚無作答數據，等待連線...</div>`;
    elAsymmetryList.innerHTML = `<div class="text-center py-2 text-slate-500 text-xs">數據收集中...</div>`;
    elTrapsList.innerHTML = `<div class="text-center py-2 text-slate-500 text-xs col-span-2">數據收集中...</div>`;
  }
});
