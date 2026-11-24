/* Pemeriksa PIN bersama untuk galeri.html & admin.html.
 * Utama: cek di server (RPC verify_pin, SECURITY DEFINER, dengan batas percobaan).
 * FALLBACK_SHA256 hanya dipakai selama fungsi SQL belum terpasang di Supabase.
 * Setelah supabase-update-2.sql dijalankan, kosongkan FALLBACK_SHA256 ("")
 * lalu deploy ulang, supaya hash PIN tidak ada lagi di kode klien. */
(function () {
  const FALLBACK_SHA256 = "351fd814a09401adc433ab045df1bb53d2bbd6e9b7952a9ef0b2a5b721d3b365";
  const SALT = "rnjawa-photobooth:";

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function isMissingFn(error) {
    if (!error) return false;
    const code = String(error.code || "");
    const msg = String(error.message || "");
    return code === "PGRST202" || code === "42883" || /could not find the function|does not exist/i.test(msg);
  }

  async function verify(client, pin) {
    pin = String(pin || "").trim();
    if (!pin) return { ok: false, error: "empty" };
    if (client) {
      try {
        const { data, error } = await client.rpc("verify_pin", { p_pin: pin });
        if (!error && data) return { ok: !!data.ok, error: data.error || null, mode: "server" };
        if (error && !isMissingFn(error)) {
          // jaringan/server bermasalah: gunakan fallback bila masih ada
          if (!FALLBACK_SHA256) return { ok: false, error: "network", mode: "server" };
        }
      } catch (e) {
        if (!FALLBACK_SHA256) return { ok: false, error: "network", mode: "server" };
      }
    }
    if (!FALLBACK_SHA256) return { ok: false, error: "server_unavailable" };
    const h = await sha256Hex(SALT + pin);
    return { ok: h === FALLBACK_SHA256, error: h === FALLBACK_SHA256 ? null : "invalid_pin", mode: "fallback" };
  }

  function message(res) {
    switch (res && res.error) {
      case "too_many_attempts": return "Terlalu banyak percobaan salah. Tunggu 10 menit lalu coba lagi.";
      case "network": return "Tidak dapat menghubungi server. Periksa koneksi internet lalu coba lagi.";
      case "server_unavailable": return "Server PIN belum siap. Hubungi panitia.";
      case "empty": return "Masukkan PIN terlebih dahulu.";
      default: return "PIN tidak sesuai.";
    }
  }

  window.PBPin = { verify, message, isMissingFn, hasFallback: () => !!FALLBACK_SHA256 };
})();
