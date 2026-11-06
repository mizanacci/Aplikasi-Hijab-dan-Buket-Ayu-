# PROMPT LANJUTAN UNTUK GITHUB COPILOT (VS CODE)

Salin prompt di bawah ini ke GitHub Copilot Chat/Agent setelah membuka folder proyek `stok-buket-hijab` di VS Code.

---

Anda bertindak sebagai **Senior Full-Stack Developer, Software Architect, dan Database Security Engineer**. Saya memiliki aplikasi inventaris usaha bernama **Ruang Stok — Inventaris Hijab & Bahan Buket** yang menggunakan PHP 8+, CSS, JavaScript, dan Supabase (PostgreSQL, Supabase Auth, Supabase Storage).

## A. Konteks bisnis yang wajib dipahami

Aplikasi digunakan untuk mengelola dua lini usaha di Balikpapan:

1. **YM THREAD** — daily hijab premium, ready stock dan open PO. Jenis produk yang terlihat pada referensi antara lain Pashmina Kaos, Viscose, Paris Jadul, Plain Square, dan beberapa varian lain. Inventaris hijab wajib dicatat per kombinasi jenis/model dan warna. Setiap warna dapat memiliki jumlah stok, harga modal, harga jual, deskripsi, dan foto masing-masing.
2. **Arum Gift Buket** — menerima pesanan buket bunga artificial, buket uang, buket snack, gift, custom buket, dan produk sejenis. Inventaris perlu memisahkan bunga berdasarkan jenis dan warna, serta menyimpan stok, harga beli/modal, harga per tangkai, harga jual (jika relevan), deskripsi dan foto. Ada pula perkakas dan bahan habis pakai seperti selotip, kayu tusuk, kertas buket, gabus buket, pita, lem tembak, gunting, plastik wrapping, dan perlengkapan lainnya.

Lihat folder `referensi-bisnis/` untuk gambar bisnis dan produk yang saya berikan. Gunakan gambar tersebut hanya sebagai referensi konteks/desain. Jangan mengarang jumlah stok atau harga berdasarkan foto dan jangan memasukkan data contoh ke database produksi. Semua nama, warna, harga, stok, foto, serta deskripsi harus bisa saya tambah/edit/hapus sendiri dari aplikasi.

## B. Langkah kerja yang harus Anda lakukan

1. **Audit seluruh repository terlebih dahulu.** Baca `README.md`, `supabase/schema.sql`, `index.php`, `api.php`, semua file di `includes/`, `assets/css/`, dan `assets/js/`. Jangan langsung mengganti struktur atau menulis ulang proyek tanpa memahami implementasi yang sudah tersedia.
2. Buat ringkasan singkat tentang arsitektur, fitur yang sudah berjalan, kekurangan, risiko keamanan, dan file yang perlu diubah.
3. Lanjutkan dengan memperbaiki dan menyelesaikan aplikasi langsung pada workspace. Jangan hanya memberi contoh kode atau instruksi; implementasikan perbaikan ke file.
4. Pertahankan stack **PHP + CSS + JavaScript + Supabase**. Jangan memindahkan proyek ke Laravel, Node.js, Firebase, atau framework lain tanpa alasan teknis yang sangat kuat dan persetujuan saya.
5. Jangan menghapus atau menimpa `config.php`, file rahasia, atau data lokal pengguna. Jangan pernah meminta, menampilkan, mencetak, atau memasukkan Supabase `service_role` / secret key ke source code. Gunakan publishable/anon key dan RLS.
6. Jika ada perubahan database, buat migration SQL yang idempotent di folder `supabase/` dan jelaskan urutan menjalankannya. Jangan menonaktifkan RLS untuk mengatasi error akses.

## C. Fitur inti yang harus dipastikan benar

### 1. Autentikasi dan keamanan
- Daftar, login, logout, dan pemulihan sesi melalui Supabase Auth.
- Pesan yang jelas jika email perlu dikonfirmasi.
- Setiap pengguna hanya bisa membaca, menambah, mengubah, dan menghapus inventaris serta riwayat miliknya sendiri.
- Validasi dilakukan di browser dan server.
- Terapkan RLS untuk seluruh tabel dan Storage policy sesuai folder pengguna.
- Jangan mempercayai `user_id` dari input browser; identitas pengguna harus berasal dari JWT/session tervalidasi.
- Tambahkan perlindungan CSRF, session cookie yang aman, validasi tipe/ukuran upload, dan penanganan error yang tidak membocorkan secret atau stack trace.

