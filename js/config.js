/**
 * 系統核心與即時資料庫設定 (config.js)
 * 支援 Firebase Firestore 即時監聽 + 本地廣播備援模式 (Offline/Demo Mode)
 */

const APP_CONFIG = {
  appName: "人因工程・身體伺服器評估系統",
  version: "1.0.0",
  defaultSessionId: "demo_session",

  // Firebase 設定 (部署上線時請替換為您的 Firebase 專案設定)
  firebaseConfig: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // 取得目前有效的 session 參數 (支援 URL 參數優先、LocalStorage 記憶與自動日期)
  getSessionId: function() {
    const params = new URLSearchParams(window.location.search);
    const urlSession = params.get("session");
    
    // 1. 若網址中帶有明確的 ?session=xxx，以此為準並儲存至本機快取
    if (urlSession && urlSession.trim() !== "") {
      const cleanSession = urlSession.trim();
      try {
        localStorage.setItem("ergo_active_session", cleanSession);
      } catch (e) {}
      return cleanSession;
    }
    
    // 2. 若網址未帶參數，優先讀取上次管理員或學員活躍的場次
    try {
      const savedSession = localStorage.getItem("ergo_active_session");
      if (savedSession && savedSession.trim() !== "" && savedSession !== "demo_session") {
        return savedSession.trim();
      }
    } catch (e) {}
    
    // 3. 若完全無紀錄，自動產生當日日期預設場次 (例如: 20260915_人因研習)
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const defaultDateSession = `${y}${m}${d}_人因研習`;
    
    try {
      localStorage.setItem("ergo_active_session", defaultDateSession);
    } catch (e) {}
    return defaultDateSession;
  },

  // 檢查 Firebase 是否已設定
  isFirebaseConfigured: function() {
    return (
      this.firebaseConfig.apiKey &&
      this.firebaseConfig.apiKey !== "" &&
      this.firebaseConfig.projectId &&
      this.firebaseConfig.projectId !== ""
    );
  }
};

// 即時同步資料適配器 (Data Bridge)
class DataBridge {
  constructor(sessionId) {
    this.sessionId = sessionId || APP_CONFIG.getSessionId();
    this.isFirebase = APP_CONFIG.isFirebaseConfigured();
    this.storageKey = `ergo_data_${this.sessionId}`;
    this.channel = new BroadcastChannel(`ergo_channel_${this.sessionId}`);
  }

  // 提交問卷數據
  async submitAssessment(data) {
    const payload = {
      ...data,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      id: "sub_" + Math.random().toString(36).substring(2, 9)
    };

    // 1. 本地 Storage 與廣播
    const currentList = this.getLocalSubmissions();
    currentList.push(payload);
    localStorage.setItem(this.storageKey, JSON.stringify(currentList));
    this.channel.postMessage({ type: "NEW_SUBMISSION", payload, all: currentList });

    // 2. 若啟用 Firebase，同步至 Firestore
    if (this.isFirebase && window.db) {
      try {
        await window.db.collection("sessions").doc(this.sessionId)
          .collection("submissions").add(payload);
      } catch (err) {
        console.warn("Firebase 寫入失敗，使用本地備援模式:", err);
      }
    }

    return payload;
  }

  // 取得目前場次所有本地資料
  getLocalSubmissions() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // 監聽即時數據變更 (大螢幕看板使用)
  onDataChange(callback) {
    // 初始載入本地已有數據
    callback(this.getLocalSubmissions());

    // 本地跨分頁即時廣播監聽
    this.channel.onmessage = (event) => {
      if (event.data && event.data.all) {
        callback(event.data.all);
      }
    };

    // 監聽 window storage 事件 (相容性)
    window.addEventListener("storage", (e) => {
      if (e.key === this.storageKey) {
        callback(this.getLocalSubmissions());
      }
    });

    // 若啟用 Firebase，註冊 Firestore onSnapshot 即時監聽
    if (this.isFirebase && window.db) {
      try {
        window.db.collection("sessions").doc(this.sessionId)
          .collection("submissions")
          .onSnapshot((snapshot) => {
            const list = [];
            snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            callback(list);
          });
      } catch (err) {
        console.warn("Firestore 監聽失敗，維持廣播模式:", err);
      }
    }
  }

  // 清空當前場次資料
  clearCurrentSession() {
    localStorage.removeItem(this.storageKey);
    this.channel.postMessage({ type: "DATA_CLEARED", all: [] });
  }

  // 生成模擬數據 (供演講前測試展示)
  generateDemoData(count = 35) {
    const roles = ["office", "student", "standing", "technician"];
    const dummyList = [];
    
    for (let i = 0; i < count; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)];
      // 隨機產生 45 ~ 95 分之間的常態分佈
      const score = Math.floor(Math.random() * 45) + 50;
      
      dummyList.push({
        id: "demo_" + i,
        sessionId: this.sessionId,
        role: role,
        totalScore: score,
        tier: score >= 85 ? "tier_green" : (score >= 70 ? "tier_yellow" : (score >= 50 ? "tier_orange" : "tier_red")),
        painPoints: {
          neck: Math.random() > 0.3 ? 10 : 0,
          back: Math.random() > 0.4 ? 10 : 0,
          wrist: Math.random() > 0.5 ? 10 : 0,
          eye: Math.random() > 0.35 ? 10 : 0
        },
        traps: {
          trap_screen: Math.random() > 0.3,
          trap_chair: Math.random() > 0.4,
          trap_glare: Math.random() > 0.6,
          trap_sedentary: Math.random() > 0.3
        },
        timestamp: Date.now() - (count - i) * 2000
      });
    }

    localStorage.setItem(this.storageKey, JSON.stringify(dummyList));
    this.channel.postMessage({ type: "DEMO_DATA_LOADED", all: dummyList });
    return dummyList;
  }
}

if (typeof window !== "undefined") {
  window.APP_CONFIG = APP_CONFIG;
  window.DataBridge = DataBridge;
}
