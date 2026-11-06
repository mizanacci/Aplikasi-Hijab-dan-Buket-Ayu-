<?php
require_once __DIR__ . '/includes/bootstrap.php';
$appName = is_array($GLOBALS['APP_CONFIG'] ?? null) ? ($GLOBALS['APP_CONFIG']['app_name'] ?? 'Ruang Stok') : 'Ruang Stok';
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f8f4f1">
  <title><?= htmlspecialchars($appName, ENT_QUOTES, 'UTF-8') ?> — Inventaris Hijab & Buket</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <div id="toast-area" class="toast-area" aria-live="polite"></div>

  <main id="auth-screen" class="auth-screen" hidden>
    <section class="auth-visual">
      <div class="auth-brand-mark">✿</div>
      <p class="eyebrow">INVENTARIS USAHA</p>
      <h1>Semua stok, lebih tertata.</h1>
      <p class="auth-lead">Kelola koleksi hijab, warna, bunga, dan perlengkapan buket dalam satu ruang kerja.</p>
      <div class="auth-pills"><span>YM THREAD</span><span>ARUM GIFT BUKET</span></div>
      <div class="auth-flower">✿</div>
    </section>
    <section class="auth-panel">
      <div class="auth-card">
        <div class="mobile-brand"><span class="brand-symbol">✿</span><span>Ruang Stok</span></div>
        <p class="eyebrow">SELAMAT DATANG</p>
        <h2 id="auth-title">Masuk ke Ruang Stok</h2>
        <p class="muted" id="auth-description">Kelola stok usaha Anda dengan mudah.</p>
        <form id="auth-form" class="form-stack">
          <label id="business-field" hidden>Nama usaha (opsional)<input name="business_name" type="text" placeholder="Contoh: Arum Gift Buket"></label>
          <label>Email<input name="email" type="email" autocomplete="email" placeholder="nama@email.com" required></label>
          <label>Kata sandi<input name="password" type="password" autocomplete="current-password" minlength="8" placeholder="Minimal 8 karakter" required></label>
          <button class="button button-primary button-full" type="submit" id="auth-submit">Masuk</button>
        </form>
        <p class="auth-switch"><span id="auth-switch-label">Belum punya akun?</span> <button type="button" class="text-button" id="auth-switch">Daftar sekarang</button></p>
        <p class="auth-note">Akun dan data inventaris tersimpan di Supabase. Setiap akun hanya dapat melihat datanya sendiri.</p>
      </div>
    </section>
  </main>

  <div id="app-shell" class="app-shell" hidden>
    <aside class="sidebar" id="sidebar">
      <a class="brand" href="#dashboard" data-page="dashboard">
        <span class="brand-symbol">✿</span>
        <span><strong>Ruang Stok</strong><small>HIJAB & BUKET</small></span>
      </a>
      <div class="workspace-label">WORKSPACE</div>
      <nav class="side-nav" aria-label="Navigasi utama">
        <button class="nav-link active" data-page="dashboard"><span class="nav-icon">⌂</span>Ringkasan</button>
        <div class="nav-section-label">INVENTARIS</div>
        <button class="nav-link" data-page="hijab"><span class="nav-icon">◈</span>Stok Hijab</button>
        <button class="nav-link" data-page="flower"><span class="nav-icon">✿</span>Bunga Buket</button>
        <button class="nav-link" data-page="supplies"><span class="nav-icon">▤</span>Perkakas & Bahan</button>
        <button class="nav-link" data-page="products"><span class="nav-icon">▧</span>Produk Jadi</button>
        <div class="nav-section-label">PEMANTAUAN</div>
        <button class="nav-link" data-page="history"><span class="nav-icon">↺</span>Riwayat Stok</button>
      </nav>
      <div class="sidebar-bottom">
        <div class="storage-note"><span class="storage-note-icon">♡</span><div><strong>Usaha lebih rapi</strong><small>Stok terpantau, kerja nyaman.</small></div></div>
        <button class="profile-button" id="profile-button">
          <span class="avatar" id="user-avatar">R</span>
          <span class="profile-copy"><strong id="user-email">Akun Anda</strong><small>Administrator</small></span>
          <span class="profile-dots">···</span>
        </button>
        <button class="logout-button" id="logout-button">Keluar dari akun</button>
      </div>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <button class="mobile-menu" id="mobile-menu" aria-label="Buka menu">☰</button>
        <div class="breadcrumb"><span>Ruang Stok</span><b>/</b><strong id="breadcrumb-current">Ringkasan</strong></div>
        <div class="topbar-right"><span class="today-label" id="today-label"></span><span class="top-avatar" id="top-avatar">R</span></div>
      </header>
      <div class="page-content">
        <section id="page-dashboard" class="page-section">
          <div class="page-heading dashboard-heading">
            <div><p class="eyebrow">DASHBOARD INVENTARIS</p><h1>Halo, selamat datang! <span class="wave">✦</span></h1><p class="muted">Pantau stok hijab dan kebutuhan buket dari satu tempat.</p></div>
            <button class="button button-primary" id="quick-add"><span>＋</span> Tambah barang</button>
          </div>
          <div class="stat-grid">
            <article class="stat-card stat-rose"><div class="stat-top"><span>Total jenis barang</span><span class="stat-icon">▦</span></div><strong id="stat-total">0</strong><small>Seluruh kategori inventaris</small></article>
            <article class="stat-card stat-lilac"><div class="stat-top"><span>Stok hijab</span><span class="stat-icon">◈</span></div><strong id="stat-hijab">0</strong><small>Total unit hijab tersedia</small></article>
            <article class="stat-card stat-peach"><div class="stat-top"><span>Stok bunga</span><span class="stat-icon">✿</span></div><strong id="stat-flower">0</strong><small>Total stok bunga tersedia</small></article>
            <article class="stat-card stat-cream"><div class="stat-top"><span>Perlu restock</span><span class="stat-icon">⌁</span></div><strong id="stat-low">0</strong><small>Barang pada/bawah batas minimum</small></article>
          </div>
          <div class="dashboard-grid">
            <section class="panel recent-panel"><div class="panel-heading"><div><p class="eyebrow">RINGKASAN INVENTARIS</p><h2>Barang terbaru</h2></div><button class="text-button" data-page="hijab">Lihat inventaris ↗</button></div><div id="recent-items" class="recent-list"><div class="empty-state compact">Belum ada barang. Tambahkan inventaris pertama Anda.</div></div></section>
            <section class="panel low-panel"><div class="panel-heading"><div><p class="eyebrow">PERHATIAN</p><h2>Stok menipis</h2></div><span class="soft-count" id="low-count">0 barang</span></div><div id="low-items" class="low-list"><div class="empty-state compact">Belum ada barang yang perlu restock.</div></div></section>
          </div>
          <section class="welcome-strip"><div class="welcome-flower">✿</div><div><strong>Kelola dua usaha dalam satu dashboard.</strong><p>Catat stok per warna untuk hijab, per jenis dan tangkai untuk bunga, serta semua perlengkapan pembuatan buket.</p></div><span class="strip-label">HIJAB · BUKET · SUPPLIES</span></section>
        </section>

        <section id="page-inventory" class="page-section" hidden>
          <div class="page-heading"><div><p class="eyebrow" id="inventory-eyebrow">DATA INVENTARIS</p><h1 id="inventory-title">Stok Hijab</h1><p class="muted" id="inventory-description">Kelola jenis, warna, modal, harga jual, dan jumlah stok hijab.</p></div><button class="button button-primary" id="add-item"><span>＋</span> Tambah barang</button></div>
          <div class="inventory-toolbar"><div class="search-wrap"><span>⌕</span><input id="search-items" type="search" placeholder="Cari nama, warna, atau kode barang..."></div><div class="toolbar-right"><select id="sort-items" aria-label="Urutkan barang"><option value="updated">Terbaru diubah</option><option value="name">Nama A–Z</option><option value="stock-low">Stok terendah</option><option value="stock-high">Stok terbanyak</option></select><span class="result-count" id="result-count">0 barang</span></div></div>
          <div class="category-chips" id="category-chips"></div>
          <div id="inventory-grid" class="inventory-grid"><div class="empty-state">Belum ada data inventaris.</div></div>
        </section>

        <section id="page-history" class="page-section" hidden>
          <div class="page-heading"><div><p class="eyebrow">CATATAN PERGERAKAN</p><h1>Riwayat stok</h1><p class="muted">Lihat catatan stok masuk, stok keluar, dan penyesuaian jumlah.</p></div><button class="button button-outline" id="refresh-history">↻ Perbarui</button></div>
          <div class="panel history-panel"><div class="table-scroll"><table class="data-table"><thead><tr><th>Barang</th><th>Jenis perubahan</th><th>Jumlah</th><th>Sebelum</th><th>Sesudah</th><th>Catatan</th><th>Waktu</th></tr></thead><tbody id="history-body"><tr><td colspan="7" class="table-empty">Belum ada riwayat perubahan stok.</td></tr></tbody></table></div></div>
        </section>
      </div>
      <footer class="app-footer"><span>Ruang Stok <b>·</b> Inventaris Hijab & Buket</span><span>Dirancang untuk operasional harian usaha Anda</span></footer>
    </main>
  </div>

  <div class="modal-backdrop" id="item-modal" hidden>
    <section class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
      <div class="modal-heading"><div><p class="eyebrow">FORM INVENTARIS</p><h2 id="item-modal-title">Tambah barang</h2><p class="muted">Isi informasi barang dan unggah foto bila tersedia.</p></div><button class="modal-close" data-close="item-modal" aria-label="Tutup">×</button></div>
      <form id="item-form">
        <input type="hidden" name="id"><input type="hidden" name="image_url"><input type="hidden" name="image_path">
        <div class="form-grid">
          <label class="span-2">Kategori barang <select name="category" id="item-category" required><option value="hijab">Hijab</option><option value="flower">Bunga buket</option><option value="tool">Perkakas buket</option><option value="packaging">Bahan & kemasan buket</option><option value="finished_product">Produk jadi</option></select></label>
          <label>Nama barang / jenis <input name="name" type="text" maxlength="120" placeholder="Contoh: Pashmina Kaos" required></label>
          <label>Varian / model <input name="variant" type="text" placeholder="Contoh: Premium, Bella, Paris"></label>
          <label>Warna <input name="color" type="text" placeholder="Contoh: Milo, Sage, Dusty Pink"></label>
          <label>Kode barang / SKU <input name="sku" type="text" placeholder="Opsional"></label>
          <label>Jumlah stok <input name="stock_qty" type="number" min="0" step="0.01" value="0" required><small id="stock-edit-hint" class="field-hint" hidden>Untuk mengubah stok barang yang sudah tersimpan, gunakan tombol ± Stok agar tercatat dalam riwayat.</small></label>
          <label>Satuan <select name="unit"><option value="pcs">pcs</option><option value="tangkai">tangkai</option><option value="ikat">ikat</option><option value="lembar">lembar</option><option value="roll">roll</option><option value="pack">pack</option><option value="batang">batang</option><option value="lembar">lembar</option><option value="set">set</option><option value="buah">buah</option></select></label>
          <label>Stok minimum <input name="min_stock" type="number" min="0" step="0.01" value="0"></label>
          <label>Harga modal / beli (Rp) <input name="purchase_price" type="number" min="0" step="1" value="0"></label>
          <label class="field-stem" hidden>Harga per tangkai (Rp) <input name="stem_price" type="number" min="0" step="1" value="0"></label>
          <label>Harga jual (Rp) <input name="selling_price" type="number" min="0" step="1" value="0"></label>
          <label class="span-2">Deskripsi / keterangan <textarea name="description" rows="3" placeholder="Catatan kualitas, bahan, ukuran, supplier, atau detail lainnya..."></textarea></label>
          <div class="span-2 image-field"><label for="item-image">Foto barang / produk</label><div class="image-upload-row"><div class="image-preview" id="image-preview"><span>✿</span><small>Belum ada foto</small></div><div class="upload-controls"><input id="item-image" type="file" accept="image/jpeg,image/png,image/webp"><small>Format JPG, PNG, WEBP. Maksimal 5 MB. Foto dapat diganti kapan saja.</small></div></div></div>
        </div>
        <div class="modal-actions"><button type="button" class="button button-ghost" data-close="item-modal">Batal</button><button type="submit" class="button button-primary" id="save-item">Simpan barang</button></div>
      </form>
    </section>
  </div>

  <div class="modal-backdrop" id="stock-modal" hidden>
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
      <div class="modal-heading"><div><p class="eyebrow">PERUBAHAN INVENTARIS</p><h2 id="stock-modal-title">Catat perubahan stok</h2><p class="muted" id="stock-item-name"></p></div><button class="modal-close" data-close="stock-modal" aria-label="Tutup">×</button></div>
      <form id="stock-form"><input type="hidden" name="item_id"><div class="form-stack">
        <label>Jenis perubahan<select name="movement_type" id="movement-type"><option value="IN">Stok masuk / pembelian</option><option value="OUT">Stok keluar / terpakai</option><option value="ADJUSTMENT">Sesuaikan stok akhir</option></select></label>
        <label id="movement-qty-label">Jumlah<input name="quantity" type="number" min="0.01" step="0.01" required placeholder="Masukkan jumlah"></label>
        <label>Catatan (opsional)<textarea name="note" rows="3" placeholder="Contoh: Pembelian dari supplier, digunakan untuk pesanan..."></textarea></label>
      </div><div class="modal-actions"><button type="button" class="button button-ghost" data-close="stock-modal">Batal</button><button type="submit" class="button button-primary" id="save-movement">Simpan perubahan</button></div></form>
    </section>
  </div>

  <script src="assets/js/app.js" defer></script>
</body>
</html>
