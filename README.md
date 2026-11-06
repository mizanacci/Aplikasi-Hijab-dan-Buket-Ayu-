# Ruang Stok — Inventaris Hijab & Bahan Buket

Starter aplikasi inventaris berbasis **PHP 8+, CSS, JavaScript, dan Supabase** untuk mengelola dua lini usaha:

- **Hijab / YM THREAD**: jenis hijab, stok per warna/varian, modal, harga jual, deskripsi, dan foto.
- **Bahan buket / Arum Gift Buket**: stok bunga per jenis dan warna, harga beli bunga, harga per tangkai, serta stok perkakas dan bahan seperti selotip, kayu tusuk, kertas buket, gabus, pita, lem, dan lain-lain.
- **Produk jadi (opsional)**: stok buket siap jual dapat dicatat sebagai kategori terpisah.

Nama usaha, warna, jenis bahan, harga, jumlah, deskripsi, dan foto pada aplikasi dapat diubah sendiri. Folder `referensi-bisnis/` berisi gambar yang dikirim sebagai referensi desain/katalog; gambar tersebut **tidak otomatis dimasukkan sebagai stok**.

## 1. Kebutuhan

- PHP 8.1 atau lebih baru.
- Ekstensi PHP `fileinfo` dan `json` aktif. Ekstensi `curl` direkomendasikan; bila tidak tersedia, PHP dapat memakai `allow_url_fopen` sebagai fallback untuk koneksi Supabase.
- Apache (XAMPP) atau PHP built-in server untuk pengembangan.
- Akun dan project Supabase.
- Koneksi internet untuk Supabase dan Google Fonts.

Aplikasi tidak membutuhkan Composer atau framework PHP tambahan.

## 2. Siapkan Supabase

