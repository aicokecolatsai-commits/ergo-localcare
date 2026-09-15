# 人因工程「身體伺服器——即時人因算力檢測系統」

一套專為**演講、工作坊、企業培訓與校園講座**打造的即時人因工程互動 Web 應用。結合**大人學商業精力管理**與**密涅瓦 76 HCs 底層思維模型**。

---

## 🚀 核心特色

1. **學員端 (`index.html`)**：
   - 支援 **4 大族群切換**（💼 辦公室久坐戰士、🎓 課堂刷題學霸、🏪 走動久站達人、🏭 重複操作/技術職）。
   - **8 題 NMQ-Lite 動態題庫**（60 秒快速完成），滿分 100 分。
   - 即時產出**個人伺服器折舊診斷卡**與**大人學物理外掛處方**。
2. **講師大螢幕投影看板 (`dashboard.html`)**：
   - 16:9 高對比科技深色風格。
   - 左側常駐專屬動態 QR Code。
   - 即時跳動連線人數、全場平均算力健康度、**全場三大痛點排行榜 (TOP 3)** 與**工作站地雷分佈**。
3. **場次管理後台 (`admin.html`)**：
   - 隨時新增/切換演講場次（如：`20260915_XX高中`、`20260920_台積電`）。
   - 自動生成專屬 QR Code（可直接右鍵複製至投影片）。
   - 一鍵匯出 CSV 數據或生成 30 筆模擬展示數據。

---

## 📂 檔案架構

```
ergo-interactive-app/
├── index.html        # 學員端 60 秒測驗與個人診斷卡
├── dashboard.html    # 講師大螢幕即時投影看板
├── admin.html        # 講師場次管理與 QR Code 產出後台
├── css/
│   └── custom.css    # 科技感深色主題與微動畫
├── js/
│   ├── config.js     # 系統設定與即時資料庫橋接 (支援 Firebase 與本地廣播)
│   ├── questions.js  # 4 大族群題庫、計分權重與大人學處方
│   ├── app.js        # 學員端答題與視覺化邏輯
│   ├── dashboard.js  # 講師端即時數據監聽與 Chart.js 動畫
│   └── admin.js      # 場次管理與 CSV 匯出邏輯
└── README.md         # 部署與自訂網域教學
```

---

## 🌐 自有網域部署與綁定教學 (3 分鐘快速上線)

本專案為**純前端靜態架構**（無須編譯、零伺服器維護成本），您可以透過以下方式一鍵綁定自有網域：

### 推薦方式 1：使用 Vercel / Netlify / Cloudflare Pages（最簡單、支援免費 SSL）
1. 將 `ergo-interactive-app` 資料夾上傳至您的 GitHub 儲存庫。
2. 登入 [Vercel](https://vercel.com/) 或 [Netlify](https://www.netlify.com/)，點擊「Add New Project」並匯入該儲存庫。
3. 進入專案的 **Domain Settings**，新增您的自訂網域（例如：`ergo.yourdomain.com`）。
4. 在您的網域託管商（如 Cloudflare、GoDaddy、Namecheap 等）新增一筆 `CNAME` 記錄指向 Vercel/Netlify。
5. 完成！所有人即可透過 `https://ergo.yourdomain.com` 進入。

---

## 🔥 跨裝置即時同步：連接 Firebase (可選)

本系統內建**本地跨分頁廣播引擎**，在同一台電腦開多個分頁即可測試。若要在演講現場讓**全場學員手機與您的筆電大螢幕即時同步**，建議配置免費的 Firebase Firestore：

1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立一個免費專案。
2. 建立 **Firestore Database**（規則可暫設為測試模式讀寫）。
3. 在專案設定中取得 Web App 的 `firebaseConfig`。
4. 打開 `js/config.js`，將金鑰填入 `APP_CONFIG.firebaseConfig` 即可！

---

## 🎤 演講現場快捷鍵小技巧

在 `dashboard.html`（大螢幕看板）頁面中：
- 按鍵盤 **`D`**：立即注入 25 筆模擬學員作答數據（適合演講前暖場展示）。
- 按鍵盤 **`C`**：一鍵清空當前場次數據。
- 按鍵盤 **`F11`** 或右上角「全螢幕投影」按鈕：進入全螢幕沉浸模式。
