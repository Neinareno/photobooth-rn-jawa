/* PBFilters v2 — preset foto profesional untuk photobooth R & N.
 * Pipeline (WebGL, sama untuk pratinjau live & hasil akhir):
 *   penghalus kulit (bilateral + frequency separation, hanya di area kulit) → pertajam non-kulit
 *   → exposure & white balance (temperature/tint) → channel mixer (mono)
 *   → kurva tone per-channel (LUT 256 dari titik kontrol, interpolasi monotone cubic)
 *   → saturasi + vibrance dengan perlindungan warna kulit → split toning (bayangan/sorotan)
 *   → halation lembut (opsional) → vinyet → grain film (berbobot luminans).
 * Fallback tanpa WebGL: pipeline yang sama di JS (hasil akhir) + filter CSS (pratinjau live).
 */
(function () {
  "use strict";

  /* ---------- preset ----------
   * curve: titik kontrol [x,y] 0..255 untuk master (m) dan kanal r/g/b.
   * exp (stop), temp (-1..1 → biru..kuning), tint (-1..1 → hijau..magenta), sat, vib,
   * skin (0..1 lindungi kulit dari perubahan saturasi), smooth, detail (tekstur kulit yang dikembalikan),
   * sharpen, shCol/hiCol (warna split toning), shAmt/hiAmt, bal, halo, vignette, grain, mono [r,g,b].
   */
  const BASE = { exp: 0, temp: 0, tint: 0, sat: 1, vib: 0, skin: 0.6, smooth: 0, detail: 0.4, sharpen: 0.12, shCol: [0.5, 0.5, 0.5], hiCol: [0.5, 0.5, 0.5], shAmt: 0, hiAmt: 0, bal: 0, halo: 0, vignette: 0, grain: 0, mono: null, curve: {} };
  const P = (o) => Object.assign({}, BASE, o);
  const FILTERS = [
    { id: "natural", name: "Natural", desc: "Bersih & jernih, warna asli",
      p: P({ exp: 0.0, vib: 0.08, smooth: 0.18, detail: 0.5, sharpen: 0.16, curve: { m: [[0, 2], [64, 60], [128, 129], [192, 197], [255, 253]] } }),
      css: "contrast(1.04) saturate(1.06)", swatch: ["#e9cdb8", "#9b7b66"] },
    { id: "soft-skin", name: "Soft Skin", desc: "Kulit halus alami, detail tetap tajam",
      p: P({ exp: 0.05, temp: 0.04, tint: 0.03, sat: 0.97, vib: 0.06, skin: 0.7, smooth: 0.62, detail: 0.38, sharpen: 0.2,
        hiCol: [1.0, 0.86, 0.82], hiAmt: 0.06, curve: { m: [[0, 8], [56, 62], [128, 138], [196, 206], [255, 250]] } }),
      css: "brightness(1.07) contrast(0.97) saturate(0.98)", swatch: ["#f6dccf", "#e2aa96"] },
    { id: "korean", name: "Korean Bright", desc: "Cerah, airy, sedikit sejuk",
      p: P({ exp: 0.1, temp: -0.12, tint: 0.04, sat: 0.9, vib: 0.04, skin: 0.8, smooth: 0.5, detail: 0.4, sharpen: 0.14,
        shCol: [0.62, 0.66, 0.78], shAmt: 0.08, hiCol: [1.0, 0.95, 0.96], hiAmt: 0.05, halo: 0.08,
        curve: { m: [[0, 26], [64, 92], [128, 160], [200, 222], [255, 250]], b: [[0, 10], [128, 132], [255, 255]] } }),
      css: "brightness(1.14) contrast(0.86) saturate(0.88) hue-rotate(-4deg)", swatch: ["#eef1fb", "#c7d3ef"] },
    { id: "portra", name: "Film Portra", desc: "Hangat-netral, kontras lembut, grain halus",
      p: P({ exp: 0.04, temp: 0.12, tint: -0.02, sat: 0.9, vib: 0.1, skin: 0.6, smooth: 0.28, detail: 0.5, sharpen: 0.1,
        shCol: [0.42, 0.46, 0.5], shAmt: 0.06, hiCol: [1.0, 0.9, 0.76], hiAmt: 0.08, vignette: 0.18, grain: 0.038,
        curve: { m: [[0, 16], [48, 50], [128, 132], [204, 204], [255, 242]], r: [[0, 0], [128, 132], [255, 255]], b: [[0, 8], [128, 122], [255, 236]] } }),
      css: "sepia(0.12) contrast(0.95) saturate(0.95) brightness(1.03)", swatch: ["#ead2b0", "#a77b5a"] },
    { id: "fuji", name: "Fuji Pastel", desc: "Bayangan hijau-toska, sorotan lembut",
      p: P({ exp: 0.04, temp: 0.02, tint: -0.04, sat: 0.82, vib: 0.06, skin: 0.75, smooth: 0.32, detail: 0.45, sharpen: 0.12,
        shCol: [0.28, 0.58, 0.52], shAmt: 0.2, hiCol: [1.0, 0.92, 0.84], hiAmt: 0.1, grain: 0.025,
        curve: { m: [[0, 26], [64, 78], [128, 138], [192, 198], [255, 242]], g: [[0, 8], [128, 131], [255, 252]] } }),
      css: "brightness(1.07) contrast(0.88) saturate(0.84) hue-rotate(6deg)", swatch: ["#dcebe3", "#8fb7aa"] },
    { id: "mint", name: "Cool Mint", desc: "Segar & dingin, nuansa mint",
      p: P({ exp: 0.08, temp: -0.24, tint: -0.07, sat: 0.9, vib: 0.06, skin: 0.85, smooth: 0.4, detail: 0.42, sharpen: 0.14,
        shCol: [0.36, 0.6, 0.66], shAmt: 0.08, hiCol: [0.82, 1.0, 0.95], hiAmt: 0.12,
        curve: { m: [[0, 6], [64, 70], [128, 142], [196, 212], [255, 253]] } }),
      css: "brightness(1.08) contrast(0.92) saturate(0.92) hue-rotate(-10deg)", swatch: ["#e1f4ee", "#9fd2c4"] },
    { id: "peachy", name: "Peachy Rose", desc: "Merona peach, lembut & hangat",
      p: P({ exp: 0.04, temp: 0.08, tint: 0.1, sat: 0.95, vib: 0.06, skin: 0.6, smooth: 0.5, detail: 0.4, sharpen: 0.14,
        shCol: [0.56, 0.42, 0.48], shAmt: 0.08, hiCol: [1.0, 0.84, 0.76], hiAmt: 0.12, halo: 0.05,
        curve: { m: [[0, 14], [64, 72], [128, 140], [196, 206], [255, 250]], r: [[0, 4], [128, 134], [255, 255]] } }),
      css: "brightness(1.07) contrast(0.93) saturate(0.95) sepia(0.08) hue-rotate(-8deg)", swatch: ["#fbd9cc", "#e7a39a"] },
    { id: "mono", name: "Mono Klasik", desc: "Hitam-putih kontras dengan grain",
      p: P({ exp: 0.02, sat: 0, smooth: 0.3, detail: 0.5, sharpen: 0.22, mono: [0.42, 0.46, 0.12], vignette: 0.26, grain: 0.05,
        curve: { m: [[0, 6], [52, 38], [128, 128], [200, 214], [255, 255]] } }),
      css: "grayscale(1) contrast(1.18) brightness(1.02)", swatch: ["#e8e8e8", "#2b2b2b"] },
    { id: "vintage", name: "Vintage Pudar", desc: "Matte pudar ala foto lama",
      p: P({ exp: 0.02, temp: 0.1, tint: 0.02, sat: 0.74, vib: 0, skin: 0.5, smooth: 0.25, detail: 0.5, sharpen: 0.08,
        shCol: [0.42, 0.4, 0.52], shAmt: 0.1, hiCol: [1.0, 0.9, 0.74], hiAmt: 0.1, vignette: 0.3, grain: 0.045,
        curve: { m: [[0, 42], [72, 92], [160, 172], [255, 226]], r: [[0, 6], [255, 255]], b: [[0, 24], [255, 226]] } }),
      css: "sepia(0.3) contrast(0.82) saturate(0.75) brightness(1.04)", swatch: ["#e3d3bd", "#9a876f"] }
  ];
  const ALIAS = { glow: "soft-skin", "warm-gold": "portra", rosy: "peachy", film: "vintage", bw: "mono" };
  const DEFAULT = "soft-skin";
  const byId = (id) => FILTERS.find((f) => f.id === (ALIAS[id] || id)) || FILTERS.find((f) => f.id === DEFAULT);

  /* ---------- kurva: monotone cubic (Fritsch–Carlson) → LUT 256 ---------- */
  function curveLUT(pts) {
    const lut = new Float32Array(256);
    if (!pts || pts.length < 2) { for (let i = 0; i < 256; i++) lut[i] = i / 255; return lut; }
    const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    let k = 0;
    for (let x = 0; x < 256; x++) {
      if (x <= xs[0]) { lut[x] = ys[0] / 255; continue; }
      if (x >= xs[n - 1]) { lut[x] = ys[n - 1] / 255; continue; }
      while (k < n - 2 && x > xs[k + 1]) k++;
      const h = xs[k + 1] - xs[k], t = (x - xs[k]) / h, t2 = t * t, t3 = t2 * t;
      const y = (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1];
      lut[x] = Math.max(0, Math.min(255, y)) / 255;
    }
    return lut;
  }
  const lutCache = {};
  /** LUT gabungan: kanal(master(x)). Hasil Uint8 RGBA 256×1. */
  function filterLUT(f) {
    if (lutCache[f.id]) return lutCache[f.id];
    const c = f.p.curve || {};
    const M = curveLUT(c.m), Rc = curveLUT(c.r), Gc = curveLUT(c.g), Bc = curveLUT(c.b);
    const at = (L, v) => { const x = v * 255, i = Math.floor(x), fr = x - i; return i >= 255 ? L[255] : L[i] * (1 - fr) + L[i + 1] * fr; };
    const out = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      const v = M[i];
      out[i * 4] = Math.round(at(Rc, v) * 255); out[i * 4 + 1] = Math.round(at(Gc, v) * 255); out[i * 4 + 2] = Math.round(at(Bc, v) * 255); out[i * 4 + 3] = 255;
    }
    return (lutCache[f.id] = out);
  }

  const VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){ v_uv = vec2((a_pos.x+1.0)*0.5, 1.0-(a_pos.y+1.0)*0.5); gl_Position = vec4(a_pos,0.0,1.0); }`;

  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform sampler2D u_lut;
uniform vec2 u_texel;
uniform float u_radius;
uniform float u_smooth, u_detail, u_sharpen, u_exp, u_temp, u_tint, u_sat, u_vib, u_skin;
uniform float u_shAmt, u_hiAmt, u_bal, u_halo, u_vignette, u_grain, u_mono;
uniform vec3 u_shCol, u_hiCol, u_monoMix;
uniform vec2 u_outSize;

float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
float skinMask(vec3 c){
  float y  = dot(c, vec3(0.299,0.587,0.114));
  float cb = 0.5 - 0.168736*c.r - 0.331264*c.g + 0.5*c.b;
  float cr = 0.5 + 0.5*c.r - 0.418688*c.g - 0.081312*c.b;
  float m = smoothstep(0.285, 0.315, cb) * (1.0 - smoothstep(0.49, 0.52, cb));
  m *= smoothstep(0.515, 0.545, cr) * (1.0 - smoothstep(0.66, 0.69, cr));
  m *= smoothstep(0.10, 0.22, y) * (1.0 - smoothstep(0.93, 0.99, y));
  return m;
}
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 lut(vec3 c){
  c = clamp(c, 0.0, 1.0) * (255.0/256.0) + 0.5/256.0;
  return vec3(texture2D(u_lut, vec2(c.r, 0.5)).r, texture2D(u_lut, vec2(c.g, 0.5)).g, texture2D(u_lut, vec2(c.b, 0.5)).b);
}
void main(){
  vec3 c = texture2D(u_tex, v_uv).rgb;
  vec3 col = c;
  float skin = skinMask(c);
  vec3 blur = c;
  if (u_smooth > 0.001 || u_sharpen > 0.001 || u_halo > 0.001) {
    vec3 bsum = c; float bw = 1.0; vec3 gsum = c; float gw = 1.0;
    const float SIG_R = 0.07;
    for (int ring = 0; ring < 2; ring++) {
      float rr = ring == 0 ? 0.5 : 1.0;
      float ang0 = ring == 0 ? 0.0 : 0.3927;
      float ws = ring == 0 ? 0.85 : 0.55;
      for (int i = 0; i < 8; i++) {
        float a = ang0 + float(i) * 0.785398;
        vec2 off = vec2(cos(a), sin(a)) * u_radius * rr * u_texel;
        vec3 s = texture2D(u_tex, v_uv + off).rgb;
        vec3 d = s - c;
        float wr = exp(-dot(d,d) / (2.0*SIG_R*SIG_R));
        bsum += s * ws * wr; bw += ws * wr;
        gsum += s * ws; gw += ws;
      }
    }
    vec3 bil = bsum / bw;
    blur = gsum / gw;
    vec3 smoothSkin = bil + (c - bil) * u_detail;
    col = mix(c, smoothSkin, clamp(u_smooth * skin, 0.0, 0.9));
    col += (c - blur) * u_sharpen * (1.0 - 0.7*skin);
  }
  // exposure + white balance
  col *= exp2(u_exp);
  col *= vec3(1.0 + 0.10*u_temp + 0.03*u_tint, 1.0 - 0.06*u_tint, 1.0 - 0.12*u_temp + 0.03*u_tint);
  // highlight roll-off lembut agar tidak terbakar
  col = col / (1.0 + max(col - 0.8, 0.0) * 1.2);
  if (u_mono > 0.5) col = vec3(dot(col, u_monoMix));
  col = lut(col);
  // saturasi + vibrance, kulit dilindungi
  float l = luma(col);
  float mx = max(col.r, max(col.g, col.b)), mn = min(col.r, min(col.g, col.b));
  float satNow = mx - mn;
  float s = u_sat * (1.0 + u_vib * (1.0 - smoothstep(0.0, 0.6, satNow)));
  s = mix(s, mix(1.0, s, 0.35), skin * u_skin);
  col = mix(vec3(l), col, s);
  // split toning (soft, berbasis luminans)
  float ws2 = 1.0 - smoothstep(0.0, 0.55 + u_bal, l);
  float wh = smoothstep(0.45 + u_bal, 1.0, l);
  col += (u_shCol - vec3(luma(u_shCol))) * u_shAmt * ws2 * 2.0;
  col += (u_hiCol - vec3(luma(u_hiCol))) * u_hiAmt * wh * 2.0;
  // halation / airy glow sangat halus
  if (u_halo > 0.0) { vec3 bl = max(blur - 0.6, 0.0) / 0.4; col = 1.0 - (1.0 - col) * (1.0 - bl * u_halo); }
  // vinyet
  vec2 q = v_uv - 0.5;
  col *= 1.0 - u_vignette * smoothstep(0.3, 0.95, length(q * vec2(1.0, 1.1)) * 1.3);
  // grain film: lebih terlihat di nada tengah
  if (u_grain > 0.0) {
    float n = (hash(floor(v_uv * u_outSize)) + hash(floor(v_uv * u_outSize) + 17.0) - 1.0);
    float lw = 1.0 - abs(luma(col) - 0.5) * 1.4;
    col += n * u_grain * clamp(lw, 0.25, 1.0);
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  const UN = ["u_tex", "u_lut", "u_texel", "u_radius", "u_smooth", "u_detail", "u_sharpen", "u_exp", "u_temp", "u_tint", "u_sat", "u_vib", "u_skin", "u_shAmt", "u_hiAmt", "u_bal", "u_halo", "u_vignette", "u_grain", "u_mono", "u_shCol", "u_hiCol", "u_monoMix", "u_outSize"];
  function createRenderer(canvas) {
    const opts = { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: false, powerPreference: "high-performance" };
    const gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    if (!gl) return null;
    function sh(type, src) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const mkTex = () => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const tex = mkTex(), lutTex = mkTex();
    const U = {};
    UN.forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.u_tex, 0); gl.uniform1i(U.u_lut, 1);
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    let lutFor = null;

    function render(source, sw, sh2, filterId, outW, outH) {
      const F = byId(filterId), f = F.p;
      if (canvas.width !== outW || canvas.height !== outH) { canvas.width = outW; canvas.height = outH; }
      gl.viewport(0, 0, outW, outH);
      if (lutFor !== F.id) {
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, lutTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, filterLUT(F));
        lutFor = F.id;
      }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      gl.uniform2f(U.u_texel, 1 / sw, 1 / sh2);
      gl.uniform1f(U.u_radius, Math.max(1.5, Math.min(sw, sh2) * 0.009));
      ["smooth", "detail", "sharpen", "exp", "temp", "tint", "sat", "vib", "skin", "shAmt", "hiAmt", "bal", "halo", "vignette"].forEach((k) => gl.uniform1f(U["u_" + k], f[k]));
      // grain: skala ke resolusi keluaran agar ukuran butir mirip di pratinjau & hasil
      gl.uniform1f(U.u_grain, f.grain);
      gl.uniform1f(U.u_mono, f.mono ? 1 : 0);
      const mm = f.mono || [0.2126, 0.7152, 0.0722];
      gl.uniform3f(U.u_monoMix, mm[0], mm[1], mm[2]);
      gl.uniform3f(U.u_shCol, f.shCol[0], f.shCol[1], f.shCol[2]);
      gl.uniform3f(U.u_hiCol, f.hiCol[0], f.hiCol[1], f.hiCol[2]);
      const gs = Math.max(1, Math.round(Math.max(outW, outH) / 1100));
      gl.uniform2f(U.u_outSize, outW / gs, outH / gs);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return canvas;
    }
    return { gl, render, maxTex, lost: () => gl.isContextLost() };
  }

  /* ---------- fallback JS (tanpa WebGL): pipeline warna yang sama, tanpa penghalus ---------- */
  function apply2D(src, w, h, filterId) {
    const F = byId(filterId), f = F.p;
    const out = document.createElement("canvas"); out.width = w; out.height = h;
    const ctx = out.getContext("2d");
    ctx.drawImage(src, 0, 0, w, h);
    let id;
    try { id = ctx.getImageData(0, 0, w, h); } catch (e) { return out; }
    const d = id.data, L = filterLUT(F);
    const ex = Math.pow(2, f.exp);
    const wb = [1 + 0.10 * f.temp + 0.03 * f.tint, 1 - 0.06 * f.tint, 1 - 0.12 * f.temp + 0.03 * f.tint];
    const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const shL = lum(f.shCol), hiL = lum(f.hiCol);
    const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const lutAt = (v, ch) => { v = Math.max(0, Math.min(1, v)) * 255; const i = Math.floor(v), fr = v - i; const a = L[i * 4 + ch], b = L[Math.min(255, i + 1) * 4 + ch]; return (a * (1 - fr) + b * fr) / 255; };
    for (let i = 0; i < d.length; i += 4) {
      let c = [d[i] / 255 * ex * wb[0], d[i + 1] / 255 * ex * wb[1], d[i + 2] / 255 * ex * wb[2]];
      c = c.map((v) => v / (1 + Math.max(v - 0.8, 0) * 1.2));
      if (f.mono) { const g = c[0] * f.mono[0] + c[1] * f.mono[1] + c[2] * f.mono[2]; c = [g, g, g]; }
      c = [lutAt(c[0], 0), lutAt(c[1], 1), lutAt(c[2], 2)];
      const l = lum(c), sn = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
      const s = f.sat * (1 + f.vib * (1 - ss(0, 0.6, sn)));
      c = c.map((v) => l + (v - l) * s);
      const ws = 1 - ss(0, 0.55 + f.bal, l), wh = ss(0.45 + f.bal, 1, l);
      for (let k = 0; k < 3; k++) c[k] += (f.shCol[k] - shL) * f.shAmt * ws * 2 + (f.hiCol[k] - hiL) * f.hiAmt * wh * 2;
      d[i] = c[0] * 255; d[i + 1] = c[1] * 255; d[i + 2] = c[2] * 255;
    }
    ctx.putImageData(id, 0, 0);
    if (f.vignette > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + f.vignette + ")");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    return out;
  }

  /* ---------- API ---------- */
  let captureR = null, captureCanvas = null, glOK = null;
  function getCaptureRenderer() {
    if (captureR && !captureR.lost()) return captureR;
    captureCanvas = document.createElement("canvas");
    captureR = createRenderer(captureCanvas);
    glOK = !!captureR;
    return captureR;
  }
  /** Terapkan filter ke sumber (canvas/video/img) dan kembalikan canvas 2D baru. */
  function apply(src, filterId) {
    const w = src.videoWidth || src.naturalWidth || src.width;
    const h = src.videoHeight || src.naturalHeight || src.height;
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const r = getCaptureRenderer();
    if (r && w <= r.maxTex && h <= r.maxTex) {
      try {
        r.render(src, w, h, filterId, w, h);
        out.getContext("2d").drawImage(captureCanvas, 0, 0);
        return out;
      } catch (e) { console.warn("WebGL filter gagal, pakai fallback", e); }
    }
    return apply2D(src, w, h, filterId);
  }

  /* object-fit:cover, pusat. Dipakai pratinjau live & pengambilan foto supaya hasil = yang terlihat. */
  function sourceCover(sw, sh, dw, dh) {
    const scale = Math.max(dw / sw, dh / sh);
    const tw = dw / scale, th = dh / scale;
    return { sx: (sw - tw) / 2, sy: (sh - th) / 2, sw: tw, sh: th };
  }
  function coverDraw(ctx, src, dw, dh, flipX) {
    const sw = src.videoWidth || src.naturalWidth || src.width;
    const sh = src.videoHeight || src.naturalHeight || src.height;
    if (!sw || !sh) return;
    const r = sourceCover(sw, sh, dw, dh);
    ctx.save();
    if (flipX) { ctx.translate(dw, 0); ctx.scale(-1, 1); }
    ctx.drawImage(src, r.sx, r.sy, r.sw, r.sh, 0, 0, dw, dh);
    ctx.restore();
  }
  function coverToCanvas(src, dw, dh, flipX) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(dw));
    c.height = Math.max(1, Math.round(dh));
    coverDraw(c.getContext("2d"), src, c.width, c.height, !!flipX);
    return c;
  }

  /** Pratinjau live: canvas berukuran kotak tampilan, video di-cover di tengah (bukan object-fit CSS). */
  function createLivePreview(video, canvas, opts) {
    opts = opts || {};
    const maxLong = opts.maxLong || 960;
    let r = createRenderer(canvas);
    let filterId = byId(opts.filter || DEFAULT).id;
    let raf = 0, running = false, frames = 0, t0 = 0, fps = 0, lastMs = 0;
    let stage = document.createElement("canvas");
    const useGL = !!r;
    function isFlip() {
      if (typeof opts.flipX === "function") return !!opts.flipX();
      if (opts.flipX) return true;
      return !!(video && video.classList && video.classList.contains("mirror"));
    }
    if (!useGL) { canvas.style.display = "none"; video.style.opacity = "1"; }
    function destSize() {
      const w = canvas.clientWidth || canvas.offsetWidth || 0;
      const h = canvas.clientHeight || canvas.offsetHeight || 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let ow = Math.max(2, Math.round(w * dpr));
      let oh = Math.max(2, Math.round(h * dpr));
      const cap = maxLong / Math.max(ow, oh, 1);
      if (cap < 1) { ow = Math.max(2, Math.round(ow * cap)); oh = Math.max(2, Math.round(oh * cap)); }
      return { ow, oh };
    }
    function tick() {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh || video.readyState < 2) return;
      const { ow, oh } = destSize();
      if (ow < 2 || oh < 2) return;
      if (stage.width !== ow || stage.height !== oh) { stage.width = ow; stage.height = oh; }
      const sctx = stage.getContext("2d");
      sctx.clearRect(0, 0, ow, oh);
      /* Cermin di bitmap, bukan CSS scaleX: filter CSS (grayscale Mono Klasik)
       * + transform pada elemen yang sama menggeser pratinjau ke samping. */
      const flip = isFlip();
      coverDraw(sctx, video, ow, oh, flip);
      canvas.style.transform = "none";
      video.style.filter = "none";
      const t = performance.now();
      const glOk = !!(r && !r.lost());
      if (r && r.lost()) r = null;
      try {
        if (glOk) r.render(stage, ow, oh, filterId, ow, oh);
        else {
          const out = apply(stage, filterId);
          const cctx = canvas.getContext("2d");
          if (canvas.width !== ow || canvas.height !== oh) { canvas.width = ow; canvas.height = oh; }
          cctx.drawImage(out, 0, 0, ow, oh);
        }
      } catch (e) { return; }
      lastMs = performance.now() - t;
      frames++;
      if (!t0) t0 = t;
      if (t - t0 >= 1000) { fps = frames * 1000 / (t - t0); frames = 0; t0 = t; }
    }
    return {
      useGL,
      start() {
        if (running) return;
        running = true; t0 = 0; frames = 0;
        video.style.opacity = "0"; video.style.filter = "none";
        canvas.style.display = "block"; canvas.style.transform = "none";
        raf = requestAnimationFrame(tick);
      },
      stop() { running = false; cancelAnimationFrame(raf); },
      showVideo() { video.style.opacity = "1"; canvas.style.display = "none"; },
      setFilter(id) { filterId = byId(id).id; },
      resize() {},
      getFilter: () => filterId,
      stats: () => ({ fps: Math.round(fps * 10) / 10, lastRenderMs: Math.round(lastMs * 100) / 100, webgl: !!(r && !r.lost()) })
    };
  }

  /** Thumbnail kecil (dataURL) dari satu frame sumber, per filter (crop tengah agak ke atas = wajah). */
  function thumbnails(src, size) {
    size = size || 120;
    const w = src.videoWidth || src.naturalWidth || src.width;
    const h = src.videoHeight || src.naturalHeight || src.height;
    if (!w || !h) return {};
    const s = Math.min(w, h) * 0.8;
    const sq = document.createElement("canvas");
    sq.width = sq.height = size * 2;
    sq.getContext("2d").drawImage(src, (w - s) / 2, Math.max(0, (h - s) * 0.35), s, s, 0, 0, size * 2, size * 2);
    const out = {};
    FILTERS.forEach((f) => { out[f.id] = apply(sq, f.id).toDataURL("image/jpeg", 0.8); });
    return out;
  }

  window.PBFilters = { FILTERS, byId, apply, createLivePreview, thumbnails, DEFAULT, hasWebGL: () => { getCaptureRenderer(); return !!glOK; }, coverDraw, coverToCanvas, sourceCover };
})();
