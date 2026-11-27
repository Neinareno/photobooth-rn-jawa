# Photobooth Pernikahan Ratna Prastyani & Nuryadi (tema Jawa)

Versi baru bergaya undangan Jawa (peach, rose, coklat), terpisah dari photobooth Booth Media yang sudah ada. Semua data mempelai tetap sama; yang ditambahkan adalah nama tempat dan jam resepsi.

**Mempelai:** Ratna Prastyani & Nuryadi  
**Tanggal:** 29 . 01 . 2027  
**Monogram:** R & N  
**Hashtag:** #MenujuRidhaRN  
**Tagline:** Two Hearts • One Promise • Forever  
**Tempat:** AULA KELUARGA  
**Resepsi:** 12.00 WIB - 15.00 WIB  
**Alamat:** Kp. Gendong RT.005/RW.003, Mangunharjo, Kec. Tembalang  
**Bingkai & tata letak bawaan:** Undangan Mawar (`theta-mawar`) + strip 2 foto vertikal

Folder sumber: `/workspace/photobooth-rn-jawa/`. Photobooth Booth Media yang lama **tidak diubah**.

---

## 1. Tautan

Domain: `https://neinareno.github.io/photobooth-rn-jawa`

- Tamu (photobooth): https://neinareno.github.io/photobooth-rn-jawa/
- Galeri pengantin (PIN): https://neinareno.github.io/photobooth-rn-jawa/galeri.html
- Pengaturan admin (PIN sama): https://neinareno.github.io/photobooth-rn-jawa/admin.html
- Layar display / TV: https://neinareno.github.io/photobooth-rn-jawa/display.html
- Galeri tamu (tanpa PIN, tanpa tombol hapus): https://neinareno.github.io/photobooth-rn-jawa/galeri-tamu.html

**PIN admin & galeri:** `290127` (tanggal acara). Jangan dibagikan kepada tamu.

**Mode pelaminan** (rahasia, tanpa batas kuota, khusus HP di pelaminan):

`https://neinareno.github.io/photobooth-rn-jawa/?mode=pelaminan&k=rNjw7k2mQp`

Buka sekali di HP pelaminan; mode tersimpan di HP itu. Kembali ke mode tamu: `https://neinareno.github.io/photobooth-rn-jawa/?mode=tamu`.

---

## 2. Alur untuk tamu

1. Beranda membuka dengan tirai batik, lalu pemandangan joglo, wayang, dan bunga. Tekan **MULAI FOTO**.
2. Pilih filter dan bingkai. Hitung mundur 3–2–1, foto diambil otomatis (2 lembar untuk tata letak bawaan; 1 / 3 / 4 jika diubah di admin).
3. Di pratinjau, filter/bingkai masih bisa diganti. Tekan **SIMPAN FOTO** atau **BATAL / ULANGI**.
4. Setelah tersimpan: **UNDUH** (PNG 1200×1800), **CETAK**, **FOTO LAGI**, atau **BERANDA**.
5. Setiap perangkat tamu dibatasi **8 sesi foto**. Mode pelaminan tidak terbatas.

---

## 3. Bingkai

- **Undangan Mawar** (bawaan) — kertas krem, dua foto bertumpuk, tipografi *THE WEDDING OF*, nama skrip, gunungan & gajah wayang, bunga cat air.
- **Undangan Peach** dan **Undangan Plum** — variasi warna dari bingkai yang sama.
- **Kayon Batik**, **Joglo & Air Terjun**, **Wayang Berpasangan**, **Merak & Teratai**.

Filter tetap sama seperti sebelumnya (bawaan: Soft Skin). Semua pengaturan (termasuk tempat, jam resepsi, alamat, teks, bingkai bawaan) ada di halaman admin.

---

## 4. Penyimpanan (terpisah dari booth lama)

- Pengaturan dan kuota memakai kunci `localStorage` / IndexedDB sendiri (`photobooth-rnjawa-…`), jadi tidak tercampur dengan photobooth Booth Media jika dibuka di perangkat yang sama.
- **Unggahan online (Supabase) sengaja dimatikan** agar foto tidak masuk ke galeri/bucket milik booth lama. Foto tetap tersimpan di perangkat booth (IndexedDB) dan bisa diunduh atau dicetak di tempat.
- Jika nanti ingin galeri online sendiri: buat proyek Supabase **baru** (jangan memakai yang lama), jalankan `supabase-setup.sql`, lalu isi URL dan kunci *anon* di admin. Kode sudah memakai awalan folder `rn-jawa/` pada `file_path`. Jangan menempelkan kredensial proyek lama.

---

## 5. Menjalankan di komputer sendiri

Kamera hanya aktif lewat HTTPS atau localhost.

```bash
cd /workspace/photobooth-rn-jawa
python3 -m http.server 8080
```

Buka [http://localhost:8080/](http://localhost:8080/) di Chrome atau Edge, lalu izinkan kamera.

---

## 6. Menayangkan (hosting gratis)

### A. GitHub Pages (aktif)

Repositori: [Neinareno/photobooth-rn-jawa](https://github.com/Neinareno/photobooth-rn-jawa), cabang `main`, folder `/`.

Alamat: **https://neinareno.github.io/photobooth-rn-jawa/**

Tautan pendek (`/galeri`, `/admin`, `/display`, `/galeri-tamu`) dialihkan lewat `404.html`. Tautan dengan akhiran `.html` juga selalu bisa dipakai.

### B. Cloudflare Pages (opsional, proyek baru)

Unggah isi folder ini (termasuk `index.html`, `assets/`, `ornamen/`, `stickers/`, `_redirects`) ke proyek Pages **baru** bernama `photobooth-rn-jawa`. Jangan menimpa proyek `photobooth-ratna-nuryadi`.

Alamat yang diharapkan: `https://photobooth-rn-jawa.pages.dev`

---

## 7. Animasi

Tirai batik, munculnya wayang/gunungan, kelopak yang mengambang, transisi antar layar, hitungan mundur, dan kilat kamera memakai `transform`/`opacity` (target 60 fps, kurva ease-in-out). Jika perangkat memakai *prefers-reduced-motion*, animasi dibatalkan dan isi halaman langsung tampil.
