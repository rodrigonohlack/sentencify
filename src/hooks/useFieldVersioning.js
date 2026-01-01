// 🎣 CUSTOM HOOK: useFieldVersioning - Versionamento de campos
// Extraído do App.jsx para facilitar testes unitários
import React from 'react';

const VERSION_DB = 'sentencify-versions';
const VERSION_STORE = 'versions';

const openVersionDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(VERSION_DB, 1);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(VERSION_STORE)) {
      const store = db.createObjectStore(VERSION_STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('topicTitle', 'topicTitle', { unique: false });
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const useFieldVersioning = () => {
  const stripHtml = (html) => (html || '').replace(/<[^>]*>/g, '').substring(0, 100);

  const saveVersion = React.useCallback(async (topicTitle, content) => {
    if (!topicTitle || !content) return;
    try {
      const db = await openVersionDB();
      const tx = db.transaction(VERSION_STORE, 'readwrite');
      const store = tx.objectStore(VERSION_STORE);
      const index = store.index('topicTitle');
      const existing = await new Promise(r => {
        const req = index.getAll(topicTitle);
        req.onsuccess = () => r(req.result || []);
      });
      if (existing.length > 0 && existing[existing.length - 1].content === content) {
        db.close(); return;
      }
      store.add({ topicTitle, content, timestamp: Date.now(), preview: stripHtml(content) });
      if (existing.length >= 10) {
        existing.slice(0, existing.length - 9).forEach(v => store.delete(v.id));
      }
      db.close();
    } catch (e) { console.warn('Erro ao salvar versão:', e); }
  }, []);

  const getVersions = React.useCallback(async (topicTitle) => {
    if (!topicTitle) return [];
    try {
      const db = await openVersionDB();
      const store = db.transaction(VERSION_STORE).objectStore(VERSION_STORE);
      const versions = await new Promise(r => {
        const req = store.index('topicTitle').getAll(topicTitle);
        req.onsuccess = () => r(req.result || []);
      });
      db.close();
      return versions.sort((a, b) => b.timestamp - a.timestamp);
    } catch { return []; }
  }, []);

  const restoreVersion = React.useCallback(async (id, currentContent, topicTitle) => {
    await saveVersion(topicTitle, currentContent);
    try {
      const db = await openVersionDB();
      const version = await new Promise(r => {
        const req = db.transaction(VERSION_STORE).objectStore(VERSION_STORE).get(id);
        req.onsuccess = () => r(req.result);
      });
      db.close();
      return version?.content;
    } catch { return null; }
  }, [saveVersion]);

  // v1.33.22: useMemo para evitar novo objeto a cada render
  return React.useMemo(
    () => ({ saveVersion, getVersions, restoreVersion }),
    [saveVersion, getVersions, restoreVersion]
  );
};

export { openVersionDB, VERSION_DB, VERSION_STORE };
export default useFieldVersioning;
