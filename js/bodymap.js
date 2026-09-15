/**
 * 人體工學 NMQ 向量人體圖元件 (bodymap.js) - 升級版
 * 導入生活情境錨定 (Functional & Temporal Anchoring)：
 * 0: 無不適 (活動自如)
 * 1: 偶爾微緊 (動一動即消失)
 * 2: 工作時酸 (下班休息後就好)
 * 3: 下班回到家還在酸痛 (慢性累積，隔天未恢復)
 * 4: 痛到分心影響工作 (產能受限)
 * 5: 發麻/劇痛 (刺痛、發麻、影響睡眠)
 */

const NMQ_SEVERITY_LEVELS = [
  { level: 0, label: "無不適", desc: "活動自如，完全無酸痛感", color: "#334155", textColor: "#94a3b8" },
  { level: 1, label: "偶爾微緊", desc: "稍微轉動、伸展一下就完全沒事", color: "#38bdf8", textColor: "#ffffff" },
  { level: 2, label: "工作時酸，下班就好", desc: "作業時感到酸脹，但下班休息後就完全消失", color: "#facc15", textColor: "#0f172a" },
  { level: 3, label: "下班回到家還在酸痛", desc: "下班回家洗完澡依然緊繃酸痛，隔天仍未完全消退", color: "#f59e0b", textColor: "#0f172a" },
  { level: 4, label: "痛到分心、動作變慢", desc: "疼痛明顯干擾專注力與工作產能，需頻繁揉捏忍痛", color: "#f97316", textColor: "#ffffff" },
  { level: 5, label: "發麻、劇痛、影響睡眠", desc: "深層刺痛、神經發麻無力或半夜痛醒，需吃藥就醫", color: "#dc2626", textColor: "#ffffff" }
];

const NMQ_ZONES = [
  { id: "neck", name: "頸部", isBilateral: false, cx: 100, cy: 55, r: 12 },
  { id: "shoulder_l", name: "左肩", isBilateral: true, cx: 65, cy: 75, r: 14 },
  { id: "shoulder_r", name: "右肩", isBilateral: true, cx: 135, cy: 75, r: 14 },
  { id: "upperback", name: "上背部", isBilateral: false, cx: 100, cy: 95, r: 16 },
  { id: "elbow_l", name: "左手肘", isBilateral: true, cx: 48, cy: 125, r: 12 },
  { id: "elbow_r", name: "右手肘", isBilateral: true, cx: 152, cy: 125, r: 12 },
  { id: "lowerback", name: "下背/腰部", isBilateral: false, cx: 100, cy: 135, r: 16 },
  { id: "wrist_l", name: "左手腕", isBilateral: true, cx: 35, cy: 165, r: 11 },
  { id: "wrist_r", name: "右手腕", isBilateral: true, cx: 165, cy: 165, r: 11 },
  { id: "hip_l", name: "左臀/髖部", isBilateral: true, cx: 80, cy: 170, r: 15 },
  { id: "hip_r", name: "右臀/髖部", isBilateral: true, cx: 120, cy: 170, r: 15 },
  { id: "knee_l", name: "左膝", isBilateral: true, cx: 82, cy: 235, r: 14 },
  { id: "knee_r", name: "右膝", isBilateral: true, cx: 118, cy: 235, r: 14 },
  { id: "ankle_l", name: "左踝/足部", isBilateral: true, cx: 82, cy: 300, r: 12 },
  { id: "ankle_r", name: "右踝/足部", isBilateral: true, cx: 118, cy: 300, r: 12 }
];

class BodyMapComponent {
  constructor(options) {
    this.container = document.getElementById(options.containerId);
    this.interactive = !!options.interactive;
    this.onChange = options.onChange || (() => {});
    this.selectedZones = {}; // { zoneId: 0~5 }
    this.activeFocusZone = null; // 當前正在設定刻度的部位 ID
    if (this.container) {
      this.init();
    }
  }

