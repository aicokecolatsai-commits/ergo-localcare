const assert = require('node:assert/strict');
const { create } = require('../js/pending-submissions');
class Storage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
const storage = new Storage(); let number = 0;
const pending = create(storage, n => new Uint8Array(n).fill(++number));
assert.throws(() => pending.enqueue('x'.repeat(101), {}));
const a = pending.enqueue('一場', { role: 'office' });
const b = pending.enqueue('另一場', { role: 'student' });
assert.equal(pending.list().length, 2);
const first = pending.assignOwner(a, 'student1');
assert.equal(first.owner, 'student1');
assert.equal(pending.assignOwner(a, 'student1').token, first.token);
assert.throws(() => pending.assignOwner(a, 'student2'));
pending.delivered(a, 'student1');
assert.equal(pending.list().length, 1);
assert.equal(pending.list()[0].session, '另一場');
storage.setItem('ergo_pending_v1:corrupt', '{');
assert.ok(pending.list().some(entry => entry.invalid));
assert.throws(() => pending.assignOwner('ergo_pending_v1:corrupt', 'x'));
assert.equal(storage.getItem(b) !== null, true);
const broken = create({ getItem(){ throw Error('儲存失敗'); } }, n => new Uint8Array(n));
assert.throws(() => broken.enqueue('test', {}), /儲存失敗/);
console.log('通過：逐筆保存、不同場次、身分變更、毀損與儲存失敗');
