/**
 * 人體工學 NMQ 向量人體圖元件 (bodymap.js)
 * 支援 9 大解剖分區與左右側獨立點擊、強度切換，以及大螢幕全場熱力圖疊加
 */

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
  /**
   * @param {Object} options
   * @param {string} options.containerId - 容器 ID
   * @param {boolean} options.interactive - 是否允許使用者點擊標記 (學員端為 true，看板為 false)
   * @param {Function} options.onChange - 選取狀態改變回呼
   */
  constructor(options) {
    this.container = document.getElementById(options.containerId);
    this.interactive = !!options.interactive;
    this.onChange = options.onChange || (() => {});
    // 記錄選取狀態: { zoneId: intensity(1=輕度, 2=中度, 3=重度) }
    this.selectedZones = {};
    if (this.container) {
      this.init();
    }
  }

  init() {
    this.container.innerHTML = this.getSvgMarkup();
    if (this.interactive) {
      this.bindEvents();
    }
  }

  getSvgMarkup() {
    return `
      <div class="relative w-full max-w-[240px] mx-auto select-none">
        <svg viewBox="0 0 200 330" class="w-full h-auto drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
          <!-- 人體工學底模剪影 (簡潔、客觀) -->
          <g fill="#1e293b" stroke="#334155" stroke-width="1.5" stroke-linejoin="round">
            <!-- 頭部 -->
            <ellipse cx="100" cy="30" rx="18" ry="22" />
            <!-- 頸部與軀幹 -->
            <path d="M 88 50 C 70 65, 55 70, 50 85 C 45 100, 42 120, 35 160 C 32 175, 42 180, 48 165 L 58 135 L 62 165 C 64 185, 75 190, 100 190 C 125 190, 136 185, 138 165 L 142 135 L 152 165 C 158 180, 168 175, 165 160 C 158 120, 155 100, 150 85 C 145 70, 130 65, 112 50 Z" />
            <!-- 下肢 (骨盆至足底) -->
            <path d="M 68 185 C 72 210, 75 250, 75 295 C 75 305, 68 312, 75 315 C 85 315, 92 308, 92 295 L 94 220 L 98 190 L 102 190 L 106 220 L 108 295 C 108 308, 115 315, 125 315 C 132 312, 125 305, 125 295 C 125 250, 128 210, 132 185 Z" />
          </g>

          <!-- 脊椎中軸輔助參考線 -->
          <line x1="100" y1="52" x2="100" y2="185" stroke="#475569" stroke-width="1" stroke-dasharray="3,3" />

          <!-- 解剖熱區圓點群組 -->
          <g id="heatmap-targets">
            ${NMQ_ZONES.map((z) => `
              <g class="zone-target cursor-pointer" data-id="${z.id}" id="target-${z.id}">
                <!-- 外層觸控熱區擴展 (符合費茨定律) -->
                <circle cx="${z.cx}" cy="${z.cy}" r="${z.r + 5}" fill="transparent" />
                <!-- 視覺指示圓環 -->
                <circle cx="${z.cx}" cy="${z.cy}" r="${z.r}" class="zone-circle transition-all duration-200" fill="#334155" fill-opacity="0.4" stroke="#64748b" stroke-width="1.5" />
                <!-- 標籤文字 (縮小於中下方) -->
                <text x="${z.cx}" y="${z.cy + 3}" text-anchor="middle" class="zone-text text-[8px] font-bold fill-slate-300 pointer-events-none select-none">
                  ${z.name.replace("左", "L").replace("右", "R")}
                </text>
              </g>
            `).join("")}
          </g>
        </svg>

        <!-- 左右標示提示標記 -->
        <div class="flex items-center justify-between text-[11px] font-bold text-slate-400 px-3 mt-1">
          <span>左側 (Left)</span>
          <span class="text-[10px] text-slate-500 font-normal">解剖視角</span>
          <span>右側 (Right)</span>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const targets = this.container.querySelectorAll(".zone-target");
    targets.forEach((target) => {
      target.addEventListener("click", () => {
        const id = target.getAttribute("data-id");
        this.toggleZone(id);
      });
    });
  }

  toggleZone(id) {
    if (this.selectedZones[id]) {
      // 依序循環：中度(2) ➔ 重度(3) ➔ 取消(0)
      if (this.selectedZones[id] === 2) {
        this.selectedZones[id] = 3;
      } else {
        delete this.selectedZones[id];
      }
    } else {
      this.selectedZones[id] = 2; // 預設中度
    }
    this.updateVisuals();
    this.onChange(this.selectedZones);
  }

  // 設置指定數值 (供外部更新)
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
      const val = this.selectedZones[z.id];

      if (val === 2) {
        // 中度負載 (琥珀橘黃)
        circle.setAttribute("fill", "#f59e0b");
        circle.setAttribute("fill-opacity", "0.85");
        circle.setAttribute("stroke", "#fbbf24");
        circle.setAttribute("stroke-width", "2");
        text.setAttribute("fill", "#0f172a");
      } else if (val === 3) {
        // 重度負載 (警戒紅)
        circle.setAttribute("fill", "#ef4444");
        circle.setAttribute("fill-opacity", "0.95");
        circle.setAttribute("stroke", "#f87171");
        circle.setAttribute("stroke-width", "2.5");
        text.setAttribute("fill", "#ffffff");
      } else {
        // 未選取
        circle.setAttribute("fill", "#334155");
        circle.setAttribute("fill-opacity", "0.4");
        circle.setAttribute("stroke", "#64748b");
        circle.setAttribute("stroke-width", "1.5");
        text.setAttribute("fill", "#94a3b8");
      }
    });
  }

  // 看板端：渲染全場百分比熱力圖
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
        fill = "#ef4444";
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
  window.NMQ_ZONES = NMQ_ZONES;
  window.BodyMapComponent = BodyMapComponent;
}