  init() {
    this.container.innerHTML = `
      <div class="w-full max-w-[280px] mx-auto flex flex-col items-center">
        <!-- SVG 人體剪影 -->
        <div class="relative w-full max-w-[220px] select-none">
          <svg viewBox="0 0 200 330" class="w-full h-auto drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <g fill="#1e293b" stroke="#334155" stroke-width="1.5" stroke-linejoin="round">
              <ellipse cx="100" cy="30" rx="18" ry="22" />
              <path d="M 88 50 C 70 65, 55 70, 50 85 C 45 100, 42 120, 35 160 C 32 175, 42 180, 48 165 L 58 135 L 62 165 C 64 185, 75 190, 100 190 C 125 190, 136 185, 138 165 L 142 135 L 152 165 C 158 180, 168 175, 165 160 C 158 120, 155 100, 150 85 C 145 70, 130 65, 112 50 Z" />
              <path d="M 68 185 C 72 210, 75 250, 75 295 C 75 305, 68 312, 75 315 C 85 315, 92 308, 92 295 L 94 220 L 98 190 L 102 190 L 106 220 L 108 295 C 108 308, 115 315, 125 315 C 132 312, 125 305, 125 295 C 125 250, 128 210, 132 185 Z" />
            </g>
            <line x1="100" y1="52" x2="100" y2="185" stroke="#475569" stroke-width="1" stroke-dasharray="3,3" />

            <g id="heatmap-targets">
              ${NMQ_ZONES.map((z) => `
                <g class="zone-target cursor-pointer" data-id="${z.id}" id="target-${z.id}">
                  <circle cx="${z.cx}" cy="${z.cy}" r="${z.r + 6}" fill="transparent" />
                  <circle cx="${z.cx}" cy="${z.cy}" r="${z.r}" class="zone-circle transition-all duration-150" fill="#334155" fill-opacity="0.4" stroke="#64748b" stroke-width="1.5" />
                  <text x="${z.cx}" y="${z.cy + 3}" text-anchor="middle" class="zone-text text-[8px] font-bold fill-slate-300 pointer-events-none select-none">
                    ${z.name.replace("左", "L").replace("右", "R")}
                  </text>
                </g>
              `).join("")}
            </g>
          </svg>

          <div class="flex items-center justify-between text-[10px] font-semibold text-slate-400 px-2 mt-1">
            <span>左側 (Left)</span>
            <span class="text-[9px] text-slate-500">解剖視角</span>
            <span>右側 (Right)</span>
          </div>
        </div>

        <!-- 互動式情境選擇膠囊排 (點選部位時動態展開) -->
        ${this.interactive ? `
          <div id="zone-scale-drawer" class="w-full mt-3 p-3 rounded-xl bg-slate-900 border border-slate-700/80 shadow-lg transition-all hidden">
            <div class="flex items-center justify-between mb-2">
              <span id="active-zone-title" class="text-xs font-bold text-sky-300">請選擇酸痛狀況</span>
              <button id="btn-clear-zone" type="button" class="text-[11px] text-slate-400 hover:text-rose-400 transition-colors">
                ✕ 設為無不適 (0分)
              </button>
            </div>
            
            <!-- 5段客觀情境按鈕 -->
            <div class="space-y-1.5" id="scale-options-container">
              ${NMQ_SEVERITY_LEVELS.filter(l => l.level > 0).map(l => `
                <button type="button" data-level="${l.level}" class="scale-btn w-full text-left px-2.5 py-1.5 rounded-lg border border-slate-700/80 hover:border-slate-500 bg-slate-800/80 transition-all flex items-center justify-between group">
                  <span class="text-xs font-bold text-slate-200 group-hover:text-white flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${l.color}"></span>
                    <span>${l.level}分 · ${l.label}</span>
                  </span>
                  <span class="text-[10px] text-slate-400 group-hover:text-slate-300 text-right truncate max-w-[140px]">
                    ${l.desc}
                  </span>
                </button>
              `).join("")}
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
    const drawer = this.container.querySelector("#zone-scale-drawer");
    const zoneTitle = this.container.querySelector("#active-zone-title");
    const btnClear = this.container.querySelector("#btn-clear-zone");
    const scaleBtns = this.container.querySelectorAll(".scale-btn");

    targets.forEach((target) => {
      target.addEventListener("click", () => {
        const id = target.getAttribute("data-id");
        this.openScaleDrawer(id);
      });
    });

    scaleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const level = parseInt(btn.getAttribute("data-level"), 10);
        if (this.activeFocusZone) {
          this.setZoneLevel(this.activeFocusZone, level);
        }
      });
    });

    if (btnClear) {
      btnClear.addEventListener("click", () => {
        if (this.activeFocusZone) {
          this.setZoneLevel(this.activeFocusZone, 0);
          if (drawer) drawer.classList.add("hidden");
        }
      });
    }
  }

  openScaleDrawer(id) {
    this.activeFocusZone = id;
    const drawer = this.container.querySelector("#zone-scale-drawer");
    const zoneTitle = this.container.querySelector("#active-zone-title");
    const zone = NMQ_ZONES.find((z) => z.id === id);

    if (drawer && zoneTitle && zone) {
      drawer.classList.remove("hidden");
      const curLevel = this.selectedZones[id] || 0;
      const curLabel = curLevel > 0 ? ` (目前: ${curLevel}分)` : " (未標記)";
      zoneTitle.innerHTML = `📍 設定【${zone.name}】${curLabel}：`;

      // 標註目前選取的按鈕
      const scaleBtns = this.container.querySelectorAll(".scale-btn");
      scaleBtns.forEach(btn => {
        const lvl = parseInt(btn.getAttribute("data-level"), 10);
        if (lvl === curLevel) {
          btn.classList.add("border-sky-400", "bg-sky-950/60");
        } else {
          btn.classList.remove("border-sky-400", "bg-sky-950/60");
        }
      });

      // 將畫面微滾動至抽屜可見
      drawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  setZoneLevel(id, level) {
    if (level <= 0) {
      delete this.selectedZones[id];
    } else {
      this.selectedZones[id] = level;
    }
    this.updateVisuals();
    this.onChange(this.selectedZones);

    // 關閉或更新抽屜
    const drawer = this.container.querySelector("#zone-scale-drawer");
    if (drawer) {
      drawer.classList.add("hidden");
    }
  }

  setData(zonesData) {
    this.selectedZones = { ...zonesData };
    this.updateVisuals();
  }

  updateVisuals() {
    NMQ_ZONES.forEach((z) => {
      const g = this.container.querySelector(`#target-${z.id}`);
      if (!g) return;
      const circle = g.querySelector(".zone-circle");
      const text = g.querySelector(".zone-text");
      const level = this.selectedZones[z.id] || 0;

      const conf = NMQ_SEVERITY_LEVELS.find(l => l.level === level) || NMQ_SEVERITY_LEVELS[0];

      if (level > 0) {
        circle.setAttribute("fill", conf.color);
        circle.setAttribute("fill-opacity", level >= 3 ? "0.9" : "0.75");
        circle.setAttribute("stroke", level >= 4 ? "#f87171" : "#ffffff");
        circle.setAttribute("stroke-width", level >= 3 ? "2.5" : "1.8");
        text.setAttribute("fill", conf.textColor);
      } else {
        circle.setAttribute("fill", "#334155");
        circle.setAttribute("fill-opacity", "0.4");
        circle.setAttribute("stroke", "#64748b");
        circle.setAttribute("stroke-width", "1.5");
        text.setAttribute("fill", "#94a3b8");
      }
    });
  }

  // 看板端：渲染全場熱力圖 (根據平均嚴重度 0~5 與盛行率)
  setAggregateHeatmap(percentages) {
    NMQ_ZONES.forEach((z) => {
      const g = this.container.querySelector(`#target-${z.id}`);
      if (!g) return;
      const circle = g.querySelector(".zone-circle");
      const text = g.querySelector(".zone-text");
      const pct = percentages[z.id] || 0;

      let fill = "#334155";
      let opacity = "0.4";
      let stroke = "#64748b";
      let textFill = "#94a3b8";

      if (pct >= 50) {
        fill = "#dc2626";
        opacity = "0.95";
        stroke = "#fca5a5";
        textFill = "#ffffff";
      } else if (pct >= 30) {
        fill = "#f97316";
        opacity = "0.85";
        stroke = "#fdba74";
        textFill = "#ffffff";
      } else if (pct >= 15) {
        fill = "#f59e0b";
        opacity = "0.75";
        stroke = "#fde047";
        textFill = "#0f172a";
      } else if (pct > 0) {
        fill = "#0284c7";
        opacity = "0.6";
        stroke = "#38bdf8";
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
