/* Batas unduhan per perangkat tamu: localStorage + cookie + IndexedDB (kunci photobooth-rnjawa-…). */
(function (global) {
  "use strict";
  const LS_SETTINGS = "photobooth-rnjawa-settings-v1";
  const LS_DL = "photobooth-rnjawa-downloads-v1";
  const LS_DL_LEGACY = "photobooth-rnjawa-galeri-dl-v1";
  const CK_DL = "pb_rnjawa_downloads";
  const CK_DL_LEGACY = "pb_rn_gdl";
  const IDB_NAME = "photobooth-rnjawa";
  const IDB_VER = 2;
  const DEFAULT_QUOTA = 5;
  const DEFAULT_DOWNLOADS = 5;

  function settingsObj() {
    try {
      return Object.assign({}, JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}"));
    } catch (e) { return {}; }
  }
  function clampLimit(n, fallback) {
    n = parseInt(n, 10);
    return Number.isFinite(n) && n >= 1 ? n : fallback;
  }
  function quotaLimit() {
    return clampLimit(settingsObj().quotaLimit, DEFAULT_QUOTA);
  }
  function downloadLimit() {
    return clampLimit(settingsObj().downloadLimit, DEFAULT_DOWNLOADS);
  }

  function readCookie(name) {
    try {
      const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }
  function writeCookie(name, value) {
    try {
      const exp = new Date();
      exp.setFullYear(exp.getFullYear() + 2);
      document.cookie = name + "=" + encodeURIComponent(String(value)) + "; expires=" + exp.toUTCString() + "; path=/; SameSite=Lax";
    } catch (e) {}
  }

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "id" });
        if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbGetMeta(id) {
    try {
      const db = await idbOpen();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("meta", "readonly");
        const r = tx.objectStore("meta").get(id);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } catch (e) { return null; }
  }
  async function idbPutMeta(value) {
    try {
      const db = await idbOpen();
      await new Promise((resolve, reject) => {
        const tx = db.transaction("meta", "readwrite");
        tx.objectStore("meta").put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {}
  }

  function legacyCount() {
    let n = 0;
    try {
      const arr = JSON.parse(localStorage.getItem(LS_DL_LEGACY) || "[]");
      if (Array.isArray(arr)) n = Math.max(n, arr.length);
    } catch (e) {}
    try {
      const raw = readCookie(CK_DL_LEGACY);
      if (raw) n = Math.max(n, raw.split(",").filter(Boolean).length);
    } catch (e) {}
    return n;
  }

  let used = 0;

  async function loadDownloads() {
    let n = 0;
    try {
      const raw = localStorage.getItem(LS_DL);
      if (raw != null) n = Math.max(n, parseInt(raw, 10) || 0);
    } catch (e) {}
    try {
      const c = parseInt(readCookie(CK_DL), 10);
      if (Number.isFinite(c)) n = Math.max(n, c);
    } catch (e) {}
    try {
      const rec = await idbGetMeta("downloads");
      if (rec && typeof rec.used === "number") n = Math.max(n, rec.used);
    } catch (e) {}
    n = Math.max(n, legacyCount());
    used = Math.max(0, n);
    return used;
  }

  async function persistDownloads(n) {
    used = Math.max(0, parseInt(n, 10) || 0);
    try { localStorage.setItem(LS_DL, String(used)); } catch (e) {}
    writeCookie(CK_DL, used);
    await idbPutMeta({ id: "downloads", used: used, updatedAt: Date.now() });
    return used;
  }

  function remainingDownloads(unlimited) {
    if (unlimited) return Infinity;
    return Math.max(0, downloadLimit() - (used || 0));
  }

  async function consumeDownload(unlimited) {
    if (unlimited) return used;
    if (remainingDownloads(false) <= 0) return used;
    return persistDownloads((used || 0) + 1);
  }

  async function resetDownloads() { return persistDownloads(0); }

  function messageExhausted() {
    const lim = downloadLimit();
    return "Jatah unduhan di perangkat ini sudah habis (" + lim + " dari " + lim + "). Kamu masih bisa melihat fotonya. Terima kasih sudah merayakan hari bahagia Ratna & Nuryadi.";
  }

  global.PBLimits = {
    DEFAULT_QUOTA,
    DEFAULT_DOWNLOADS,
    LS_DL,
    quotaLimit,
    downloadLimit,
    loadDownloads,
    persistDownloads,
    remainingDownloads,
    consumeDownload,
    resetDownloads,
    used: () => used,
    messageExhausted
  };
})(typeof window !== "undefined" ? window : globalThis);
