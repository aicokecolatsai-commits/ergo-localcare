const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, onSnapshot } = require('firebase/firestore');
const fs = require('fs');
(async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-ergo-localcare', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), 'previewAdmins/teacher'), { enabled: true }));
  const student = env.authenticatedContext('teststudent', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const admin = env.authenticatedContext('teacher', { email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore();
  const other = env.authenticatedContext('other', { email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore();
  const guest = env.unauthenticatedContext().firestore();
  const path = 'previewSessions/s_test/submissions/teststudent_0123456789abcdef';
  const sample = { owner: 'teststudent', sessionId: 'test', timestamp: 1, role: 'office', totalScore: 84, tier: 'tier_yellow', nmqData: {}, nmqDetails: {}, traps: {}, durationSeconds: 30, qualityFlag: 'Valid', isRetest: false };
  await assertSucceeds(setDoc(doc(student, path), sample));
  await assertSucceeds(getDoc(doc(admin, path)));
  await assertFails(getDoc(doc(student, path)));
  await assertFails(getDoc(doc(other, path)));
  await assertFails(getDoc(doc(guest, path)));
  await assertSucceeds(getDoc(doc(admin, 'previewAdmins/teacher')));
  await assertFails(getDoc(doc(other, 'previewAdmins/teacher')));
  await assertFails(getDocs(collection(other, 'previewAdmins')));
  await assertFails(setDoc(doc(other, 'previewAdmins/other'), { enabled: true }));
  await assertFails(updateDoc(doc(student, path), { totalScore: 100 }));
  await assertFails(deleteDoc(doc(admin, path)));
  await assertFails(setDoc(doc(student, 'previewSessions/s_test/submissions/teststudent_9876543210abcdef'), { ...sample, totalScore: 101 }));
  const remote = collection(admin, 'previewSessions/s_realtime/submissions');
  let stop, ready;
  const listening = new Promise(resolve => { ready = resolve; });
  const received = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('即時監聽逾時')), 10000);
    stop = onSnapshot(remote, snapshot => {
      if (snapshot.empty) ready();
      if (snapshot.size === 1) { clearTimeout(timeout); resolve(); }
    }, reject);
  });
  await listening;
  await assertSucceeds(setDoc(doc(student, 'previewSessions/s_realtime/submissions/teststudent_abcdefghijk123'), sample));
  await received; stop();
  console.log('通過：資料權限、資料驗證與跨使用者即時更新');
  await env.cleanup();
})().catch(error => { console.error(error); process.exitCode = 1; });
