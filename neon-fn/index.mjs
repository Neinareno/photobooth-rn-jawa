/**
 * Photobooth Ratna Prastyani & Nuryadi — public API.
 * Secrets stay in the Neon Function environment (DATABASE_URL).
 * Public surface: GET list, GET image, POST insert (size-limited),
 * PIN-protected delete.
 */
import { neon } from "@neondatabase/serverless";

const MAX_BYTES = 4.5 * 1024 * 1024;
const LIST_LIMIT = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hits = new Map();

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  return neon(url);
}

function cors(req, extra = {}) {
  const origin = req.headers.get("origin") || "*";
  return {
    "access-control-allow-origin": origin === "null" ? "*" : origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, if-none-match",
    "access-control-expose-headers": "etag, ETag",
    "access-control-max-age": "86400",
    vary: "Origin",
    ...extra,
  };
}

function json(req, body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(req),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

function pathOf(req) {
  try {
    const u = new URL(req.url);
    return (u.pathname.replace(/\/+$/, "") || "/") + (u.search || "");
  } catch {
    return "/";
  }
}

function pathname(req) {
  try {
    return new URL(req.url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function baseOrigin(req) {
  const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
  if (host) {
    const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
    return `${proto}://${host.split(",")[0].trim()}`;
  }
  const bid = process.env.NEON_BRANCH_ID;
  const suf = process.env.NEON_FUNCTION_HOST_SUFFIX;
  if (bid && suf) return `https://${bid}-api${suf}`;
  return new URL(req.url).origin;
}

function clientIp(req) {
  const xf = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
  return xf.split(",")[0].trim() || "unknown";
}

function rateLimit(req, key, max, windowMs) {
  const id = key + ":" + clientIp(req);
  const now = Date.now();
  const arr = (hits.get(id) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  hits.set(id, arr);
  return true;
}

function sniff(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function extFor(ct) {
  if (ct === "image/png") return "png";
  if (ct === "image/webp") return "webp";
  return "jpg";
}

async function readBody(req) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BYTES) return { error: "too_large" };
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return { error: "too_large" };
  return { buf };
}

function parseUuidFromPath(p) {
  const m = p.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\.(?:jpe?g|png|webp))?$/i);
  return m ? m[1].toLowerCase() : null;
}

async function listPhotos(req) {
  const u = new URL(req.url);
  const limit = Math.min(LIST_LIMIT, Math.max(1, parseInt(u.searchParams.get("limit") || "200", 10) || 200));
  const meta = await sql()`
    select count(*)::int as n, max(created_at) as latest, max(id::text) as mid
    from public.photos
  `;
  const m = meta[0] || {};
  const etag = `"p${m.n || 0}-${m.latest || "0"}-${m.mid || "0"}-${limit}"`;
  const inm = req.headers.get("if-none-match");
  if (inm && inm === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...cors(req),
        etag,
        "cache-control": "private, no-cache",
      },
    });
  }
  const rows = await sql()`
    select id, created_at, file_path, public_url, layout, theme, content_type
    from public.photos
    order by created_at desc
    limit ${limit}
  `;
  return json(req, { ok: true, photos: rows }, 200, {
    etag,
    "cache-control": "private, no-cache",
  });
}

async function getPhoto(req, id) {
  const rows = await sql()`
    select p.content_type, b.image_data
    from public.photos p
    join public.photo_blobs b on b.photo_id = p.id
    where p.id = ${id}
    limit 1
  `;
  if (!rows.length) return json(req, { ok: false, error: "not_found" }, 404);
  const row = rows[0];
  let bytes = row.image_data;
  if (typeof bytes === "string") {
    // neon may return hex or base64
    if (bytes.startsWith("\\x") || /^[0-9a-f]+$/i.test(bytes)) {
      const hex = bytes.startsWith("\\x") ? bytes.slice(2) : bytes;
      bytes = Uint8Array.from(hex.match(/.{1,2}/g).map((h) => parseInt(h, 16)));
    } else {
      bytes = Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0));
    }
  } else if (bytes && bytes.type === "Buffer" && Array.isArray(bytes.data)) {
    bytes = new Uint8Array(bytes.data);
  } else if (!(bytes instanceof Uint8Array)) {
    bytes = new Uint8Array(bytes);
  }
  const ct = row.content_type || "image/jpeg";
  return new Response(bytes, {
    status: 200,
    headers: {
      ...cors(req),
      "content-type": ct,
      "cache-control": "public, max-age=31536000, immutable",
      "content-disposition": `inline; filename="photobooth-${id}.${extFor(ct)}"`,
    },
  });
}

