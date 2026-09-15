/**
 * 學員端問卷核心互動邏輯 (app.js) - 升級版
 * 流程：
 * 步驟 0：選擇作業型態
 * 步驟 1：互動式人體圖 NMQ 不適部位標記 (左右側分開)
 * 步驟 2：工作站環境配置檢核 (4 題)
 * 步驟 3：個人人因檢核報告卡 (含個人人體圖透視、總分、改善指引與免責警語)
 */

document.addEventListener("DOMContentLoaded", () => {
  // 品牌過場畫面 (Splash Screen) 自動平滑淡出 (約 900ms 後淡出，確保專業品牌體驗)
  const elSplash = document.getElementById("brand-splash-screen");
  if (elSplash) {
    setTimeout(() => {
      elSplash.classList.add("opacity-0", "pointer-events-none");
      setTimeout(() => elSplash.remove(), 550);
    }, 900);
  }

  const sessionId = APP_CONFIG.getSessionId();
  const dataBridge = new DataBridge(sessionId);

  // 狀態管理
  let selectedRole = null;
  let userBodymapData = {}; // { zoneId: 0~5 }
  let userBodymapDetails = {}; // { zoneId: { days: 'lt7'|'8to30'|'gt30', medical: 'yes'|'no' } }
  let currentQuestionIndex = 0;
  let userAnswers = []; // 保存工作站檢核作答狀態
  let envQuestions = [];
  let assessmentStartTime = Date.now(); // 記錄作答起算時間，用於防刷/防亂點分析
  let currentReportState = null; // 保存當前產出之報告資料供 PDF 匯出
  let currentFlexibilityResults = { upper: null, lower: null }; // 保存體適能檢測結果供 PDF 整合

  // DOM 元素
  const elSessionBadge = document.getElementById("session-badge");
  const elStepRole = document.getElementById("step-role");
  const elStepBodymap = document.getElementById("step-bodymap");
  const elStepQuiz = document.getElementById("step-quiz");
  const elStepResult = document.getElementById("step-result");
  
  const elRoleContainer = document.getElementById("role-cards-container");
  const elBodymapSummary = document.getElementById("bodymap-summary");
  const elBtnBodymapBack = document.getElementById("btn-bodymap-back");
  const elBtnBodymapNext = document.getElementById("btn-bodymap-next");
  const elBtnBodymapClearAll = document.getElementById("btn-bodymap-clear-all");

  const elProgressBar = document.getElementById("progress-bar");
  const elProgressText = document.getElementById("progress-text");
  const elQuestionContainer = document.getElementById("question-container");
  const elBtnPrev = document.getElementById("btn-prev-question");

  let studentBodyMap = null;

  // 初始化場次標籤
  if (elSessionBadge) {
    elSessionBadge.innerText = `場次：${sessionId}`;
    elSessionBadge.style.cursor = "pointer";
    elSessionBadge.title = "點擊可切換或查看演講場次代碼";
    elSessionBadge.addEventListener("click", () => {
      const customSession = prompt("目前場次代碼為：" + sessionId + "\n如需切換至其他場次，請輸入新代碼：", sessionId);
      if (customSession && customSession.trim() !== "" && customSession.trim() !== sessionId) {
        window.location.href = `index.html?session=${encodeURIComponent(customSession.trim())}`;
      }
    });
  }

  // 1. 渲染角色挑選卡片 (莫蘭迪色系 + 序號層級 + 痛點特徵說明)
  function renderRoles() {
    elRoleContainer.innerHTML = "";
    ERGO_CONFIG.roles.forEach((role) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className =
        "w-full text-left p-3.5 md:p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between group touch-press relative overflow-hidden shadow-sm hover:shadow-md";
      card.style.background = role.morandi.bg;
      card.style.borderColor = role.morandi.border;
      card.innerHTML = `
        <div class="w-full">
          <div class="flex items-start justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-2.5">
              <span class="text-base md:text-lg font-black px-2 py-0.5 rounded-md font-mono flex-shrink-0" style="color: ${role.morandi.seqColor}; background: ${role.morandi.badgeBg};">
                ${role.seq}
              </span>
              <div>
                <h3 class="text-sm md:text-base font-bold flex items-center gap-1.5" style="color: ${role.morandi.titleColor}">
                  <span>${role.icon}</span>
                  <span>${role.name}</span>
                </h3>
                <p class="text-[11px] font-medium" style="color: ${role.morandi.descColor}">${role.subtitle}</p>
              </div>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold border flex-shrink-0" style="background: ${role.morandi.badgeBg}; color: ${role.morandi.badgeText}; border-color: ${role.morandi.border};">
              ${role.badge}
            </span>
          </div>
          <p class="text-xs leading-relaxed mt-1 pl-1" style="color: ${role.morandi.descColor}">${role.desc}</p>
        </div>
        <div class="mt-2.5 pt-2 border-t flex items-center justify-between text-xs font-semibold" style="border-color: ${role.morandi.border}; color: ${role.morandi.color}">
          <span class="text-[10px] md:text-[11px] opacity-80 font-normal">專屬作業型態檢核題目</span>
          <span class="group-hover:translate-x-1 transition-transform flex items-center gap-0.5 font-bold">點擊開始檢測 ➔</span>
        </div>
      `;
      card.addEventListener("click", () => startBodymapStep(role.id));
      elRoleContainer.appendChild(card);
    });
  }

  // 2. 進入人體圖標記步驟
  function startBodymapStep(roleId) {
    selectedRole = roleId;
    elStepRole.classList.add("hidden");
    elStepBodymap.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 初始化人體圖元件
    if (!studentBodyMap) {
      studentBodyMap = new BodyMapComponent({
        containerId: "student-bodymap-container",
        interactive: true,
        onChange: (selectedData, detailsData) => {
          userBodymapData = { ...selectedData };
          userBodymapDetails = detailsData ? { ...detailsData } : {};
          updateBodymapSummary();
        }
      });
    } else {
      studentBodyMap.setData(userBodymapData, userBodymapDetails);
    }
    updateBodymapSummary();
  }

  // 更新人體圖選取摘要 (顯示 0~5 分莫蘭迪情境標籤與 NMQ 關鍵追問標記)
  function updateBodymapSummary() {
    const keys = Object.keys(userBodymapData).filter(k => userBodymapData[k] > 0);
    if (keys.length === 0) {
      elBodymapSummary.innerHTML = "目前尚未標記任何不適部位（若完全無症狀，可直接點擊下一步）";
      return;
    }

    const items = keys.map((key) => {
      const zone = NMQ_ZONES.find((z) => z.id === key);
      const name = zone ? zone.name : key;
      const level = userBodymapData[key];
      const levelConf = NMQ_SEVERITY_LEVELS.find(l => l.level === level) || NMQ_SEVERITY_LEVELS[0];
      const detail = userBodymapDetails[key];
      
      let extraTag = "";
      if (level >= 3 && detail) {
        const daysMap = { lt7: "<7天", "8to30": "8-30天", gt30: ">30天" };
        const medMap = { yes: "曾就醫", no: "未就醫" };
        extraTag = ` · ${daysMap[detail.days] || ""} · ${medMap[detail.medical] || ""}`;
      }

      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border font-medium shadow-xs" style="background-color: ${levelConf.color}15; border-color: ${levelConf.color}60; color: ${levelConf.color};">
        <span class="w-1.5 h-1.5 rounded-full mr-1.5" style="background-color: ${levelConf.color}"></span>
        ${name} (${level}分${extraTag})
      </span>`;
    });

    elBodymapSummary.innerHTML = `<div class="flex flex-wrap items-center justify-center gap-1.5">已標記部位：${items.join("")}</div>`;
  }

  // 人體圖按鈕導航
  elBtnBodymapBack.addEventListener("click", () => {
    elStepBodymap.classList.add("hidden");
    elStepRole.classList.remove("hidden");
  });

  // 一鍵無酸痛通關按鈕 (防呆：避免無酸痛者被迫亂按)
  if (elBtnBodymapClearAll) {
    elBtnBodymapClearAll.addEventListener("click", () => {
      userBodymapData = {};
      userBodymapDetails = {};
      if (studentBodyMap) {
        studentBodyMap.setData({}, {});
      }
      updateBodymapSummary();
      startQuizStep();
    });
  }

  elBtnBodymapNext.addEventListener("click", () => {
    // 檢查是否有極端惡搞嫌疑：若全身 15 個部位有超過 10 個標記為 4~5 分
    const severeCount = Object.values(userBodymapData).filter(v => v >= 4).length;
    if (severeCount >= 10) {
      const confirmProceed = confirm("⚠️ 系統偵測到您標記了超過 10 個部位皆為極重度劇痛或發麻（4~5分）。\n\n請問這符合您近一個月的真實身體狀況嗎？\n\n・點擊「確定」確認此為真實狀況並繼續\n・點擊「取消」返回檢查並修正標記");
      if (!confirmProceed) return;
    }
    startQuizStep();
  });

  // 3. 進入工作站環境檢核 4 題
  function startQuizStep() {
    const allQuestions = ERGO_CONFIG.questionSets[selectedRole] || ERGO_CONFIG.questionSets.office;
    // 取後 4 題環境題 (Q5~Q8)
    envQuestions = allQuestions.slice(4);
    currentQuestionIndex = 0;
    userAnswers = new Array(envQuestions.length).fill(null);

    elStepBodymap.classList.add("hidden");
    elStepQuiz.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    renderQuestion();
  }

  // 4. 渲染單一題目
  function renderQuestion() {
    const q = envQuestions[currentQuestionIndex];
    const totalQ = envQuestions.length;
    const progressPercent = ((currentQuestionIndex + 1) / totalQ) * 100;

    elProgressBar.style.width = `${progressPercent}%`;
    elProgressText.innerText = `環境檢核 ${currentQuestionIndex + 1} / ${totalQ}`;

    // 更新上一題按鈕文案
    if (elBtnPrev) {
      if (currentQuestionIndex === 0) {
        elBtnPrev.innerText = "⬅️ 返回人體圖修改";
      } else {
        elBtnPrev.innerText = "⬅️ 返回上一題";
      }
    }

    const prevAnswer = userAnswers[currentQuestionIndex];
    const prevSelectedIdx = prevAnswer !== null ? prevAnswer.selectedOptionIndex : null;

    elQuestionContainer.innerHTML = `
      <div class="fade-in">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
            ${q.dimensionName}
          </span>
        </div>
        <h2 class="text-lg md:text-xl font-bold text-slate-900 mb-5 leading-snug">
          ${q.question}
        </h2>
        <div class="space-y-3" id="options-container">
          ${q.options
            .map((opt, idx) => {
              const isSelected = prevSelectedIdx === idx;
              const activeClass = isSelected
                ? "border-sky-500 bg-sky-50/80 text-sky-950 ring-1 ring-sky-400 font-semibold shadow-sm"
                : "border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50 text-slate-800 shadow-sm";
              const letterActiveClass = isSelected
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-300 text-slate-500 group-hover:border-sky-400 group-hover:text-sky-700 bg-slate-50";

              return `
                <button 
                  type="button"
                  data-index="${idx}"
                  data-penalty="${opt.penalty}"
                  class="option-btn w-full text-left p-4 rounded-xl border ${activeClass} transition-all flex items-start gap-3.5 group min-h-[52px]">
                  <span class="w-6 h-6 rounded-full border ${letterActiveClass} flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-colors">
                    ${String.fromCharCode(65 + idx)}
                  </span>
                  <span class="text-sm md:text-base leading-relaxed font-normal">${opt.label}</span>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
    `;

    const optionBtns = elQuestionContainer.querySelectorAll(".option-btn");
    optionBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const optionIdx = parseInt(btn.getAttribute("data-index"), 10);
        const penalty = parseInt(btn.getAttribute("data-penalty"), 10);
        handleAnswer(optionIdx, penalty, q);
      });
    });
  }

  // 5. 處理答題
  function handleAnswer(optionIdx, penalty, questionObj) {
    userAnswers[currentQuestionIndex] = {
      questionId: questionObj.id,
      dimension: questionObj.dimension,
      penalty: penalty,
      selectedOptionIndex: optionIdx
    };

    if (currentQuestionIndex < envQuestions.length - 1) {
      currentQuestionIndex++;
      renderQuestion();
    } else {
      finishAssessment();
    }
  }

  // 6. 返回上一題邏輯
  if (elBtnPrev) {
    elBtnPrev.addEventListener("click", () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
      } else {
        // 返回人體圖步驟
        elStepQuiz.classList.add("hidden");
        elStepBodymap.classList.remove("hidden");
      }
    });
  }

  // 7. 計算總分與產出評估報告 (NMQ 人體圖負載 + 環境檢核)
  async function finishAssessment() {
    let totalScore = 100;
    
    // 計算 NMQ 人體圖扣分 (1分=1分, 2分=3分, 3分=6分, 4分=9分, 5分=12分，上限 40 分)
    let nmqPenaltySum = 0;
    Object.keys(userBodymapData).forEach((key) => {
      const val = userBodymapData[key] || 0;
      if (val === 1) nmqPenaltySum += 1;
      else if (val === 2) nmqPenaltySum += 3;
      else if (val === 3) nmqPenaltySum += 6; // 下班仍酸痛，權重加重
      else if (val === 4) nmqPenaltySum += 9;
      else if (val === 5) nmqPenaltySum += 12;
    });
    const nmqPenalty = Math.min(40, nmqPenaltySum);
    totalScore -= nmqPenalty;

    // 計算工作站環境與行為扣分 (最高扣 60 分)
    const traps = {
      trap_screen: false,
      trap_chair: false,
      trap_glare: false,
      trap_sedentary: false
    };

    userAnswers.forEach((ans) => {
      if (!ans) return;
      totalScore -= ans.penalty;
      if (traps[ans.dimension] !== undefined && ans.penalty > 0) {
        traps[ans.dimension] = true;
      }
    });

    totalScore = Math.max(0, Math.min(100, totalScore));

    const tierInfo =
      ERGO_CONFIG.scoreTiers.find((t) => totalScore >= t.min && totalScore <= t.max) ||
      ERGO_CONFIG.scoreTiers[ERGO_CONFIG.scoreTiers.length - 1];

    // 建立 15 個解剖區域的 NMQ 資料庫格式 (0~5 分純數值)
    const nmqData = {};
    NMQ_ZONES.forEach((z) => {
      nmqData[z.id] = userBodymapData[z.id] || 0;
    });

    // 呼叫動態人因指引引擎，產出完全客製化建議
    const personalizedGuides = ERGO_CONFIG.generatePersonalizedActionGuides(
      selectedRole,
      userBodymapData,
      traps
    );

    // 計算作答總耗時與品質旗標 (防惡意刷題/防極速亂點)
    const durationSeconds = Math.max(1, Math.round((Date.now() - assessmentStartTime) / 1000));
    const severeCount = Object.values(userBodymapData).filter(v => v >= 4).length;
    let qualityFlag = "Valid";
    if (durationSeconds < 8) {
      qualityFlag = "Speedrun";
    } else if (severeCount >= 10) {
      qualityFlag = "Extreme";
    }

    const submissionData = {
      role: selectedRole,
      totalScore: totalScore,
      tier: tierInfo.tier,
      nmqData: nmqData,
      nmqDetails: userBodymapDetails,
      traps: traps,
      durationSeconds: durationSeconds,
      qualityFlag: qualityFlag
    };

    await dataBridge.submitAssessment(submissionData);
    showResult(totalScore, tierInfo, nmqData, personalizedGuides, userBodymapDetails);
  }

  // 8. 渲染個人評估結果報告
  function showResult(score, tierInfo, nmqData, customGuides, detailsData = {}) {
    elStepQuiz.classList.add("hidden");
    elStepResult.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    document.getElementById("res-score").innerText = score;
    document.getElementById("res-title").innerText = tierInfo.title;
    document.getElementById("res-subtitle").innerText = tierInfo.subtitle;
    document.getElementById("res-analysis").innerText = tierInfo.analysis;
    document.getElementById("res-score-badge").className = `inline-block px-3 py-1 rounded-full text-xs font-bold border ${tierInfo.badgeColor} mb-2`;
    document.getElementById("res-score-badge").innerText = tierInfo.title;

    // 保存當前報告完整狀態供 PDF 匯出使用
    currentReportState = {
      score,
      tierInfo,
      nmqData,
      customGuides,
      detailsData,
      bodymapData: { ...userBodymapData },
      role: selectedRole
    };

    // 儲存至本地記憶，防學員演講中途跳出或重新整理遺失
    try {
      localStorage.setItem("ergo_last_report_" + sessionId, JSON.stringify({
        score, tierInfo, nmqData, customGuides, detailsData, bodymapData: userBodymapData, role: selectedRole
      }));
    } catch (e) {}

    // 渲染高對比光譜落點儀 (0~100 橫桿、穿透定位針、靶心光環與四級動態高亮)
    const marker = document.getElementById("spectrum-marker");
    const markerScoreText = document.getElementById("spectrum-marker-score-text");
    const markerLabel = document.getElementById("spectrum-marker-label");
    const markerArrow = document.getElementById("spectrum-marker-arrow");
    const targetDisc = document.getElementById("spectrum-target-disc");

    if (marker) {
      const clampedScore = Math.max(0, Math.min(100, score));
      const markerPos = Math.max(7, Math.min(93, clampedScore));
      marker.style.left = `${markerPos}%`;

      if (markerScoreText) {
        markerScoreText.innerText = `${clampedScore} 分 (${tierInfo.title})`;
      }

      // 依區間設定色彩與定位指標
      let markerBg = "#10b981"; // 85~100 綠 (健康優良)
      let activePillId = "tier-pill-good";
      if (clampedScore < 50) {
        markerBg = "#f43f5e"; // 0~49 紅 (重度超載)
        activePillId = "tier-pill-severe";
      } else if (clampedScore < 70) {
        markerBg = "#f97316"; // 50~69 橙 (中度負荷)
        activePillId = "tier-pill-moderate";
      } else if (clampedScore < 85) {
        markerBg = "#eab308"; // 70~84 黃 (輕度不良)
        activePillId = "tier-pill-mild";
      }

      if (markerLabel) markerLabel.style.backgroundColor = markerBg;
      if (markerArrow) markerArrow.style.borderTopColor = markerBg;
      if (targetDisc) targetDisc.style.backgroundColor = markerBg;

      // 四大區間藥丸卡片動態高亮 (讓學員一眼看出落在哪個區間)
      ["tier-pill-severe", "tier-pill-moderate", "tier-pill-mild", "tier-pill-good"].forEach((pillId) => {
        const pill = document.getElementById(pillId);
        if (!pill) return;
        if (pillId === activePillId) {
          pill.className = "p-1.5 md:p-2 rounded-xl border-2 transition-all duration-300 shadow-md font-black " +
            (activePillId === "tier-pill-severe" ? "bg-rose-100 border-rose-500 text-rose-950 ring-2 ring-rose-300" :
             activePillId === "tier-pill-moderate" ? "bg-orange-100 border-orange-500 text-orange-950 ring-2 ring-orange-300" :
             activePillId === "tier-pill-mild" ? "bg-amber-100 border-amber-500 text-amber-950 ring-2 ring-amber-300" :
             "bg-emerald-100 border-emerald-500 text-emerald-950 ring-2 ring-emerald-300");
        } else {
          pill.className = "p-1.5 rounded-lg border transition-all duration-300 text-slate-400 bg-slate-50/70 border-slate-200 opacity-60";
        }
      });
    }

    // 綁定 PDF 下載與分享按鈕
    const btnExportPdf = document.getElementById("btn-export-pdf");
    const btnSharePdf = document.getElementById("btn-share-pdf");
    if (btnExportPdf) {
      btnExportPdf.onclick = () => exportPdfReport(false);
    }
    if (btnSharePdf) {
      btnSharePdf.onclick = () => exportPdfReport(true);
    }

    // 渲染個人結果人體圖 (唯讀)
    const resMapContainer = document.getElementById("result-bodymap-container");
    resMapContainer.innerHTML = "";
    const resultMap = new BodyMapComponent({
      containerId: "result-bodymap-container",
      interactive: false
    });
    resultMap.setData(userBodymapData, detailsData);

    // 渲染標記文字清單 (顯示 0~5 分精準生活情境與 NMQ 法規追問結果)
    const resListEl = document.getElementById("result-bodymap-list");
    const activeKeys = Object.keys(userBodymapData).filter(k => userBodymapData[k] > 0);
    if (activeKeys.length === 0) {
      resListEl.innerHTML = `<div class="text-slate-400 text-center py-1">全身體幹與關節目前無顯著酸痛標記（各部位皆為 0 分）</div>`;
    } else {
      resListEl.innerHTML = activeKeys
        .map((k) => {
          const z = NMQ_ZONES.find((item) => item.id === k);
          const name = z ? z.name : k;
          const level = userBodymapData[k];
          const levelConf = NMQ_SEVERITY_LEVELS.find(l => l.level === level) || NMQ_SEVERITY_LEVELS[0];
          const detail = detailsData[k];

          let nmqBadgeHtml = "";
          if (level >= 3 && detail) {
            const daysLabel = detail.days === "gt30" ? "累積超過 30 天" : (detail.days === "8to30" ? "累積 8~30 天" : "未滿 7 天");
            const medLabel = detail.medical === "yes" ? "🏥 曾就醫/復健/服藥" : "🌱 未曾就醫";
            const medClass = detail.medical === "yes" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200";

            nmqBadgeHtml = `
              <div class="mt-1.5 pt-1.5 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span class="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold border border-sky-200">NMQ法規追問</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">年累：${daysLabel}</span>
                <span class="px-1.5 py-0.5 rounded font-medium border ${medClass}">${medLabel}</span>
              </div>
            `;
          }
          
          return `
          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-sm">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2 font-bold text-slate-800">
                <span class="w-2.5 h-2.5 rounded-full shadow-sm" style="background-color: ${levelConf.color}"></span>
                <span>${name}</span>
              </span>
              <span class="text-slate-700 font-semibold">${level}分 · ${levelConf.label} <span class="text-[10px] text-slate-500 font-normal">(${levelConf.desc.slice(0, 16)}...)</span></span>
            </div>
            ${nmqBadgeHtml}
          </div>
        `;
        })
        .join("");
    }

    // 渲染動態個人化改善指引清單
    const elGuides = document.getElementById("res-action-guides");
    const guidesToRender = customGuides && customGuides.length > 0 ? customGuides : tierInfo.actionGuides;
    if (elGuides) {
      elGuides.innerHTML = guidesToRender
        .map(
          (guide, i) => `
          <li class="flex items-start gap-3 text-slate-700 text-sm leading-relaxed p-3 rounded-xl bg-sky-50/50 border border-sky-100 shadow-sm">
            <span class="w-5 h-5 rounded-md bg-sky-100 text-sky-800 border border-sky-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 shadow-xs">
              ${i + 1}
            </span>
            <span>${guide}</span>
          </li>
        `
        )
        .join("");
    }

    const elDisclaimer = document.getElementById("res-disclaimer");
    if (elDisclaimer) {
      elDisclaimer.innerText = ERGO_CONFIG.disclaimer;
    }

    document.getElementById("btn-restart").addEventListener("click", () => {
      userBodymapData = {};
      userBodymapDetails = {};
      elStepResult.classList.add("hidden");
      elStepRole.classList.remove("hidden");
      resetFlexibilityModule();
      checkRestoreBanner();
      renderRoles();
    });
  }

  // 9. 課堂體適能柔軟度自我檢測模組互動邏輯
  function initFlexibilityModule() {
    const btnToggle = document.getElementById("btn-toggle-flexibility");
    const content = document.getElementById("flexibility-content");
    const chevron = document.getElementById("flexibility-chevron");

    if (btnToggle && content && chevron) {
      btnToggle.addEventListener("click", () => {
        const isHidden = content.classList.contains("hidden");
        if (isHidden) {
          content.classList.remove("hidden");
          const textSpan = btnToggle.querySelector("span:first-child");
          if (textSpan) textSpan.innerText = "收合課堂檢測";
          chevron.innerText = "▴";
        } else {
          content.classList.add("hidden");
          const textSpan = btnToggle.querySelector("span:first-child");
          if (textSpan) textSpan.innerText = "展開課堂檢測";
          chevron.innerText = "▾";
        }
      });
    }

    const upperFeedbacks = {
      good: `
        <div class="space-y-1.5 text-left">
          <div class="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
            <span>🟢 檢測結果：優良（指尖重疊 > 2cm）</span>
          </div>
          <p class="text-[11px] text-emerald-950/80 leading-relaxed">
            <strong>雙側肩關節活動度極佳！</strong>旋轉肌袖與胸大肌延展性充足，肩胛骨能自然後收下壓。
          </p>
          <div class="p-2 rounded-lg bg-white/90 border border-emerald-200 text-[10.5px] space-y-1">
            <div class="text-emerald-900 font-bold">✨ 生物力學優勢：</div>
            <div class="text-slate-700">肩峰下空間（Subacromial Space）充裕，操作滑鼠時棘上肌腱不易磨損夾擠，能有效預防滑鼠手與頸椎過度代償。</div>
            <div class="text-emerald-800 font-semibold pt-0.5">🛠️ 工間保養：持續保持每小時起身擴胸的良好習慣！</div>
          </div>
        </div>
      `,
      normal: `
        <div class="space-y-1.5 text-left">
          <div class="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
            <span>🟡 檢測結果：及格（指尖勉強碰觸）</span>
          </div>
          <p class="text-[11px] text-amber-950/80 leading-relaxed">
            <strong>肩關節活動度在標準邊界。</strong>平日長時間操作鍵盤滑鼠，前側胸大肌與肩胛下肌已開始出現早期短縮。
          </p>
          <div class="p-2 rounded-lg bg-white/90 border border-amber-200 text-[10.5px] space-y-1">
            <div class="text-amber-900 font-bold">⚡ 潛在影響與好發酸痛部位：</div>
            <div class="text-slate-700">下午常感<strong>肩胛骨內側（膏肓盲區）</strong>酸脹、後頸僵硬。若未及時伸展，容易惡化為圓肩與滑鼠手。</div>
            <div class="text-amber-800 font-semibold pt-0.5">🛠️ 人因小管家解法：定時進行雙手背後互扣牽拉，放鬆提肩胛肌。</div>
          </div>
        </div>
      `,
      tight: `
        <div class="space-y-2 text-left">
          <div class="font-bold text-rose-900 flex items-center gap-1.5 text-xs">
            <span>🔴 緊繃警示：碰不到（差 5cm+ / 肩旋轉肌群嚴重緊繃）</span>
          </div>
          <div class="p-2.5 rounded-lg bg-white/95 border border-rose-300 text-[11px] space-y-2">
            <div>
              <div class="text-rose-950 font-bold flex items-center gap-1">
                <span>💥</span> 可能引發的骨骼肌肉影響（生物力學代償）：
              </div>
              <ul class="list-disc pl-4 text-slate-700 space-y-0.5 mt-1 text-[10.5px]">
                <li><strong>圓肩駝背（上交叉症候群）：</strong>胸大肌與肩胛下肌攣縮，將兩肩向前強拉，迫使頸椎向前過度前傾代償（烏龜頸）。</li>
                <li><strong>肩峰下夾擠症候群：</strong>肩胛骨缺乏上旋空間，手臂前伸操作滑鼠時，旋轉肌袖（棘上肌腱）反覆遭受骨質磨損夾擠。</li>
                <li><strong>胸廓出口壓迫：</strong>胸小肌過度短縮壓迫臂神經叢，導致手臂末梢血流受阻。</li>
              </ul>
            </div>

            <div class="pt-1.5 border-t border-rose-100">
              <div class="text-rose-950 font-bold flex items-center gap-1">
                <span>⚡</span> 容易產生的酸痛與麻木好發部位：
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-1 mt-1 text-[10px] text-slate-700">
                <div class="p-1 rounded bg-rose-50/80 border border-rose-100">1. <strong>後頸與上斜方肌：</strong>沉重僵硬、伴隨頸因性頭痛</div>
                <div class="p-1 rounded bg-rose-50/80 border border-rose-100">2. <strong>肩峰前外側：</strong>穿衣、後摸或舉手時刺痛</div>
                <div class="p-1 rounded bg-rose-50/80 border border-rose-100">3. <strong>前臂與手肘外側：</strong>滑鼠手代償引發網球肘/伸腕肌炎</div>
                <div class="p-1 rounded bg-rose-50/80 border border-rose-100">4. <strong>手掌與指尖麻木：</strong>正中神經受壓、指尖冰冷麻刺</div>
              </div>
            </div>

            <div class="pt-1.5 border-t border-rose-100 text-rose-900 font-medium text-[10.5px]">
              🛠️ <strong>人因改善指引：</strong>每工作 50 分鐘施作「門框擴胸伸展（20秒）」與「靠牆天使背肌活化」，嚴禁手肘懸空懸臂打字。
            </div>
          </div>
        </div>
      `
    };

    const lowerFeedbacks = {
      good: `
        <div class="space-y-1.5 text-left">
          <div class="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
            <span>🟢 檢測結果：優良（超過腳尖 5cm+）</span>
          </div>
          <p class="text-[11px] text-emerald-950/80 leading-relaxed">
            <strong>大腿後側膕旁肌與下背深層筋膜彈性極佳！</strong>
          </p>
          <div class="p-2 rounded-lg bg-white/90 border border-emerald-200 text-[10.5px] space-y-1">
            <div class="text-emerald-900 font-bold">✨ 生物力學優勢：</div>
            <div class="text-slate-700">久坐時骨盆能自然維持中立位（Neutral Pelvis），腰椎維持自然生理前凸避震弧度，大幅分散第4-5腰椎間盤集中擠壓。</div>
            <div class="text-emerald-800 font-semibold pt-0.5">🛠️ 工間保養：維持健康坐姿與定期起立走動即可！</div>
          </div>
        </div>
      `,
      normal: `
        <div class="space-y-1.5 text-left">
          <div class="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
            <span>🟡 檢測結果：及格（剛好觸及腳趾）</span>
          </div>
          <p class="text-[11px] text-amber-950/80 leading-relaxed">
            <strong>腿後肌群延展性處於基本範圍。</strong>
          </p>
          <div class="p-2 rounded-lg bg-white/90 border border-amber-200 text-[10.5px] space-y-1">
            <div class="text-amber-900 font-bold">⚡ 潛在影響與好發酸痛部位：</div>
            <div class="text-slate-700">久坐若超過 60 分鐘，骨盆易不自覺向後滑移塌陷，引起下腰深處酸脹。</div>
            <div class="text-amber-800 font-semibold pt-0.5">🛠️ 人因小管家解法：座椅請加裝腰靠支撐，坐姿時膝蓋保持 90 度腳踏實地。</div>
          </div>
        </div>
      `,
      tight: `
        <div class="space-y-2 text-left">
          <div class="font-bold text-rose-900 flex items-center gap-1.5 text-xs">
            <span>🔴 緊繃警示：摸不到腳趾（膕旁肌攣縮短縮 / 骨盆後傾高風險）</span>
          </div>
          <div class="p-2.5 rounded-lg bg-white/95 border border-rose-300 text-[11px] space-y-2">
            <div>
              <div class="text-rose-950 font-bold flex items-center gap-1">
                <span>💥</span> 可能引發的骨骼肌肉影響（生物力學代償）：
              </div>
              <ul class="list-disc pl-4 text-slate-700 space-y-0.5 mt-1 text-[10.5px]">
                <li><strong>強力拉扯骨盆後傾（Posterior Pelvic Tilt）：</strong>膕旁肌緊繃如繃緊的鋼索，將骨盆坐骨結節往下拉翻。</li>
                <li><strong>腰椎正常生理前凸消失（Flat Back）：</strong>骨盆後倒迫使第4-5腰椎及薦椎（L4-S1）向前屈曲拉平，失去天然 S 型避震彈性。</li>
                <li><strong>椎間盤承受 2.5 倍以上異常剪力與後向膨出擠壓：</strong>久坐時上半身全部重量直接壓迫腰椎後側纖維環，誘發椎間盤突出高風險！</li>
              </ul>
            </div>

            <div class="pt-1.5 border-t border-rose-100">
              <div class="text-rose-950 font-bold flex items-center gap-1">
                <span>⚡</span> 容易產生的酸痛與麻木好發部位：
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-1 mt-1 text-[10px] text-slate-700">
                <div class="p-1 rounded bg-rose-50/80 border border-rose-100">1. <strong>下腰部正中（L4-S1豎脊肌）：</strong>久坐起立時直不起腰、深層鈍痛僵硬</div>
                <div class="p-1 rounded bg-rose-50/80 border border-rose-100">2. <strong>臀部深層與坐骨神經：</strong>梨狀肌代償緊繃，酸脹傳導至大腿後側</div>
                <div class="p-1 rounded bg-rose-50/80 border border-rose-100">3. <strong>膝蓋前側髕骨肌腱：</strong>後側太緊迫使膝前股四頭肌過勞，引發膝前疼痛</div>
                <div class="p-1 rounded bg-rose-50/80 border border-rose-100">4. <strong>薦腸關節（SI Joint）：</strong>骨盆歪斜不對稱受壓，引發單側下背刺痛</div>
              </div>
            </div>

            <div class="pt-1.5 border-t border-rose-100 text-rose-900 font-medium text-[10.5px]">
              🛠️ <strong>人因改善指引：</strong>每日施作「坐姿單腿向前毛巾拉足伸展（每腿30秒）」與「坐姿翹二郎腿臀大肌前傾伸展」，座椅切忌過深。
            </div>
          </div>
        </div>
      `
    };

    // 上肢按鈕互動
    const upperBtns = document.querySelectorAll(".flex-btn-upper");
    const upperRes = document.getElementById("flex-result-upper");
    upperBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        upperBtns.forEach((b) => {
          b.classList.remove("border-emerald-500", "bg-emerald-50", "text-emerald-900");
          b.classList.add("border-slate-200", "bg-white", "text-slate-800");
        });
        btn.classList.remove("border-slate-200", "bg-white", "text-slate-800");
        btn.classList.add("border-emerald-500", "bg-emerald-50", "text-emerald-900");

        const val = btn.getAttribute("data-val");
        const valMap = { good: "優良（指尖重疊）", normal: "及格（勉強碰觸）", tight: "緊繃警示（碰不到）" };
        currentFlexibilityResults.upper = {
          val: val,
          text: valMap[val] || val
        };

        if (upperRes && upperFeedbacks[val]) {
          upperRes.innerHTML = upperFeedbacks[val];
          upperRes.classList.remove("hidden");
        }
      });
    });

    // 下肢按鈕互動
    const lowerBtns = document.querySelectorAll(".flex-btn-lower");
    const lowerRes = document.getElementById("flex-result-lower");
    lowerBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        lowerBtns.forEach((b) => {
          b.classList.remove("border-emerald-500", "bg-emerald-50", "text-emerald-900");
          b.classList.add("border-slate-200", "bg-white", "text-slate-800");
        });
        btn.classList.remove("border-slate-200", "bg-white", "text-slate-800");
        btn.classList.add("border-emerald-500", "bg-emerald-50", "text-emerald-900");

        const val = btn.getAttribute("data-val");
        const valMap = { good: "優良（超過腳尖）", normal: "及格（剛好碰觸）", tight: "緊繃警示（摸不到腳趾）" };
        currentFlexibilityResults.lower = {
          val: val,
          text: valMap[val] || val
        };

        if (lowerRes && lowerFeedbacks[val]) {
          lowerRes.innerHTML = lowerFeedbacks[val];
          lowerRes.classList.remove("hidden");
        }
      });
    });
  }

  function resetFlexibilityModule() {
    const content = document.getElementById("flexibility-content");
    const btnToggle = document.getElementById("btn-toggle-flexibility");
    const chevron = document.getElementById("flexibility-chevron");
    if (content) content.classList.add("hidden");
    if (btnToggle) {
      const textSpan = btnToggle.querySelector("span:first-child");
      if (textSpan) textSpan.innerText = "展開課堂檢測";
    }
    if (chevron) chevron.innerText = "▾";

    document.querySelectorAll(".flex-btn-upper, .flex-btn-lower").forEach((b) => {
      b.classList.remove("border-emerald-500", "bg-emerald-50", "text-emerald-900");
      b.classList.add("border-slate-200", "bg-white", "text-slate-800");
    });
    const upperRes = document.getElementById("flex-result-upper");
    const lowerRes = document.getElementById("flex-result-lower");
    if (upperRes) upperRes.classList.add("hidden");
    if (lowerRes) lowerRes.classList.add("hidden");
    currentFlexibilityResults = { upper: null, lower: null };
  }

  // 10. PDF 報告產出與分享功能 (比照 KIM 2019 官方規格，附人因小管家 LOGO)
  async function exportPdfReport(isShare = false) {
    if (!currentReportState) {
      alert("請先完成檢測評估以產出報告！");
      return;
    }

    // 顯示生成進度彈窗
    const toast = document.createElement("div");
    toast.className = "fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4";
    toast.innerHTML = `
      <div class="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl flex flex-col items-center text-center space-y-3">
        <div class="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <div>
          <div class="font-black text-slate-900 text-sm">正在產出高解析 PDF 人因報告</div>
          <p class="text-xs text-slate-500 mt-0.5">載入人因小管家官方標章與檢測指標...</p>
        </div>
      </div>
    `;
    document.body.appendChild(toast);

    try {
      // 構建專屬 A4 高解析度輸出容器
      const printable = document.createElement("div");
      printable.id = "printable-pdf-document";
      printable.style.width = "780px";
      printable.style.padding = "24px 28px";
      printable.style.backgroundColor = "#ffffff";
      printable.style.color = "#0f172a";
      printable.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif";
      printable.style.position = "fixed";
      printable.style.left = "-9999px";
      printable.style.top = "0";

      const dateStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      const roleObj = ERGO_CONFIG.roles.find(r => r.id === currentReportState.role) || ERGO_CONFIG.roles[0];

      // 痛點標記列表 HTML
      const activeKeys = Object.keys(currentReportState.bodymapData || {}).filter(k => currentReportState.bodymapData[k] > 0);
      let bodymapRowsHtml = "";
      if (activeKeys.length === 0) {
        bodymapRowsHtml = `<tr><td colspan="4" style="text-align:center; padding: 10px; color: #64748b; font-size: 11px;">全身體幹與各關節目前無顯著酸痛標記（各部位皆為 0 分）</td></tr>`;
      } else {
        bodymapRowsHtml = activeKeys.map(k => {
          const zone = NMQ_ZONES.find(z => z.id === k);
          const name = zone ? zone.name : k;
          const level = currentReportState.bodymapData[k];
          const levelConf = NMQ_SEVERITY_LEVELS.find(l => l.level === level) || NMQ_SEVERITY_LEVELS[0];
          const detail = (currentReportState.detailsData && currentReportState.detailsData[k]) || null;
          let daysLabel = "--";
          let medLabel = "--";
          if (detail) {
            daysLabel = detail.days === "gt30" ? ">30天" : (detail.days === "8to30" ? "8~30天" : "<7天");
            medLabel = detail.medical === "yes" ? "曾就醫" : "未就醫";
          }
          return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
              <td style="padding: 6px 8px; font-weight: bold; color: #1e293b;">${name}</td>
              <td style="padding: 6px 8px; color: ${levelConf.color}; font-weight: bold;">${level}分 · ${levelConf.label}</td>
              <td style="padding: 6px 8px; color: #475569;">${daysLabel}</td>
              <td style="padding: 6px 8px; color: #475569;">${medLabel}</td>
            </tr>
          `;
        }).join("");
      }

      // 改善指引 HTML
      const guides = currentReportState.customGuides && currentReportState.customGuides.length > 0 ? currentReportState.customGuides : currentReportState.tierInfo.actionGuides;
      const guidesHtml = guides.map((g, idx) => `
        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 11px; line-height: 1.5; color: #334155;">
          <span style="background: #e0f2fe; color: #0369a1; font-weight: bold; width: 18px; height: 18px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 10px;">${idx + 1}</span>
          <span>${g}</span>
        </div>
      `).join("");

      // 體適能測試 HTML
      let flexHtml = "";
      const upperRes = currentFlexibilityResults.upper;
      const lowerRes = currentFlexibilityResults.lower;
      if (upperRes || lowerRes) {
        flexHtml = `
          <div style="margin-top: 14px; padding: 12px; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px;">
            <div style="font-weight: bold; font-size: 12px; color: #14532d; margin-bottom: 6px;">🏃‍♂️ 課堂實作：體適能上下肢柔軟度自我檢測與酸痛好發分析</div>
            <div style="font-size: 11px; color: #166534; line-height: 1.5;">
              ${upperRes ? `<div><strong>1. 上肢抓背測驗：</strong>${upperRes.text} <span style="font-size: 10px; color: #475569;">(緊繃影響：圓肩、肩峰夾擠、手肘網球肘、滑鼠手)</span></div>` : ''}
              ${lowerRes ? `<div style="margin-top: 4px;"><strong>2. 下肢椅上體前彎：</strong>${lowerRes.text} <span style="font-size: 10px; color: #475569;">(緊繃影響：骨盆後傾、腰椎前凸消失、L4-S1椎間盤剪力、下背痛)</span></div>` : ''}
            </div>
          </div>
        `;
      }

      printable.innerHTML = `
        <!-- 頂部官方 Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #0284c7; padding-bottom: 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="assets/logo.png" style="width: 52px; height: 52px; object-fit: contain;">
            <div>
              <div style="font-size: 17px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
                人因小管家 PRO・肌肉骨骼不適 (NMQ) 與工作站環境評估報告
              </div>
              <div style="font-size: 11px; color: #0284c7; font-weight: bold; margin-top: 2px;">
                北歐肌肉骨骼問卷 (Nordic Musculoskeletal Questionnaire) 臨床人因工程評估體系
              </div>
            </div>
          </div>
          <div style="text-align: right; font-size: 10.5px; color: #64748b; line-height: 1.4;">
            <div><strong>主講專家：</strong>蔡健儀 人因工程專家</div>
            <div><strong>評估場次：</strong>${sessionId}</div>
            <div><strong>報告日期：</strong>${dateStr} ${timeStr}</div>
          </div>
        </div>

        <!-- 作業型態 -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 11.5px;">
          <span><strong>受檢作業型態：</strong>${roleObj.name} (${roleObj.subtitle})</span>
          <span style="color: #0284c7; font-weight: bold;">人因專屬題庫檢核認證</span>
        </div>

        <!-- 分數與 0~100 連續光譜 -->
        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 14px; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 24px;">
            <div>
              <span style="font-size: 10.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">人因健康綜合評分</span>
              <div style="font-size: 40px; font-weight: 900; color: #0f172a; line-height: 1.1;">
                ${currentReportState.score} <span style="font-size: 14px; color: #64748b;">/ 100分</span>
              </div>
            </div>
            <div style="text-align: left; max-width: 440px;">
              <span style="display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; margin-bottom: 4px;">
                ${currentReportState.tierInfo.title}
              </span>
              <div style="font-size: 11px; color: #334155; line-height: 1.4;">
                ${currentReportState.tierInfo.analysis}
              </div>
            </div>
          </div>

          <!-- 光譜條落點視覺 -->
          <div style="margin-top: 14px; padding: 0 10px;">
            <div style="position: relative; padding-top: 22px; padding-bottom: 6px;">
              <div style="position: absolute; top: 0; left: ${Math.max(8, Math.min(92, currentReportState.score))}%; transform: translateX(-50%); font-size: 10px; font-weight: bold; background: #0f172a; color: #ffffff; padding: 2px 8px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                🎯 落點: ${currentReportState.score}分 (${currentReportState.tierInfo.title})
              </div>
              <div style="height: 14px; border-radius: 7px; background: linear-gradient(to right, #f43f5e 0%, #f97316 45%, #eab308 70%, #10b981 100%); width: 100%; border: 1px solid rgba(0,0,0,0.1);"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: bold; color: #64748b; margin-top: 2px;">
              <span style="color: #e11d48;">0 (重度超載)</span>
              <span style="color: #ea580c;">50 (中度)</span>
              <span style="color: #ca8a04;">70 (輕度)</span>
              <span style="color: #059669;">100 (健康滿分)</span>
            </div>
          </div>
        </div>

        <!-- 痛點清單與人因指引 雙欄 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <!-- 左欄：痛點清單 -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
            <div style="font-weight: bold; font-size: 12px; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              🧍 NMQ 肌肉骨骼不適標記清單
            </div>
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
              <thead>
                <tr style="font-size: 10px; color: #64748b; border-bottom: 1.5px solid #cbd5e1;">
                  <th style="padding: 4px 6px;">部位</th>
                  <th style="padding: 4px 6px;">嚴重度</th>
                  <th style="padding: 4px 6px;">年累積</th>
                  <th style="padding: 4px 6px;">就醫</th>
                </tr>
              </thead>
              <tbody>
                ${bodymapRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- 右欄：人因改善指引 -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
            <div style="font-weight: bold; font-size: 12px; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              🛠️ 個人化作業環境改善指引
            </div>
            ${guidesHtml}
          </div>
        </div>

        <!-- 體適能測試結果 -->
        ${flexHtml}

        <!-- 專家推薦與官方工具 -->
        <div style="margin-top: 14px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px;">
          <div>
            <strong>📐 德國主要關鍵指標法 KIM 2019：</strong>https://aicokecolatsai-commits.github.io/KIM2019/
          </div>
          <div>
            <strong>📚 蔡健儀 官方部落格：</strong>https://ergopt.blogspot.com/
          </div>
        </div>

        <!-- Footer 免責與版權 -->
        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 9.5px; color: #94a3b8; line-height: 1.4; text-align: center;">
          ⚠️ 免責聲明：本報告係依據北歐肌肉骨骼問卷 (NMQ) 原理及人因工程人體測量學設計之自我檢核指標，僅供環境改善與健康促進參考，非屬醫療診斷行為。若已有持續性神經壓迫或病症請尋求專科醫師診斷。<br>
          © 人因小管家 (Noah) 蔡健儀 專屬研發 ｜ 智慧財產權保護・未經授權禁止商用翻印
        </div>
      `;

      document.body.appendChild(printable);

      // 設定 html2pdf 選項
      const fileName = `人因小管家_NMQ評估報告_${dateStr.replace(/\//g, '')}.pdf`;
      const opt = {
        margin: [6, 6, 6, 6],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (isShare) {
        // 分享模式
        const pdfBlob = await html2pdf().set(opt).from(printable).output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: '人因小管家 PRO 個人評估報告',
            text: `蔡健儀 人因工程專家 研發建置・我的健康得分：${currentReportState.score}分`,
            files: [pdfFile]
          });
        } else {
          // 若瀏覽器不支援 Web Share API 檔案分享，自動觸發下載
          await html2pdf().set(opt).from(printable).save();
        }
      } else {
        // 直接下載
        await html2pdf().set(opt).from(printable).save();
      }

      // 清理 DOM
      setTimeout(() => {
        printable.remove();
        toast.remove();
      }, 500);

    } catch (err) {
      console.error("PDF 產生失敗:", err);
      toast.remove();
      alert("PDF 報告產生失敗，請確認瀏覽器支援度或稍後重試。");
    }
  }

  // 10. 檢測報告歷史還原與課堂快速通道
  function checkRestoreBanner() {
    const banner = document.getElementById("banner-restore-result");
    const btnRestore = document.getElementById("btn-restore-result");
    const bannerText = document.getElementById("restore-banner-text");
    const btnQuickFlex = document.getElementById("btn-quick-flexibility");

    let cached = null;
    try {
      const raw = localStorage.getItem("ergo_last_report_" + sessionId);
      if (raw) cached = JSON.parse(raw);
    } catch (e) {}

    if (cached && banner && btnRestore) {
      banner.classList.remove("hidden");
      if (bannerText) {
        bannerText.innerText = `您已完成檢測 (得分：${cached.score}分 · ${cached.tierInfo.title})`;
      }
      btnRestore.onclick = () => {
        userBodymapData = cached.bodymapData || {};
        userBodymapDetails = cached.detailsData || {};
        elStepRole.classList.add("hidden");
        elStepBodymap.classList.add("hidden");
        elStepQuiz.classList.add("hidden");
        showResult(cached.score, cached.tierInfo, cached.nmqData, cached.customGuides, cached.detailsData);
      };
    }

    if (btnQuickFlex) {
      btnQuickFlex.addEventListener("click", () => {
        elStepRole.classList.add("hidden");
        elStepBodymap.classList.add("hidden");
        elStepQuiz.classList.add("hidden");

        if (cached) {
          userBodymapData = cached.bodymapData || {};
          userBodymapDetails = cached.detailsData || {};
          showResult(cached.score, cached.tierInfo, cached.nmqData, cached.customGuides, cached.detailsData);
        } else {
          const defaultTier = ERGO_CONFIG.scoreTiers[1]; // 良好
          showResult(85, defaultTier, {}, defaultTier.actionGuides, {});
        }

        // 展開體適能模組並平滑滾動至該處
        const flexContent = document.getElementById("flexibility-content");
        const btnToggle = document.getElementById("btn-toggle-flexibility");
        const chevron = document.getElementById("flexibility-chevron");
        if (flexContent) flexContent.classList.remove("hidden");
        if (btnToggle) {
          const span = btnToggle.querySelector("span:first-child");
          if (span) span.innerText = "收合課堂檢測";
        }
        if (chevron) chevron.innerText = "▴";

        setTimeout(() => {
          const card = document.getElementById("flexibility-test-card");
          if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.classList.add("ring-4", "ring-emerald-300");
            setTimeout(() => card.classList.remove("ring-4", "ring-emerald-300"), 2000);
          }
        }, 200);
      });
    }
  }

  // 初始渲染
  initFlexibilityModule();
  checkRestoreBanner();
  renderRoles();
});
