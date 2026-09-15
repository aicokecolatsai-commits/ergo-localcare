/**
 * 學員端問卷核心邏輯 (app.js)
 * 負責角色挑選、動態題庫推進、分數計算、診斷卡產出與即時提交
 */

document.addEventListener("DOMContentLoaded", () => {
  const sessionId = APP_CONFIG.getSessionId();
  const dataBridge = new DataBridge(sessionId);

  // 狀態變數
  let selectedRole = null;
  let currentQuestionIndex = 0;
  let userAnswers = []; // 每題作答紀錄
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

  // 初始化場次標籤
  if (elSessionBadge) {
    elSessionBadge.innerText = `📍 場次代碼: ${sessionId}`;
  }

  // 1. 渲染角色選擇卡片
  function renderRoles() {
    elRoleContainer.innerHTML = "";
    ERGO_CONFIG.roles.forEach((role) => {
      const card = document.createElement("div");
      card.className =
        "glass-panel glass-card-hover p-5 rounded-2xl cursor-pointer border border-slate-700/60 hover:border-cyan-500/80 transition-all flex flex-col justify-between group";
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">${role.name}</h3>
            <span class="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-medium">${role.badge}</span>
          </div>
          <p class="text-sm text-slate-400 leading-relaxed">${role.desc}</p>
        </div>
        <div class="mt-4 flex items-center justify-end text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
          開始 60 秒檢測 →
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
    userAnswers = [];

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
    elProgressText.innerText = `第 ${currentQuestionIndex + 1} / ${totalQ} 題`;

    elQuestionContainer.innerHTML = `
      <div class="slide-in-right">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs font-bold px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            ${q.dimensionName}
          </span>
        </div>
        <h2 class="text-xl md:text-2xl font-bold text-white mb-6 leading-snug">
          ${q.question}
        </h2>
        <div class="space-y-3.5" id="options-container">
          ${q.options
            .map(
              (opt, idx) => `
            <button 
              data-index="${idx}"
              data-penalty="${opt.penalty}"
              class="option-btn w-full text-left p-4 rounded-xl glass-panel border border-slate-700/80 hover:border-cyan-400 hover:bg-slate-800/80 transition-all text-slate-200 hover:text-white flex items-start gap-3.5 group">
              <span class="w-6 h-6 rounded-full border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:border-cyan-400 group-hover:text-cyan-400 flex-shrink-0 mt-0.5">
                ${String.fromCharCode(65 + idx)}
              </span>
              <span class="text-sm md:text-base leading-relaxed">${opt.label}</span>
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // 綁定選項點擊事件
    const optionBtns = elQuestionContainer.querySelectorAll(".option-btn");
    optionBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const penalty = parseInt(btn.getAttribute("data-penalty"), 10);
        handleAnswer(penalty, q);
      });
    });
  }

  // 4. 處理答題
  function handleAnswer(penalty, questionObj) {
    userAnswers.push({
      questionId: questionObj.id,
      dimension: questionObj.dimension,
      penalty: penalty
    });

    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  // 5. 計算總分與產出診斷
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
      totalScore -= ans.penalty;
      // 統計痛點
      if (painPoints[ans.dimension] !== undefined) {
        painPoints[ans.dimension] = ans.penalty;
      }
      // 統計地雷
      if (traps[ans.dimension] !== undefined && ans.penalty > 0) {
        traps[ans.dimension] = true;
      }
    });

    totalScore = Math.max(0, Math.min(100, totalScore));

    // 尋找對應的分數區間
    const tierInfo = ERGO_CONFIG.scoreTiers.find(
      (t) => totalScore >= t.min && totalScore <= t.max
    ) || ERGO_CONFIG.scoreTiers[ERGO_CONFIG.scoreTiers.length - 1];

    const submissionData = {
      role: selectedRole,
      totalScore: totalScore,
      tier: tierInfo.tier,
      painPoints: painPoints,
      traps: traps
    };

    // 提交至資料庫/廣播
    await dataBridge.submitAssessment(submissionData);

    // 顯示結果頁
    showResult(totalScore, tierInfo, painPoints);
  }

  // 6. 渲染個人診斷卡片
  function showResult(score, tierInfo, painPoints) {
    elStepQuiz.classList.add("hidden");
    elStepResult.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 分數與等級
    document.getElementById("res-score").innerText = score;
    document.getElementById("res-title").innerText = tierInfo.title;
    document.getElementById("res-subtitle").innerText = tierInfo.subtitle;
    document.getElementById("res-analysis").innerText = tierInfo.analysis;
    document.getElementById("res-score-badge").className = `inline-block px-3 py-1 rounded-full text-xs font-bold border ${tierInfo.badgeColor} mb-2`;
    document.getElementById("res-score-badge").innerText = tierInfo.title;

    // 大人學處方清單
    const elPrescriptions = document.getElementById("res-prescriptions");
    elPrescriptions.innerHTML = tierInfo.prescriptions
      .map(
        (rx, i) => `
        <li class="flex items-start gap-3 text-slate-300 text-sm md:text-base leading-relaxed">
          <span class="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
            ${i + 1}
          </span>
          <span>${rx}</span>
        </li>
      `
      )
      .join("");

    // 繪製痛點條狀視覺化
    renderPainChart(painPoints);

    // 綁定重新測試按鈕
    document.getElementById("btn-restart").addEventListener("click", () => {
      elStepResult.classList.add("hidden");
      elStepRole.classList.remove("hidden");
      renderRoles();
    });
  }

  // 7. 渲染痛點雷達/條狀圖
  function renderPainChart(painPoints) {
    const ctx = document.getElementById("painChart");
    if (!ctx) return;

    if (window.myPainChart) {
      window.myPainChart.destroy();
    }

    const labels = ["後頸肩胛", "腰椎骨盆", "手腕關節", "視覺專注"];
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
            label: "損耗程度 (扣分)",
            data: values,
            backgroundColor: [
              "rgba(244, 63, 94, 0.75)",
              "rgba(249, 115, 22, 0.75)",
              "rgba(245, 158, 11, 0.75)",
              "rgba(6, 182, 212, 0.75)"
            ],
            borderColor: [
              "#f43f5e",
              "#f97316",
              "#f59e0b",
              "#06b6d4"
            ],
            borderWidth: 1,
            borderRadius: 8
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
              color: "#94a3b8",
              callback: (v) => (v === 0 ? "健康" : (v === 5 ? "中度" : "重度"))
            },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          x: {
            ticks: { color: "#cbd5e1" },
            grid: { display: false }
          }
        }
      }
    });
  }

  // 初始化執行
  renderRoles();
});
