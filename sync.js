/* Klien API photobooth (Neon Function). Hanya URL publik, tanpa kunci rahasia. */
(function (global) {
  const DEFAULT_API = "https://br-raspy-boat-bi9ymbbr-api.compute.c-5.ap-southeast-1.aws.neon.tech";
  const LS = "photobooth-rnjawa-settings-v1";

  function trimSlash(u) { return String(u || "").trim().replace(/\/+$/, ""); }

  function apiBase() {
    let url = DEFAULT_API;
    try {
      if (global.CONFIG && CONFIG.apiUrl) url = CONFIG.apiUrl || url;
    } catch (e) {}
    try {
      const s = JSON.parse(localStorage.getItem(LS) || "{}");
      if (s && s.apiUrl) url = s.apiUrl;
    } catch (e) {}
    return trimSlash(url) || DEFAULT_API;
  }

  function enabled() { return !!apiBase(); }

  async function parseJson(res) {
    const data = await res.json().catch(() => ({}));
    return data;
  }

  let listEtag = "";
  let lastListNotModified = false;

  async function listPhotos(limit) {
    lastListNotModified = false;
    const headers = {};
    if (listEtag) headers["If-None-Match"] = listEtag;
    const res = await fetch(apiBase() + "/photos?limit=" + (limit || 200), { headers: headers, cache: "no-cache" });
    if (res.status === 304) {
      lastListNotModified = true;
      return Object.assign([], { notModified: true });
    }
    const et = res.headers.get("etag") || res.headers.get("ETag");
    if (et) listEtag = et;
    const data = await parseJson(res);
    if (!res.ok || data.ok === false) throw new Error((data && data.error) || ("list " + res.status));
    return data.photos || [];
  }

  async function uploadPhoto(blob, rec) {
    rec = rec || {};
    const fd = new FormData();
    const typ = ((blob && blob.type) || "");
    const ext = typ.includes("png") ? "png" : typ.includes("webp") ? "webp" : "jpg";
    const name = (rec.id || "photo") + "." + ext;
    fd.append("file", blob, name);
    if (rec.id) fd.append("id", rec.id);
    if (rec.layout) fd.append("layout", rec.layout);
    if (rec.theme) fd.append("theme", rec.theme);
    const res = await fetch(apiBase() + "/photos", { method: "POST", body: fd });
    const data = await parseJson(res);
    if (!res.ok || !data.ok || !data.photo) throw new Error((data && data.error) || ("upload " + res.status));
    return data.photo;
  }

  async function verifyPin(pin) {
    const res = await fetch(apiBase() + "/verify-pin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin: String(pin || "") })
    });
    const data = await parseJson(res);
    if (data && typeof data.ok === "boolean") return data;
    throw new Error((data && data.error) || ("pin " + res.status));
  }

  async function deletePhotos(ids, pin) {
    const res = await fetch(apiBase() + "/delete-photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: ids || [], pin: String(pin || "") })
    });
    const data = await parseJson(res);
    if (data && typeof data.ok === "boolean") return data;
    throw new Error((data && data.error) || ("delete " + res.status));
  }

  global.PBSync = { DEFAULT_API, apiBase, enabled, listPhotos, uploadPhoto, verifyPin, deletePhotos, get lastListNotModified() { return lastListNotModified; } };
})(typeof window !== "undefined" ? window : globalThis);
