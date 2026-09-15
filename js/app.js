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

    // 渲染連續光譜指針 (0~100 光譜橫桿)
    const marker = document.getElementById("spectrum-marker");
    const markerLabel = document.getElementById("spectrum-marker-label");
    if (marker && markerLabel) {
      const clampedScore = Math.max(0, Math.min(100, score));
      marker.style.left = `${clampedScore}%`;
      markerLabel.innerText = `${clampedScore} 分 · ${tierInfo.title}`;

      // 依區間設定指針標籤顏色
      let markerBg = "#10b981"; // 85~100 綠 (健康低風險)
      if (clampedScore < 50) markerBg = "#f43f5e"; // 0~49 紅 (重度危害)
      else if (clampedScore < 70) markerBg = "#f97316"; // 50~69 橙 (中度負荷)
      else if (clampedScore < 85) markerBg = "#eab308"; // 70~84 黃 (輕度不良)

      markerLabel.style.backgroundColor = markerBg;
      const markerArrow = marker.querySelector("div:last-child");
      if (markerArrow) markerArrow.style.borderTopColor = markerBg;
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
      good: "🟢 <strong>優良（肩關節活動良好）：</strong>雙側肩胛下肌與棘下肌活動度極佳，能維持良好胸廓開展！請持續保持工間伸展。",
      normal: "🟡 <strong>及格（標準活動範圍）：</strong>肩關節活動度尚可，但若平日使用電腦滑鼠時間長，容易逐漸前傾緊繃，建議定期做擴胸後夾伸展。",
      tight: "🔴 <strong>緊繃警示（肩旋轉肌群受限）：</strong>肩胛下肌、胸大肌過度攣縮短縮，易誘發圓肩駝背與滑鼠手夾擠症候群！建議每工作 50 分鐘施作「門框胸肌伸展」或「雙手背後互扣牽拉」。"
    };

    const lowerFeedbacks = {
      good: "🟢 <strong>優良（膕旁肌彈性極佳）：</strong>大腿後側膕旁肌與腰椎屈曲延展性優良，能有效分散長時間就座時的骨盆壓力！",
      normal: "🟡 <strong>及格（基本標準範圍）：</strong>下背與腿後肌柔軟度正常，建議久坐辦公時維持人體工學腰靠支撐，避免坐骨結節代償受壓。",
      tight: "🔴 <strong>緊繃警示（骨盆後傾高風險）：</strong>膕旁肌過度短縮攣縮會強烈牽引骨盆向後傾斜，迫使腰椎生理前凸消失、椎間盤承受倍增剪力！強烈建議每日進行「坐姿伸腿毛巾拉伸」與「臀大肌坐姿抱膝伸展」。"
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
  }

  // 初始渲染
  initFlexibilityModule();
  renderRoles();
});