async function uploadPhoto(req) {
  if (!rateLimit(req, "up", 30, 60_000)) {
    return json(req, { ok: false, error: "rate_limited" }, 429);
  }
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  let image, layout = null, theme = null, id = crypto.randomUUID();

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") || form.get("photo") || form.get("image");
    if (!file || typeof file.arrayBuffer !== "function") {
      return json(req, { ok: false, error: "missing_file" }, 400);
    }
    if (file.size > MAX_BYTES) return json(req, { ok: false, error: "too_large" }, 413);
    image = new Uint8Array(await file.arrayBuffer());
    layout = (form.get("layout") || "").toString().slice(0, 40) || null;
    theme = (form.get("theme") || "").toString().slice(0, 40) || null;
    const given = (form.get("id") || "").toString().trim();
    if (UUID_RE.test(given)) id = given.toLowerCase();
  } else if (ct.includes("application/json")) {
    const raw = await req.text();
    if (raw.length > MAX_BYTES * 1.4) return json(req, { ok: false, error: "too_large" }, 413);
    const body = JSON.parse(raw);
    const b64 = String(body.image || body.dataURL || "").replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");
    if (!b64) return json(req, { ok: false, error: "missing_file" }, 400);
    image = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    if (image.byteLength > MAX_BYTES) return json(req, { ok: false, error: "too_large" }, 413);
    layout = body.layout ? String(body.layout).slice(0, 40) : null;
    theme = body.theme ? String(body.theme).slice(0, 40) : null;
    if (body.id && UUID_RE.test(String(body.id))) id = String(body.id).toLowerCase();
  } else {
    const { buf, error } = await readBody(req);
    if (error) return json(req, { ok: false, error }, 413);
    image = buf;
    const u = new URL(req.url);
    layout = u.searchParams.get("layout");
    theme = u.searchParams.get("theme");
    const given = u.searchParams.get("id");
    if (given && UUID_RE.test(given)) id = given.toLowerCase();
  }

  const kind = sniff(image);
  if (!kind) return json(req, { ok: false, error: "unsupported_type" }, 400);

  const ext = extFor(kind);
  const filePath = `rn-jawa/${id}.${ext}`;
  const publicUrl = `${baseOrigin(req)}/p/${id}.${ext}`;
  const hex = [...image].map((b) => b.toString(16).padStart(2, "0")).join("");

  const db = sql();
  try {
    const rows = await db`
      with ins as (
        insert into public.photos (id, file_path, public_url, layout, theme, content_type)
        values (${id}::uuid, ${filePath}, ${publicUrl}, ${layout}, ${theme}, ${kind})
        returning id, created_at, file_path, public_url, layout, theme, content_type
      ), blob as (
        insert into public.photo_blobs (photo_id, image_data)
        select id, decode(${hex}, 'hex') from ins
      )
      select * from ins
    `;
    return json(req, { ok: true, photo: rows[0] }, 201);
  } catch (e) {
    const msg = String(e && e.message || e);
    if (/duplicate|unique/i.test(msg)) {
      return json(req, { ok: false, error: "duplicate" }, 409);
    }
    console.error("upload failed", msg);
    return json(req, { ok: false, error: "server_error" }, 500);
  }
}

async function verifyPin(req) {
  if (!rateLimit(req, "pin", 20, 10 * 60_000)) {
    return json(req, { ok: false, error: "too_many_attempts" }, 429);
  }
  const body = await req.json().catch(() => ({}));
  const pin = String(body.pin || body.p_pin || "");
  const rows = await sql()`select public.verify_pin(${pin}) as result`;
  const result = rows[0]?.result || { ok: false, error: "invalid_pin" };
  return json(req, result, result.ok ? 200 : 401);
}

async function deletePhotos(req) {
  if (!rateLimit(req, "pin", 20, 10 * 60_000)) {
    return json(req, { ok: false, error: "too_many_attempts" }, 429);
  }
  const body = await req.json().catch(() => ({}));
  const pin = String(body.pin || body.p_pin || "");
  const ids = Array.isArray(body.ids || body.p_ids) ? (body.ids || body.p_ids) : [];
  const clean = ids.map(String).filter((x) => UUID_RE.test(x));
  const rows = await sql()`select public.delete_photos(${clean}::uuid[], ${pin}) as result`;
  const result = rows[0]?.result || { ok: false, error: "invalid_pin" };
  return json(req, result, result.ok ? 200 : 401);
}

export default {
  async fetch(req) {
    try {
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors(req) });
      }
      const p = pathname(req);
      if (req.method === "GET" && (p === "/" || p === "/health")) {
        return json(req, { ok: true, service: "photobooth-rn-jawa" });
      }
      if (req.method === "GET" && (p === "/photos" || p === "/photos/")) {
        return await listPhotos(req);
      }
      if (req.method === "GET" && (p.startsWith("/p/") || /^\/photos\/[^/]+$/.test(p))) {
        const id = parseUuidFromPath(p);
        if (!id) return json(req, { ok: false, error: "not_found" }, 404);
        return await getPhoto(req, id);
      }
      if (req.method === "POST" && (p === "/photos" || p === "/photos/")) {
        return await uploadPhoto(req);
      }
      if (req.method === "POST" && (p === "/verify-pin" || p === "/verify_pin")) {
        return await verifyPin(req);
      }
      if (req.method === "POST" && (p === "/delete-photos" || p === "/delete_photos")) {
        return await deletePhotos(req);
      }
      return json(req, { ok: false, error: "not_found" }, 404);
    } catch (e) {
      console.error("handler error", e);
      return json(req, { ok: false, error: "server_error" }, 500);
    }
  },
};
