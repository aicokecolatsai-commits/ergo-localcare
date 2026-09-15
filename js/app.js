/**
 * 學員端問卷核心互動邏輯 (app.js) - 升級版
 * 流程：
 * 步驟 0：選擇作業型態
 * 步驟 1：互動式人體圖 NMQ 不適部位標記 (左右側分開)
 * 步驟 2：工作站環境配置檢核 (4 題)
 * 步驟 3：個人人因檢核報告卡 (含個人人體圖透視、總分、改善指引與免責警語)
 */

document.addEventListener("DOMContentLoaded", () => {
  const sessionId = APP_CONFIG.getSessionId();
  const dataBridge = new DataBridge(sessionId);

  // 狀態管理
  let selectedRole = null;
  let userBodymapData = {}; // { zoneId: 2 (中度) 或 3 (重度) }
  let currentQuestionIndex = 0;
  let userAnswers = []; // 保存工作站檢核作答狀態
  let envQuestions = [];

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

  // 1. 渲染角色挑選卡片
  function renderRoles() {
    elRoleContainer.innerHTML = "";
    ERGO_CONFIG.roles.forEach((role) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className =
        "w-full text-left p-4 md:p-5 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800/90 hover:border-sky-500/70 focus:border-sky-500 focus:outline-none transition-all flex flex-col justify-between group";
      card.innerHTML = `
        <div class="w-full">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-base font-bold text-slate-100 group-hover:text-sky-300 transition-colors">${role.name}</span>
            <span class="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">${role.badge}</span>
          </div>
          <p class="text-xs md:text-sm text-slate-400 leading-relaxed">${role.desc}</p>
        </div>
        <div class="mt-3 flex items-center justify-end text-xs font-semibold text-sky-400 group-hover:translate-x-0.5 transition-transform">
          進入人體圖標記 ➔
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
        onChange: (selectedData) => {
          userBodymapData = { ...selectedData };
          updateBodymapSummary();
        }
      });
    } else {
      studentBodyMap.setData(userBodymapData);
    }
    updateBodymapSummary();
  }

  // 更新人體圖選取摘要 (顯示 0~5 分生活情境標籤)
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
      
      let badgeClass = "text-sky-400 bg-sky-950/60 border-sky-800";
      if (level === 2) badgeClass = "text-amber-300 bg-amber-950/60 border-amber-800";
      if (level === 3) badgeClass = "text-amber-400 bg-amber-950/80 border-amber-600 font-bold";
      if (level >= 4) badgeClass = "text-rose-400 bg-rose-950/80 border-rose-600 font-bold";

      return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] border ${badgeClass}">
        ${name} (${level}分 · ${levelConf.label})
      </span>`;
    });

    elBodymapSummary.innerHTML = `<div class="flex flex-wrap items-center justify-center gap-1.5">已標記部位：${items.join("")}</div>`;
  }

  // 人體圖按鈕導航
  elBtnBodymapBack.addEventListener("click", () => {
    elStepBodymap.classList.add("hidden");
    elStepRole.classList.remove("hidden");
  });

  elBtnBodymapNext.addEventListener("click", () => {
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
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
            ${q.dimensionName}
          </span>
        </div>
        <h2 class="text-lg md:text-xl font-bold text-slate-100 mb-5 leading-snug">
          ${q.question}
        </h2>
        <div class="space-y-3" id="options-container">
          ${q.options
            .map((opt, idx) => {
              const isSelected = prevSelectedIdx === idx;
              const activeClass = isSelected
                ? "border-sky-500 bg-sky-950/40 text-sky-200"
                : "border-slate-700/80 bg-slate-850 hover:border-slate-600 hover:bg-slate-800 text-slate-200";
              const letterActiveClass = isSelected
                ? "border-sky-400 bg-sky-500 text-slate-950"
                : "border-slate-600 text-slate-400 group-hover:border-slate-500 group-hover:text-slate-300";

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

    const submissionData = {
      role: selectedRole,
      totalScore: totalScore,
      tier: tierInfo.tier,
      nmqData: nmqData,
      traps: traps
    };

    await dataBridge.submitAssessment(submissionData);
    showResult(totalScore, tierInfo, nmqData, personalizedGuides);
  }

  // 8. 渲染個人評估結果報告
  function showResult(score, tierInfo, nmqData, customGuides) {
    elStepQuiz.classList.add("hidden");
    elStepResult.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    document.getElementById("res-score").innerText = score;
    document.getElementById("res-title").innerText = tierInfo.title;
    document.getElementById("res-subtitle").innerText = tierInfo.subtitle;
    document.getElementById("res-analysis").innerText = tierInfo.analysis;
    document.getElementById("res-score-badge").className = `inline-block px-3 py-1 rounded-full text-xs font-bold border ${tierInfo.badgeColor} mb-2`;
    document.getElementById("res-score-badge").innerText = tierInfo.title;

    // 渲染個人結果人體圖 (唯讀)
    const resMapContainer = document.getElementById("result-bodymap-container");
    resMapContainer.innerHTML = "";
    const resultMap = new BodyMapComponent({
      containerId: "result-bodymap-container",
      interactive: false
    });
    resultMap.setData(userBodymapData);

    // 渲染標記文字清單 (顯示 0~5 分精準生活情境)
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
          
          return `
          <div class="flex items-center justify-between p-2 rounded bg-slate-850 border border-[#30363d] text-xs">
            <span class="flex items-center gap-2 font-bold text-slate-200">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${levelConf.color}"></span>
              <span>${name}</span>
            </span>
            <span class="text-slate-300 font-medium">${level}分 · ${levelConf.label} <span class="text-[10px] text-slate-400">(${levelConf.desc.slice(0, 16)}...)</span></span>
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
          <li class="flex items-start gap-3 text-slate-300 text-sm leading-relaxed p-2.5 rounded-lg bg-slate-850/60 border border-[#30363d]">
            <span class="w-5 h-5 rounded-md bg-sky-950 text-sky-300 border border-sky-800 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
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
      elStepResult.classList.add("hidden");
      elStepRole.classList.remove("hidden");
      renderRoles();
    });
  }

  // 初始渲染
  renderRoles();
});