### 2. Modul stok hijab
- Field minimal: nama/jenis hijab, model/varian, warna, SKU opsional, stok, satuan, stok minimum, harga modal, harga jual, deskripsi, foto.
- Stok harus dapat dipisah untuk tiap warna. Jangan menggabungkan semua warna ke satu angka stok.
- Mendukung tambah, lihat, edit, hapus, pencarian, filter, dan urutan data.
- Tampilkan tanda stok menipis sesuai stok minimum.

### 3. Modul bunga
- Field minimal: nama/jenis bunga, warna, varian opsional, stok per tangkai/ikat, satuan, stok minimum, harga beli/modal, harga per tangkai, harga jual opsional, deskripsi, foto.
- Satu jenis bunga dengan warna berbeda dapat menjadi baris inventaris berbeda.
- Pastikan label harga menjelaskan perbedaan harga beli/modal dan harga per tangkai agar tidak membingungkan.

### 4. Modul perkakas dan bahan buket
- Pisahkan kategori `Perkakas` (contoh: gunting, glue gun) dan `Bahan & kemasan` (selotip, kayu tusuk, kertas buket, gabus, pita, plastik wrapping, lem, dan lainnya).
- Field minimal: nama, kategori, varian/ukuran, warna bila relevan, SKU opsional, stok, satuan (pcs, roll, lembar, batang, pack, set, buah, dll.), stok minimum, harga modal/beli, harga jual opsional, deskripsi, foto.
- Kategori harus mudah ditambah bila di masa depan ada jenis bahan/perkakas baru.

### 5. Modul produk jadi
- Boleh digunakan untuk mencatat stok buket siap jual secara terpisah dari bahan baku.
- Jangan menganggap stok produk jadi otomatis mengurangi stok bahan sebelum fitur resep/BOM dibuat dan diuji.

### 6. Riwayat stok
- Catat stok masuk, stok keluar/terpakai, dan penyesuaian stok akhir.
- Setiap catatan minimal berisi item, tipe perubahan, jumlah perubahan, stok sebelum, stok sesudah, waktu, dan catatan.
- Operasi update saldo + insert histori harus atomik dalam transaksi/fungsi database.
- Tolak stok keluar yang membuat saldo negatif.
- Perjelas bahwa nilai penyesuaian stok adalah jumlah stok akhir, bukan delta.

### 7. Foto
- Pengguna bisa unggah dan mengganti foto setiap barang dari form tambah/edit.
- Gunakan Supabase Storage; batasi format ke JPG/PNG/WEBP dan ukuran file secara masuk akal.
- Tampilkan preview, loading, kegagalan upload, dan foto fallback bila belum ada foto.
- Jangan menyimpan base64 foto di tabel PostgreSQL. Simpan URL/path Storage saja.
- Jangan menghapus file lama sebelum proses update barang berhasil; hindari object Storage yatim sejauh mungkin.

### 8. Dashboard dan UX
- Dashboard menampilkan jumlah jenis barang, total stok hijab, total tangkai bunga, serta jumlah barang yang perlu restock.
- Tampilkan barang terbaru dan daftar stok menipis.
- Desain responsif desktop/tablet/HP, mudah digunakan pemilik toko, rapi dan konsisten.
- Gunakan Bahasa Indonesia dan format Rupiah `id-ID`.
- Beri state loading, empty state, success/error toast, validasi form, konfirmasi hapus, dan pesan error yang mudah dipahami.
- Jangan menampilkan status koneksi Supabase sebagai "terhubung" hanya karena halaman terbuka; periksa respons request nyata.

## D. Pengembangan lanjutan yang disarankan

Setelah core inventory aman dan stabil, periksa kelayakan fitur berikut dan implementasikan bertahap, tanpa mengorbankan fitur inti:

