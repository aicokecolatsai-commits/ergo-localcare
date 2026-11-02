/* 每筆待送資料使用獨立鍵值，避免不同分頁覆寫彼此。 */
(function (root) {
  const prefix = 'ergo_pending_v1:';
  function create(storage, randomBytes, notify) {
    const emit = () => { if (notify) notify(); };
    function keys() {
      const result = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) result.push(key);
      }
      return result;
    }
    function read(key) {
      const raw = storage.getItem(key);
      if (raw === null) return null;
      try {
        const entry = JSON.parse(raw);
        if (!entry || entry.version !== 1 || !/^[a-f0-9]{32}$/.test(entry.token) || !entry.session || !entry.data || !Number.isInteger(entry.timestamp)) return { key, invalid: true };
        return { ...entry, key };
      } catch (_) { return { key, invalid: true }; }
    }
    return {
      enqueue(session, data) {
        if (typeof session !== 'string' || !session || session.length > 100) throw new Error('場次代碼須介於 1 至 100 個字');
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('待送資料格式錯誤');
        const token = Array.from(randomBytes(16), n => n.toString(16).padStart(2, '0')).join('');
        const key = prefix + token;
        if (storage.getItem(key) !== null) throw new Error('待送識別碼衝突');
        storage.setItem(key, JSON.stringify({ version: 1, token, session, data, timestamp: Date.now(), owner: null }));
        emit();
        return key;
      },
      list() { return keys().map(read).filter(Boolean); },
      assignOwner(key, owner) {
        const entry = read(key);
        if (!entry || entry.invalid) throw new Error('待送資料無法讀取');
        if (entry.owner && entry.owner !== owner) throw new Error('此筆待送資料的匿名身分已變更，請聯絡講師');
        if (!entry.owner) {
          const { key: ignored, ...record } = entry;
          record.owner = owner;
          storage.setItem(key, JSON.stringify(record));
          emit();
        }
        return read(key);
      },
      delivered(key, owner) {
        const entry = read(key);
        if (!entry) return;
        if (entry.invalid || entry.owner !== owner) throw new Error('待送資料狀態已變更');
        storage.removeItem(key);
        emit();
      }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { create };
  if (root && root.ERGO_FIREBASE_PREVIEW) {
    try {
      root.ErgoPending = create(root.localStorage, n => root.crypto.getRandomValues(new Uint8Array(n)), () => root.dispatchEvent(new Event('ergo-pending-changed')));
    } catch (error) { console.error('無法使用本機待送儲存', error); }
  }
})(typeof window !== 'undefined' ? window : null);
