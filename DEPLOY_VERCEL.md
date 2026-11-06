# Deploy ke Vercel

Aplikasi ini memakai PHP. Vercel tidak menyediakan builder `@vercel/php`; deployment memakai Container Runtime resmi dengan FrankenPHP. Root `Dockerfile` dan `Caddyfile` menyiapkan runtime PHP serta melayani halaman dan endpoint API. Jangan menambahkan kembali konfigurasi `builds` yang memakai `@vercel/php`.

## Persiapan

1. Pastikan repository GitHub terhubung ke project Vercel.
2. Jalankan `supabase/schema.sql` dan migration di `supabase/migrations/` pada project Supabase.
3. Pastikan Dockerfile dan Caddyfile ada di root repository.

## Environment variables

Tambahkan di Vercel Project > Settings > Environment Variables untuk Production dan Preview:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (publishable/anon key, bukan service role/secret)
- `STORAGE_BUCKET` (biasanya `inventory-images`)
- `APP_NAME`
- `SESSION_SECURE` (`true` untuk deployment HTTPS)

Sesudah mengubah environment variables, lakukan redeploy.

## Konfigurasi project Vercel

Jika project dibuat sebelum Dockerfile ditambahkan, ubah **Framework Preset** ke **Container** pada Project Settings > Build and Deployment. Untuk project yang masih terhubung melalui Vercel CLI, gunakan `vercel project update --framework container --yes`. Root Dockerfile menjadi konfigurasi build; jangan memakai builder `@vercel/php` dari `vercel.json`.

## Uji deployment

Setelah deployment berstatus Ready, buka:

- `/` untuk halaman aplikasi
- `/api.php?action=state` untuk memeriksa endpoint dan konfigurasi

Respons state harus memuat `"configured":true`. Kemudian uji signup/login dan alur inventaris.

## Batasan sesi

PHP menyimpan session secara default sebagai file lokal. File itu tidak dibagi antar-container dan tidak dijamin bertahan ketika instance diganti atau diskalakan. Sebelum penggunaan produksi, gunakan session store bersama (misalnya Redis) atau pindahkan sesi autentikasi ke mekanisme bersama. Uji login dan beberapa request berurutan pada deployment; bila sesi terputus, jangan menganggap deployment siap operasional.

File `.dockerignore` mengecualikan `config.php` dan file environment lokal agar tidak masuk ke container image. Jangan commit kredensial atau menaruh service role key pada environment variable yang dapat diakses browser.
