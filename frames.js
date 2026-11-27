/* PBFrames v6 — Photobooth Jawa Undangan (Ratna Prastyani & Nuryadi).
 * Pakem typography tetap: THE WEDDING OF, nama skrip, tanggal, resepsi, AULA KELUARGA.
 * Kanvas: single 1200×1800 (undangan); strip2 1200×2400; strip3 1200×3000.
 * Slot 2/3 foto: 4:3 landscape (pola photostrip klasik, foto tidak terpotong lebar).
 * Referensi rasio/petak:
 *  - https://boothcue.com/photo-strip-template/ (2×6, footer cadangan, jendela 2 & 3 foto)
 *  - https://thesocialboothco.com/layout-guide (2×6 = 1200×3600 @600dpi; 3-foto landscape/square)
 *  - https://bespokebooth.com/coordinates/ (S3L: 3 landscape pada strip 600×1800)
 *  - https://templatesbooth.com/free/elegant-wedding-photo-booth-template/
 *  - https://flashroombooth.com/templates/wedding-sunburst-2x6-three
 * API: compose, thumbnail, ready, warm, geometry, size, FRAMES, byId.
 */
(function () {
  "use strict";
  const BASE_W = 1200, BASE_H = 1800;
  const FONT = {
    display: '"Cinzel", "Cormorant Garamond", "Times New Roman", serif',
    serif: '"Cormorant Garamond", "Instrument Serif", Georgia, serif',
    ui: '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif',
    mono: '"Cormorant Garamond", "DM Mono", serif',
    script: '"Great Vibes", "Ms Madi", "Parisienne", cursive'
  };
  const FONT_CSS = "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Great+Vibes&family=Ms+Madi&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
  const FONT_LOADS = [
    "600 48px Cinzel", "700 48px Cinzel", "500 28px Cinzel",
    "500 40px 'Cormorant Garamond'", "600 40px 'Cormorant Garamond'", "italic 400 36px 'Cormorant Garamond'",
    "400 90px 'Great Vibes'", "400 96px 'Great Vibes'", "400 90px 'Ms Madi'",
    "500 28px 'Plus Jakarta Sans'"
  ];
  (function injectFonts() {
    try {
      if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => /Cinzel/.test(l.href) && /Great\+Vibes/.test(l.href))) return;
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_CSS; document.head.appendChild(l);
    } catch (e) {}
  })();

  const ASSET_LIST = {
    paper: "assets/paper-texture.jpg",
    floral: "assets/floral-corners.webp",
    floralL: "assets/floral-left.webp",
    floralR: "assets/floral-right.webp",
    gunungan: "assets/gunungan.webp",
    gajah: "assets/gajah.webp",
    wayangL: "assets/wayang-pria.webp",
    wayangR: "assets/wayang-wanita.webp",
    batik: "assets/batik-curtain.webp",
    batikPeach: "assets/batik-curtain-peach.webp",
    scene: "assets/beranda-scene.jpg",
    merak: "ornamen/burung-merak.webp"
  };
  const A = {};
  function loadImg(src) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    }).then((im) => { if (im) A[src] = im; return im; });
  }
  let assetsJob = null;
  function loadAssets() {
    if (!assetsJob) assetsJob = Promise.all(Object.values(ASSET_LIST).map(loadImg));
    return assetsJob;
  }
  function img(key) { return A[ASSET_LIST[key]] || null; }

  function rgba(hex, a) {
    const n = parseInt(String(hex).replace("#", ""), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function cover(ctx, image, x, y, w, h) {
    const im = image || null;
    if (!im) { ctx.fillStyle = "#ddd"; ctx.fillRect(x, y, w, h); return; }
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (!iw || !ih) { ctx.fillStyle = "#ddd"; ctx.fillRect(x, y, w, h); return; }
    const s = Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function drawContain(ctx, image, x, y, w, h) {
    if (!image) return;
    const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    if (!iw || !ih) return;
    const s = Math.min(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function shadow(ctx, c, b, oy, ox) {
    ctx.shadowColor = c; ctx.shadowBlur = b; ctx.shadowOffsetY = oy || 0; ctx.shadowOffsetX = ox || 0;
  }
  function noShadow(ctx) {
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  }
  function setTrack(ctx, t) { try { ctx.letterSpacing = (t || 0) + "px"; } catch (e) {} }
  function fitFont(ctx, text, maxW, size, min, fn) {
    let s = size; ctx.font = fn(s);
    while (s > min && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = fn(s); }
    return s;
  }
  function txt(ctx, text, x, y, opt) {
    if (!text) return 0;
    opt = opt || {};
    const fn = opt.fn || ((s) => `500 ${s}px ${FONT.serif}`);
    const size = fitFont(ctx, text, opt.max || 1000, opt.size || 24, opt.min || 12, fn);
    ctx.font = fn(size);
    ctx.fillStyle = opt.color || "#6B3A36";
    ctx.textAlign = opt.align || "center";
    ctx.textBaseline = opt.base || "alphabetic";
    setTrack(ctx, opt.track || 0);
    ctx.fillText(text, x, y);
    setTrack(ctx, 0);
    return size;
  }
  const F = {
    cinzel: (wt) => (s) => `${wt || 600} ${s}px ${FONT.display}`,
    serif: (wt, it) => (s) => `${it ? "italic " : ""}${wt || 500} ${s}px ${FONT.serif}`,
    script: () => (s) => `400 ${s}px ${FONT.script}`,
    ui: (wt) => (s) => `${wt || 500} ${s}px ${FONT.ui}`
  };
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function textsOf(t) {
    t = t || {};
    const names = (t.names || "Ratna Prastyani & Nuryadi").trim();
    const parts = names.split(/\s*&\s*/).map((s) => s.trim()).filter(Boolean);
    const a = parts[0] || "Ratna Prastyani", b = parts[1] || "";
    const date = (t.date || "29 . 01 . 2027").trim();
    const MONTHS = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12, january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, august: 8, october: 10, december: 12 };
    let dots = date, dotsSpaced = date, dd = "", mm = "", yyyy = "";
    const m = date.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
    const d = date.match(/(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/);
    if (m && MONTHS[m[2]]) {
      dd = String(m[1]).padStart(2, "0"); mm = String(MONTHS[m[2]]).padStart(2, "0"); yyyy = m[3];
      dots = dd + "." + mm + "." + yyyy;
      dotsSpaced = dd + " . " + mm + " . " + yyyy;
    } else if (d) {
      dd = String(d[1]).padStart(2, "0"); mm = String(d[2]).padStart(2, "0"); yyyy = d[3];
      dots = dd + "." + mm + "." + yyyy;
      dotsSpaced = dd + " . " + mm + " . " + yyyy;
    }
    const place = (t.place || "AULA KELUARGA").trim();
    const time = (t.time || "12.00 WIB - 15.00 WIB").trim();
    const venue = t.showVenue === false ? "" : (t.venue || "").trim();
    const reception = [time ? "Resepsi " + time.replace(/^Resepsi\s+/i, "") : "", place].filter(Boolean).join(" · ");
    return {
      names, a, b, date, dots, dotsSpaced, place, time, venue, reception,
      heading: (t.heading || "THE WEDDING OF").trim().toUpperCase(),
      tag: (t.hashtag || "#MenujuRidhaRN").trim(),
      tagline: (t.tagline || "Two Hearts • One Promise • Forever").trim(),
      mono: "R  &  N"
    };
  }

  function layoutOf(L) {
    return L === "grid4" || L === "strip3" || L === "strip2" ? L : "single";
  }
  function shotCount(L) {
    return L === "grid4" ? 4 : L === "strip3" ? 3 : L === "strip2" ? 2 : 1;
  }
  function sizeOf(layout) {
    const L = layoutOf(layout);
    if (L === "strip3") return { W: 1200, H: 3000 };
    if (L === "strip2") return { W: 1200, H: 2400 };
    return { W: BASE_W, H: BASE_H };
  }

  /* Slot 4:3 landscape pada strip 2/3 (mengikuti jendela S3L / template 2×6).
   * Footer cukup untuk pakem typography. */
  function layoutGeom(layout) {
    const { W, H } = sizeOf(layout);
    const L = layoutOf(layout);
    if (L === "single" || L === "grid4") {
      const HEAD = L === "grid4" ? 72 : 80;
      const FOOT = Math.round(H * 0.30);
      const M = 48, GAP = 16;
      const box = { x: M, y: HEAD, w: W - 2 * M, h: H - HEAD - FOOT };
      return { W, H, L, HEAD, FOOT, M, GAP, photoBottom: H - FOOT, box, slotAr: box.w / box.h };
    }
    const M = 72, GAP = 28, HEAD = 56, SLOT_AR = 4 / 3;
    const slotW = W - 2 * M;
    const slotH = Math.round(slotW / SLOT_AR);
    const n = L === "strip3" ? 3 : 2;
    const photoBlock = n * slotH + (n - 1) * GAP;
    const FOOT = H - HEAD - photoBlock;
    const box = { x: M, y: HEAD, w: slotW, h: photoBlock };
    return { W, H, L, HEAD, FOOT, M, GAP, photoBottom: HEAD + photoBlock, box, slotW, slotH, slotAr: SLOT_AR };
  }

  function slotList(g) {
    const { x, y, w, h } = g.box;
    const gap = g.GAP;
    if (g.L === "grid4") {
      const cw = (w - gap) / 2, ch = (h - gap) / 2;
      return [0, 1, 2, 3].map((i) => ({ x: x + (i % 2) * (cw + gap), y: y + Math.floor(i / 2) * (ch + gap), w: cw, h: ch }));
    }
    if (g.L === "strip3") {
      const ch = g.slotH;
      return [0, 1, 2].map((i) => ({ x, y: y + i * (ch + gap), w, h: ch }));
    }
    if (g.L === "strip2") {
      const ch = g.slotH;
      return [{ x, y, w, h: ch }, { x, y: y + ch + gap, w, h: ch }];
    }
    return [{ x, y, w, h }];
  }

  /* Lebar sisi lebih besar, rasio slot tetap 4:3 agar viewfinder tidak berubah aspek. */
  function wayangGeom(layout) {
    const base = layoutGeom(layout);
    const { W, H, L, GAP } = base;
    if (L === "single" || L === "grid4") {
      const M = 168, HEAD = 100, FOOT = Math.round(H * 0.28);
      const box = { x: M, y: HEAD, w: W - 2 * M, h: H - HEAD - FOOT };
      return { W, H, L, HEAD, FOOT, M, GAP, photoBottom: H - FOOT, box, slotAr: box.w / box.h };
    }
    const M = 176, HEAD = 64, SLOT_AR = 4 / 3;
    const slotW = W - 2 * M;
    const slotH = Math.round(slotW / SLOT_AR);
    const n = L === "strip3" ? 3 : 2;
    const photoBlock = n * slotH + (n - 1) * GAP;
    const FOOT = H - HEAD - photoBlock;
    const box = { x: M, y: HEAD, w: slotW, h: photoBlock };
    return { W, H, L, HEAD, FOOT, M, GAP, photoBottom: HEAD + photoBlock, box, slotW, slotH, slotAr: SLOT_AR };
  }

  function geomFor(spec, layout) {
    if (spec && spec.id === "wayang-pasangan") return wayangGeom(layout);
    return layoutGeom(layout);
  }

  function paperFill(ctx, color, W, H) {
    ctx.fillStyle = color || "#F6EFE6";
    ctx.fillRect(0, 0, W, H);
    const p = img("paper");
    if (p) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.28;
      ctx.drawImage(p, 0, 0, W, H);
      ctx.restore();
    } else {
      const r = rng(2027);
      const id = ctx.getImageData(0, 0, W, H), d = id.data;
      for (let i = 0; i < d.length; i += 16) {
        const n = (r() - 0.5) * 18;
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(id, 0, 0);
    }
  }

  function smear(ctx, cx, cy, r, color, a) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(0.55, rgba(color, a * 0.45));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  function photo(ctx, image, s, st) {
    st = st || {};
    const pad = st.pad != null ? st.pad : 0;
    ctx.save();
    shadow(ctx, st.shadow || "rgba(80,40,36,.16)", st.blur || 18, 6, 0);
    ctx.fillStyle = st.matColor || "#fff";
    rr(ctx, s.x - pad, s.y - pad, s.w + pad * 2, s.h + pad * 2, st.r || 0);
    ctx.fill();
    noShadow(ctx);
    ctx.beginPath();
    rr(ctx, s.x, s.y, s.w, s.h, st.r || 0);
    ctx.clip();
    cover(ctx, image, s.x, s.y, s.w, s.h);
    ctx.restore();
  }

  function hairline(ctx, g, color, inset) {
    const i = inset == null ? 22 : inset;
    ctx.save();
    ctx.strokeStyle = color || "rgba(139,79,74,0.35)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(i, i, g.W - i * 2, g.H - i * 2);
    ctx.strokeStyle = color || "rgba(139,79,74,0.18)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(i + 7, i + 7, g.W - (i + 7) * 2, g.H - (i + 7) * 2);
    ctx.restore();
  }

  function drawKawung(ctx, x, y, w, h, c1, c2, cell) {
    const s = cell || 36;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = c1;
    ctx.fillRect(x, y, w, h);
    for (let yy = y - s; yy < y + h + s; yy += s) {
      for (let xx = x - s; xx < x + w + s; xx += s) {
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.ellipse(xx + s / 2, yy + s / 2, s * 0.42, s * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c1;
        ctx.beginPath();
        ctx.ellipse(xx + s / 2, yy + s / 2, s * 0.16, s * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawParang(ctx, x, y, w, h, c1, c2, step) {
    const st = step || 22;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = c1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c2;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let i = -h; i < w + h; i += st) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h * 0.55, y + h);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(c2.replace("#", "").length ? c2 : "#8B4F4A", 0.35);
    ctx.lineWidth = 1.5;
    for (let i = -h + 8; i < w + h; i += st) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h * 0.55, y + h);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawKawungBorder(ctx, g, c1, c2, bw) {
    const b = bw || 56;
    drawKawung(ctx, 0, 0, g.W, b, c1, c2, 28);
    drawKawung(ctx, 0, g.H - b, g.W, b, c1, c2, 28);
    drawKawung(ctx, 0, b, b, g.H - 2 * b, c1, c2, 28);
    drawKawung(ctx, g.W - b, b, b, g.H - 2 * b, c1, c2, 28);
    ctx.save();
    ctx.strokeStyle = "rgba(139,90,68,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(b, b, g.W - 2 * b, g.H - 2 * b);
    ctx.restore();
  }

  function drawParangBorder(ctx, g, c1, c2, bw) {
    const b = bw || 52;
    drawParang(ctx, 0, 0, b, g.H, c1, c2, 20);
    drawParang(ctx, g.W - b, 0, b, g.H, c1, c2, 20);
    drawParang(ctx, b, 0, g.W - 2 * b, 40, c1, c2, 18);
    drawParang(ctx, b, g.H - 40, g.W - 2 * b, 40, c1, c2, 18);
    ctx.save();
    ctx.strokeStyle = "rgba(92,46,60,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(b, 40, g.W - 2 * b, g.H - 80);
    ctx.restore();
  }

  function drawJogloRoof(ctx, g, color) {
    const cx = g.W / 2, top = 10, midY = Math.max(36, g.HEAD - 8);
    ctx.save();
    ctx.strokeStyle = color || "rgba(139,90,68,0.7)";
    ctx.fillStyle = "rgba(248,238,230,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx + 220, midY);
    ctx.lineTo(cx - 220, midY);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, top + 16);
    ctx.lineTo(cx + 140, midY - 4);
    ctx.lineTo(cx - 140, midY - 4);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  /* Typografi pakem, posisi relatif terhadap footer (berlaku semua tinggi kanvas). */
  function drawPakemType(ctx, T, pal, g, opts) {
    opts = opts || {};
    const cx = g.W / 2;
    const max = Math.min(g.W - 140, opts.textW || 820);
    const compact = g.FOOT < 540;
    const roomy = g.FOOT >= 680;
    if (opts.monoTop) {
      txt(ctx, T.mono, cx, Math.max(36, g.HEAD * 0.62), { fn: F.cinzel(600), size: 20, track: 10, color: pal.header, max: 400 });
    }
    let y = opts.startY != null ? opts.startY : (g.photoBottom + (roomy ? 92 : compact ? 52 : 68));
    if (opts.offsetY) y += opts.offsetY;
    txt(ctx, T.heading, cx, y, { fn: F.cinzel(600), size: compact ? 22 : 28, track: 10, color: pal.ink, max });
    y += compact ? 64 : (roomy ? 92 : 82);
    txt(ctx, T.a, cx, y, { fn: F.script(), size: compact ? 72 : 92, color: pal.ink, max, min: 44 });
    y += compact ? 44 : 56;
    txt(ctx, "&", cx, y, { fn: F.script(), size: compact ? 40 : 52, color: pal.inkSoft, max: 200 });
    y += compact ? 58 : 76;
    if (T.b) txt(ctx, T.b, cx, y, { fn: F.script(), size: compact ? 72 : 92, color: pal.ink, max, min: 44 });
    y += compact ? 50 : 64;
    txt(ctx, T.dotsSpaced || T.dots, cx, y, { fn: F.serif(500), size: compact ? 28 : 36, track: 8, color: pal.ink, max });
    y += compact ? 38 : 48;
    if (T.reception) {
      const rec = T.reception.replace(/\s*WIB\s*-\s*/g, "–").replace(/\s*WIB\s*$/, " WIB");
      txt(ctx, rec, cx, y, { fn: F.serif(500, true), size: compact ? 20 : 26, track: 0.5, color: pal.ink, max, min: 15 });
      y += compact ? 32 : 38;
    }
    if (opts.showVenue && T.venue) {
      txt(ctx, T.venue, cx, y, { fn: F.serif(400), size: compact ? 14 : 16, color: pal.inkSoft, max: max + 40, min: 12 });
    }
    return y;
  }

  function drawFooterOrnamentsTheta(ctx, g, pal) {
    const gun = img("gunungan");
    const gj = img("gajah");
    const compact = g.FOOT < 540;
    const roomy = g.FOOT >= 680;
    const gh = compact ? 100 : (roomy ? 150 : 120);
    const gy = g.photoBottom + (roomy ? 18 : 8);
    if (gun) drawContain(ctx, gun, g.W / 2 - gh * 0.42, gy, gh * 0.84, gh);
    if (gj) {
      const gw = compact ? 180 : (roomy ? 240 : 200), ghh = gw * 0.7;
      drawContain(ctx, gj, 70, g.H - ghh - 28, gw, ghh);
      ctx.save(); ctx.translate(g.W - 70, 0); ctx.scale(-1, 1);
      drawContain(ctx, gj, 0, g.H - ghh - 28, gw, ghh);
      ctx.restore();
    }
    smear(ctx, g.W / 2, g.photoBottom + 20, 200, pal.smear, 0.12);
    return gy + gh; // y di bawah gunungan, untuk typography
  }

  function drawSideFlorals(ctx, g, mode) {
    const L = img("floralL"), R = img("floralR"), C = img("floral");
    const top = g.HEAD - 10;
    const h = Math.min(g.photoBottom - top + 40, 720);
    if (mode === "sides" || mode === "pakem") {
      if (L) { ctx.save(); ctx.globalAlpha = 0.95; drawContain(ctx, L, -30, top, 220, h); ctx.restore(); }
      if (R) { ctx.save(); ctx.globalAlpha = 0.95; drawContain(ctx, R, g.W - 190, top, 220, h); ctx.restore(); }
    }
    if (mode === "top-corners") {
      if (C) {
        const dw = 420, dh = C.height * (dw / C.width);
        ctx.save(); ctx.globalAlpha = 0.9;
        ctx.drawImage(C, -40, -30, dw, dh);
        ctx.save(); ctx.translate(g.W + 40, -30); ctx.scale(-1, 1);
        ctx.drawImage(C, 0, 0, dw, dh);
        ctx.restore(); ctx.restore();
      } else if (L && R) {
        drawContain(ctx, L, -20, -10, 280, 320);
        drawContain(ctx, R, g.W - 260, -10, 280, 320);
      }
    }
    if (mode === "bottom-corners") {
      if (C) {
        const dw = g.W, dh = C.height * (dw / C.width);
        ctx.save(); ctx.globalAlpha = 0.92;
        ctx.drawImage(C, 0, g.H - dh + 80, dw, dh);
        ctx.restore();
      }
    }
    if (mode === "garland") {
      if (C) {
        const dw = g.W + 80, dh = C.height * (dw / C.width);
        ctx.save(); ctx.globalAlpha = 0.88;
        ctx.drawImage(C, -40, g.H - dh + 60, dw, dh);
        ctx.restore();
      }
    }
  }

  /* Bunga hanya di sudut, tengah footer tetap bersih untuk typography pakem. */
  function drawCornerFlorals(ctx, g, where) {
    const C = img("floral"), L = img("floralL"), R = img("floralR");
    const fh = Math.min(Math.round(g.FOOT * 0.88), 540);
    if (where !== "bottom") return;
    const tmp = document.createElement("canvas");
    tmp.width = g.W; tmp.height = g.H;
    const tx = tmp.getContext("2d");
    if (C) {
      const dw = g.W, dh = C.height * (dw / C.width);
      tx.globalAlpha = 0.95;
      tx.drawImage(C, 0, g.H - dh + 80, dw, dh);
    } else {
      if (L) drawContain(tx, L, -20, g.H - fh, g.W * 0.4, fh);
      if (R) drawContain(tx, R, g.W * 0.6, g.H - fh, g.W * 0.4, fh);
    }
    const grd = tx.createLinearGradient(0, 0, g.W, 0);
    grd.addColorStop(0, "rgba(0,0,0,1)");
    grd.addColorStop(0.26, "rgba(0,0,0,1)");
    grd.addColorStop(0.40, "rgba(0,0,0,0)");
    grd.addColorStop(0.60, "rgba(0,0,0,0)");
    grd.addColorStop(0.74, "rgba(0,0,0,1)");
    grd.addColorStop(1, "rgba(0,0,0,1)");
    tx.globalAlpha = 1;
    tx.globalCompositeOperation = "destination-in";
    tx.fillStyle = grd;
    tx.fillRect(0, g.H - fh, g.W, fh);
    ctx.drawImage(tmp, 0, 0);
  }

  /* ---------- Frame 1: theta-mawar — pakem undangan Theta ---------- */
  function makeThetaMawar() {
    const pal = { paper: "#F6EFE6", ink: "#8B4F4A", inkSoft: "#A56A64", header: "#6B3A36", smear: "#C4A0A0", smear2: "#B07A86" };
    return {
      id: "theta-mawar", name: "Undangan Mawar", thumbBg: pal.paper,
      bg: function (ctx, layout) {
        const g = layoutGeom(layout);
        paperFill(ctx, pal.paper, g.W, g.H);
        smear(ctx, g.W * 0.2, 120, 260, pal.smear, 0.16);
        smear(ctx, g.W * 0.8, 160, 240, pal.smear2, 0.12);
        hairline(ctx, g, "rgba(139,79,74,0.32)", 20);
        drawSideFlorals(ctx, g, "pakem");
      },
      photos: function (ctx, layout, ims) {
        slotList(layoutGeom(layout)).forEach((s, i) => photo(ctx, ims[i], s, { pad: 8, r: 2, matColor: "#fffaf6" }));
      },
      fg: function (ctx, layout, texts) {
        const g = layoutGeom(layout);
        const T = textsOf(texts);
        const belowGun = drawFooterOrnamentsTheta(ctx, g, pal);
        txt(ctx, T.mono, g.W / 2, Math.max(36, g.HEAD * 0.62), { fn: F.cinzel(600), size: 20, track: 10, color: pal.header, max: 400 });
        drawPakemType(ctx, T, pal, g, { startY: belowGun + (g.FOOT >= 680 ? 36 : 22) });
      }
    };
  }

  /* ---------- Frame 2: kawung border + wayang couple in footer ---------- */
  function makeThetaPeach() {
    const pal = { paper: "#F3DCD0", ink: "#8B5A44", inkSoft: "#A87868", header: "#7A4638", smear: "#D9A5A0" };
    return {
      id: "theta-peach", name: "Kawung Peach", thumbBg: pal.paper,
      bg: function (ctx, layout) {
        const g = layoutGeom(layout);
        paperFill(ctx, pal.paper, g.W, g.H);
        drawKawungBorder(ctx, g, "#E8C8B8", "#C98980", 58);
        smear(ctx, g.W / 2, g.H - 80, 300, pal.smear, 0.14);
      },
      photos: function (ctx, layout, ims) {
        slotList(layoutGeom(layout)).forEach((s, i) => photo(ctx, ims[i], s, { pad: 10, r: 0, matColor: "#F8EEE6" }));
      },
      fg: function (ctx, layout, texts) {
        const g = layoutGeom(layout);
        const T = textsOf(texts);
        const L = img("wayangL"), R = img("wayangR");
        const wh = Math.min(300, g.FOOT * 0.48);
        if (L) drawContain(ctx, L, 80, g.H - wh - 28, wh * 0.62, wh);
        if (R) drawContain(ctx, R, g.W - 80 - wh * 0.62, g.H - wh - 28, wh * 0.62, wh);
        drawSideFlorals(ctx, g, "top-corners");
        drawPakemType(ctx, T, pal, g, {});
      }
    };
  }

  /* ---------- Frame 3: parang side borders, gunungan di kepala, bunga di kaki ---------- */
  function makeThetaPlum() {
    const pal = { paper: "#F6E6E4", ink: "#6B3A36", inkSoft: "#8A5A58", header: "#5C2E3C", smear: "#C4A0B0" };
    return {
      id: "theta-plum", name: "Parang Plum", thumbBg: pal.paper,
      bg: function (ctx, layout) {
        const g = layoutGeom(layout);
        paperFill(ctx, pal.paper, g.W, g.H);
        drawParangBorder(ctx, g, "#E8D0D4", "#8B4F4A", 50);
        smear(ctx, g.W / 2, 80, 220, pal.smear, 0.14);
      },
      photos: function (ctx, layout, ims) {
        slotList(layoutGeom(layout)).forEach((s, i) => photo(ctx, ims[i], s, { pad: 8, r: 4, matColor: "#F8EEE6" }));
      },
      fg: function (ctx, layout, texts) {
        const g = layoutGeom(layout);
        const T = textsOf(texts);
        const gun = img("gunungan");
        if (gun) drawContain(ctx, gun, g.W / 2 - 55, 6, 110, Math.max(80, g.HEAD + 28));
        drawCornerFlorals(ctx, g, "bottom");
        drawPakemType(ctx, T, pal, g, {});
      }
    };
  }

  /* ---------- Frame 4: Kayon besar + tirai batik ---------- */
  const kayonBatik = {
    id: "kayon-batik", name: "Kayon Batik", thumbBg: "#F3DCD0",
    bg: function (ctx, layout) {
      const g = layoutGeom(layout);
      paperFill(ctx, "#F3DCD0", g.W, g.H);
      const b = img("batik");
      if (b) {
        ctx.save(); ctx.globalAlpha = 0.9;
        ctx.drawImage(b, 0, 0, b.width * 0.38, b.height, 0, 0, 110, g.H);
        ctx.save(); ctx.translate(g.W, 0); ctx.scale(-1, 1);
        ctx.drawImage(b, 0, 0, b.width * 0.38, b.height, 0, 0, 110, g.H);
        ctx.restore();
        ctx.drawImage(b, 0, 0, b.width, b.height * 0.18, 0, 0, g.W, 64);
        ctx.drawImage(b, 0, b.height * 0.82, b.width, b.height * 0.18, 0, g.H - 64, g.W, 64);
        ctx.restore();
      }
      const gun = img("gunungan");
      if (gun) {
        ctx.save(); ctx.globalAlpha = 0.16;
        drawContain(ctx, gun, g.W / 2 - 280, g.H * 0.28, 560, 820);
        ctx.restore();
      }
    },
    photos: function (ctx, layout, ims) {
      slotList(layoutGeom(layout)).forEach((s, i) => photo(ctx, ims[i], s, { pad: 8, r: 4, matColor: "#F8EEE6" }));
    },
    fg: function (ctx, layout, texts) {
      const g = layoutGeom(layout);
      const T = textsOf(texts);
      const pal = { paper: "#F3DCD0", ink: "#8B5A44", inkSoft: "#A87868", header: "#7A4638" };
      const gun = img("gunungan");
      if (gun) drawContain(ctx, gun, g.W / 2 - 90, 4, 180, Math.max(110, g.HEAD + 50));
      drawPakemType(ctx, T, pal, g, {});
    }
  };

  /* ---------- Frame 5: Joglo + suasana air terjun (header atap, scene di kaki) ---------- */
  const jogloTerjun = {
    id: "joglo-terjun", name: "Joglo & Air Terjun", thumbBg: "#F3DCD0",
    bg: function (ctx, layout) {
      const g = layoutGeom(layout);
      paperFill(ctx, "#F8EEE6", g.W, g.H);
      const sc = img("scene");
      if (sc) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, g.photoBottom - 20, g.W, g.FOOT + 20);
        ctx.clip();
        ctx.globalAlpha = 0.42;
        cover(ctx, sc, 0, g.photoBottom - 80, g.W, g.FOOT + 100);
        ctx.restore();
        const lg = ctx.createLinearGradient(0, g.photoBottom - 40, 0, g.H);
        lg.addColorStop(0, "rgba(248,238,230,0.7)");
        lg.addColorStop(0.35, "rgba(248,238,230,0.2)");
        lg.addColorStop(1, "rgba(243,220,208,0.55)");
        ctx.fillStyle = lg;
        ctx.fillRect(0, g.photoBottom - 40, g.W, g.FOOT + 40);
      }
      const bp = img("batikPeach");
      if (bp) {
        ctx.save(); ctx.globalAlpha = 0.4;
        ctx.drawImage(bp, 0, 0, bp.width * 0.3, bp.height, 0, 0, 72, g.H);
        ctx.save(); ctx.translate(g.W, 0); ctx.scale(-1, 1);
        ctx.drawImage(bp, 0, 0, bp.width * 0.3, bp.height, 0, 0, 72, g.H);
        ctx.restore(); ctx.restore();
      }
      drawJogloRoof(ctx, g, "rgba(139,90,68,0.75)");
    },
    photos: function (ctx, layout, ims) {
      slotList(layoutGeom(layout)).forEach((s, i) => photo(ctx, ims[i], s, { pad: 10, r: 2, matColor: "#F8EEE6" }));
    },
    fg: function (ctx, layout, texts) {
      const g = layoutGeom(layout);
      const T = textsOf(texts);
      const pal = { paper: "#F8EEE6", ink: "#8B5A44", inkSoft: "#A87868", header: "#7A4638" };
      drawPakemType(ctx, T, pal, g, { showVenue: true });
    }
  };

  /* ---------- Frame 6: wayang sebagai kolom kiri-kanan ---------- */
  const wayangPasangan = {
    id: "wayang-pasangan", name: "Wayang Berpasangan", thumbBg: "#F6EFE6",
    bg: function (ctx, layout) {
      const g = wayangGeom(layout);
      paperFill(ctx, "#F6EFE6", g.W, g.H);
      hairline(ctx, g, "rgba(139,79,74,0.28)", 16);
      smear(ctx, g.W / 2, 80, 240, "#C4A0A0", 0.12);
    },
    photos: function (ctx, layout, ims) {
      slotList(wayangGeom(layout)).forEach((s, i) => photo(ctx, ims[i], s, { pad: 8, r: 6, matColor: "#fff" }));
    },
    fg: function (ctx, layout, texts) {
      const g = wayangGeom(layout);
      const T = textsOf(texts);
      const pal = { paper: "#F6EFE6", ink: "#8B4F4A", inkSoft: "#A56A64", header: "#6B3A36" };
      const L = img("wayangL"), R = img("wayangR");
      const colW = g.M + 20, colH = Math.min(g.photoBottom - 20, 1100);
      const colY = Math.max(40, g.HEAD - 10);
      if (L) drawContain(ctx, L, -8, colY, colW, colH);
      if (R) drawContain(ctx, R, g.W - colW + 8, colY, colW, colH);
      drawPakemType(ctx, T, pal, g, { textW: Math.min(760, g.W - 80) });
    }
  };

  /* ---------- Frame 7: merak di puncak, teratai/bunga di kaki ---------- */
  const merakTeratai = {
    id: "merak-teratai", name: "Merak & Teratai", thumbBg: "#F3DCD0",
    bg: function (ctx, layout) {
      const g = layoutGeom(layout);
      paperFill(ctx, "#F3DCD0", g.W, g.H);
      const mer = img("merak");
      if (mer) {
        /* Ditempatkan di sudut header, tidak di belakang petak foto. */
        const mw = 200, mh = 180;
        ctx.save(); ctx.globalAlpha = 0.92;
        drawContain(ctx, mer, g.W - mw - 10, 4, mw, mh);
        ctx.save(); ctx.translate(mw + 10, 4); ctx.scale(-1, 1);
        drawContain(ctx, mer, 0, 0, mw, mh);
        ctx.restore(); ctx.restore();
      }
      drawCornerFlorals(ctx, g, "bottom");
      hairline(ctx, g, "rgba(139,90,68,0.28)", 18);
    },
    photos: function (ctx, layout, ims) {
      slotList(layoutGeom(layout)).forEach((s, i) => photo(ctx, ims[i], s, { pad: 10, r: 4, matColor: "#F8EEE6" }));
    },
    fg: function (ctx, layout, texts) {
      const g = layoutGeom(layout);
      const T = textsOf(texts);
      const pal = { paper: "#F3DCD0", ink: "#8B5A44", inkSoft: "#A87868", header: "#7A4638" };
      drawPakemType(ctx, T, pal, g, {});
    }
  };

  const thetaMawar = makeThetaMawar();
  const thetaPeach = makeThetaPeach();
  const thetaPlum = makeThetaPlum();
  const FRAMES = [thetaMawar, thetaPeach, thetaPlum, kayonBatik, jogloTerjun, wayangPasangan, merakTeratai];

  function geometry(spec, layout) {
    const g = geomFor(spec, layout);
    return {
      W: g.W, H: g.H, layout: g.L, n: shotCount(g.L),
      area: { x: 0, y: 0, w: g.W, h: g.H },
      slots: slotList(g)
    };
  }
  function size(layout) { return sizeOf(layout); }

  let fontsReady = null;
  function ready() {
    if (!fontsReady) {
      fontsReady = (async () => {
        try { await Promise.all(FONT_LOADS.map((f) => document.fonts.load(f, "Ratna & Nuryadi 2027").catch(() => {}))); } catch (e) {}
        try { await document.fonts.ready; } catch (e) {}
        await loadAssets();
      })();
    }
    return fontsReady;
  }
  function byId(id) { return FRAMES.find((f) => f.id === id) || FRAMES[0]; }
  const bgCache = new Map();
  function bgLayer(spec, layout) {
    const key = spec.id + "|" + layout;
    if (bgCache.has(key)) { const c = bgCache.get(key); bgCache.delete(key); bgCache.set(key, c); return c; }
    const g = geomFor(spec, layout);
    const c = document.createElement("canvas"); c.width = g.W; c.height = g.H;
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
    x.fillStyle = spec.thumbBg || "#F6EFE6"; x.fillRect(0, 0, g.W, g.H);
    spec.bg.call(spec, x, layout);
    bgCache.set(key, c);
    while (bgCache.size > 8) bgCache.delete(bgCache.keys().next().value);
    return c;
  }

  async function compose(canvas, images, opts) {
    await ready();
    const spec = byId(opts.frame);
    const layout = layoutOf(opts.layout);
    const g = geomFor(spec, layout);
    const n = shotCount(layout);
    images = images || [];
    const ims = Array.from({ length: n }, (_, i) => images[i] || images[images.length - 1] || null);
    canvas.width = g.W; canvas.height = g.H;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bgLayer(spec, layout), 0, 0);
    spec.photos.call(spec, ctx, layout, ims);
    if (opts.overlay) ctx.drawImage(opts.overlay, 0, 0, g.W, g.H);
    spec.fg.call(spec, ctx, layout, opts.texts || {}, { logo: opts.logo || null });
    return canvas;
  }

  let ph = null;
  function placeholder() {
    if (ph) return ph;
    const c = document.createElement("canvas"); c.width = 960; c.height = 720;
    const x = c.getContext("2d");
    const gr = x.createLinearGradient(0, 0, 960, 720);
    gr.addColorStop(0, "#E8D5C8"); gr.addColorStop(1, "#C9A8A0");
    x.fillStyle = gr; x.fillRect(0, 0, 960, 720);
    const person = (cx, col) => { x.fillStyle = col; x.beginPath(); x.arc(cx, 280, 80, 0, Math.PI * 2); x.fill(); x.beginPath(); x.ellipse(cx, 700, 180, 250, 0, Math.PI, 0); x.fill(); };
    person(380, "#9C8579"); person(580, "#8E6E6A");
    ph = c; return c;
  }
  const thumbCache = new Map();
  async function thumbnail(frameId, layout, texts, width, logo) {
    const key = frameId + "|" + layout + "|" + width + "|" + (texts && texts.names) + (logo ? "|L" : "");
    if (thumbCache.has(key)) return thumbCache.get(key);
    const job = makeThumb(frameId, layout, texts, width, logo);
    thumbCache.set(key, job); job.catch(() => thumbCache.delete(key));
    return job;
  }
  async function makeThumb(frameId, layout, texts, width, logo) {
    const big = document.createElement("canvas");
    const n = shotCount(layoutOf(layout));
    await compose(big, Array(n).fill(placeholder()), { frame: frameId, layout, texts, logo });
    const { W, H } = sizeOf(layout);
    const c = document.createElement("canvas"); c.width = width; c.height = Math.round(width * (H / W));
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(big, 0, 0, c.width, c.height);
    big.width = big.height = 1;
    return c.toDataURL("image/jpeg", 0.85);
  }
  function warm() { return ready(); }
  loadAssets();
  window.PBFrames = { FRAMES, byId, compose, thumbnail, ready, warm, geometry, size, W: BASE_W, H: BASE_H, FONT, assets: A };
})();
