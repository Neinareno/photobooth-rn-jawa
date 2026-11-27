# Function API photobooth (`api`)

Function Neon di cabang `main` proyek `photobooth-rn-jawa`.
URL publik (tanpa kunci rahasia):

https://br-raspy-boat-bi9ymbbr-api.compute.c-5.ap-southeast-1.aws.neon.tech/

`DATABASE_URL` disuntikkan oleh Neon, tidak masuk repositori.

- `GET /photos` — daftar foto terbaru
- `GET /p/:id.jpg` — berkas gambar
- `POST /photos` — unggah (multipart `file`, atau JPEG/PNG mentah, atau JSON base64)
- `POST /verify-pin` — `{ pin }`
- `POST /delete-photos` — `{ ids, pin }`
