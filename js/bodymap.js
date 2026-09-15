/**
 * 人體工學 NMQ 向量人體圖元件 (bodymap.js) - 莫蘭迪美學與手機優先版
 * 導入生活情境錨定 (Functional & Temporal Anchoring) 與 莫蘭迪高雅色系：
 * 0: 無不適 (活動自如，無酸痛感) - 莫蘭迪灰石 #546274
 * 1: 偶爾微緊 (動一動即消失) - 莫蘭迪霧霾藍 #5b8eab
 * 2: 工作時酸 (下班休息後就好) - 莫蘭迪鼠尾草綠 #66997a
 * 3: 下班回到家還在酸痛 (生活核心門檻，隔天未恢復) - 莫蘭迪秋香芥黃 #c69242
 * 4: 痛到分心 (干擾專注，動作變慢) - 莫蘭迪陶土焦糖 #bd5d38
 * 5: 發麻劇痛 (深層刺痛、神經發麻、影響睡眠) - 莫蘭迪煙燻莓紅 #a63a50
 */

const NMQ_SEVERITY_LEVELS = [
  { level: 0, label: "無不適", desc: "活動自如，完全無酸痛感", color: "#546274", textColor: "#cbd5e1", bgClass: "bg-[#546274]/20 border-[#546274]/40" },
  { level: 1, label: "偶爾微緊", desc: "稍微轉動、伸展一下就消失", color: "#5b8eab", textColor: "#ffffff", bgClass: "bg-[#5b8eab]/20 border-[#5b8eab]/50" },
  { level: 2, label: "工作時酸，下班就好", desc: "作業時酸脹，下班休息後消退", color: "#66997a", textColor: "#ffffff", bgClass: "bg-[#66997a]/20 border-[#66997a]/50" },
  { level: 3, label: "下班回家還在酸痛", desc: "洗完澡仍酸痛，隔天未完全消退", color: "#c69242", textColor: "#ffffff", bgClass: "bg-[#c69242]/25 border-[#c69242]/60" },
  { level: 4, label: "痛到分心、動作變慢", desc: "明顯干擾專注力與工作產能", color: "#bd5d38", textColor: "#ffffff", bgClass: "bg-[#bd5d38]/25 border-[#bd5d38]/60" },
  { level: 5, label: "發麻、劇痛、難以入眠", desc: "深層刺痛、神經發麻無力或痛醒", color: "#a63a50", textColor: "#ffffff", bgClass: "bg-[#a63a50]/25 border-[#a63a50]/60" }
];

const NMQ_ZONES = [
  { id: "neck", name: "頸部", isBilateral: false, cx: 100, cy: 55, r: 13 },
  { id: "shoulder_l", name: "左肩", isBilateral: true, cx: 65, cy: 75, r: 14 },
  { id: "shoulder_r", name: "右肩", isBilateral: true, cx: 135, cy: 75, r: 14 },
  { id: "upperback", name: "上背部", isBilateral: false, cx: 100, cy: 95, r: 16 },
  { id: "elbow_l", name: "左手肘", isBilateral: true, cx: 48, cy: 125, r: 13 },
  { id: "elbow_r", name: "右手肘", isBilateral: true, cx: 152, cy: 125, r: 13 },
  { id: "lowerback", name: "下背/腰部", isBilateral: false, cx: 100, cy: 135, r: 16 },
  { id: "wrist_l", name: "左手腕", isBilateral: true, cx: 35, cy: 165, r: 12 },
  { id: "wrist_r", name: "右手腕", isBilateral: true, cx: 165, cy: 165, r: 12 },
  { id: "hip_l", name: "左臀/髖部", isBilateral: true, cx: 80, cy: 170, r: 15 },
  { id: "hip_r", name: "右臀/髖部", isBilateral: true, cx: 120, cy: 170, r: 15 },
  { id: "knee_l", name: "左膝", isBilateral: true, cx: 82, cy: 235, r: 14 },
  { id: "knee_r", name: "右膝", isBilateral: true, cx: 118, cy: 235, r: 14 },
  { id: "ankle_l", name: "左踝/足部", isBilateral: true, cx: 82, cy: 300, r: 13 },
  { id: "ankle_r", name: "右踝/足部", isBilateral: true, cx: 118, cy: 300, r: 13 }
];