1. **Supplier dan pembelian stok**: data supplier, tanggal pembelian, harga perolehan, jumlah dan catatan pembelian.
2. **Pesanan/penjualan**: pesanan buket custom, tanggal pesanan, nama pelanggan, DP/pelunasan, status pesanan, biaya bahan, dan harga jual.
3. **Resep/BOM buket**: komposisi bahan untuk satu produk buket. Ketika pesanan ditandai selesai, sistem dapat mengurangi stok bunga dan bahan sesuai resep. Minta konfirmasi/aturan bisnis bila belum jelas; jangan membuat pengurangan otomatis dengan asumsi.
4. **Laporan**: nilai persediaan berdasarkan harga modal, barang fast-moving, stok minimum, pembelian, penjualan, dan estimasi margin. Bedakan omzet, laba kotor, dan nilai stok.
5. **Ekspor/impor CSV** dan backup data.
6. **Multi-user satu usaha** (pemilik dan pegawai) menggunakan tabel workspace dan role/permission hanya bila memang diperlukan. Jangan mencampur data usaha lintas akun tanpa model akses yang eksplisit.

Untuk setiap fitur lanjutan, jelaskan asumsi bisnis, skema data, RLS, dan cara menguji sebelum mengimplementasikannya.

## E. Pengujian dan kriteria selesai

Sebelum menyatakan selesai:

1. Periksa seluruh file PHP dengan `php -l` jika PHP tersedia.
2. Periksa JavaScript tanpa syntax error dan pastikan selector HTML/JS cocok.
3. Pastikan seluruh endpoint API punya validasi input dan otorisasi.
4. Uji alur: daftar → konfirmasi email (bila aktif) → login → tambah hijab dua warna → edit → unggah/ganti foto → stok masuk → stok keluar → tolak stok negatif → tampilkan riwayat → hapus.
5. Uji alur bunga: buat jenis bunga dengan warna berbeda, isi harga modal dan harga per tangkai, perbarui stok.
6. Uji alur perkakas/bahan: buat selotip, kayu tusuk, kertas buket, dan gabus dengan satuan berbeda.
7. Uji dua akun berbeda. Pastikan akun A tidak dapat melihat/mengubah data akun B dengan cara apa pun, termasuk memanipulasi request API.
8. Pastikan tidak ada secret key, password, atau token yang masuk ke Git.
9. Jangan mengklaim tes Supabase live berhasil bila kredensial dan project Supabase belum dikonfigurasi. Tuliskan dengan jelas bagian yang sudah dites lokal dan bagian yang harus dites oleh pemilik project.
10. Update `README.md` dengan instalasi, migrasi SQL, konfigurasi, cara pakai, dan troubleshooting terbaru.

## F. Format laporan akhir kepada saya

Setelah melakukan perubahan, berikan laporan dalam Bahasa Indonesia dengan struktur:

1. Ringkasan kondisi awal.
2. Daftar file yang dibuat/diubah.
3. Fitur yang sudah selesai.
4. Perubahan tabel, fungsi, RLS, atau Storage policy yang perlu dijalankan di Supabase.
5. Cara menjalankan aplikasi di VS Code/XAMPP.
6. Hasil tes nyata (cantumkan yang lulus/gagal/belum dapat dites dan alasannya).
7. Hal yang masih perlu saya lakukan sendiri, misalnya mengisi `config.php`, menjalankan SQL, dan melakukan uji akun.

**Mulai dengan audit repository, kemudian implementasikan perbaikan paling penting. Jangan berhenti setelah hanya memberikan rencana.**

---

## Prompt tambahan setelah aplikasi dasar stabil (opsional)

Setelah fitur inti sudah diuji, saya ingin Anda mengembangkan **modul pesanan buket custom dan resep/BOM bahan**. Sebelum mengubah kode, jelaskan dulu bagaimana model pesanan, detail item, resep bahan, pemakaian stok, pembatalan pesanan, DP/pelunasan, dan pengembalian stok akan bekerja. Stok hanya boleh berkurang pada titik status yang jelas dan harus memiliki histori yang dapat diaudit. Buat transaksi database yang atomik dan tes kasus pembatalan agar stok tidak terpotong dua kali. Jangan mengasumsikan komposisi bahan, biaya, atau aturan pembayaran; buat input yang dapat saya atur sendiri.
