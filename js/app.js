/**
 * 學員端問卷核心互動邏輯 (app.js) - 升級版
 * 流程：
 * 步驟 0：選擇作業型態
 * 步驟 1：互動式人體圖 NMQ 不適部位標記 (左右側分開)
 * 步驟 2：工作站環境配置檢核 (4 題)
 * 步驟 3：個人人因檢核報告卡 (含個人人體圖透視、總分、改善指引與免責警語)
 */

function initApp() {
  // 品牌過場畫面 (Splash Screen) 自動平滑淡出
  const elSplash = document.getElementById("brand-splash-screen");
  if (elSplash && !elSplash.getAttribute("data-dismissed")) {
    elSplash.setAttribute("data-dismissed", "true");
    setTimeout(() => {
      elSplash.style.transition = "opacity 0.35s ease-out";
      elSplash.style.opacity = "0";
      elSplash.style.pointerEvents = "none";
      setTimeout(() => {
        if (elSplash && elSplash.parentNode) elSplash.parentNode.removeChild(elSplash);
      }, 400);
    }, 500);
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
  let baselineAssessment = null; // 前測基準資料 (Before Assessment)
  let isRetestMode = false; // 是否處於課堂改善後複測狀態

  // 載入本機已存的前測基準記錄
  try {
    const rawBaseline = localStorage.getItem("ergo_baseline_" + sessionId);
    if (rawBaseline) {
      baselineAssessment = JSON.parse(rawBaseline);
    }
  } catch (e) {}

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

  // 學員識別碼與姓名本地記憶持久化 (關閉網頁永不丟失)
  let studentUid = localStorage.getItem("ergo_student_uid");
  if (!studentUid) {
    studentUid = "U-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem("ergo_student_uid", studentUid);
  }
  const elStudentUid = document.getElementById("display-student-uid");
  if (elStudentUid) elStudentUid.innerText = `UID: ${studentUid}`;

  const elInputName = document.getElementById("input-student-name");
  let studentName = localStorage.getItem("ergo_student_name") || "";
  if (elInputName) {
    elInputName.value = studentName;
    elInputName.addEventListener("input", (e) => {
      studentName = e.target.value.trim();
      localStorage.setItem("ergo_student_name", studentName);
    });
  }

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
    isRetestMode = false;
    elStepRole.classList.add("hidden");
    elStepBodymap.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 恢復正常按鈕與標題文字
    const stepRetestBanner = document.getElementById("bodymap-retest-banner");
    if (stepRetestBanner) stepRetestBanner.classList.add("hidden");
    if (elBtnBodymapNext) {
      elBtnBodymapNext.innerHTML = '<span>下一步：進行工作站檢核</span> <span>➔</span>';
    }
    if (elBtnBodymapClearAll) {
      elBtnBodymapClearAll.innerHTML = '<span>✨ 我目前全身舒暢 (全無酸痛，一鍵進入檢核)</span>';
    }
    const stepTitle = document.getElementById("bodymap-step-title");
    if (stepTitle) stepTitle.innerText = "點選近一個月常感酸痛、僵硬或麻木部位";
    const stepSubtitle = document.getElementById("bodymap-step-subtitle");
    if (stepSubtitle) stepSubtitle.innerText = "可直接點選人體圖或滑動上方膠囊，於下方彈出選單設定程度";

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
    if (isRetestMode && baselineAssessment) {
      // 複測模式下返回結果頁
      isRetestMode = false;
      elStepBodymap.classList.add("hidden");
      elStepResult.classList.remove("hidden");
      const stepRetestBanner = document.getElementById("bodymap-retest-banner");
      if (stepRetestBanner) stepRetestBanner.classList.add("hidden");
    } else {
      elStepBodymap.classList.add("hidden");
      elStepRole.classList.remove("hidden");
    }
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
    if (!selectedRole && baselineAssessment && baselineAssessment.role) {
      selectedRole = baselineAssessment.role;
    }
    const targetRole = selectedRole || "office";
    const allQuestions = ERGO_CONFIG.questionSets[targetRole] || ERGO_CONFIG.questionSets.office;
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
    const isRetest = isRetestMode && baselineAssessment;

    elProgressBar.style.width = `${progressPercent}%`;
    elProgressText.innerText = `${isRetest ? '【改善後複測】' : ''}環境檢核 ${currentQuestionIndex + 1} / ${totalQ}`;

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

    const isRetest = !!(isRetestMode && baselineAssessment);

    // 呼叫動態人因指引引擎，產出完全客製化建議 (含 15 區痛點處方 + 環境配置 + 前後測成效指引)
    const personalizedGuides = ERGO_CONFIG.generatePersonalizedActionGuides(
      selectedRole,
      userBodymapData,
      traps,
      isRetest,
      baselineAssessment ? (baselineAssessment.bodymapData || {}) : null
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
      qualityFlag: isRetest ? "Retest" : qualityFlag,
      isRetest: isRetest
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
      role: selectedRole,
      isRetest: isRetestMode,
      baselineAssessment: baselineAssessment ? { ...baselineAssessment } : null
    };

    // 前後測邏輯判定
    const retestBanner = document.getElementById("before-after-banner");
    const retestBadge = document.getElementById("retest-status-badge");
    const retestDiffPanel = document.getElementById("retest-diff-panel");
    const btnTriggerRetest = document.getElementById("btn-trigger-retest");
    const btnResetBaseline = document.getElementById("btn-reset-baseline");

    const isRetestActiveUI = !!(baselineAssessment && isRetestMode);

    if (isRetestActiveUI) {
      // 複測模式已完成，顯示前後測對照成效
      if (retestBadge) {
        retestBadge.innerText = "✨ 現場改善後 (後測已完成)";
        retestBadge.className = "text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow-xs";
      }
      if (retestDiffPanel) {
        retestDiffPanel.classList.remove("hidden");
        document.getElementById("diff-baseline-score").innerText = `${baselineAssessment.score} 分`;
        document.getElementById("diff-baseline-tier").innerText = baselineAssessment.tierInfo.title;
        document.getElementById("diff-current-score").innerText = `${score} 分`;
        document.getElementById("diff-current-tier").innerText = tierInfo.title;

        const delta = score - baselineAssessment.score;
        const deltaEl = document.getElementById("diff-delta-badge");
        if (deltaEl) {
          deltaEl.innerText = `${delta >= 0 ? '+' : ''}${delta} 分`;
          deltaEl.className = `text-2xl font-black ${delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
        }
      }
      if (btnResetBaseline) btnResetBaseline.classList.remove("hidden");
      if (btnTriggerRetest) {
        btnTriggerRetest.querySelector("span").innerText = "🔄 再次重新複測";
      }
    } else {
      // 若尚未進行複測，當前評估即為初次基準 (前測)
      if (retestBadge) {
        retestBadge.innerText = "初次基準 (前測)";
        retestBadge.className = "text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white shadow-xs";
      }
      if (retestDiffPanel) retestDiffPanel.classList.add("hidden");
      if (btnResetBaseline) btnResetBaseline.classList.add("hidden");
      if (btnTriggerRetest) {
        btnTriggerRetest.querySelector("span").innerText = "✨ 進行現場改善後複測";
      }
    }

    // 綁定「進行現場改善後複測」按鈕
    if (btnTriggerRetest) {
      btnTriggerRetest.onclick = () => {
        // 1. 將當前結果鎖定為前測基準 (Baseline)
        baselineAssessment = {
          score,
          tierInfo,
          nmqData: { ...nmqData },
          customGuides: [...customGuides],
          detailsData: { ...detailsData },
          bodymapData: { ...userBodymapData },
          role: selectedRole
        };
        isRetestMode = true;
        try {
          localStorage.setItem("ergo_baseline_" + sessionId, JSON.stringify(baselineAssessment));
        } catch (e) {}

        // 2. 清空人體圖不適點選，讓學員重新點選伸展微調後的體感
        userBodymapData = {};
        userBodymapDetails = {};

        // 3. 切換畫面至步驟 1 (人體圖)
        elStepResult.classList.add("hidden");
        elStepQuiz.classList.add("hidden");
        elStepRole.classList.add("hidden");
        elStepBodymap.classList.remove("hidden");

        // 4. 顯示複測提示橫幅與專屬複測按鈕文字
        const stepRetestBanner = document.getElementById("bodymap-retest-banner");
        if (stepRetestBanner) stepRetestBanner.classList.remove("hidden");

        if (elBtnBodymapNext) {
          elBtnBodymapNext.innerHTML = '<span>下一步：工作站環境檢核</span> <span>➔</span>';
        }
        if (elBtnBodymapClearAll) {
          elBtnBodymapClearAll.innerHTML = '<span>✨ 伸展後全身舒緩 (全無酸痛，進入環境檢核)</span>';
        }
        const stepTitle = document.getElementById("bodymap-step-title");
        if (stepTitle) stepTitle.innerText = "【現場改善後複測】請點選您當前體感";
        const stepSubtitle = document.getElementById("bodymap-step-subtitle");
        if (stepSubtitle) stepSubtitle.innerText = "依據課堂伸展與坐姿微調後的感受重新點選（若已舒緩可直接點全無酸痛）";

        // 5. 初始化人體圖元件 (確保即便重新整理也能 100% 渲染)
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
          studentBodyMap.setData({}, {});
        }
        updateBodymapSummary();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
    }

    // 綁定「取消複測」與「清除前測」按鈕
    const btnCancelRetest = document.getElementById("btn-cancel-retest");
    if (btnCancelRetest) {
      btnCancelRetest.onclick = () => {
        isRetestMode = false;
        elStepBodymap.classList.add("hidden");
        elStepResult.classList.remove("hidden");
        const stepRetestBanner = document.getElementById("bodymap-retest-banner");
        if (stepRetestBanner) stepRetestBanner.classList.add("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
    }

    if (btnResetBaseline) {
      btnResetBaseline.onclick = () => {
        if (confirm("確定要清除前測基準紀錄，回復為單次評估模式嗎？")) {
          isRetestMode = false;
          baselineAssessment = null;
          try {
            localStorage.removeItem("ergo_baseline_" + sessionId);
          } catch (e) {}
          showResult(score, tierInfo, nmqData, customGuides, detailsData);
        }
      };
    }

    // 初始化課後微習慣與行事曆
    initHabitModule();
    initCalendarButtons(score, customGuides);

    // 儲存至本地記憶，防學員演講中途跳出或重新整理遺失
    try {
      localStorage.setItem("ergo_last_report_" + sessionId, JSON.stringify(currentReportState));
    } catch (e) {}

    // 渲染高對比光譜落點儀 (0~100 橫桿、穿透定位針、靶心光環與四級動態高亮)
    const marker = document.getElementById("spectrum-marker");
    const markerScoreText = document.getElementById("spectrum-marker-score-text");
    const markerLabel = document.getElementById("spectrum-marker-label");
    const markerArrow = document.getElementById("spectrum-marker-arrow");
    const targetDisc = document.getElementById("spectrum-target-disc");

    if (marker) {
      const clampedScore = Math.max(0, Math.min(100, score));
      // 緊縮落點定位針邊界至 6% ~ 94%，確保極端 0 分或 100 分時標籤膠囊永不超出手機視窗邊緣
      const markerPos = Math.max(6, Math.min(94, clampedScore));
      marker.style.left = `${markerPos}%`;

      // 頂部浮動標籤僅顯示極簡分數（寬度僅約 45px，永不溢出）
      if (markerScoreText) {
        markerScoreText.innerText = `${clampedScore}分`;
      }
      // 完整落點資訊置於光譜色條上方的靜態標題，大字清晰且不論手機螢幕多窄都完全適配
      const summaryText = document.getElementById("spectrum-summary-text");
      if (summaryText) {
        summaryText.innerText = `${clampedScore} 分 · ${tierInfo.title}`;
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

    // 綁定 PDF 下載、全頁預覽與分享按鈕
    const btnExportPdf = document.getElementById("btn-export-pdf");
    const btnPreviewPdf = document.getElementById("btn-preview-direct-pdf");
    const btnSharePdf = document.getElementById("btn-share-pdf");
    if (btnExportPdf) {
      btnExportPdf.onclick = () => exportPdfReport(false);
    }
    if (btnPreviewPdf) {
      btnPreviewPdf.onclick = () => showWarRoomPreviewModal();
    }
    if (btnSharePdf) {
      btnSharePdf.onclick = () => exportPdfReport(true);
    }

    // 渲染個人結果人體圖 (若處於前後測狀態，渲染雙人體圖對照；若單次評估，渲染單一圖)
    const resMapContainer = document.getElementById("result-bodymap-container");
    const bodymapCardTitle = document.getElementById("bodymap-card-title");
    resMapContainer.innerHTML = "";

    if (isRetestMode && baselineAssessment) {
      if (bodymapCardTitle) bodymapCardTitle.innerHTML = "🧍 前後測肌肉骨骼痛點對照圖 (Before vs After)";
      
      const dualWrapper = document.createElement("div");
      dualWrapper.className = "grid grid-cols-2 gap-2 sm:gap-3.5 w-full max-w-lg mx-auto";
      dualWrapper.innerHTML = `
        <div class="p-2 sm:p-3 rounded-2xl bg-slate-50 border-2 border-indigo-200 text-center flex flex-col items-center shadow-xs">
          <div class="text-[11px] sm:text-xs font-black text-slate-800 mb-1 flex items-center justify-center gap-1">
            <span>⏮️ 改善前 (前測)</span>
            <span class="text-[9.5px] sm:text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">${baselineAssessment.score}分</span>
          </div>
          <div id="sub-map-baseline" class="w-full flex justify-center py-1"></div>
        </div>
        <div class="p-2 sm:p-3 rounded-2xl bg-emerald-50/80 border-2 border-emerald-400 text-center flex flex-col items-center shadow-xs">
          <div class="text-[11px] sm:text-xs font-black text-emerald-950 mb-1 flex items-center justify-center gap-1">
            <span>✨ 改善後 (複測)</span>
            <span class="text-[9.5px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">${score}分</span>
          </div>
          <div id="sub-map-current" class="w-full flex justify-center py-1"></div>
        </div>
      `;
      resMapContainer.appendChild(dualWrapper);

      const baselineMap = new BodyMapComponent({ containerId: "sub-map-baseline", interactive: false });
      baselineMap.setData(baselineAssessment.bodymapData || {}, baselineAssessment.detailsData || {});

      const currentMap = new BodyMapComponent({ containerId: "sub-map-current", interactive: false });
      currentMap.setData(userBodymapData, detailsData);

    } else {
      if (bodymapCardTitle) bodymapCardTitle.innerHTML = "🧍 肌肉骨骼痛點分佈圖";
      const resultMap = new BodyMapComponent({
        containerId: "result-bodymap-container",
        interactive: false
      });
      resultMap.setData(userBodymapData, detailsData);
    }

    // 渲染標記文字清單 (顯示 0~5 分精準生活情境與前後測舒緩比較)
    const resListEl = document.getElementById("result-bodymap-list");
    const activeKeys = Object.keys(userBodymapData).filter(k => userBodymapData[k] > 0);
    
    if (isRetestMode && baselineAssessment) {
      // 複測模式：展示痛點舒緩前後差異清單
      const baseKeys = Object.keys(baselineAssessment.bodymapData || {}).filter(k => (baselineAssessment.bodymapData[k] || 0) > 0);
      const allConcernKeys = Array.from(new Set([...baseKeys, ...activeKeys]));

      if (allConcernKeys.length === 0) {
        resListEl.innerHTML = `<div class="text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center font-bold text-xs">✨ 全身體幹與主要關節完全無酸痛標記（健康優良）</div>`;
      } else {
        resListEl.innerHTML = allConcernKeys.map((k) => {
          const z = NMQ_ZONES.find((item) => item.id === k);
          const name = z ? z.name : k;
          const prevLevel = baselineAssessment.bodymapData[k] || 0;
          const currLevel = userBodymapData[k] || 0;
          const prevConf = NMQ_SEVERITY_LEVELS.find(l => l.level === prevLevel) || NMQ_SEVERITY_LEVELS[0];
          const currConf = NMQ_SEVERITY_LEVELS.find(l => l.level === currLevel) || NMQ_SEVERITY_LEVELS[0];

          let diffBadge = "";
          if (prevLevel > currLevel) {
            diffBadge = `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black border border-emerald-300 text-[10px]">🟢 舒緩改善 ${prevLevel - currLevel} 分</span>`;
          } else if (prevLevel === currLevel && currLevel > 0) {
            diffBadge = `<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-300 text-[10px]">🟡 維持原狀</span>`;
          } else if (prevLevel < currLevel) {
            diffBadge = `<span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300 text-[10px]">🔴 症狀略增</span>`;
          }

          return `
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-xs flex items-center justify-between flex-wrap gap-2">
              <span class="font-black text-slate-800 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${currConf.color}"></span>
                <span>${name}</span>
              </span>
              <div class="flex items-center gap-2">
                <span class="text-slate-500 text-[11px]">前測 ${prevLevel}分 ➔ 後測 <strong class="text-slate-900">${currLevel}分</strong></span>
                ${diffBadge}
              </div>
            </div>
          `;
        }).join("");
      }

    } else {
      // 單次評估模式
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
    }

    // 渲染動態個人化改善指引清單 (分區呈現：人體圖痛點處方 + 環境配置方針 + 前後測成效指引)
    const elGuides = document.getElementById("res-action-guides");
    if (elGuides) {
      const isRetest = !!(baselineAssessment && isRetestMode);
      const bGuides = (customGuides && customGuides.bodyGuides) || [];
      const eGuides = (customGuides && customGuides.envGuides) || [];
      const rGuides = (customGuides && customGuides.retestGuides) || [];
      
      let html = "";

      // 1. 若為前後測，展示前後測改善成效與維持指引
      if (isRetest && rGuides.length > 0) {
        html += `
          <div class="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-300 space-y-2 mb-3">
            <div class="text-xs font-black text-emerald-950 flex items-center gap-1.5">
              <span>🔄</span> 課堂前後測改善成效與維持指引 (Before vs After)
            </div>
            <ul class="space-y-1.5">
              ${rGuides.map(g => `
                <li class="text-xs text-emerald-900 leading-relaxed flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-xs">
                  <span class="text-emerald-700 font-bold mt-0.5">・</span>
                  <span>${g}</span>
                </li>
              `).join("")}
            </ul>
          </div>
        `;
      }

      // 2. 人體圖痛點部位專屬處方 (依點選部位精準對應)
      if (bGuides.length > 0) {
        html += `
          <div class="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 mb-3">
            <div class="text-xs font-black text-rose-950 flex items-center gap-1.5">
              <span>🧍‍♂️</span> 人體圖酸痛部位・專屬舒緩處方 (針對點選部位)
            </div>
            <ul class="space-y-1.5">
              ${bGuides.map((g, idx) => `
                <li class="text-xs text-slate-800 leading-relaxed flex items-start gap-2 bg-white p-2.5 rounded-xl border border-rose-100 shadow-xs">
                  <span class="w-4 h-4 rounded-md bg-rose-100 text-rose-800 border border-rose-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">${idx + 1}</span>
                  <span>${g}</span>
                </li>
              `).join("")}
            </ul>
          </div>
        `;
      }

      // 3. 工作站環境配置與習慣指引
      if (eGuides.length > 0) {
        html += `
          <div class="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
            <div class="text-xs font-black text-sky-950 flex items-center gap-1.5">
              <span>🛠️</span> 工作站環境配置・個人化調整方針
            </div>
            <ul class="space-y-1.5">
              ${eGuides.map((g, idx) => `
                <li class="text-xs text-slate-800 leading-relaxed flex items-start gap-2 bg-white p-2.5 rounded-xl border border-sky-100 shadow-xs">
                  <span class="w-4 h-4 rounded-md bg-sky-100 text-sky-800 border border-sky-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">${idx + 1}</span>
                  <span>${g}</span>
                </li>
              `).join("")}
            </ul>
          </div>
        `;
      }

      // 備援：若無分區資料則回退到標準清單
      if (!html) {
        const fallbackGuides = customGuides && customGuides.length > 0 ? customGuides : tierInfo.actionGuides;
        html = fallbackGuides.map((guide, i) => `
          <li class="flex items-start gap-3 text-slate-700 text-sm leading-relaxed p-3 rounded-xl bg-sky-50/50 border border-sky-100 shadow-sm">
            <span class="w-5 h-5 rounded-md bg-sky-100 text-sky-800 border border-sky-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 shadow-xs">
              ${i + 1}
            </span>
            <span>${guide}</span>
          </li>
        `).join("");
      }

      elGuides.innerHTML = html;
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

  // 10. 個人 A4 人因戰情室報告產出、向量人體圖點陣化與前後測雙人體圖渲染
  
  // 依據痛點資料獨立生成乾淨無依賴的 SVG 字串 (支援前測與後測獨立生成)
  function generateBodymapSvgString(bodymapData = {}, width = 200, height = 330) {
    const zonesSvg = NMQ_ZONES.map((z) => {
      const level = bodymapData[z.id] || 0;
      const conf = NMQ_SEVERITY_LEVELS.find(l => l.level === level) || NMQ_SEVERITY_LEVELS[0];
      const isLit = level > 0;
      const circleFill = isLit ? conf.color : "#f8fafc";
      const circleStroke = isLit ? conf.color : "#94a3b8";
      const textFill = isLit ? "#ffffff" : "#334155";
      const label = z.shortName || z.name;
      return `
        <g id="svg-zone-${z.id}">
          <circle cx="${z.cx}" cy="${z.cy}" r="${z.r}" fill="${circleFill}" stroke="${circleStroke}" stroke-width="1.5" />
          <text x="${z.cx}" y="${z.cy}" text-anchor="middle" dominant-baseline="central" font-size="7.5" font-weight="bold" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="${textFill}">
            ${label}
          </text>
        </g>
      `;
    }).join("");

    return `
      <svg viewBox="0 0 200 330" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border-radius: 6px;">
        <g fill="#e9eef5" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round">
          <ellipse cx="100" cy="30" rx="18" ry="22" />
          <path d="M 88 50 C 70 65, 55 70, 50 85 C 45 100, 42 120, 35 160 C 32 175, 42 180, 48 165 L 58 135 L 62 165 C 64 185, 75 190, 100 190 C 125 190, 136 185, 138 165 L 142 135 L 152 165 C 158 180, 168 175, 165 160 C 158 120, 155 100, 150 85 C 145 70, 130 65, 112 50 Z" />
          <path d="M 68 185 C 72 210, 75 250, 75 295 C 75 305, 68 312, 75 315 C 85 315, 92 308, 92 295 L 94 220 L 98 190 L 102 190 L 106 220 L 108 295 C 108 308, 115 315, 125 315 C 132 312, 125 305, 125 295 C 125 250, 128 210, 132 185 Z" />
        </g>
        <line x1="100" y1="52" x2="100" y2="185" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" />
        <g id="heatmap-targets">${zonesSvg}</g>
      </svg>
    `;
  }

  // 將 SVG 字串轉為高解析度 PNG Data URL (徹底解決跨平台與 html2canvas 繪製問題)
  function svgStringToPngDataUrl(svgString, width = 400, height = 660) {
    return new Promise((resolve) => {
      try {
        if (!svgString) return resolve("");
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const URLObj = window.URL || window.webkitURL || window;
        const blobUrl = URLObj.createObjectURL(svgBlob);
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            URLObj.revokeObjectURL(blobUrl);
            resolve(canvas.toDataURL("image/png"));
          } catch (e) {
            URLObj.revokeObjectURL(blobUrl);
            resolve("");
          }
        };
        img.onerror = () => {
          URLObj.revokeObjectURL(blobUrl);
          resolve("");
        };
        img.src = blobUrl;
      } catch (e) {
        resolve("");
      }
    });
  }

  function buildWarRoomHtml(currentBodyMapPng = null, baselineBodyMapPng = null) {
    if (!currentReportState) return "";

    const dateStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    const roleObj = ERGO_CONFIG.roles.find(r => r.id === currentReportState.role) || ERGO_CONFIG.roles[0];
    const score = Math.max(0, Math.min(100, currentReportState.score || 0));
    const tierInfo = currentReportState.tierInfo || ERGO_CONFIG.scoreTiers[0];

    const baselineData = baselineAssessment || (currentReportState && currentReportState.baselineAssessment) || null;
    const isRetestActive = !!(baselineData && (isRetestMode || (currentReportState && currentReportState.isRetest)));
    const delta = isRetestActive ? (score - baselineData.score) : 0;

    // 痛點部位與職安署 NMQ 危害分析
    const bodymapData = currentReportState.bodymapData || {};
    const detailsData = currentReportState.detailsData || {};
    const baselineBodymap = (isRetestActive && baselineData && baselineData.bodymapData) ? baselineData.bodymapData : {};

    const activeKeys = Object.keys(bodymapData).filter(k => (bodymapData[k] || 0) > 0);
    const severeCount = activeKeys.filter(k => bodymapData[k] >= 3).length;
    const hasExtremeZone = Object.values(bodymapData).some(v => v >= 4);

    // 職安署 (OSHA) NMQ 肌肉骨骼危害關注判定
    let oshaStatusHtml = "";
    if (severeCount >= 3 || hasExtremeZone) {
      oshaStatusHtml = `
        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 4px; padding: 3px 6px; font-size: 8.5px; color: #991b1b; margin-top: 3px;">
          <strong>🔴 職安署人因危害分級：高度關注群</strong>（已檢出 ${severeCount} 處 ≥3 分中重度痛點，符合人因工程優先介入與職護追蹤改善指標）
        </div>
      `;
    } else if (severeCount === 2) {
      oshaStatusHtml = `
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 3px 6px; font-size: 8.5px; color: #92400e; margin-top: 3px;">
          <strong>🟡 職安署人因危害分級：中度關注</strong>（檢出 2 處 ≥3 分中度不適，建議優先調整工作站人因配置並落實工間微伸展）
        </div>
      `;
    } else if (severeCount === 1) {
      oshaStatusHtml = `
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; padding: 3px 6px; font-size: 8.5px; color: #075985; margin-top: 3px;">
          <strong>🔵 職安署人因危害分級：輕度注意</strong>（檢出 1 處 ≥3 分部位，請依下方專屬處方進行局部關節力學減壓）
        </div>
      `;
    } else {
      oshaStatusHtml = `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 3px 6px; font-size: 8.5px; color: #065f46; margin-top: 3px;">
          <strong>🟢 職安署人因危害分級：低風險優良</strong>（全身體幹皆在輕微以下 <3 分，工作站人因負荷健全）
        </div>
      `;
    }

    // 痛點清單表格 HTML (支援前後測對照與單次評估)
    let bodymapRowsHtml = "";

    if (isRetestActive && baselineData) {
      // 複測模式：整合前測與後測所有曾有點選的部位
      const allConcernKeys = Array.from(new Set([
        ...Object.keys(baselineBodymap).filter(k => (baselineBodymap[k] || 0) > 0),
        ...Object.keys(bodymapData).filter(k => (bodymapData[k] || 0) > 0)
      ]));

      if (allConcernKeys.length === 0) {
        bodymapRowsHtml = `
          <tr>
            <td colspan="4" style="text-align:center; padding: 8px 4px; color: #059669; font-size: 9.5px; font-weight: bold; background: #ecfdf5;">
              ✨ 前後測全身體幹與主要關節均無酸痛標記（維持優良健康水準）
            </td>
          </tr>
        `;
      } else {
        bodymapRowsHtml = allConcernKeys.map(k => {
          const zone = NMQ_ZONES.find(z => z.id === k);
          const name = zone ? zone.name : k;
          const prevLevel = baselineBodymap[k] || 0;
          const currLevel = bodymapData[k] || 0;
          const prevConf = NMQ_SEVERITY_LEVELS.find(l => l.level === prevLevel) || NMQ_SEVERITY_LEVELS[0];
          const currConf = NMQ_SEVERITY_LEVELS.find(l => l.level === currLevel) || NMQ_SEVERITY_LEVELS[0];

          let diffHtml = "";
          if (prevLevel > currLevel) {
            diffHtml = `<span style="color: #15803d; font-weight: bold; background: #dcfce7; border: 1px solid #86efac; padding: 1px 5px; border-radius: 3px; font-size: 8.5px;">🟢 舒緩 -${prevLevel - currLevel}分</span>`;
          } else if (currLevel === 0 && prevLevel === 0) {
            diffHtml = `<span style="color: #059669; font-size: 8.5px;">⚪ 良好無痛</span>`;
          } else if (currLevel >= 3) {
            diffHtml = `<span style="color: #b91c1c; font-weight: bold; background: #fee2e2; border: 1px solid #fca5a5; padding: 1px 5px; border-radius: 3px; font-size: 8.5px;">🔴 殘留 ${currLevel}分(加強)</span>`;
          } else {
            diffHtml = `<span style="color: #d97706; font-weight: bold; background: #fef3c7; border: 1px solid #fcd34d; padding: 1px 5px; border-radius: 3px; font-size: 8.5px;">🟡 殘留 ${currLevel}分</span>`;
          }

          return `
            <tr style="border-bottom: 1px solid #f1f5f9; font-size: 9px;">
              <td style="padding: 3px 4px; font-weight: bold; color: #0f172a; white-space: nowrap;">${name}</td>
              <td style="padding: 3px 4px;">
                <span style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: bold; color: #ffffff; background-color: ${prevConf.color}; font-size: 8.5px;">
                  ${prevLevel}分·${prevConf.label}
                </span>
              </td>
              <td style="padding: 3px 4px;">
                <span style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: bold; color: #ffffff; background-color: ${currConf.color}; font-size: 8.5px;">
                  ${currLevel}分·${currConf.label}
                </span>
              </td>
              <td style="padding: 3px 4px;">${diffHtml}</td>
            </tr>
          `;
        }).join("");
      }

    } else {
      // 單次評估模式
      if (activeKeys.length === 0) {
        bodymapRowsHtml = `
          <tr>
            <td colspan="5" style="text-align:center; padding: 8px 4px; color: #059669; font-size: 9.5px; font-weight: bold; background: #ecfdf5;">
              ✨ 全身體幹與主要關節目前無顯著酸痛標記（維持優良健康水準）
            </td>
          </tr>
        `;
      } else {
        bodymapRowsHtml = activeKeys.map(k => {
          const zone = NMQ_ZONES.find(z => z.id === k);
          const name = zone ? zone.name : k;
          const level = bodymapData[k];
          const levelConf = NMQ_SEVERITY_LEVELS.find(l => l.level === level) || NMQ_SEVERITY_LEVELS[0];
          const detail = detailsData[k] || null;

          let daysLabel = "--";
          let medLabel = "--";
          let medStyle = "color: #64748b;";
          if (detail) {
            daysLabel = detail.days === "gt30" ? ">30天" : (detail.days === "8to30" ? "8~30天" : "<7天");
            medLabel = detail.medical === "yes" ? "🏥曾就醫" : "🌱未就醫";
            medStyle = detail.medical === "yes" ? "color: #b91c1c; font-weight: bold;" : "color: #047857;";
          }

          const oshaTag = level >= 3
            ? `<span style="color: #dc2626; font-weight: bold; background: #fee2e2; border: 1px solid #fca5a5; padding: 1px 4px; border-radius: 3px; font-size: 8px;">⚠️ 需關注</span>`
            : `<span style="color: #059669; background: #ecfdf5; padding: 1px 4px; border-radius: 3px; font-size: 8px;">常態</span>`;

          return `
            <tr style="border-bottom: 1px solid #f1f5f9; font-size: 9px;">
              <td style="padding: 3px 4px; font-weight: bold; color: #0f172a; white-space: nowrap;">${name}</td>
              <td style="padding: 3px 4px;">
                <span style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: bold; color: #ffffff; background-color: ${levelConf.color}; font-size: 8.5px;">
                  ${level}分·${levelConf.label}
                </span>
              </td>
              <td style="padding: 3px 4px;">${oshaTag}</td>
              <td style="padding: 3px 4px; color: #475569;">${daysLabel}</td>
              <td style="padding: 3px 4px; ${medStyle}">${medLabel}</td>
            </tr>
          `;
        }).join("");
      }
    }

    // 課堂體適能檢測與酸痛好發分析 HTML
    const upperRes = currentFlexibilityResults.upper;
    const lowerRes = currentFlexibilityResults.lower;
    const upperText = upperRes ? upperRes.text : "未填報（標準：雙手指尖重疊 > 2cm）";
    const lowerText = lowerRes ? lowerRes.text : "未填報（標準：雙手超過腳尖 5cm）";

    // 落點光譜色彩判定
    let scoreColor = "#10b981";
    if (score < 50) scoreColor = "#f43f5e";
    else if (score < 70) scoreColor = "#f97316";
    else if (score < 85) scoreColor = "#eab308";

    // 個人化環境與痛點調整指引 HTML (字體放大至 9.5px，確保痛點處方與環境方針清晰並存)
    const rawGuides = currentReportState.customGuides || tierInfo.actionGuides;
    const bGuides = (rawGuides && rawGuides.bodyGuides) || [];
    const eGuides = (rawGuides && rawGuides.envGuides) || [];
    const rGuides = (rawGuides && rawGuides.retestGuides) || [];

    let guidesList = [];
    let guideSectionTitle = "🛠️ 人體圖痛點處方與環境調整方針";

    if (isRetestActive && baselineData) {
      guideSectionTitle = "🔄 課堂前後測改善成效與專屬指引";
      // 組合：1~2 個前後測改善指引 + 1 個部位痛點處方 + 1 個工作站環境方針
      guidesList = [
        ...rGuides.slice(0, 1),
        ...bGuides.slice(0, 1),
        ...eGuides.slice(0, 1)
      ];
      if (guidesList.length < 3 && rGuides.length > 1) {
        guidesList.splice(1, 0, rGuides[1]);
      }
    } else {
      guidesList = [
        ...bGuides.slice(0, 2),
        ...eGuides.slice(0, 1)
      ];
      if (guidesList.length === 0) {
        guidesList = Array.isArray(rawGuides) ? rawGuides.slice(0, 3) : tierInfo.actionGuides.slice(0, 3);
      }
    }

    const guidesHtml = guidesList.slice(0, 3).map((g, idx) => `
      <div style="margin-bottom: 3.5px; font-size: 9.5px; line-height: 1.32; color: #1e293b;">
        <span style="background: #e0f2fe; color: #0284c7; font-weight: bold; padding: 0.5px 4px; border-radius: 3px; font-size: 8.5px; border: 1px solid #bae6fd; margin-right: 4px;">
          ${idx + 1}
        </span>
        <span>${g}</span>
      </div>
    `).join("");

    // 前後測對照區塊 HTML (若有前測基準且在複測模式)
    let beforeAfterHtml = "";
    let bodymapSectionHtml = "";

    if (isRetestActive && baselineData) {
      beforeAfterHtml = `
        <div style="background: #eef2ff; border: 1.5px solid #c7d2fe; border-radius: 6px; padding: 5px 10px; margin-bottom: 6px; box-sizing: border-box;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
              <td style="vertical-align: middle; text-align: left;">
                <div style="font-size: 11px; font-weight: 900; color: #3730a3;">🔄 課堂前後測改善成效對照 (Before / After 現場改善評估)</div>
                <div style="font-size: 9.5px; color: #4338ca; margin-top: 1px;">
                  前測基準 <strong>${baselineData.score}分</strong> (${baselineData.tierInfo ? baselineData.tierInfo.title.split(' ')[0] : ''}) ➔ 改善後複測 <strong>${score}分</strong> (${tierInfo.title.split(' ')[0]})
                </div>
              </td>
              <td style="text-align: right; vertical-align: middle; width: 145px;">
                <span style="display: inline-block; font-size: 10.5px; font-weight: 900; color: ${delta >= 0 ? '#15803d' : '#b91c1c'}; background: ${delta >= 0 ? '#dcfce7' : '#fee2e2'}; border: 1px solid ${delta >= 0 ? '#86efac' : '#fca5a5'}; padding: 2.5px 8px; border-radius: 5px;">
                  📈 健康減壓 ${delta >= 0 ? '+' : ''}${delta} 分
                </span>
              </td>
            </tr>
          </table>
        </div>
      `;

      // 前後測雙人體圖放大並列渲染
      bodymapSectionHtml = `
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 6px; box-sizing: border-box;">
          <tr>
            <!-- 左欄：前後測雙人體圖對照 (加寬並放大圖片) -->
            <td style="width: 290px; vertical-align: top; padding-right: 6px;">
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px; text-align: center; box-sizing: border-box;">
                <div style="font-size: 10.5px; font-weight: 900; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
                  🧍 前後測肌肉骨骼痛點對照圖
                </div>
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                  <tr>
                    <td style="width: 50%; text-align: center; vertical-align: top; padding-right: 3px;">
                      <div style="font-size: 9px; font-weight: bold; color: #475569; margin-bottom: 2px;">改善前 (前測)</div>
                      <img src="${baselineBodyMapPng || currentBodyMapPng}" style="width: 125px; height: 195px; max-height: 200px; object-fit: contain; display: block; margin: 0 auto; border-radius: 4px;">
                      <div style="font-size: 9px; font-weight: 900; color: #475569; margin-top: 2px;">
                        ${baselineData.score}分·${baselineData.tierInfo ? baselineData.tierInfo.title.split(' ')[0] : ''}
                      </div>
                    </td>
                    <td style="width: 50%; text-align: center; vertical-align: top; padding-left: 3px; border-left: 1px dashed #cbd5e1;">
                      <div style="font-size: 9px; font-weight: bold; color: #15803d; margin-bottom: 2px;">改善後 (複測)</div>
                      <img src="${currentBodyMapPng}" style="width: 125px; height: 195px; max-height: 200px; object-fit: contain; display: block; margin: 0 auto; border-radius: 4px;">
                      <div style="font-size: 9px; font-weight: 900; color: #15803d; margin-top: 2px;">
                        ${score}分·${tierInfo.title.split(' ')[0]}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>

            <!-- 右欄：NMQ 清單與環境指引 -->
            <td style="width: 426px; vertical-align: top; padding-left: 0;">
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 6px; margin-bottom: 4px; box-sizing: border-box;">
                <div style="font-size: 10px; font-weight: 900; color: #0f172a; margin-bottom: 2px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; display: flex; justify-content: space-between; align-items: center;">
                  <span>📋 NMQ 肌肉骨骼前後測對照清單</span>
                </div>
                ${oshaStatusHtml}
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed; text-align: left; margin-top: 3px;">
                  <thead>
                    <tr style="font-size: 8.5px; color: #64748b; border-bottom: 1px solid #cbd5e1; background: #f8fafc;">
                      <th style="padding: 2.5px 3px; width: 65px;">部位</th>
                      <th style="padding: 2.5px 3px; width: 95px;">前測等級</th>
                      <th style="padding: 2.5px 3px; width: 95px;">後測等級</th>
                      <th style="padding: 2.5px 3px;">改善成效</th>
                    </tr>
                  </thead>
                  <tbody>${bodymapRowsHtml}</tbody>
                </table>
              </div>
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 5px 6px; box-sizing: border-box;">
                <div style="font-size: 10px; font-weight: 900; color: #0369a1; margin-bottom: 3px; border-bottom: 1px solid #e0f2fe; padding-bottom: 2px;">
                  ${guideSectionTitle}
                </div>
                ${guidesHtml}
              </div>
            </td>
          </tr>
        </table>
      `;

    } else {
      // 單次評估模式 (加大單張人體圖尺寸)
      bodymapSectionHtml = `
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 6px; box-sizing: border-box;">
          <tr>
            <td style="width: 230px; vertical-align: top; padding-right: 6px;">
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px; text-align: center; box-sizing: border-box;">
                <div style="font-size: 10.5px; font-weight: 900; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; text-align: left;">
                  🧍 肌肉骨骼痛點分佈圖
                </div>
                <img src="${currentBodyMapPng}" style="width: 170px; height: 260px; max-height: 270px; object-fit: contain; display: block; margin: 0 auto; border-radius: 4px;">
              </div>
            </td>
            <td style="width: 486px; vertical-align: top; padding-left: 0;">
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 6px; margin-bottom: 4px; box-sizing: border-box;">
                <div style="font-size: 10px; font-weight: 900; color: #0f172a; margin-bottom: 2px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
                  📋 NMQ 肌肉骨骼不適標記清單
                </div>
                ${oshaStatusHtml}
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed; text-align: left; margin-top: 3px;">
                  <thead>
                    <tr style="font-size: 8.5px; color: #64748b; border-bottom: 1px solid #cbd5e1; background: #f8fafc;">
                      <th style="padding: 2.5px 3px; width: 70px;">部位</th>
                      <th style="padding: 2.5px 3px; width: 110px;">嚴重度</th>
                      <th style="padding: 2.5px 3px; width: 75px;">職安署標記</th>
                      <th style="padding: 2.5px 3px; width: 75px;">年天數</th>
                      <th style="padding: 2.5px 3px;">就醫</th>
                    </tr>
                  </thead>
                  <tbody>${bodymapRowsHtml}</tbody>
                </table>
              </div>
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 5px 6px; box-sizing: border-box;">
                <div style="font-size: 10px; font-weight: 900; color: #0369a1; margin-bottom: 3px; border-bottom: 1px solid #e0f2fe; padding-bottom: 2px;">
                  ${guideSectionTitle}
                </div>
                ${guidesHtml}
              </div>
            </td>
          </tr>
        </table>
      `;
    }

    // 寬度精確設為 740px，內距 10px 12px，完全相容單頁 A4
    return `
      <div style="width: 740px; margin: 0 auto; padding: 10px 12px; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans TC', sans-serif; box-sizing: border-box;">
        
        <!-- 頂部官方 Header (戰情室首部：LOGO 放大防變形、標題更新為人體老化指標戰情室) -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; border-bottom: 2.5px solid #0284c7; padding-bottom: 4px; margin-bottom: 6px;">
          <tr>
            <td style="vertical-align: middle; width: 56px; text-align: center;">
              <img src="assets/logo.png" style="width: 50px; height: 50px; max-width: 50px; max-height: 50px; object-fit: contain; display: block; margin: 0 auto;">
            </td>
            <td style="vertical-align: middle; padding-left: 8px;">
              <div style="font-size: 15px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px;">
                人因小管家 - 人體老化指標戰情室
                <span style="font-size: 8.5px; font-weight: bold; padding: 1.5px 6px; border-radius: 4px; background: #0284c7; color: #ffffff; vertical-align: middle; margin-left: 5px;">
                  個人戰情儀表板
                </span>
              </div>
              <div style="font-size: 9.5px; color: #0369a1; font-weight: bold; margin-top: 2px;">
                受檢學員：<span style="color: #0f172a; text-decoration: underline;">${studentName ? studentName : '專案受檢人員'}</span> (${studentUid}) ｜ 勞動部職安署 NMQ 肌肉骨骼臨床評估
              </div>
            </td>
            <td style="vertical-align: middle; text-align: right; font-size: 9px; color: #475569; line-height: 1.35; width: 175px;">
              <div><strong>主講講師：</strong>蔡健儀</div>
              <div><strong>場次編號：</strong>${sessionId}</div>
              <div><strong>報告時間：</strong>${dateStr} ${timeStr}</div>
            </td>
          </tr>
        </table>

        ${beforeAfterHtml}

        <!-- 戰情報告基本屬性列 -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; margin-bottom: 6px;">
          <tr>
            <td style="padding: 4px 6px; font-size: 9.5px; vertical-align: middle;">
              <strong>受檢作業型態：</strong><span style="color: #0369a1; font-weight: bold;">${roleObj.name}</span> (${roleObj.subtitle})
            </td>
            <td style="padding: 4px 6px; font-size: 9px; color: #475569; text-align: right; vertical-align: middle; width: 235px;">
              <span style="background: #e2e8f0; padding: 1.5px 6px; border-radius: 8px; font-weight: 600;">
                人因工程作業危害預防計畫合規檢測
              </span>
            </td>
          </tr>
        </table>

        <!-- 第一層戰情儀表：3 大核心 KPI 卡片與連續光譜儀 (字體放大) -->
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; box-sizing: border-box;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
              <!-- KPI 1: 健康綜合評分 (支援前後測對照與單次評估) -->
              ${isRetestActive && baselineData ? `
                <td style="width: 145px; text-align: center; border-right: 1px solid #e2e8f0; padding-right: 6px; vertical-align: middle;">
                  <div style="font-size: 9px; font-weight: bold; color: #4338ca;">前後測對照評分</div>
                  <table style="width: 100%; border-collapse: collapse; margin: 1px 0;">
                    <tr>
                      <td style="text-align: center; width: 48%;">
                        <div style="font-size: 8px; color: #64748b; font-weight: bold;">前測</div>
                        <div style="font-size: 20px; font-weight: 900; color: #64748b; line-height: 1;">${baselineData.score}</div>
                      </td>
                      <td style="text-align: center; font-size: 12px; color: #94a3b8; width: 4%;">➔</td>
                      <td style="text-align: center; width: 48%;">
                        <div style="font-size: 8px; color: #15803d; font-weight: bold;">改善後</div>
                        <div style="font-size: 22px; font-weight: 900; color: ${scoreColor}; line-height: 1;">${score}</div>
                      </td>
                    </tr>
                  </table>
                  <div style="font-size: 8.5px; font-weight: 900; color: ${delta >= 0 ? '#15803d' : '#b91c1c'}; background: ${delta >= 0 ? '#dcfce7' : '#fee2e2'}; border-radius: 3px; padding: 1px 5px; display: inline-block;">
                    ${delta >= 0 ? '📈 減壓提升 +' : '📉 變動 '}${delta} 分
                  </div>
                </td>
              ` : `
                <td style="width: 125px; text-align: center; border-right: 1px solid #e2e8f0; padding-right: 6px; vertical-align: middle;">
                  <div style="font-size: 9px; font-weight: bold; color: #64748b;">人因健康綜合評分</div>
                  <div style="font-size: 28px; font-weight: 900; color: ${scoreColor}; line-height: 1.05; margin: 1px 0;">
                    ${score} <span style="font-size: 11px; color: #64748b; font-weight: normal;">/ 100</span>
                  </div>
                  <div style="font-size: 8.5px; color: #64748b; font-weight: 600;">分數越高越健康</div>
                </td>
              `}

              <!-- KPI 2: 負荷狀態評級與臨床解讀 -->
              <td style="padding: 0 8px; vertical-align: middle;">
                <div style="display: inline-block; padding: 1.5px 7px; border-radius: 8px; font-size: 10px; font-weight: bold; background: ${scoreColor}15; color: ${scoreColor}; border: 1px solid ${scoreColor}40; margin-bottom: 2px;">
                  ${tierInfo.title}
                </div>
                <div style="font-size: 9.5px; color: #334155; line-height: 1.35;">
                  ${tierInfo.analysis}
                </div>
              </td>

              <!-- KPI 3: 肌肉骨骼有感部位統計 -->
              <td style="width: 120px; text-align: center; border-left: 1px solid #e2e8f0; padding-left: 6px; vertical-align: middle;">
                <div style="font-size: 9px; font-weight: bold; color: #64748b;">肌肉骨骼酸痛標記</div>
                <div style="font-size: 22px; font-weight: 900; color: ${activeKeys.length > 0 ? '#bd5d38' : '#10b981'}; margin: 1px 0;">
                  ${activeKeys.length} <span style="font-size: 10px; font-weight: normal; color: #64748b;">處部位</span>
                </div>
                <div style="font-size: 8px; color: ${severeCount > 0 ? '#b91c1c' : '#059669'}; font-weight: bold;">
                  ${severeCount > 0 ? `⚠️ 高風險：${severeCount} 處` : '全區皆在輕度以下'}
                </div>
              </td>
            </tr>
          </table>

          <!-- 0~100 連續橫桿光譜落點儀 (支援前後測雙落點對照) -->
          <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
            <div style="position: relative; padding-top: 16px; padding-bottom: 2px;">
              ${isRetestActive && baselineData ? `
                <div style="position: absolute; top: 0; left: ${Math.max(6, Math.min(94, baselineData.score))}%; transform: translateX(-50%); font-size: 8px; font-weight: 900; background: #475569; color: #ffffff; padding: 1px 5px; border-radius: 3px; white-space: nowrap; z-index: 2;">
                  ⏮️ 前測：${baselineData.score}分
                </div>
                <div style="position: absolute; top: 0; left: ${Math.max(6, Math.min(94, score))}%; transform: translateX(-50%); font-size: 8.5px; font-weight: 900; background: #0f172a; color: #34d399; border: 1px solid #10b981; padding: 1px 6px; border-radius: 3px; white-space: nowrap; z-index: 3;">
                  🎯 改善後：${score}分 (${tierInfo.title.split(' ')[0]})
                </div>
              ` : `
                <div style="position: absolute; top: 0; left: ${Math.max(6, Math.min(94, score))}%; transform: translateX(-50%); font-size: 8.5px; font-weight: 900; background: #0f172a; color: #ffffff; padding: 1px 6px; border-radius: 3px; white-space: nowrap;">
                  🎯 您的落點：${score}分 (${tierInfo.title.split(' ')[0]})
                </div>
              `}
              <div style="height: 7px; border-radius: 3.5px; background: linear-gradient(to right, #f43f5e 0%, #f97316 45%, #eab308 70%, #10b981 100%); width: 100%;"></div>
            </div>
            <table style="width: 100%; font-size: 8px; font-weight: bold; color: #64748b; table-layout: fixed; margin-top: 1px;">
              <tr>
                <td style="color: #e11d48; text-align: left; width: 25%;">0~49 (重度超載)</td>
                <td style="color: #ea580c; text-align: left; width: 25%;">50~69 (中度負荷)</td>
                <td style="color: #ca8a04; text-align: left; width: 25%;">70~84 (輕度不良)</td>
                <td style="color: #059669; text-align: right; width: 25%;">85~100 (健康優良)</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- 第二層戰情主軸：人體現況圖與 NMQ 清單 -->
        <div style="margin-bottom: 6px;">
          ${bodymapSectionHtml}
        </div>

        <!-- 第三層戰情整合：課堂體適能上下肢檢測 -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 5px 8px; margin-bottom: 6px; box-sizing: border-box;">
          <table style="width: 100%; border-bottom: 1px solid #dcfce7; margin-bottom: 3px; padding-bottom: 2px; table-layout: fixed;">
            <tr>
              <td style="text-align: left; font-size: 9.5px; font-weight: bold; color: #166534;">
                🏃‍♂️ 課堂實作：體適能上下肢柔軟度自我檢測與生物力學分析
              </td>
              <td style="text-align: right; font-size: 8px; font-weight: 600; color: #15803d; width: 110px;">
                <span style="background: #dcfce7; padding: 1px 5px; border-radius: 4px;">
                  代償風險評估
                </span>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 3px;">
                <div style="background: #ffffff; border: 1px solid #dcfce7; border-radius: 4px; padding: 4px 6px; font-size: 8.5px; line-height: 1.3;">
                  <span style="font-weight: bold; color: #0f172a;">1. 上肢抓背測驗：</span>
                  <span style="font-weight: bold; color: #0284c7;">${upperText}</span>
                  <div style="color: #475569; margin-top: 1px;">
                    <strong style="color: #b91c1c;">💥 緊繃影響：</strong>胸大肌短縮引發圓肩、肩峰夾擠與滑鼠手。
                  </div>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 3px;">
                <div style="background: #ffffff; border: 1px solid #dcfce7; border-radius: 4px; padding: 4px 6px; font-size: 8.5px; line-height: 1.3;">
                  <span style="font-weight: bold; color: #0f172a;">2. 下肢椅上體前彎：</span>
                  <span style="font-weight: bold; color: #0284c7;">${lowerText}</span>
                  <div style="color: #475569; margin-top: 1px;">
                    <strong style="color: #b91c1c;">💥 緊繃影響：</strong>膕旁肌拉扯骨盆後傾，腰椎 L4-S1 間盤剪力加劇。
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- 第四層：職場微習慣執行指引 (實用行動方案) -->
        <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; padding: 5px 8px; margin-bottom: 6px; box-sizing: border-box;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
              <td style="font-size: 9px; font-weight: bold; color: #115e59; width: 140px; vertical-align: middle;">
                🌱 課後職場微習慣執行指引：
              </td>
              <td style="font-size: 8.5px; color: #134e4a; line-height: 1.35; vertical-align: middle;">
                💧 <strong>每小時補水起身</strong>（促進下肢血液循環與肌肉收縮回流） ｜ 🚶 <strong>50分鐘站立走動</strong>（重啟脊椎循環）<br>
                🧘 <strong>每日 15:00 辦公室微伸展</strong>（椅前彎30秒+擴胸） ｜ 👀 <strong>20-20-20 護眼法則</strong>（放鬆睫狀肌）
              </td>
            </tr>
          </table>
        </div>

        <!-- 第五層：官方延伸工具與知識庫連結 -->
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 3px 4px; margin-bottom: 6px; font-size: 8px;">
          <tr>
            <td style="padding: 2px 4px; text-align: left; width: 33.3%;">
              <strong>📐 KIM 2019：</strong>https://aicokecolatsai-commits.github.io/KIM2019/
            </td>
            <td style="padding: 2px 4px; text-align: center; width: 33.3%;">
              <strong>📱 動齡健康管理 App：</strong>https://move-age-web.bewellfutlife.com/tab2/home
            </td>
            <td style="padding: 2px 4px; text-align: right; width: 33.3%;">
              <strong>📚 人因工程部落格：</strong>https://ergopt.blogspot.com/
            </td>
          </tr>
        </table>

        <!-- 第六層：法律免責與官方認證 Footer -->
        <div style="border-top: 1px solid #cbd5e1; padding-top: 3px; font-size: 8px; color: #64748b; line-height: 1.25; text-align: center;">
          ⚠️ 免責聲明：本報告係依據北歐肌肉骨骼問卷 (NMQ) 與人因工程人體測量學原理設計之自我檢核指標，非屬醫療診斷行為。<br>
          人因小管家(Noah) 研發
        </div>

      </div>
    `;
  }

  // 職場健康微習慣定時助推助手 (動態組合 4 大實用習慣並生成日曆提醒)
  function initHabitModule() {
    const chkWater = document.getElementById("chk-habit-water");
    const chkStand = document.getElementById("chk-habit-stand");
    const chkStretch = document.getElementById("chk-habit-stretch");
    const chkEye = document.getElementById("chk-habit-eye");

    [chkWater, chkStand, chkStretch, chkEye].forEach((chk) => {
      if (chk) {
        chk.addEventListener("change", () => {
          updateCalendarLinks();
        });
      }
    });

    updateCalendarLinks();
  }

  // 動態產生 Google 日曆連結與 .ics 下載檔
  function updateCalendarLinks() {
    const chkWater = document.getElementById("chk-habit-water");
    const chkStand = document.getElementById("chk-habit-stand");
    const chkStretch = document.getElementById("chk-habit-stretch");
    const chkEye = document.getElementById("chk-habit-eye");

    const habits = [];
    if (chkWater && chkWater.checked) {
      habits.push("💧 規律補水與如廁：每小時喝水 200ml，自然起身走動。");
    }
    if (chkStand && chkStand.checked) {
      habits.push("🚶 50分鐘防久坐：每工作 50 分鐘站立活動 1~2 分鐘，重啟脊椎血流循環。");
    }
    if (chkStretch && chkStretch.checked) {
      habits.push("🧘 每日 15:00 辦公室微伸展：椅上體前彎 30 秒＋擴胸放鬆肩頸。");
    }
    if (chkEye && chkEye.checked) {
      habits.push("👀 20-20-20 護眼法則：每看螢幕 20 分鐘，遠眺 20 呎外 20 秒。");
    }

    const title = "⏰ 人因小管家・職場健康微習慣與疲勞消除微伸展";
    const details = `人因小管家(Noah) 為您量身定制的每日職場微習慣：\n\n` +
      (habits.length > 0 ? habits.join("\n\n") : "維持良好坐姿與視線平視螢幕！\n") +
      `\n\n您的個人健康戰情室與知識庫：https://ergopt.blogspot.com/`;

    const btnGCal = document.getElementById("btn-add-gcal");
    const btnIcs = document.getElementById("btn-download-ics");

    if (btnGCal) {
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent("個人辦公工作站")}&recur=RRULE:FREQ=DAILY`;
      btnGCal.href = gcalUrl;
    }

    if (btnIcs) {
      btnIcs.onclick = () => {
        const icsContent = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Noah Ergonomics//Ergo Care//TW",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "BEGIN:VEVENT",
          "SUMMARY:" + title,
          "DESCRIPTION:" + details.replace(/\n/g, "\\n"),
          "LOCATION:個人辦公工作站",
          "RRULE:FREQ=DAILY;COUNT=60",
          "DTSTART:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 8) + "T070000Z", // 15:00 TW
          "DTEND:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 8) + "T071500Z",
          "STATUS:CONFIRMED",
          "BEGIN:VALARM",
          "TRIGGER:-PT0M",
          "DESCRIPTION:人因微伸展與習慣提醒",
          "ACTION:DISPLAY",
          "END:VALARM",
          "END:VEVENT",
          "END:VCALENDAR"
        ].join("\r\n");

        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "人因小管家_每日職場微習慣提醒.ics";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 1500);
      };
    }
  }

  function initCalendarButtons(score, guides) {
    updateCalendarLinks();
  }

  // LINE 瀏覽器專屬引導彈窗 (解決 LINE In-App 封鎖下載與分享問題)
  function showLineModal(isShare) {
    const existing = document.getElementById("line-helper-modal");
    if (existing) existing.remove();

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("openExternalBrowser", "1");
    const externalUrl = currentUrl.toString();

    const modal = document.createElement("div");
    modal.id = "line-helper-modal";
    modal.className = "fixed inset-0 z-[200] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4";
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-5 md:p-6 max-w-sm w-full shadow-2xl space-y-4 border-2 border-sky-400 animate-in fade-in zoom-in duration-200">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center text-2xl flex-shrink-0">
            📲
          </div>
          <div>
            <h4 class="text-sm md:text-base font-black text-slate-900">偵測到 LINE 內建瀏覽器</h4>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">LINE 機制限制直接下載檔案</p>
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11.5px] text-amber-900 leading-relaxed space-y-1">
          <div class="font-black flex items-center gap-1">
            <span>⚠️</span> 為什麼 LINE 無法直接下載？
          </div>
          <div class="text-[11px]">
            LINE 內部瀏覽器基於安全性考量，會攔截所有由網頁直接產生的 PDF 檔案下載與檔案分享。
          </div>
        </div>

        <div class="space-y-2 pt-1">
          <!-- 方式一：一鍵轉外部瀏覽器 (LINE 會自動轉跳 Chrome/Safari) -->
          <a href="${externalUrl}" target="_blank" rel="noopener noreferrer" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-md transition-all touch-press">
            <span>🌐 以外部瀏覽器開啟 (一鍵下載 PDF)</span>
          </a>

          <!-- 方式二：直接在 LINE 中預覽戰情室 -->
          <button type="button" id="btn-line-preview-trigger" class="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-2 border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all touch-press">
            <span>👁️ 在 LINE 中直接預覽戰情室 (可截圖)</span>
          </button>

          <!-- 方式三：仍嘗試下載 -->
          <button type="button" id="btn-line-force-download" class="w-full py-2 px-3 text-[11px] text-slate-500 hover:text-slate-800 font-medium text-center">
            仍嘗試在 LINE 中直接下載 / 分享
          </button>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-600 leading-normal">
          💡 <strong>小秘訣：</strong>您也可點選 LINE 畫面右上角「三個點點」選單 ➜ 選擇「以預設瀏覽器開啟」，即可享有完整功能！
        </div>

        <div class="text-center pt-1 border-t border-slate-100">
          <button type="button" id="btn-line-close" class="text-xs font-bold text-slate-400 hover:text-slate-600 px-4 py-1">
            關閉視窗
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#btn-line-close").onclick = () => modal.remove();
    modal.querySelector("#btn-line-preview-trigger").onclick = () => {
      modal.remove();
      showWarRoomPreviewModal();
    };
    modal.querySelector("#btn-line-force-download").onclick = () => {
      modal.remove();
      window._forceDirectPdfDownload = true;
      exportPdfReport(isShare);
    };
  }

  // 螢幕全頁預覽戰情室 Modal (支援自動適應手機螢幕尺寸、縮放切換、永不裁切)
  async function showWarRoomPreviewModal() {
    const existing = document.getElementById("warroom-preview-modal");
    if (existing) existing.remove();

    // 點陣化人體圖 (支援前後測雙人體圖，升級為 800x1320 高解析度)
    const currentBodmap = (currentReportState && currentReportState.bodymapData) || userBodymapData || {};
    const currentSvgStr = generateBodymapSvgString(currentBodmap);
    const currentBodyMapPng = await svgStringToPngDataUrl(currentSvgStr, 800, 1320);

    const baselineData = baselineAssessment || (currentReportState && currentReportState.baselineAssessment) || null;
    const isRetestActive = !!(baselineData && (isRetestMode || (currentReportState && currentReportState.isRetest)));
    let baselineBodyMapPng = null;
    if (isRetestActive && baselineData) {
      const baselineSvgStr = generateBodymapSvgString(baselineData.bodymapData || {});
      baselineBodyMapPng = await svgStringToPngDataUrl(baselineSvgStr, 800, 1320);
    }

    const warRoomHtml = buildWarRoomHtml(currentBodyMapPng, baselineBodyMapPng);

    const modal = document.createElement("div");
    modal.id = "warroom-preview-modal";
    modal.className = "fixed inset-0 z-[210] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start p-1.5 sm:p-4 overflow-y-auto";
    modal.innerHTML = `
      <div class="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col my-auto border-2 border-sky-400 overflow-hidden">
        
        <!-- 頂部操作導覽列 -->
        <div class="p-3 md:p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">📊</span>
            <div>
              <div class="font-black text-xs md:text-sm">個人 A4 人因戰情室・全畫面預覽</div>
              <div class="text-[10px] text-sky-300">支援左右滑動與一鍵適配手機寬度</div>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" id="btn-preview-toggle-fit" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-600/50 font-bold text-xs flex items-center gap-1">
              <span id="fit-icon">📱</span>
              <span id="fit-text">全幅適應</span>
            </button>
            <button type="button" id="btn-preview-download" class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm">
              <span>📥 下載 PDF</span>
            </button>
            <button type="button" id="btn-preview-close" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-base">
              ✕
            </button>
          </div>
        </div>

        <!-- 提示橫幅 -->
        <div class="bg-amber-50 px-3 py-2 border-b border-amber-200 text-amber-900 text-[11px] flex items-center justify-between flex-wrap gap-1">
          <span>💡 <strong>保存提示：</strong>在手機上長按螢幕或同時按下「電源鍵 + 音量鍵」即可立即截圖儲存！</span>
        </div>

        <!-- 戰情室內容預覽滾動區 (徹底修正 justify-center 導致左側被切除問題) -->
        <div id="warroom-scroll-container" class="p-2 sm:p-4 overflow-x-auto bg-slate-100 flex justify-start md:justify-center w-full min-h-[400px]">
          <div id="warroom-scale-wrapper" class="bg-white shadow-md rounded-xl overflow-hidden transition-all duration-200" style="margin: 0 auto;">
            <div id="warroom-preview-inner" style="width: 740px;">
              ${warRoomHtml}
            </div>
          </div>
        </div>

        <!-- 底部關閉 -->
        <div class="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 flex-wrap">
          <button type="button" id="btn-preview-native-print" class="px-4 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-xs">
            🖨️ 列印 / 存為 PDF
          </button>
          <button type="button" id="btn-preview-close-footer" class="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs">
            關閉預覽
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    // 適配縮放狀態控制
    let isFitMode = window.innerWidth < 768;
    const scrollContainer = modal.querySelector("#warroom-scroll-container");
    const scaleWrapper = modal.querySelector("#warroom-scale-wrapper");
    const previewInner = modal.querySelector("#warroom-preview-inner");
    const btnToggleFit = modal.querySelector("#btn-preview-toggle-fit");
    const fitIcon = modal.querySelector("#fit-icon");
    const fitText = modal.querySelector("#fit-text");

    function updatePreviewScaling() {
      if (!previewInner || !scaleWrapper) return;
      const containerWidth = scrollContainer.clientWidth - 16;
      if (isFitMode && containerWidth < 740) {
        const scale = containerWidth / 740;
        previewInner.style.transform = `scale(${scale})`;
        previewInner.style.transformOrigin = "top left";
        scaleWrapper.style.width = `${740 * scale}px`;
        scaleWrapper.style.height = `${previewInner.offsetHeight * scale}px`;
        fitIcon.innerText = "🔍";
        fitText.innerText = "原始 100%";
      } else {
        previewInner.style.transform = "none";
        previewInner.style.transformOrigin = "top center";
        scaleWrapper.style.width = "740px";
        scaleWrapper.style.height = "auto";
        fitIcon.innerText = "📱";
        fitText.innerText = "全幅適應";
      }
    }

    // 初次載入適配
    setTimeout(updatePreviewScaling, 60);
    window.addEventListener("resize", updatePreviewScaling, { passive: true });

    btnToggleFit.onclick = () => {
      isFitMode = !isFitMode;
      updatePreviewScaling();
    };

    const closeHandler = () => {
      window.removeEventListener("resize", updatePreviewScaling);
      modal.remove();
    };
    modal.querySelector("#btn-preview-close").onclick = closeHandler;
    modal.querySelector("#btn-preview-close-footer").onclick = closeHandler;
    modal.querySelector("#btn-preview-download").onclick = () => {
      window._forceDirectPdfDownload = true;
      exportPdfReport(false);
    };
    modal.querySelector("#btn-preview-native-print").onclick = () => {
      triggerNativePrint(warRoomHtml);
    };
  }

  // 瀏覽器原生列印 / 存為 PDF 觸發器 (利用 @media print，完全不依賴 html2canvas)
  function triggerNativePrint(htmlContent) {
    let printContainer = document.getElementById("print-only-warroom-container");
    if (!printContainer) {
      printContainer = document.createElement("div");
      printContainer.id = "print-only-warroom-container";
      document.body.appendChild(printContainer);
    }
    printContainer.innerHTML = htmlContent;
    window.print();
  }

  // 10. PDF 報告產出與分享功能核心執行 (可列印 300 DPI 超高清品質)
  async function exportPdfReport(isShare = false) {
    if (!currentReportState) {
      alert("請先完成檢測評估以產出報告！");
      return;
    }

    // 檢查是否處於 LINE 內建瀏覽器環境
    const isLine = /Line\//i.test(navigator.userAgent) || /Line/i.test(navigator.userAgent);
    if (isLine && !window._forceDirectPdfDownload) {
      showLineModal(isShare);
      return;
    }

    // 顯示高解析度產出中 Toast
    const toast = document.createElement("div");
    toast.className = "fixed inset-0 z-[160] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4";
    toast.innerHTML = `
      <div class="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl flex flex-col items-center text-center space-y-3.5 border-2 border-sky-400 animate-in fade-in duration-200">
        <div class="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <div>
          <div class="font-black text-slate-900 text-sm md:text-base">正在產出 A4 人因戰情室報告</div>
          <p class="text-xs text-slate-500 mt-1">向量人體圖 300DPI 渲染、排版計算與光譜生成中...</p>
        </div>
      </div>
    `;
    document.body.appendChild(toast);

    try {
      // 1. 先將 SVG 向量人體圖轉換為 PNG Data URL (雙倍解析度 800x1320 確保印刷銳利)
      const currentBodmap = (currentReportState && currentReportState.bodymapData) || userBodymapData || {};
      const currentSvgStr = generateBodymapSvgString(currentBodmap);
      const currentBodyMapPng = await svgStringToPngDataUrl(currentSvgStr, 800, 1320);

      const baselineData = baselineAssessment || (currentReportState && currentReportState.baselineAssessment) || null;
      const isRetestActive = !!(baselineData && (isRetestMode || (currentReportState && currentReportState.isRetest)));
      let baselineBodyMapPng = null;
      if (isRetestActive && baselineData) {
        const baselineSvgStr = generateBodymapSvgString(baselineData.bodymapData || {});
        baselineBodyMapPng = await svgStringToPngDataUrl(baselineSvgStr, 800, 1320);
      }

      // 2. 產出使用 Table 排版的個人戰情室 HTML
      const warRoomHtml = buildWarRoomHtml(currentBodyMapPng, baselineBodyMapPng);

      // 3. 構建專屬 A4 高解析度輸出容器 (740px 精準單頁寬度，杜絕右側裁切)
      const renderWrapper = document.createElement("div");
      renderWrapper.id = "pdf-render-wrapper";
      renderWrapper.style.position = "fixed";
      renderWrapper.style.left = "-9999px";
      renderWrapper.style.top = "0";
      renderWrapper.style.width = "740px";
      renderWrapper.style.zIndex = "-9999";

      const printable = document.createElement("div");
      printable.id = "printable-pdf-document";
      printable.style.width = "740px";
      printable.style.backgroundColor = "#ffffff";
      printable.style.color = "#0f172a";
      printable.style.boxSizing = "border-box";
      printable.innerHTML = warRoomHtml;

      renderWrapper.appendChild(printable);
      document.body.appendChild(renderWrapper);

      // 等待圖片載入完畢
      await new Promise(r => setTimeout(r, 150));

      const dateStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '');
      const fileName = `人因小管家PRO_A4戰情室評估報告_${dateStr}.pdf`;

      // 設定 html2pdf 選項 (4mm 邊界 + scale: 3 可列印高品質 + avoid-all 單頁防裁切)
      const opt = {
        margin: [4, 4, 4, 4],
        filename: fileName,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          letterRendering: true,
          windowWidth: 740
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const pdfBlob = await html2pdf().set(opt).from(printable).output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (isShare) {
        // 分享模式
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: '人因小管家 PRO 個人 A4 人因戰情室報告',
            text: `人因小管家(Noah) 研發・我的健康得分：${currentReportState.score}分`,
            files: [pdfFile]
          });
        } else {
          // 若不支援原生分享，自動轉為直接下載
          downloadPdfBlob(pdfBlob, fileName);
        }
      } else {
        // 直接下載 (使用原生 Blob 連結觸發，全平台 Android / iOS / Desktop 通用)
        downloadPdfBlob(pdfBlob, fileName);
      }

      // 清理 DOM
      setTimeout(() => {
        renderWrapper.remove();
        toast.remove();
        window._forceDirectPdfDownload = false;
      }, 500);

    } catch (err) {
      console.error("PDF 產生失敗:", err);
      toast.remove();
      window._forceDirectPdfDownload = false;
      // 若瀏覽器攔截下載，自動為學員展開全頁螢幕預覽，確保 100% 能看見報告與人體圖！
      showWarRoomPreviewModal();
    }
  }

  function downloadPdfBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1500);
  }

  // 11. 首頁與全局一鍵重置 (清除初評/複評/作答紀錄)
  function handleGlobalReset() {
    const confirmReset = confirm("⚠️ 確定要清除本場次的所有初評、複評與作答紀錄嗎？\n\n・點擊「確定」：徹底清除紀錄並回到全新評估狀態\n・點擊「取消」：保留現有紀錄");
    if (!confirmReset) return;

    try {
      localStorage.removeItem("ergo_last_report_" + sessionId);
      localStorage.removeItem("ergo_baseline_" + sessionId);
    } catch (e) {}

    userBodymapData = {};
    userBodymapDetails = {};
    baselineAssessment = null;
    isRetestMode = false;
    selectedRole = null;
    userAnswers = [];
    currentReportState = null;
    currentFlexibilityResults = { upper: null, lower: null };

    if (studentBodyMap) {
      studentBodyMap.setData({}, {});
    }

    const banner = document.getElementById("banner-restore-result");
    if (banner) banner.classList.add("hidden");

    elStepResult.classList.add("hidden");
    elStepQuiz.classList.add("hidden");
    elStepBodymap.classList.add("hidden");
    elStepRole.classList.remove("hidden");

    const stepRetestBanner = document.getElementById("bodymap-retest-banner");
    if (stepRetestBanner) stepRetestBanner.classList.add("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
    alert("✅ 已成功重置所有紀錄！您可以重新選擇作業型態開始檢測。");
  }

  // 12. 檢測報告歷史還原與課堂快速通道
  function checkRestoreBanner() {
    const banner = document.getElementById("banner-restore-result");
    const btnRestore = document.getElementById("btn-restore-result");
    const btnResetFromHome = document.getElementById("btn-reset-from-home");
    const btnGlobalReset = document.getElementById("btn-global-reset");
    const bannerText = document.getElementById("restore-banner-text");
    const btnQuickFlex = document.getElementById("btn-quick-flexibility");

    // 綁定一鍵重置按鈕
    if (btnResetFromHome) btnResetFromHome.onclick = handleGlobalReset;
    if (btnGlobalReset) btnGlobalReset.onclick = handleGlobalReset;

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
        selectedRole = cached.role || null;
        isRetestMode = !!cached.isRetest;
        if (cached.baselineAssessment) {
          baselineAssessment = cached.baselineAssessment;
        }
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
          selectedRole = cached.role || null;
          isRetestMode = !!cached.isRetest;
          if (cached.baselineAssessment) {
            baselineAssessment = cached.baselineAssessment;
          }
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
}

// 確保無論 DOM 何時就緒皆能 100% 正常初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