class BodyMapComponent {
  constructor(options) {
    this.container = document.getElementById(options.containerId);
    this.interactive = !!options.interactive;
    this.onChange = options.onChange || (() => {});
    this.selectedZones = {}; // { zoneId: 0~5 }
    this.zoneDetails = {}; // { zoneId: { days: 'lt7'|'8to30'|'gt30', medical: 'yes'|'no' } }
    this.activeFocusZone = null;
    if (this.container) {
      this.init();
    }
  }

  init() {
    this.container.innerHTML = `
      <div class="w-full max-w-sm mx-auto flex flex-col items-center select-none">
        
        <!-- 手機友善：人體部位快捷橫向滑動膠囊列 (白底淡色膠囊) -->
        ${this.interactive ? `
          <div class="w-full mb-2.5">
            <div class="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 px-0.5 font-medium">
              <span class="flex items-center gap-1">
                <span>📍</span> 快捷切換部位：
              </span>
              <span class="text-[10px] text-slate-400">可點選人體圖或橫向滑動</span>
            </div>
            <div class="zone-pills-bar flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar w-full">
              ${NMQ_ZONES.map(z => `
                <button 
                  type="button" 
                  data-id="${z.id}" 
                  class="zone-pill-btn flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100/90 text-slate-700 border border-slate-200/90 hover:border-[#4a7c9d] transition-all flex items-center gap-1.5 touch-press shadow-xs">
                  <span class="w-2 h-2 rounded-full bg-slate-400 pill-dot transition-colors"></span>
                  <span class="pill-name">${z.name}</span>
                  <span class="pill-score text-[10px] font-bold hidden"></span>
                </button>
              `).join("")}
            </div>
          </div>
        ` : ""}

        <!-- SVG 向量人體剪影 (白底淺色溫潤人體輪廓) -->
        <div class="relative w-full max-w-[210px] flex flex-col items-center">
          <svg viewBox="0 0 200 330" class="w-full h-auto drop-shadow-xs" xmlns="http://www.w3.org/2000/svg">
            <!-- 身體輪廓 -->
            <g fill="#e9eef5" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round">
              <ellipse cx="100" cy="30" rx="18" ry="22" />
              <path d="M 88 50 C 70 65, 55 70, 50 85 C 45 100, 42 120, 35 160 C 32 175, 42 180, 48 165 L 58 135 L 62 165 C 64 185, 75 190, 100 190 C 125 190, 136 185, 138 165 L 142 135 L 152 165 C 158 180, 168 175, 165 160 C 158 120, 155 100, 150 85 C 145 70, 130 65, 112 50 Z" />
              <path d="M 68 185 C 72 210, 75 250, 75 295 C 75 305, 68 312, 75 315 C 85 315, 92 308, 92 295 L 94 220 L 98 190 L 102 190 L 106 220 L 108 295 C 108 308, 115 315, 125 315 C 132 312, 125 305, 125 295 C 125 250, 128 210, 132 185 Z" />
            </g>
            <line x1="100" y1="52" x2="100" y2="185" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" />

            <!-- 15 個解剖區域互動靶點 -->
            <g id="heatmap-targets">
              ${NMQ_ZONES.map((z) => `
                <g class="zone-target ${this.interactive ? 'cursor-pointer' : ''}" data-id="${z.id}" id="target-${z.id}">
                  <!-- 放大點擊熱區，手機更易擊中 -->
                  <circle cx="${z.cx}" cy="${z.cy}" r="${z.r + 7}" fill="transparent" />
                  <circle cx="${z.cx}" cy="${z.cy}" r="${z.r}" class="zone-circle transition-all duration-200" fill="#f8fafc" fill-opacity="0.95" stroke="#94a3b8" stroke-width="1.5" />
                  <text x="${z.cx}" y="${z.cy + 3.5}" text-anchor="middle" class="zone-text text-[9px] font-bold fill-slate-700 pointer-events-none select-none">
                    ${z.name.replace("左", "L").replace("右", "R")}
                  </text>
                </g>
              `).join("")}
            </g>
          </svg>

          <div class="w-full flex items-center justify-between text-[10px] font-semibold text-slate-500 px-3 mt-1">
            <span>左側 (Left)</span>
            <span class="text-[9px] text-slate-400 font-mono">解剖左右視角</span>
            <span>右側 (Right)</span>
          </div>
        </div>

        <!-- 手機原生級底部滑出抽屜 (白底莫蘭迪 Bottom Sheet Modal) -->
        ${this.interactive ? `
          <!-- 半透明 Backdrop 遮罩 (加深對比，凸顯白底抽屜) -->
          <div id="bodymap-sheet-backdrop" class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 hidden opacity-0 transition-opacity duration-200"></div>

          <!-- 底部彈出抽屜 (純白不透明底色 + 實體邊框與高對比按鈕) -->
          <div id="zone-scale-drawer" class="fixed inset-x-0 bottom-0 z-50 p-4 pb-8 bg-white border-t-2 border-slate-300 rounded-t-2xl shadow-2xl transition-all duration-200 transform translate-y-full opacity-0 pointer-events-none max-w-lg mx-auto max-h-[88vh] overflow-y-auto no-scrollbar">
            <!-- 頂部手柄條 -->
            <div class="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-3.5"></div>
            
            <div class="flex items-center justify-between mb-3 px-1">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-[#4a7c9d] shadow-xs"></span>
                <span id="active-zone-title" class="text-sm md:text-base font-black text-slate-900 tracking-wide">
                  設定部位酸痛狀況
                </span>
              </div>
              <button id="btn-close-drawer" type="button" class="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors text-sm font-bold shadow-xs">
                ✕
              </button>
            </div>
            
            <!-- 6段莫蘭迪情境按鈕 (純白底色 + 實體粗邊框 + 鮮明色標) -->
            <div class="grid grid-cols-2 gap-2.5" id="scale-options-container">
              ${NMQ_SEVERITY_LEVELS.map(l => `
                <button 
                  type="button" 
                  data-level="${l.level}" 
                  class="scale-btn text-left p-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between touch-press group min-h-[66px] shadow-xs">
                  <div class="flex items-center justify-between w-full mb-1">
                    <span class="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span class="w-3 h-3 rounded-full flex-shrink-0 shadow-xs" style="background-color: ${l.color}"></span>
                      <span>${l.level}分 · ${l.label}</span>
                    </span>
                  </div>
                  <span class="text-[10.5px] text-slate-600 leading-snug font-medium">
                    ${l.desc}
                  </span>
                </button>
              `).join("")}
            </div>

            <!-- 台灣勞安所 NMQ 關鍵指標條件追問區 (純色高對比卡片) -->
            <div id="nmq-deep-dive-box" class="hidden mt-3 p-3.5 rounded-xl bg-sky-50 border-2 border-sky-300 transition-all duration-200 shadow-sm">
              <div class="flex items-center justify-between mb-2.5">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-600 text-white shadow-xs">NMQ 危害指標</span>
                  <span class="text-xs font-black text-sky-950">高風險痛點深度檢核</span>
                </div>
                <span class="text-[10px] text-sky-800 font-bold">（已達顯著危害閾值）</span>
              </div>

              <!-- 追問 1：過去一年累積不適天數 -->
              <div class="mb-3">
                <label class="block text-[11px] font-bold text-slate-800 mb-1.5">
                  1. 過去 1 年內，該部位累積酸痛/麻木天數？
                </label>
                <div class="grid grid-cols-3 gap-1.5" id="nmq-days-group">
                  <button type="button" data-days="lt7" class="nmq-btn-days py-2 px-1 rounded-lg border-2 border-slate-200 bg-white text-[11px] text-slate-800 font-bold hover:border-sky-400 transition-all text-center touch-press shadow-xs">
                    未滿 7 天
                  </button>
                  <button type="button" data-days="8to30" class="nmq-btn-days py-2 px-1 rounded-lg border-2 border-slate-200 bg-white text-[11px] text-slate-800 font-bold hover:border-sky-400 transition-all text-center touch-press shadow-xs">
                    8 ~ 30 天
                  </button>
                  <button type="button" data-days="gt30" class="nmq-btn-days py-2 px-1 rounded-lg border-2 border-slate-200 bg-white text-[11px] text-slate-800 font-bold hover:border-sky-400 transition-all text-center touch-press shadow-xs">
                    超過 30 天
                  </button>
                </div>
              </div>

              <!-- 追問 2：是否曾就醫、復健或服藥 -->
              <div class="mb-3">
                <label class="block text-[11px] font-bold text-slate-800 mb-1.5">
                  2. 是否曾因此就醫、接受物理治療或服藥？
                </label>
                <div class="grid grid-cols-2 gap-2" id="nmq-med-group">
                  <button type="button" data-medical="yes" class="nmq-btn-med py-2 px-2 rounded-lg border-2 border-slate-200 bg-white text-[11px] text-slate-800 font-bold hover:border-sky-400 transition-all text-center touch-press shadow-xs">
                    🏥 是，曾就醫或治療
                  </button>
                  <button type="button" data-medical="no" class="nmq-btn-med py-2 px-2 rounded-lg border-2 border-slate-200 bg-white text-[11px] text-slate-800 font-bold hover:border-sky-400 transition-all text-center touch-press shadow-xs">
                    🌱 否，未曾就醫
                  </button>
                </div>
              </div>

              <!-- 確認儲存按鈕 -->
              <div class="pt-2 border-t border-sky-200/80">
                <button id="btn-confirm-zone" type="button" class="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 touch-press">
                  <span>✓</span> 儲存此部位評估與 NMQ 指標
                </button>
              </div>
            </div>

            <!-- 底部動作 -->
            <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between px-1 text-xs">
              <span class="text-[11px] text-slate-400">💡 0~2分點選即存，3分以上啟動危害追問</span>
              <button id="btn-clear-zone" type="button" class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 text-xs font-medium transition-colors">
                設為無不適 (0分)
              </button>
            </div>
          </div>
        ` : ""}

      </div>
    `;

    if (this.interactive) {
      this.bindEvents();
    }
  }

  bindEvents() {
    const targets = this.container.querySelectorAll(".zone-target");
    const pills = this.container.querySelectorAll(".zone-pill-btn");
    const drawer = this.container.querySelector("#zone-scale-drawer");
    const backdrop = this.container.querySelector("#bodymap-sheet-backdrop");
    const btnClose = this.container.querySelector("#btn-close-drawer");
    const btnClear = this.container.querySelector("#btn-clear-zone");
    const scaleBtns = this.container.querySelectorAll(".scale-btn");
    const deepDiveBox = this.container.querySelector("#nmq-deep-dive-box");

    // 點擊人體圖向量靶點
    targets.forEach((target) => {
      target.addEventListener("click", () => {
        const id = target.getAttribute("data-id");
        this.openScaleDrawer(id);
      });
    });

    // 點擊橫向部位膠囊
    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const id = pill.getAttribute("data-id");
        this.openScaleDrawer(id);
      });
    });

    // 選擇分數 (0~2分即刻儲存關閉；3~5分啟動方案B漸進式追問)
    scaleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const level = parseInt(btn.getAttribute("data-level"), 10);
        if (!this.activeFocusZone) return;

        // 更新分數按鈕視覺
        scaleBtns.forEach(b => {
          const bLvl = parseInt(b.getAttribute("data-level"), 10);
          const lConf = NMQ_SEVERITY_LEVELS.find(l => l.level === bLvl);
          if (bLvl === level) {
            b.style.borderColor = lConf.color;
            b.style.backgroundColor = `${lConf.color}25`;
          } else {
            b.style.borderColor = "";
            b.style.backgroundColor = "";
          }
        });

        if (level < 3) {
          if (deepDiveBox) deepDiveBox.classList.add("hidden");
          this.setZoneLevel(this.activeFocusZone, level);
        } else {
          // 3分以上：已達生活與產能顯著干擾閾值，展開 NMQ 關鍵指標
          this.selectedZones[this.activeFocusZone] = level;
          if (!this.zoneDetails[this.activeFocusZone]) {
            this.zoneDetails[this.activeFocusZone] = { days: "8to30", medical: "no" };
          }
          if (deepDiveBox) {
            deepDiveBox.classList.remove("hidden");
            this.updateDeepDiveSelections(this.activeFocusZone);
            setTimeout(() => {
              deepDiveBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 50);
          }
          this.updateVisuals();
          this.onChange(this.selectedZones, this.zoneDetails);
        }
      });
    });

    // NMQ 追問 1 按鈕點擊 (累積天數)
    const daysBtns = this.container.querySelectorAll(".nmq-btn-days");
    daysBtns.forEach(b => {
      b.addEventListener("click", () => {
        if (!this.activeFocusZone) return;
        const val = b.getAttribute("data-days");
        if (!this.zoneDetails[this.activeFocusZone]) {
          this.zoneDetails[this.activeFocusZone] = { days: "8to30", medical: "no" };
        }
        this.zoneDetails[this.activeFocusZone].days = val;
        this.updateDeepDiveSelections(this.activeFocusZone);
        this.onChange(this.selectedZones, this.zoneDetails);
      });
    });

    // NMQ 追問 2 按鈕點擊 (就醫復健史)
    const medBtns = this.container.querySelectorAll(".nmq-btn-med");
    medBtns.forEach(b => {
      b.addEventListener("click", () => {
        if (!this.activeFocusZone) return;
        const val = b.getAttribute("data-medical");
        if (!this.zoneDetails[this.activeFocusZone]) {
          this.zoneDetails[this.activeFocusZone] = { days: "8to30", medical: "no" };
        }
        this.zoneDetails[this.activeFocusZone].medical = val;
        this.updateDeepDiveSelections(this.activeFocusZone);
        this.onChange(this.selectedZones, this.zoneDetails);
      });
    });

    // 確定儲存按鈕
    const btnConfirm = this.container.querySelector("#btn-confirm-zone");
    if (btnConfirm) {
      btnConfirm.addEventListener("click", () => {
        this.updateVisuals();
        this.onChange(this.selectedZones, this.zoneDetails);
        this.closeScaleDrawer();
      });
    }

    // 設為 0 分
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        if (this.activeFocusZone) {
          this.setZoneLevel(this.activeFocusZone, 0);
        }
      });
    }

    // 關閉按鈕與遮罩
    if (btnClose) {
      btnClose.addEventListener("click", () => this.closeScaleDrawer());
    }
    if (backdrop) {
      backdrop.addEventListener("click", () => this.closeScaleDrawer());
    }
  }

  updateDeepDiveSelections(zoneId) {
    const detail = this.zoneDetails[zoneId] || { days: "8to30", medical: "no" };
    
    // 更新天數按鈕
    const daysBtns = this.container.querySelectorAll(".nmq-btn-days");
    daysBtns.forEach(b => {
      const val = b.getAttribute("data-days");
      if (val === detail.days) {
        b.className = "nmq-btn-days py-2 px-1 rounded-lg border border-sky-500 bg-sky-600 text-white text-[11px] font-bold text-center touch-press shadow-xs";
      } else {
        b.className = "nmq-btn-days py-2 px-1 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700 font-medium hover:border-sky-300 transition-all text-center touch-press shadow-xs";
      }
    });

    // 更新就醫按鈕
    const medBtns = this.container.querySelectorAll(".nmq-btn-med");
    medBtns.forEach(b => {
      const val = b.getAttribute("data-medical");
      if (val === detail.medical) {
        b.className = "nmq-btn-med py-2 px-2 rounded-lg border border-sky-500 bg-sky-600 text-white text-[11px] font-bold text-center touch-press shadow-xs";
      } else {
        b.className = "nmq-btn-med py-2 px-2 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700 font-medium hover:border-sky-300 transition-all text-center touch-press shadow-xs";
      }
    });
  }

  openScaleDrawer(id) {
    this.activeFocusZone = id;
    const drawer = this.container.querySelector("#zone-scale-drawer");
    const backdrop = this.container.querySelector("#bodymap-sheet-backdrop");
    const zoneTitle = this.container.querySelector("#active-zone-title");
    const deepDiveBox = this.container.querySelector("#nmq-deep-dive-box");
    const zone = NMQ_ZONES.find((z) => z.id === id);

    if (drawer && zoneTitle && zone) {
      const curLevel = this.selectedZones[id] || 0;
      const curLabel = curLevel > 0 ? ` (目前: ${curLevel}分)` : " (目前無不適)";
      zoneTitle.innerHTML = `設定【${zone.name}】酸痛程度 <span class="text-xs font-normal text-slate-500">${curLabel}</span>`;

      // 標記目前已選擇的按鈕
      const scaleBtns = this.container.querySelectorAll(".scale-btn");
      scaleBtns.forEach(btn => {
        const lvl = parseInt(btn.getAttribute("data-level"), 10);
        const lConf = NMQ_SEVERITY_LEVELS.find(l => l.level === lvl);
        if (lvl === curLevel) {
          btn.style.borderColor = lConf.color;
          btn.style.backgroundColor = `${lConf.color}25`;
        } else {
          btn.style.borderColor = "";
          btn.style.backgroundColor = "";
        }
      });

      // 判斷是否顯示追問區
      if (curLevel >= 3) {
        if (deepDiveBox) deepDiveBox.classList.remove("hidden");
        this.updateDeepDiveSelections(id);
      } else {
        if (deepDiveBox) deepDiveBox.classList.add("hidden");
      }

      // 喚出底部滑出抽屜與遮罩
      if (backdrop) {
        backdrop.classList.remove("hidden");
        setTimeout(() => backdrop.classList.remove("opacity-0"), 10);
      }
      drawer.classList.remove("translate-y-full", "opacity-0", "pointer-events-none");
      drawer.classList.add("sheet-open");
    }
  }

  closeScaleDrawer() {
    const drawer = this.container.querySelector("#zone-scale-drawer");
    const backdrop = this.container.querySelector("#bodymap-sheet-backdrop");
    if (drawer) {
      drawer.classList.remove("sheet-open");
      drawer.classList.add("translate-y-full", "opacity-0", "pointer-events-none");
    }
    if (backdrop) {
      backdrop.classList.add("opacity-0");
      setTimeout(() => backdrop.classList.add("hidden"), 200);
    }
  }

  setZoneLevel(id, level) {
    if (level <= 0) {
      delete this.selectedZones[id];
      delete this.zoneDetails[id];
    } else {
      this.selectedZones[id] = level;
      if (level < 3) {
        delete this.zoneDetails[id];
      }
    }
    this.updateVisuals();
    this.onChange(this.selectedZones, this.zoneDetails);
    setTimeout(() => this.closeScaleDrawer(), 120);
  }

  setData(zonesData, zoneDetailsData) {
    this.selectedZones = { ...zonesData };
    this.zoneDetails = zoneDetailsData ? { ...zoneDetailsData } : {};
    this.updateVisuals();
  }

  updateVisuals() {
    NMQ_ZONES.forEach((z) => {
      const g = this.container.querySelector(`#target-${z.id}`);
      const pill = this.container.querySelector(`.zone-pill-btn[data-id="${z.id}"]`);
      const level = this.selectedZones[z.id] || 0;
      const conf = NMQ_SEVERITY_LEVELS.find(l => l.level === level) || NMQ_SEVERITY_LEVELS[0];

      // 更新 SVG 人體靶點視覺
      if (g) {
        const circle = g.querySelector(".zone-circle");
        const text = g.querySelector(".zone-text");

        if (level > 0) {
          circle.setAttribute("fill", conf.color);
          circle.setAttribute("fill-opacity", "0.9");
          circle.setAttribute("stroke", "#ffffff");
          circle.setAttribute("stroke-width", "2");
          text.setAttribute("fill", "#ffffff");
        } else {
          circle.setAttribute("fill", "#f8fafc");
          circle.setAttribute("fill-opacity", "0.95");
          circle.setAttribute("stroke", "#94a3b8");
          circle.setAttribute("stroke-width", "1.5");
          text.setAttribute("fill", "#475569");
        }
      }

      // 更新橫向快捷膠囊按鈕狀態
      if (pill) {
        const dot = pill.querySelector(".pill-dot");
        const scoreSpan = pill.querySelector(".pill-score");
        if (level > 0) {
          pill.style.borderColor = conf.color;
          pill.style.backgroundColor = `${conf.color}22`;
          if (dot) dot.style.backgroundColor = conf.color;
          if (scoreSpan) {
            scoreSpan.innerText = `${level}分`;
            scoreSpan.style.color = conf.color;
            scoreSpan.classList.remove("hidden");
          }
        } else {
          pill.style.borderColor = "";
          pill.style.backgroundColor = "";
          if (dot) dot.style.backgroundColor = "#64748b";
          if (scoreSpan) scoreSpan.classList.add("hidden");
        }
      }
    });
  }

  // 看板端：渲染全場熱力圖 (莫蘭迪色系漸變)
  setAggregateHeatmap(percentages) {
    NMQ_ZONES.forEach((z) => {
      const g = this.container.querySelector(`#target-${z.id}`);
      if (!g) return;
      const circle = g.querySelector(".zone-circle");
      const text = g.querySelector(".zone-text");
      const pct = percentages[z.id] || 0;

      let fill = "#2d3748";
      let opacity = "0.5";
      let stroke = "#546274";
      let textFill = "#cbd5e1";

      if (pct >= 50) {
        fill = "#a63a50"; // 莫蘭迪煙燻莓紅
        opacity = "0.95";
        stroke = "#fca5a5";
        textFill = "#ffffff";
      } else if (pct >= 30) {
        fill = "#bd5d38"; // 莫蘭迪陶土焦糖
        opacity = "0.9";
        stroke = "#fed7aa";
        textFill = "#ffffff";
      } else if (pct >= 15) {
        fill = "#c69242"; // 莫蘭迪秋香芥黃
        opacity = "0.85";
        stroke = "#fef08a";
        textFill = "#ffffff";
      } else if (pct > 0) {
        fill = "#5b8eab"; // 莫蘭迪霧霾藍
        opacity = "0.75";
        stroke = "#bae6fd";
        textFill = "#ffffff";
      }

      circle.setAttribute("fill", fill);
      circle.setAttribute("fill-opacity", opacity);
      circle.setAttribute("stroke", stroke);
      text.setAttribute("fill", textFill);
    });
  }
}

if (typeof window !== "undefined") {
  window.NMQ_SEVERITY_LEVELS = NMQ_SEVERITY_LEVELS;
  window.NMQ_ZONES = NMQ_ZONES;
  window.BodyMapComponent = BodyMapComponent;
}
