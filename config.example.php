<?php
/**
 * Salin file ini menjadi config.php lalu isi dengan URL dan publishable/anon key Supabase.
 * Jangan pernah memasukkan service_role/secret key ke aplikasi ini.
 */
return [
    'supabase_url' => 'https://PROJECT-REF.supabase.co',
    'supabase_anon_key' => 'SUPABASE_PUBLISHABLE_OR_LEGACY_ANON_KEY',
    'storage_bucket' => 'inventory-images',
    'app_name' => 'Ruang Stok',
    'session_secure' => false, // Ubah true ketika website sudah memakai HTTPS.
];
