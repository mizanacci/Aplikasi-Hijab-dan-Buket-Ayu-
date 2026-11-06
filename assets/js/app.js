(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { csrf: '', user: null, items: [], movements: [], page: 'dashboard', chip: 'all', authMode: 'login', editingId: null, stockItem: null };

  const CATEGORY = {
    hijab: 'Hijab', flower: 'Bunga buket', tool: 'Perkakas',
    packaging: 'Bahan & kemasan', finished_product: 'Produk jadi'
  };
  const PAGE = {
    dashboard: 'Ringkasan', hijab: 'Stok Hijab', flower: 'Bunga Buket',
    supplies: 'Perkakas & Bahan', products: 'Produk Jadi', history: 'Riwayat Stok'
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  }
  function number(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function formatNumber(value) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(number(value)); }
  function money(value) { return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(number(value)); }
  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    $('#toast-area').append(el);
    setTimeout(() => el.remove(), 4000);
  }
  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = busy;
    if (busy) { button.dataset.oldText = button.textContent; button.textContent = label || 'Memproses...'; }
    else if (button.dataset.oldText) { button.textContent = button.dataset.oldText; delete button.dataset.oldText; }
  }
  async function api(action, body = null) {
    const response = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
      body: JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || `Permintaan gagal (${response.status})`);
    return data;
  }
  async function uploadImage(file) {
    const form = new FormData();
    form.append('image', file);
    const response = await fetch('api.php?action=image_upload', { method: 'POST', headers: { 'X-CSRF-Token': state.csrf }, body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || 'Foto gagal diunggah.');
    return data;
  }

  function showAuth() {
    $('#auth-screen').hidden = false;
    $('#app-shell').hidden = true;
  }
  function showApp() {
    $('#auth-screen').hidden = true;
    $('#app-shell').hidden = false;
    const email = state.user?.email || 'Akun Anda';
    const initial = (email[0] || 'R').toLocaleUpperCase('id-ID');
    $('#user-email').textContent = email;
    $('#user-avatar').textContent = initial;
    $('#top-avatar').textContent = initial;
    $('#today-label').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    navigate('dashboard');
  }
  function navigate(page) {
    state.page = page;
    $$('.page-section').forEach(section => { section.hidden = true; });
    if (page === 'dashboard') $('#page-dashboard').hidden = false;
    else if (page === 'history') $('#page-history').hidden = false;
    else $('#page-inventory').hidden = false;
    $$('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === page));
    $('#breadcrumb-current').textContent = PAGE[page] || 'Ringkasan';
    $('#sidebar').classList.remove('open');
    if (page === 'hijab' || page === 'flower' || page === 'supplies' || page === 'products') {
      const titles = {
        hijab: ['STOK HIJAB', 'Stok Hijab', 'Kelola jenis, warna, modal, harga jual, dan jumlah stok hijab.'],
        flower: ['BAHAN BUKET', 'Bunga Buket', 'Catat stok per jenis dan warna bunga, harga beli, serta harga per tangkai.'],
        supplies: ['PERLENGKAPAN BUKET', 'Perkakas & Bahan', 'Kelola selotip, kayu tusuk, kertas buket, gabus, alat, dan bahan lainnya.'],
        products: ['HASIL PRODUKSI', 'Produk Jadi', 'Catat stok buket atau produk siap jual bila ingin dipantau terpisah.']
      }[page];
      $('#inventory-eyebrow').textContent = titles[0];
      $('#inventory-title').textContent = titles[1];
      $('#inventory-description').textContent = titles[2];
      state.chip = 'all';
      $('#search-items').value = '';
      renderChips();
      renderInventory();
    }
    if (page === 'dashboard') renderDashboard();
    if (page === 'history') loadMovements();
  }

  function pageCategories() {
    if (state.page === 'hijab') return ['hijab'];
    if (state.page === 'flower') return ['flower'];
    if (state.page === 'supplies') return ['tool', 'packaging'];
    if (state.page === 'products') return ['finished_product'];
    return [];
  }
  function filteredItems() {
    const allowed = pageCategories();
    const search = ($('#search-items')?.value || '').trim().toLocaleLowerCase('id-ID');
    let list = state.items.filter(item => allowed.includes(item.category));
    if (state.chip !== 'all') list = list.filter(item => item.category === state.chip);
    if (search) list = list.filter(item => [item.name, item.variant, item.color, item.sku, item.description].join(' ').toLocaleLowerCase('id-ID').includes(search));
    const sort = $('#sort-items')?.value || 'updated';
    list.sort((a, b) => {
      if (sort === 'name') return String(a.name).localeCompare(String(b.name), 'id');
      if (sort === 'stock-low') return number(a.stock_qty) - number(b.stock_qty);
      if (sort === 'stock-high') return number(b.stock_qty) - number(a.stock_qty);
      return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
    });
    return list;
  }
  function renderChips() {
    const allowed = pageCategories();
    let options = [{ id: 'all', label: 'Semua barang' }];
    if (allowed.length > 1) options = options.concat(allowed.map(id => ({ id, label: CATEGORY[id] })));
    $('#category-chips').innerHTML = options.map(option => `<button class="chip ${state.chip === option.id ? 'active' : ''}" data-chip="${option.id}">${escapeHtml(option.label)}</button>`).join('');
  }
  function cardPrice(item) {
    if (item.category === 'flower') return [
      ['Harga modal', item.purchase_price],
      ['Harga per tangkai', item.stem_price],
      ['Harga jual', item.selling_price]
    ];
    return [['Harga modal', item.purchase_price], ['Harga jual', item.selling_price]];
  }
  function renderInventory() {
    const list = filteredItems();
    $('#result-count').textContent = `${list.length} barang`;
    if (!list.length) {
      $('#inventory-grid').innerHTML = `<div class="empty-state">Belum ada barang pada kategori ini.<br><br>Tekan <strong>Tambah barang</strong> untuk mulai mencatat stok.</div>`;
      return;
    }
    $('#inventory-grid').innerHTML = list.map(item => {
      const low = number(item.stock_qty) <= number(item.min_stock);
      const prices = cardPrice(item);
      const label = [item.variant, item.color].filter(Boolean).join(' · ') || 'Tanpa varian';
      const image = item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" loading="lazy">` : '<span>✿</span>';
      return `<article class="item-card">
        <div class="item-image">${image}<span class="category-badge">${escapeHtml(CATEGORY[item.category] || item.category)}</span><span class="stock-pill ${low ? 'low' : ''}">${low ? 'Perlu restock' : 'Stok tersedia'}</span></div>
        <div class="item-body"><div class="item-title-row"><div><h3 class="item-title">${escapeHtml(item.name)}</h3><div class="item-color">${escapeHtml(label)}</div>${item.sku ? `<div class="sku">SKU: ${escapeHtml(item.sku)}</div>` : ''}</div></div>
          <div class="item-meta"><div><span class="meta-label">Stok tersedia</span><strong class="meta-value">${formatNumber(item.stock_qty)} ${escapeHtml(item.unit || 'pcs')}</strong></div>${prices.map(([label, value]) => `<div><span class="meta-label">${escapeHtml(label)}</span><strong class="meta-value">${money(value)}</strong></div>`).join('')}<div><span class="meta-label">Stok minimum</span><strong class="meta-value">${formatNumber(item.min_stock)} ${escapeHtml(item.unit || 'pcs')}</strong></div></div>
          ${item.description ? `<p class="item-description">${escapeHtml(item.description)}</p>` : ''}
          <div class="item-actions"><button class="small-action primary" data-stock="${item.id}">± Stok</button><button class="small-action" data-edit="${item.id}">Edit</button><button class="small-action" data-delete="${item.id}">Hapus</button></div>
        </div></article>`;
    }).join('');
  }

  function renderDashboard() {
    const total = state.items.length;
    const hijab = state.items.filter(i => i.category === 'hijab').reduce((sum, i) => sum + number(i.stock_qty), 0);
    const flowers = state.items.filter(i => i.category === 'flower').reduce((sum, i) => sum + number(i.stock_qty), 0);
    const low = state.items.filter(i => number(i.stock_qty) <= number(i.min_stock));
    $('#stat-total').textContent = formatNumber(total);
    $('#stat-hijab').textContent = formatNumber(hijab);
    $('#stat-flower').textContent = formatNumber(flowers);
    $('#stat-low').textContent = formatNumber(low.length);
    $('#low-count').textContent = `${low.length} barang`;
    const recent = [...state.items].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)).slice(0, 5);
    $('#recent-items').innerHTML = recent.length ? recent.map(item => `<div class="recent-row"><div class="mini-thumb">${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="">` : '✿'}</div><div class="row-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(CATEGORY[item.category])}${item.color ? ' · ' + escapeHtml(item.color) : ''}</small></div><div class="row-value">${formatNumber(item.stock_qty)}<small>${escapeHtml(item.unit || 'pcs')}</small></div></div>`).join('') : '<div class="empty-state compact">Belum ada barang. Tambahkan inventaris pertama Anda.</div>';
    $('#low-items').innerHTML = low.length ? low.slice(0, 6).map(item => `<div class="low-row"><span class="low-dot"></span><div class="row-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(CATEGORY[item.category])}${item.color ? ' · ' + escapeHtml(item.color) : ''}</small></div><div class="row-value">${formatNumber(item.stock_qty)}<small>min. ${formatNumber(item.min_stock)} ${escapeHtml(item.unit || 'pcs')}</small></div></div>`).join('') : '<div class="empty-state compact">Belum ada barang yang perlu restock.</div>';
  }

  async function loadItems() {
    const result = await api('items_list');
    state.items = Array.isArray(result.items) ? result.items : [];
    renderDashboard();
    if (['hijab', 'flower', 'supplies', 'products'].includes(state.page)) renderInventory();
  }
  async function loadMovements() {
    $('#history-body').innerHTML = '<tr><td colspan="7" class="table-empty">Memuat riwayat...</td></tr>';
    try {
      const result = await api('movements_list');
      state.movements = Array.isArray(result.movements) ? result.movements : [];
      if (!state.movements.length) {
        $('#history-body').innerHTML = '<tr><td colspan="7" class="table-empty">Belum ada riwayat perubahan stok. Gunakan tombol ± Stok pada kartu barang untuk mencatat perubahan.</td></tr>';
        return;
      }
      const labels = { IN: 'Stok masuk', OUT: 'Stok keluar', ADJUSTMENT: 'Penyesuaian' };
      $('#history-body').innerHTML = state.movements.map(row => `<tr><td><strong>${escapeHtml(row.inventory_items?.name || 'Barang dihapus')}</strong><br><small style="color:#a09298">${escapeHtml(row.inventory_items?.category ? CATEGORY[row.inventory_items.category] : '')}</small></td><td><span class="movement-tag movement-${row.movement_type}">${labels[row.movement_type] || row.movement_type}</span></td><td>${formatNumber(row.quantity)} ${escapeHtml(row.inventory_items?.unit || '')}</td><td>${formatNumber(row.stock_before)}</td><td><strong>${formatNumber(row.stock_after)}</strong></td><td>${escapeHtml(row.note || '-')}</td><td>${formatDate(row.created_at)}</td></tr>`).join('');
    } catch (error) {
      $('#history-body').innerHTML = `<tr><td colspan="7" class="table-empty">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function openItemModal(item = null) {
    const form = $('#item-form');
    form.reset();
    state.editingId = item?.id || null;
    form.elements.id.value = item?.id || '';
    form.elements.category.value = item?.category || (state.page === 'hijab' ? 'hijab' : state.page === 'flower' ? 'flower' : state.page === 'supplies' ? 'packaging' : state.page === 'products' ? 'finished_product' : 'hijab');
    form.elements.name.value = item?.name || '';
    form.elements.variant.value = item?.variant || '';
    form.elements.color.value = item?.color || '';
    form.elements.sku.value = item?.sku || '';
    form.elements.stock_qty.value = item?.stock_qty ?? 0;
    form.elements.stock_qty.readOnly = !!item;
    $('#stock-edit-hint').hidden = !item;
    form.elements.unit.value = item?.unit || (form.elements.category.value === 'flower' ? 'tangkai' : 'pcs');
    form.elements.min_stock.value = item?.min_stock ?? 0;
    form.elements.purchase_price.value = item?.purchase_price ?? 0;
    form.elements.stem_price.value = item?.stem_price ?? 0;
    form.elements.selling_price.value = item?.selling_price ?? 0;
    form.elements.description.value = item?.description || '';
    form.elements.image_url.value = item?.image_url || '';
    form.elements.image_path.value = item?.image_path || '';
    $('#item-image').value = '';
    updateImagePreview(item?.image_url || '');
    updateCategoryFields();
    $('#item-modal-title').textContent = item ? 'Edit barang' : 'Tambah barang';
    $('#save-item').textContent = item ? 'Simpan perubahan' : 'Simpan barang';
    $('#item-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function updateCategoryFields() {
    const category = $('#item-category').value;
    const stemField = $('.field-stem');
    stemField.hidden = category !== 'flower';
    const unit = $('#item-form').elements.unit;
    if (!state.editingId && category === 'flower') unit.value = 'tangkai';
    if (!state.editingId && category === 'hijab') unit.value = 'pcs';
  }
  function updateImagePreview(url) {
    const box = $('#image-preview');
    box.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="Pratinjau foto">` : '<span>✿</span><small>Belum ada foto</small>';
  }
  function openStockModal(item) {
    state.stockItem = item;
    const form = $('#stock-form');
    form.reset();
    form.elements.item_id.value = item.id;
    $('#stock-item-name').textContent = `${item.name} · stok saat ini ${formatNumber(item.stock_qty)} ${item.unit || 'pcs'}`;
    $('#movement-qty-label').firstChild.textContent = 'Jumlah';
    $('#stock-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
    if ($$('.modal-backdrop').every(node => node.hidden)) document.body.style.overflow = '';
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('#auth-submit');
    const fd = new FormData(form);
    setBusy(button, true, 'Memproses...');
    try {
      const action = state.authMode === 'login' ? 'login' : 'signup';
      const result = await api(action, {
        email: fd.get('email'), password: fd.get('password'), business_name: fd.get('business_name') || ''
      });
      toast(result.message || 'Berhasil.');
      if (result.user) {
        state.user = result.user;
        await loadItems();
        showApp();
      } else if (state.authMode === 'signup') {
        setAuthMode('login');
        form.reset();
      }
    } catch (error) { toast(error.message, 'error'); }
    finally { setBusy(button, false); button.textContent = state.authMode === 'login' ? 'Masuk' : 'Buat akun'; }
  }
  function setAuthMode(mode) {
    state.authMode = mode;
    const signup = mode === 'signup';
    $('#auth-title').textContent = signup ? 'Buat akun Ruang Stok' : 'Masuk ke Ruang Stok';
    $('#auth-description').textContent = signup ? 'Daftarkan akun untuk mulai menyimpan data inventaris.' : 'Kelola stok usaha Anda dengan mudah.';
    $('#business-field').hidden = !signup;
    $('#auth-submit').textContent = signup ? 'Buat akun' : 'Masuk';
    $('#auth-switch-label').textContent = signup ? 'Sudah punya akun?' : 'Belum punya akun?';
    $('#auth-switch').textContent = signup ? 'Masuk di sini' : 'Daftar sekarang';
  }

  async function handleItemSave(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('#save-item');
    setBusy(button, true, 'Menyimpan...');
    try {
      const file = $('#item-image').files[0];
      const values = Object.fromEntries(new FormData(form).entries());
      if (file) {
        setBusy(button, true, 'Mengunggah foto...');
        const uploaded = await uploadImage(file);
        values.image_url = uploaded.image_url;
        values.image_path = uploaded.image_path;
      }
      values.stock_qty = number(values.stock_qty);
      values.min_stock = number(values.min_stock);
      values.purchase_price = number(values.purchase_price);
      values.stem_price = number(values.stem_price);
      values.selling_price = number(values.selling_price);
      await api('item_save', values);
      closeModal('item-modal');
      toast('Data barang berhasil disimpan.');
      await loadItems();
    } catch (error) { toast(error.message, 'error'); }
    finally { setBusy(button, false); button.textContent = state.editingId ? 'Simpan perubahan' : 'Simpan barang'; }
  }
  async function handleStockSave(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('#save-movement');
    const values = Object.fromEntries(new FormData(form).entries());
    values.quantity = number(values.quantity);
    setBusy(button, true, 'Mencatat...');
    try {
      await api('stock_move', values);
      closeModal('stock-modal');
      toast('Perubahan stok berhasil dicatat.');
      await loadItems();
      if (state.page === 'history') await loadMovements();
    } catch (error) { toast(error.message, 'error'); }
    finally { setBusy(button, false); }
  }

  function bindEvents() {
    $('#auth-form').addEventListener('submit', handleAuthSubmit);
    $('#auth-switch').addEventListener('click', () => setAuthMode(state.authMode === 'login' ? 'signup' : 'login'));
    $('#item-form').addEventListener('submit', handleItemSave);
    $('#stock-form').addEventListener('submit', handleStockSave);
    $('#item-category').addEventListener('change', updateCategoryFields);
    $('#item-image').addEventListener('change', event => {
      const file = event.target.files[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        toast('Pilih gambar JPG, PNG, atau WEBP maksimal 5 MB.', 'error'); event.target.value = ''; return;
      }
      const reader = new FileReader();
      reader.onload = () => updateImagePreview(reader.result);
      reader.readAsDataURL(file);
    });
    $('#add-item').addEventListener('click', () => openItemModal());
    $('#quick-add').addEventListener('click', () => openItemModal());
    $('#search-items').addEventListener('input', renderInventory);
    $('#sort-items').addEventListener('change', renderInventory);
    $('#category-chips').addEventListener('click', event => {
      const button = event.target.closest('[data-chip]');
      if (!button) return;
      state.chip = button.dataset.chip; renderChips(); renderInventory();
    });
    $('#inventory-grid').addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit]');
      const stock = event.target.closest('[data-stock]');
      const del = event.target.closest('[data-delete]');
      if (edit) {
        const item = state.items.find(row => row.id === edit.dataset.edit);
        if (item) openItemModal(item);
      }
      if (stock) {
        const item = state.items.find(row => row.id === stock.dataset.stock);
        if (item) openStockModal(item);
      }
      if (del) {
        const item = state.items.find(row => row.id === del.dataset.delete);
        if (!item || !confirm(`Hapus barang "${item.name}"? Riwayat stok untuk barang ini juga akan terhapus.`)) return;
        try { await api('item_delete', { id: item.id }); toast('Barang berhasil dihapus.'); await loadItems(); }
        catch (error) { toast(error.message, 'error'); }
      }
    });
    $$('.nav-link, [data-page]').forEach(button => button.addEventListener('click', event => {
      const page = event.currentTarget.dataset.page;
      if (page && PAGE[page]) navigate(page);
    }));
    $$('[data-close]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.close)));
    $$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop.id); }));
    $('#movement-type').addEventListener('change', event => {
      const label = $('#movement-qty-label');
      label.firstChild.textContent = event.target.value === 'ADJUSTMENT' ? 'Jumlah stok akhir yang benar' : 'Jumlah';
      $('#stock-form').elements.quantity.placeholder = event.target.value === 'ADJUSTMENT' ? 'Masukkan stok akhir' : 'Masukkan jumlah';
    });
    $('#refresh-history').addEventListener('click', loadMovements);
    $('#logout-button').addEventListener('click', async () => {
      try { await api('logout'); } catch (error) { /* sesi lokal tetap dibersihkan */ }
      state.user = null; state.items = []; showAuth(); setAuthMode('login'); toast('Anda sudah keluar.');
    });
    $('#mobile-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') $$('.modal-backdrop').forEach(modal => closeModal(modal.id)); });
  }

  async function init() {
    bindEvents();
    try {
      const response = await fetch('api.php?action=state', { cache: 'no-store' });
      const info = await response.json();
      state.csrf = info.csrf || '';
      if (!info.configured) {
        showAuth();
        toast('Konfigurasi belum siap: buat config.php dan jalankan schema.sql di Supabase.', 'error');
        return;
      }
      if (info.user) {
        state.user = info.user;
        showApp();
        await loadItems();
      } else {
        showAuth();
      }
    } catch (error) {
      showAuth();
      toast('Aplikasi tidak dapat memuat sesi. Periksa server PHP dan koneksi internet.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
