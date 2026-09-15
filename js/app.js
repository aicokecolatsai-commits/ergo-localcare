/**
 * 學員端問卷核心互動邏輯 (app.js)
 * 具備：角色挑選、雙向上一題/下一題導航、作答狀態記憶、NMQ-Lite 計算與人因改善指引報告
 */

document.addEventListener("DOMContentLoaded", () => {
  const sessionId = APP_CONFIG.getSessionId();
  const dataBridge = new DataBridge(sessionId);

  // 狀態管理
  let selectedRole = null;
  let currentQuestionIndex = 0;
  let userAnswers = []; // 保存每題作答狀態 [{questionId, dimension, penalty, selectedOptionIndex}]
  let questions = [];

  // DOM 元素
  const elSessionBadge = document.getElementById("session-badge");
  const elStepRole = document.getElementById("step-role");
  const elStepQuiz = document.getElementById("step-quiz");
  const elStepResult = document.getElementById("step-result");
  const elRoleContainer = document.getElementById("role-cards-container");
  const elProgressBar = document.getElementById("progress-bar");
  const elProgressText = document.getElementById("progress-text");
  const elQuestionContainer = document.getElementById("question-container");
  const elBtnPrev = document.getElementById("btn-prev-question");

  if (elSessionBadge) {
    elSessionBadge.innerText = `場次：${sessionId}`;
  }

  // 1. 渲染角色挑選卡片 (純粹專業、無浮誇假 3D 與刺眼漸層)
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
          開始自我檢核 ➔
        </div>
      `;
      card.addEventListener("click", () => startQuiz(role.id));
      elRoleContainer.appendChild(card);
    });
  }

  // 2. 開始測驗
  function startQuiz(roleId) {
    selectedRole = roleId;
    questions = ERGO_CONFIG.questionSets[roleId] || ERGO_CONFIG.questionSets.office;
    currentQuestionIndex = 0;
    userAnswers = new Array(questions.length).fill(null);

    elStepRole.classList.add("hidden");
    elStepQuiz.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    renderQuestion();
  }

  // 3. 渲染單一題目
  function renderQuestion() {
    const q = questions[currentQuestionIndex];
    const totalQ = questions.length;
    const progressPercent = ((currentQuestionIndex + 1) / totalQ) * 100;

    elProgressBar.style.width = `${progressPercent}%`;
    elProgressText.innerText = `進度 ${currentQuestionIndex + 1} / ${totalQ}`;

    // 更新上一題按鈕狀態
    if (elBtnPrev) {
      if (currentQuestionIndex === 0) {
        elBtnPrev.innerText = "⬅️ 重新選擇作業型態";
      } else {
        elBtnPrev.innerText = "⬅️ 返回上一題";
      }
    }

    // 檢查本題是否已有歷史作答紀錄
    const prevAnswer = userAnswers[currentQuestionIndex];
    const prevSelectedIdx = prevAnswer !== null ? prevAnswer.selectedOptionIndex : null;

    elQuestionContainer.innerHTML = `
      <div class="fade-in">
        <div class="flex items-center gap-2 mb-2.5">
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

    // 綁定選項點擊事件
    const optionBtns = elQuestionContainer.querySelectorAll(".option-btn");
    optionBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const optionIdx = parseInt(btn.getAttribute("data-index"), 10);
        const penalty = parseInt(btn.getAttribute("data-penalty"), 10);
        handleAnswer(optionIdx, penalty, q);
      });
    });
  }

  // 4. 處理答題
  function handleAnswer(optionIdx, penalty, questionObj) {
    userAnswers[currentQuestionIndex] = {
      questionId: questionObj.id,
      dimension: questionObj.dimension,
      penalty: penalty,
      selectedOptionIndex: optionIdx
    };

    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  // 5. 上一題邏輯
  if (elBtnPrev) {
    elBtnPrev.addEventListener("click", () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
      } else {
        // 第一題點上一題，返回身分挑選
        elStepQuiz.classList.add("hidden");
        elStepRole.classList.remove("hidden");
      }
    });
  }

  // 6. 計算總分與產出評估報告
  async function finishQuiz() {
    let totalScore = 100;
    const painPoints = { neck: 0, back: 0, wrist: 0, eye: 0 };
    const traps = {
      trap_screen: false,
      trap_chair: false,
      trap_glare: false,
      trap_sedentary: false
    };

    userAnswers.forEach((ans) => {
      if (!ans) return;
      totalScore -= ans.penalty;
      if (painPoints[ans.dimension] !== undefined) {
        painPoints[ans.dimension] = ans.penalty;
      }
      if (traps[ans.dimension] !== undefined && ans.penalty > 0) {
        traps[ans.dimension] = true;
      }
    });

    totalScore = Math.max(0, Math.min(100, totalScore));

    const tierInfo =
      ERGO_CONFIG.scoreTiers.find((t) => totalScore >= t.min && totalScore <= t.max) ||
      ERGO_CONFIG.scoreTiers[ERGO_CONFIG.scoreTiers.length - 1];

    const submissionData = {
      role: selectedRole,
      totalScore: totalScore,
      tier: tierInfo.tier,
      painPoints: painPoints,
      traps: traps
    };

    await dataBridge.submitAssessment(submissionData);
    showResult(totalScore, tierInfo, painPoints);
  }

  // 7. 渲染個人評估結果報告
  function showResult(score, tierInfo, painPoints) {
    elStepQuiz.classList.add("hidden");
    elStepResult.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    document.getElementById("res-score").innerText = score;
    document.getElementById("res-title").innerText = tierInfo.title;
    document.getElementById("res-subtitle").innerText = tierInfo.subtitle;
    document.getElementById("res-analysis").innerText = tierInfo.analysis;
    document.getElementById("res-score-badge").className = `inline-block px-3 py-1 rounded-full text-xs font-bold border ${tierInfo.badgeColor} mb-2`;
    document.getElementById("res-score-badge").innerText = tierInfo.title;

    // 改善指引清單
    const elGuides = document.getElementById("res-action-guides");
    if (elGuides) {
      elGuides.innerHTML = tierInfo.actionGuides
        .map(
          (guide, i) => `
          <li class="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
            <span class="w-5 h-5 rounded-md bg-slate-800 text-sky-300 border border-slate-700 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
              ${i + 1}
            </span>
            <span>${guide}</span>
          </li>
        `
        )
        .join("");
    }

    // 渲染免責聲明警語
    const elDisclaimer = document.getElementById("res-disclaimer");
    if (elDisclaimer) {
      elDisclaimer.innerText = ERGO_CONFIG.disclaimer;
    }

    renderPainChart(painPoints);

    document.getElementById("btn-restart").addEventListener("click", () => {
      elStepResult.classList.add("hidden");
      elStepRole.classList.remove("hidden");
      renderRoles();
    });
  }

  // 8. 渲染 NMQ 扣分長條圖 (專業乾淨配色)
  function renderPainChart(painPoints) {
    const ctx = document.getElementById("painChart");
    if (!ctx) return;

    if (window.myPainChart) {
      window.myPainChart.destroy();
    }

    const labels = ["頸肩部", "腰背部", "手腕關節", "視覺調節"];
    const values = [
      painPoints.neck || 0,
      painPoints.back || 0,
      painPoints.wrist || 0,
      painPoints.eye || 0
    ];

    window.myPainChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "負載扣分 (越高代表該部位負荷越重)",
            data: values,
            backgroundColor: [
              "rgba(244, 63, 94, 0.8)",
              "rgba(249, 115, 22, 0.8)",
              "rgba(234, 179, 8, 0.8)",
              "rgba(56, 189, 248, 0.8)"
            ],
            borderColor: [
              "#f43f5e",
              "#f97316",
              "#eab308",
              "#38bdf8"
            ],
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 10,
            ticks: {
              stepSize: 5,
              color: "#64748b",
              font: { size: 11 },
              callback: (v) => (v === 0 ? "低負載" : (v === 5 ? "中度負載" : "重度負載"))
            },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          x: {
            ticks: { color: "#94a3b8", font: { size: 12, weight: "bold" } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // 初始渲染
  renderRoles();
});
