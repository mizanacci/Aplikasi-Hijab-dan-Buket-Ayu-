# Deploy ke Vercel

Perhatian: aplikasi ini saat ini adalah aplikasi PHP + Supabase. Vercel dapat menangani deployment PHP melalui build runtime `@vercel/php`, tetapi tetap dibutuhkan konfigurasi environment variable dan project Supabase yang aktif.

## 1. Persiapan

1. Pastikan repo GitHub sudah terkoneksi dan branch utama aktif.
2. Siapkan project Supabase yang sudah menjalankan schema SQL di `supabase/schema.sql`.
3. Salin file `.env.example` ke `.env.local` untuk lokal, atau masukkan variabel ke dashboard Vercel.

## 2. Variabel lingkungan Vercel

Set di Vercel Project > Settings > Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STORAGE_BUCKET`
- `APP_NAME`
- `SESSION_SECURE`

## 3. Deploy

1. Push repository ke GitHub.
2. Import repo ke Vercel.
3. Pilih framework: `Other` / static + PHP serverless config.
4. Pastikan Vercel membaca `vercel.json` di root.
5. Deploy dan uji halaman login serta endpoint `api.php`.

## 4. Catatan penting

- Jangan pernah menyimpan `service_role` atau secret key di repo atau Vercel public env.
- Gunakan `SUPABASE_ANON_KEY` / publishable key saja.
- File `config.php` tetap lokal dan tidak dijadikan bagian dari repo publik.
- Jika deploy Anda memakai Vercel Production, hapus atau pastikan `config.php` tidak di-commit.