1. Buat project baru di [Supabase](https://supabase.com/dashboard).
2. Buka **Project Settings → API** (pada dashboard yang lebih baru, URL Data API dan API key juga tersedia melalui bagian Integrations/Data API dan API Keys).
3. Salin **Project URL** dan **Publishable key** (atau legacy `anon` key). Jangan memakai `service_role` / secret key.
4. Buka **SQL Editor → New query**.
5. Buka file `supabase/schema.sql`, salin seluruh isinya ke SQL Editor, lalu jalankan. SQL membuat tabel inventaris, tabel riwayat stok, fungsi perubahan stok, RLS, dan bucket Storage `inventory-images` beserta policy upload.
6. Untuk uji coba, pastikan metode login Email aktif pada **Authentication → Sign In / Providers**. Jika konfirmasi email diaktifkan, pengguna harus mengonfirmasi email dahulu sebelum login. Jangan mematikan proteksi konfirmasi email untuk penggunaan produksi hanya demi melewati langkah ini.

Dokumentasi resmi: [Supabase Auth](https://supabase.com/docs/guides/auth), [Data API](https://supabase.com/docs/guides/api), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage](https://supabase.com/docs/guides/storage).

## 3. Hubungkan aplikasi dengan Supabase

1. Salin `config.example.php` menjadi `config.php` pada folder utama proyek.
2. Edit `config.php`, isi `supabase_url` dan `supabase_anon_key` sesuai project Anda.
3. Biarkan `storage_bucket` bernilai `inventory-images` karena nama ini harus sama dengan bucket yang dibuat oleh `schema.sql`.
4. `config.php` sudah dimasukkan ke `.gitignore` dan diblokir oleh `.htaccess`. Jangan mengunggah file tersebut ke GitHub.

Contoh isi (gunakan nilai milik project Anda sendiri):

```php
return [
    'supabase_url' => 'https://xxxxxxxx.supabase.co',
    'supabase_anon_key' => 'sb_publishable_xxxxxxxxx',
    'storage_bucket' => 'inventory-images',
    'app_name' => 'Ruang Stok',
    'session_secure' => false,
];
```

Gunakan **publishable/anon key saja** pada konfigurasi ini. Jangan pernah menaruh `service_role` atau secret key di browser, PHP app, Git, prompt Copilot, atau screenshot.

## 4. Jalankan di komputer lokal

### Opsi A — PHP built-in server

Buka terminal di folder proyek (folder yang berisi `index.php`), lalu jalankan:

```bash
php -S localhost:8000
```

Buka `http://localhost:8000` pada browser.

### Opsi B — XAMPP

1. Salin folder `stok-buket-hijab` ke `C:\xampp\htdocs\`.
2. Pastikan Apache aktif.
3. Buka `http://localhost/stok-buket-hijab/`.

Jika muncul error koneksi Supabase, pastikan URL dan key benar, SQL sudah dijalankan, internet aktif, serta ekstensi `curl` dan `fileinfo` PHP aktif.

## 5. Cara menggunakan

1. Daftarkan akun melalui halaman masuk. Satu akun memiliki data inventaris pribadi.
2. **Stok Hijab**: buat satu catatan untuk setiap kombinasi jenis/model dan warna. Misalnya `Pashmina Kaos / Milo` dan `Pashmina Kaos / Sage` adalah dua baris berbeda sehingga stok per warna dapat dipantau.
3. **Bunga Buket**: catat setiap jenis bunga dan warna sebagai baris terpisah. Satuan awal `tangkai`; isi harga modal/pembelian dan harga per tangkai.
4. **Perkakas & Bahan**: pilih kategori `Perkakas` atau `Bahan & kemasan`. Contoh barang: gunting, glue gun, lem tembak, selotip, kayu tusuk, kertas buket, gabus, pita, plastik wrapping.
5. Isi **stok minimum** supaya barang yang jumlahnya sama dengan atau di bawah batas tersebut masuk ke daftar `Perlu restock`.
6. Unggah foto barang dalam JPG, PNG, atau WEBP dengan ukuran maksimal 5 MB. Foto disimpan di Supabase Storage. Foto bisa diganti melalui menu Edit.
7. Gunakan tombol **± Stok** untuk mencatat stok masuk, stok keluar, atau penyesuaian stok akhir. Sistem menyimpan riwayat dan menghitung saldo baru di database dalam satu transaksi.
8. Harga modal, harga per tangkai, dan harga jual adalah angka Rupiah tanpa tanda titik/koma saat diketik. Aplikasi menampilkan format Rupiah.

### Arti kolom harga

- **Harga modal / beli**: biaya pembelian satu unit stok (misalnya harga beli satu tangkai bunga).
- **Harga per tangkai**: harga acuan per tangkai bunga, sesuai kebutuhan perhitungan usaha.
- **Harga jual**: harga jual barang/produk bila memang barang tersebut dijual secara satuan.

Untuk bunga, `Harga modal / beli` dan `Harga per tangkai` disediakan terpisah agar fleksibel. Sesuaikan cara pencatatan dengan pola pembelian dan penjualan bisnis Anda.

## 6. Struktur folder

```text
stok-buket-hijab/
├── index.php
├── api.php
├── config.example.php
├── config.php                 # dibuat sendiri; jangan commit
├── .gitignore
├── .htaccess
├── README.md
├── PROMPT_GITHUB_COPILOT.md
├── assets/
│   ├── css/style.css
│   └── js/app.js
├── includes/
│   ├── bootstrap.php
│   └── supabase.php
├── supabase/
│   └── schema.sql
└── referensi-bisnis/          # gambar referensi yang Anda kirim
```

## 7. Keamanan dan catatan penting

- Setiap tabel inventaris memakai Row Level Security. Pengguna hanya bisa mengelola baris dengan `user_id` miliknya.
- Riwayat stok hanya bisa dibaca oleh pemiliknya. Hak UPDATE kolom saldo stok dan pemilik dibatasi; perubahan stok dilakukan melalui fungsi database yang memeriksa pemilik barang dan mencegah stok negatif.
- Bucket foto dibuat public agar foto dapat ditampilkan melalui URL publik. Kebijakan Storage tetap membatasi upload, perubahan, dan penghapusan ke folder UUID pemilik. Jangan menyimpan foto atau dokumen yang bersifat rahasia di bucket ini.
- Aplikasi memakai PHP session dan token CSRF untuk request dari browser. Pada hosting HTTPS, set cookie session secure dan pastikan konfigurasi server memakai HTTPS.
- Sebelum digunakan untuk operasional bisnis, uji daftar akun, login, tambah/edit/hapus data, unggah foto, stok masuk/keluar, dan akses menggunakan dua akun berbeda.
- Aplikasi kini memastikan setiap item hanya bisa diakses oleh pemilik akun yang sama; penghapusan item juga membersihkan file foto terkait di Storage apabila ada, dan cookie sesi mengikuti konfigurasi `session_secure` bila situs dipakai di HTTPS.
- Backup database dan file Storage secara berkala. Backup database tidak otomatis berarti file Storage juga sudah dibackup.
- Starter ini belum mencakup transaksi penjualan, resep/BOM kebutuhan bahan per buket, purchase order, multi-user dalam satu workspace, barcode, atau laporan laba rugi. Fitur tersebut bisa dikembangkan melalui prompt Copilot.

## 8. Troubleshooting singkat

| Gejala | Hal yang diperiksa |
|---|---|
| `Konfigurasi belum dibuat` | Salin `config.example.php` menjadi `config.php`. |
| `cURL error` | Pastikan ekstensi cURL aktif, internet tersedia, dan Project URL benar. |
| `Invalid API key` | Gunakan publishable key atau legacy anon key dari project yang benar. |
| `relation inventory_items does not exist` | Jalankan `supabase/schema.sql` di SQL Editor. |
| `new row violates row-level security` | Pastikan user sudah login dan policy pada schema.sql berhasil dibuat. Jangan mengatasi ini dengan menonaktifkan RLS. |
| Upload foto ditolak | Pastikan bucket `inventory-images` dan policy Storage dari schema.sql sudah ada. |
| Login setelah daftar belum berhasil | Periksa email konfirmasi dari Supabase Auth bila konfirmasi email diaktifkan. |
| Foto tidak terlihat | Pastikan URL yang tersimpan berasal dari bucket `inventory-images` dan bucket masih public. |

