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
  window.ErgoCloud = {
    requireAdmin,
    async submit(session, data) {
      if (!navigator.onLine) throw new Error('目前離線');
      const user = await Promise.race([
        student(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('登入等待逾時')), 15000))
      ]);
      const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2,'0')).join('');
      const ref = sessionRef(session, studentApp.firestore()).doc(user.uid + '_' + token);
      const payload = { ...data, owner: user.uid, sessionId: session, timestamp: Date.now() };
      if (!navigator.onLine) throw new Error('目前離線');
      await Promise.race([
        ref.set(payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error('等待雲端回應逾時')), 15000))
      ]);
    },
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
