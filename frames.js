/* PBFrames v5 — Photobooth Jawa Undangan (Ratna Prastyani & Nuryadi).
 * Bingkai bawaan: theta-mawar + tata letak strip2 (dua foto vertikal).
 * Kanvas 1200×1800 (2:3). API tetap: compose, thumbnail, ready, warm, geometry, FRAMES, byId.
 */
(function () {
  "use strict";
  const W = 1200, H = 1800;
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
    "400 90px 'Great Vibes'", "400 90px 'Ms Madi'",
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
  function txt(ctx, text, x, y, o) {
    if (!text) return 0;
    o = o || {};
    ctx.save();
    setTrack(ctx, o.track);
    ctx.fillStyle = o.color || "#000";
    ctx.textAlign = o.align || "center";
    ctx.textBaseline = o.base || "alphabetic";
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const s = o.max ? fitFont(ctx, text, o.max, o.size, o.min || 12, o.fn) : (ctx.font = o.fn(o.size), o.size);
    ctx.fillText(text, x, y);
    ctx.restore();
    return s;
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

  function slots(L, box, gap) {
    const { x, y, w, h } = box;
    if (L === "grid4") {
      const cw = (w - gap) / 2, ch = (h - gap) / 2;
      return [0, 1, 2, 3].map((i) => ({ x: x + (i % 2) * (cw + gap), y: y + Math.floor(i / 2) * (ch + gap), w: cw, h: ch }));
    }
    if (L === "strip3") {
      const ch = (h - gap * 2) / 3;
      return [0, 1, 2].map((i) => ({ x, y: y + i * (ch + gap), w, h: ch }));
    }
    if (L === "strip2") {
      const ch = (h - gap) / 2;
      return [{ x, y, w, h: ch }, { x, y: y + ch + gap, w, h: ch }];
    }
    return [{ x, y, w, h }];
  }

  function layoutOf(L) {
    return L === "grid4" || L === "strip3" || L === "strip2" ? L : "single";
  }
  function shotCount(L) {
    return L === "grid4" ? 4 : L === "strip3" ? 3 : L === "strip2" ? 2 : 1;
  }

  function paperFill(ctx, color) {
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

  /* ---- geometry for the Theta-style invitation strip (2:3 paper) ---- */
  function thetaBox(layout) {
    const M = 44, HEAD = 92, FOOT = 500, GAP = 14;
    return slots(layoutOf(layout), { x: M, y: HEAD, w: W - 2 * M, h: H - HEAD - FOOT }, GAP);
  }

  function drawThetaDecor(ctx, pal) {
    smear(ctx, 160, 1680, 420, pal.smear, 0.42);
    smear(ctx, 1040, 1700, 400, pal.smear2 || pal.smear, 0.4);
    smear(ctx, 600, 1760, 260, pal.smear, 0.18);
    const gun = img("gunungan"), gajah = img("gajah"), fl = img("floral");
    if (fl) {
      const dw = W, dh = fl.height * (dw / fl.width);
      ctx.drawImage(fl, 0, H - dh + 36, dw, dh);
    }
    /* silhouettes on top of florals so they stay visible at the corners */
    if (gun) drawContain(ctx, gun, -20, 1320, 280, 470);
    if (gajah) drawContain(ctx, gajah, 860, 1480, 360, 310);
  }

  function drawThetaType(ctx, T, pal) {
    /* top header */
    txt(ctx, T.mono, 600, 58, { fn: F.cinzel(600), size: 22, track: 10, color: pal.header, max: 900 });
    /* bottom typography */
    let y = 1388;
    txt(ctx, T.heading || "THE WEDDING OF", 600, y, { fn: F.cinzel(600), size: 22, track: 8, color: pal.ink, max: 920 });
    y += 78;
    txt(ctx, T.a, 600, y, { fn: F.script(), size: 78, color: pal.ink, max: 980, min: 44 });
    y += 52;
    txt(ctx, "&", 600, y, { fn: F.script(), size: 48, color: pal.inkSoft, max: 200 });
    y += 70;
    if (T.b) txt(ctx, T.b, 600, y, { fn: F.script(), size: 78, color: pal.ink, max: 980, min: 44 });
    y += 56;
    txt(ctx, T.dotsSpaced || T.dots, 600, y, { fn: F.serif(500), size: 26, track: 6, color: pal.ink, max: 800 });
    y += 36;
    if (T.reception) {
      txt(ctx, T.reception.replace(/\s*WIB\s*-\s*/g, "–").replace(/\s*WIB\s*$/, " WIB"), 600, y, {
        fn: F.serif(500, true), size: 18, track: 1, color: pal.inkSoft, max: 980
      });
    }
  }

  function makeTheta(id, name, pal) {
    return {
      id, name, thumbBg: pal.paper,
      bg: function (ctx, layout) {
        paperFill(ctx, pal.paper);
      },
      photos: function (ctx, layout, ims) {
        const sl = thetaBox(layout);
        sl.forEach((s, i) => photo(ctx, ims[i], s, { pad: 0, r: 0, matColor: pal.paper, shadow: "rgba(80,40,36,.10)", blur: 8 }));
      },
      fg: function (ctx, layout, texts) {
        const T = textsOf(texts);
        /* typography first, then decor so florals/gunungan overlap the lower photo and type sides */
        drawThetaType(ctx, T, pal);
        drawThetaDecor(ctx, pal);
        /* redraw type on top of florals only in the center band so names stay readable */
        ctx.save();
        ctx.beginPath();
        ctx.rect(220, 1320, 760, 460);
        ctx.clip();
        drawThetaType(ctx, T, pal);
        ctx.restore();
      }
    };
  }

  const thetaMawar = makeTheta("theta-mawar", "Undangan Mawar", {
    paper: "#F6EFE6", ink: "#8B4F4A", inkSoft: "#A56A64", header: "#6B3A36", smear: "#C4A0A0", smear2: "#B07A86"
  });
  const thetaPeach = makeTheta("theta-peach", "Undangan Peach", {
    paper: "#F3DCD0", ink: "#8B5A44", inkSoft: "#A87868", header: "#7A4638", smear: "#D9A5A0", smear2: "#C98980"
  });
  const thetaPlum = makeTheta("theta-plum", "Undangan Plum", {
    paper: "#F3E8EE", ink: "#6B3A4A", inkSoft: "#8A5A6A", header: "#5C2E3C", smear: "#C4A0B0", smear2: "#A87890"
  });

  function jawaBox(layout, inset) {
    const M = inset || 110, HEAD = 120, FOOT = 280, GAP = 16;
    return slots(layoutOf(layout), { x: M, y: HEAD, w: W - 2 * M, h: H - HEAD - FOOT }, GAP);
  }

  function drawBatikBorder(ctx, which, alpha) {
    const b = img(which === "peach" ? "batikPeach" : "batik");
    if (!b) return;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    /* side panels */
    ctx.drawImage(b, 0, 0, b.width * 0.35, b.height, 0, 0, 96, H);
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.drawImage(b, 0, 0, b.width * 0.35, b.height, 0, 0, 96, H);
    ctx.restore();
    /* top / bottom strips */
    ctx.drawImage(b, 0, 0, b.width, b.height * 0.2, 0, 0, W, 72);
    ctx.drawImage(b, 0, b.height * 0.8, b.width, b.height * 0.2, 0, H - 72, W, 72);
    ctx.restore();
  }

  const kayonBatik = {
    id: "kayon-batik", name: "Kayon Batik", thumbBg: "#F3DCD0",
    bg: function (ctx) {
      paperFill(ctx, "#F3DCD0");
      drawBatikBorder(ctx, "brown", 0.92);
    },
    photos: function (ctx, layout, ims) {
      jawaBox(layout, 118).forEach((s, i) => photo(ctx, ims[i], s, { pad: 8, r: 4, matColor: "#F8EEE6" }));
    },
    fg: function (ctx, layout, texts) {
      const T = textsOf(texts);
      const gun = img("gunungan");
      if (gun) drawContain(ctx, gun, 500, 8, 200, 280);
      txt(ctx, T.heading, 600, 1570, { fn: F.cinzel(600), size: 18, track: 7, color: "#8B5A44", max: 800 });
      txt(ctx, T.a + (T.b ? "  &  " + T.b : ""), 600, 1640, { fn: F.script(), size: 56, color: "#8B5A44", max: 980 });
      txt(ctx, T.dotsSpaced, 600, 1690, { fn: F.serif(500), size: 22, track: 5, color: "#8B5A44", max: 800 });
      if (T.reception) txt(ctx, T.reception, 600, 1730, { fn: F.serif(500, true), size: 16, color: "#A87868", max: 980 });
    }
  };

  const jogloTerjun = {
    id: "joglo-terjun", name: "Joglo & Air Terjun", thumbBg: "#F3DCD0",
    bg: function (ctx) {
      paperFill(ctx, "#F8EEE6");
      const sc = img("scene");
      if (sc) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        cover(ctx, sc, 0, 0, W, H);
        ctx.restore();
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(248,238,230,0.15)");
        g.addColorStop(0.35, "rgba(248,238,230,0.55)");
        g.addColorStop(0.72, "rgba(248,238,230,0.2)");
        g.addColorStop(1, "rgba(243,220,208,0.55)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      drawBatikBorder(ctx, "peach", 0.55);
    },
    photos: function (ctx, layout, ims) {
      jawaBox(layout, 130).forEach((s, i) => photo(ctx, ims[i], s, { pad: 10, r: 2, matColor: "#F8EEE6" }));
    },
    fg: function (ctx, layout, texts) {
      const T = textsOf(texts);
      txt(ctx, T.heading, 600, 86, { fn: F.cinzel(600), size: 18, track: 8, color: "#8B5A44", max: 800 });
      txt(ctx, T.a + (T.b ? "  &  " + T.b : ""), 600, 1588, { fn: F.script(), size: 60, color: "#8B5A44", max: 980 });
      txt(ctx, T.dotsSpaced, 600, 1644, { fn: F.serif(500), size: 22, track: 5, color: "#8B5A44", max: 800 });
      if (T.reception) txt(ctx, T.reception, 600, 1684, { fn: F.serif(500, true), size: 16, color: "#A87868", max: 980 });
      if (T.venue) txt(ctx, T.venue, 600, 1724, { fn: F.serif(400), size: 15, color: "#A87868", max: 900 });
    }
  };

  const wayangPasangan = {
    id: "wayang-pasangan", name: "Wayang Berpasangan", thumbBg: "#F6EFE6",
    bg: function (ctx) {
      paperFill(ctx, "#F6EFE6");
      drawBatikBorder(ctx, "peach", 0.4);
    },
    photos: function (ctx, layout, ims) {
      jawaBox(layout, 150).forEach((s, i) => photo(ctx, ims[i], s, { pad: 8, r: 6, matColor: "#fff" }));
    },
    fg: function (ctx, layout, texts) {
      const T = textsOf(texts);
      const L = img("wayangL"), R = img("wayangR");
      if (L) drawContain(ctx, L, -10, 980, 280, 520);
      if (R) drawContain(ctx, R, 930, 980, 280, 520);
      txt(ctx, T.heading, 600, 80, { fn: F.cinzel(600), size: 18, track: 8, color: "#8B4F4A", max: 800 });
      txt(ctx, T.a, 600, 1570, { fn: F.script(), size: 58, color: "#8B4F4A", max: 700 });
      txt(ctx, "&", 600, 1614, { fn: F.script(), size: 36, color: "#A56A64" });
      if (T.b) txt(ctx, T.b, 600, 1670, { fn: F.script(), size: 58, color: "#8B4F4A", max: 700 });
      txt(ctx, T.dotsSpaced, 600, 1718, { fn: F.serif(500), size: 20, track: 4, color: "#8B4F4A", max: 800 });
      if (T.reception) txt(ctx, T.reception, 600, 1752, { fn: F.serif(500, true), size: 15, color: "#A56A64", max: 900 });
    }
  };

  const merakTeratai = {
    id: "merak-teratai", name: "Merak & Teratai", thumbBg: "#F3DCD0",
    bg: function (ctx) {
      paperFill(ctx, "#F3DCD0");
      const mer = img("merak");
      if (mer) {
        ctx.save(); ctx.globalAlpha = 0.55;
        drawContain(ctx, mer, 820, 40, 340, 420);
        ctx.save(); ctx.translate(380, 40); ctx.scale(-1, 1);
        drawContain(ctx, mer, 0, 0, 340, 420);
        ctx.restore(); ctx.restore();
      }
      const fl = img("floral");
      if (fl) {
        const dw = W, dh = fl.height * (dw / fl.width);
        ctx.drawImage(fl, 0, H - dh + 80, dw, dh);
      }
    },
    photos: function (ctx, layout, ims) {
      jawaBox(layout, 120).forEach((s, i) => photo(ctx, ims[i], s, { pad: 10, r: 4, matColor: "#F8EEE6" }));
    },
    fg: function (ctx, layout, texts) {
      const T = textsOf(texts);
      txt(ctx, T.heading, 600, 86, { fn: F.cinzel(600), size: 18, track: 8, color: "#8B5A44", max: 800 });
      txt(ctx, T.a + (T.b ? "  &  " + T.b : ""), 600, 1600, { fn: F.script(), size: 58, color: "#8B5A44", max: 980 });
      txt(ctx, T.dotsSpaced, 600, 1654, { fn: F.serif(500), size: 22, track: 5, color: "#8B5A44", max: 800 });
      if (T.reception) txt(ctx, T.reception, 600, 1694, { fn: F.serif(500, true), size: 16, color: "#A87868", max: 980 });
    }
  };

  const FRAMES = [thetaMawar, thetaPeach, thetaPlum, kayonBatik, jogloTerjun, wayangPasangan, merakTeratai];

  function geometry(spec, layout) {
    const L = layoutOf(layout);
    const n = shotCount(L);
    const sl = (spec && spec.id && String(spec.id).indexOf("theta-") === 0) ? thetaBox(L) : jawaBox(L, 118);
    return { W, H, layout: L, n, area: { x: 0, y: 0, w: W, h: H }, slots: sl };
  }

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
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
    x.fillStyle = spec.thumbBg || "#F6EFE6"; x.fillRect(0, 0, W, H);
    spec.bg.call(spec, x, layout);
    bgCache.set(key, c);
    while (bgCache.size > 4) bgCache.delete(bgCache.keys().next().value);
    return c;
  }

  async function compose(canvas, images, opts) {
    await ready();
    const spec = byId(opts.frame);
    const layout = layoutOf(opts.layout);
    const n = shotCount(layout);
    images = images || [];
    const ims = Array.from({ length: n }, (_, i) => images[i] || images[images.length - 1] || null);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bgLayer(spec, layout), 0, 0);
    spec.photos.call(spec, ctx, layout, ims);
    if (opts.overlay) ctx.drawImage(opts.overlay, 0, 0, W, H);
    spec.fg.call(spec, ctx, layout, opts.texts || {}, { logo: opts.logo || null });
    return canvas;
  }

  let ph = null;
  function placeholder() {
    if (ph) return ph;
    const c = document.createElement("canvas"); c.width = 960; c.height = 640;
    const x = c.getContext("2d");
    const gr = x.createLinearGradient(0, 0, 960, 640);
    gr.addColorStop(0, "#E8D5C8"); gr.addColorStop(1, "#C9A8A0");
    x.fillStyle = gr; x.fillRect(0, 0, 960, 640);
    const person = (cx, col) => { x.fillStyle = col; x.beginPath(); x.arc(cx, 250, 80, 0, Math.PI * 2); x.fill(); x.beginPath(); x.ellipse(cx, 620, 180, 250, 0, Math.PI, 0); x.fill(); };
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
    const c = document.createElement("canvas"); c.width = width; c.height = Math.round(width * 1.5);
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(big, 0, 0, c.width, c.height);
    big.width = big.height = 1;
    return c.toDataURL("image/jpeg", 0.85);
  }
  function warm() { return ready(); }
  loadAssets();
  window.PBFrames = { FRAMES, byId, compose, thumbnail, ready, warm, geometry, W, H, FONT, assets: A };
})();
