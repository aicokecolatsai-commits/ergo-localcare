/* 僅供 Firebase Hosting 預覽環境使用，正式網站不載入此模組。 */
(function () {
  if (!window.ERGO_FIREBASE_PREVIEW || !window.firebase || !firebase.apps.length) return;
  const studentApp = window.firebase && firebase.apps.length ? firebase.initializeApp(firebase.app().options, 'ergo-student') : null;
  if (studentApp && window.ERGO_EMULATOR) {
    studentApp.auth().useEmulator('http://127.0.0.1:9099');
    studentApp.firestore().useEmulator('127.0.0.1', 8085);
  }
  const studentAuthReady = new Promise((resolve, reject) => {
    if (!studentApp) return reject(new Error('Firebase 初始化失敗'));
    studentApp.auth().onAuthStateChanged(resolve, reject);
  });
  const authReady = new Promise((resolve, reject) => {
    if (!window.firebase || !firebase.apps.length) return reject(new Error('Firebase 初始化失敗'));
    firebase.auth().onAuthStateChanged(resolve, reject);
  });
  function sessionRef(session, db = firebase.firestore()) {
    if (!session || session.length > 100) throw new Error('場次代碼須介於 1 至 100 個字');
    return db.collection('previewSessions').doc('s_' + encodeURIComponent(session)).collection('submissions');
  }
  async function student() {
    const current = studentApp.auth().currentUser || await studentAuthReady;
    if (current && current.isAnonymous) return current;
    return (await studentApp.auth().signInAnonymously()).user;
  }
  function addLogout() {
    if (document.getElementById('cloud-signout')) return;
    const button = document.createElement('button');
    button.id = 'cloud-signout'; button.type = 'button'; button.textContent = '登出講師帳號';
    button.style.cssText = 'min-height:48px;padding:8px 12px;border:1px solid #0b6f73;border-radius:8px;background:#fff;color:#0b6f73';
    button.onclick = async () => { await firebase.auth().signOut(); location.reload(); };
    const header = document.querySelector('header'); if (header) header.appendChild(button);
  }
  async function isAdmin(user) {
    if (!user || user.isAnonymous || !user.emailVerified) return false;
    const role = await firebase.firestore().collection('previewAdmins').doc(user.uid).get({source:'server'});
    return role.exists;
  }
  async function requireAdmin() {
    let user = await authReady;
    try {
      if (user && await isAdmin(user)) { addLogout(); return user; }
    } catch (error) {
      console.warn('無法確認講師權限', error);
    }
    return new Promise((resolve, reject) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#faf9f5;display:flex;align-items:center;justify-content:center;padding:24px;color:#173b3d';
      overlay.innerHTML = '<div style="max-width:420px;line-height:1.7"><h1 style="font-size:24px;font-weight:700">講師登入</h1><p>請使用已授權的 Google 帳號登入，才能查看場次資料。</p><button type="button" style="margin-top:16px;min-height:48px;padding:10px 18px;background:#0b6f73;color:white;border:0;border-radius:8px">使用 Google 帳號登入</button><p role="alert"></p></div>';
      overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', '講師登入');
      const background = Array.from(document.body.children);
      background.forEach(element => { element.inert = true; });
      document.body.appendChild(overlay);
      const button = overlay.querySelector('button'); button.focus();
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
          user = result.user;
          if (!await isAdmin(user)) {
            await firebase.auth().signOut();
            throw new Error('此帳號沒有講師權限，請使用已授權帳號');
          }
          overlay.remove(); background.forEach(element => { element.inert = false; }); addLogout(); resolve(user);
        } catch (error) {
          overlay.querySelector('[role=alert]').textContent = '登入失敗：' + error.message;
          button.disabled = false;
        }
      });
    });
  }
  let pendingFlush = null;
  let pendingIssue = '';
  const timeout = (promise, message) => Promise.race([
    promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 10000))
  ]);
  async function flushPending() {
    if (pendingFlush) return pendingFlush;
    if (!navigator.locks) {
      pendingIssue = '此瀏覽器無法安全協調待送作答；請勿清除資料，並聯絡講師。';
      window.dispatchEvent(new Event('ergo-pending-changed'));
      return Promise.resolve();
    }
    const run = async () => {
      if (!window.ErgoPending) throw new Error('無法使用本機待送儲存');
      if (!navigator.onLine) return;
      pendingIssue = '';
      const entries = window.ErgoPending.list();
      if (!entries.length) return;
      const user = await timeout(student(), '登入等待逾時');
      for (const item of entries) {
        if (item.invalid) continue;
        try {
          const entry = window.ErgoPending.assignOwner(item.key, user.uid);
          const ref = sessionRef(entry.session, studentApp.firestore()).doc(entry.token);
          const payload = { ...entry.data, owner: entry.owner, sessionId: entry.session, timestamp: entry.timestamp };
          const writing = ref.set(payload).then(() => window.ErgoPending.delivered(entry.key, entry.owner));
          await timeout(writing, '等待雲端回應逾時');
        } catch (error) {
          if (error.message && error.message.includes('匿名身分已變更')) {
            pendingIssue = '此裝置的匿名身分已變更，待送資料無法自動補送，請聯絡講師。';
            window.dispatchEvent(new Event('ergo-pending-changed'));
          }
          console.warn('待送資料尚未確認送達', error);
        }
      }
    };
    pendingFlush = navigator.locks.request('ergo-pending-flush-v1', run)
      .finally(() => { pendingFlush = null; });
    return pendingFlush;
  }
  function installPendingStatus() {
    const result = document.getElementById('step-result');
    if (!result || !window.ErgoPending) return;
    const box = document.createElement('div');
    box.id = 'cloud-pending-status'; box.setAttribute('role', 'status');
    box.style.cssText = 'display:none;padding:14px;border:1px solid #c49332;border-radius:10px;background:#fff8df;color:#473800;line-height:1.6';
    const message = document.createElement('span');
    const retry = document.createElement('button');
    retry.type = 'button'; retry.textContent = '立即重試'; retry.style.cssText = 'display:block;min-height:48px;margin-top:8px;padding:8px 14px;border:1px solid #0b6f73;border-radius:8px;color:#0b6f73;background:white';
    retry.onclick = () => { retry.disabled = true; flushPending().catch(console.warn).finally(() => { retry.disabled = false; update(); }); };
    box.append(message, retry); result.prepend(box);
    let seenPending = false;
    function update() {
      try {
        const entries = window.ErgoPending.list();
        if (entries.length) {
          seenPending = true; box.style.display = '';
          message.textContent = entries.some(entry => entry.invalid)
            ? '此裝置有無法讀取的待送資料，請保留瀏覽器資料並聯絡講師。'
            : pendingIssue || `此裝置有 ${entries.length} 筆資料尚未確認送達。恢復網路或再次開啟此頁時會重試，請勿清除瀏覽器資料。`;
          retry.hidden = entries.every(entry => entry.invalid);
        } else if (seenPending) {
          box.style.display = ''; message.textContent = '此裝置的待送資料已送達。'; retry.hidden = true;
        }
      } catch (_) { box.style.display = ''; message.textContent = '無法讀取本機待送資料，請保留此頁並聯絡講師。'; retry.hidden = true; }
    }
    window.addEventListener('ergo-pending-changed', update);
    window.addEventListener('storage', update);
    window.addEventListener('online', () => flushPending().catch(console.warn));
    update();
    flushPending().catch(console.warn);
  }
  document.addEventListener('DOMContentLoaded', installPendingStatus);
  window.ErgoCloud = {
    requireAdmin,
    async submit(session, data) {
      if (!window.ErgoPending) throw new Error('無法使用本機待送儲存');
      const key = window.ErgoPending.enqueue(session, data);
      try { await flushPending(); } catch (error) { console.warn(error); }
      if (window.ErgoPending.list().some(item => item.key === key)) throw new Error('資料已保留待送');
    },
    flushPending,
    async read(session) {
      const snap = await sessionRef(session).get({source:'server'});
      return snap.docs.map(d => ({...d.data(), id:d.id}));
    },
    watch(session, onData, onError, onStatus) {
      return sessionRef(session).onSnapshot({includeMetadataChanges:true}, snapshot => {
        if (onStatus) onStatus(snapshot.metadata.fromCache ? 'cache' : 'online');
        if (snapshot.metadata.fromCache) return;
        onData(snapshot.docs.map(d => ({...d.data(),id:d.id})));
      }, onError);
    }
  };
})();
