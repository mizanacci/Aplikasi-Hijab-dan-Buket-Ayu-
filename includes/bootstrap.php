<?php
// Inisialisasi sesi dan konfigurasi aplikasi.
$configFile = dirname(__DIR__) . '/config.php';
$GLOBALS['APP_CONFIG'] = is_file($configFile) ? require $configFile : null;

if (session_status() !== PHP_SESSION_ACTIVE) {
    $config = is_array($GLOBALS['APP_CONFIG'] ?? null) ? $GLOBALS['APP_CONFIG'] : [];
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $secureCookies = (bool)($config['session_secure'] ?? false) && $isHttps;
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secureCookies,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function app_config(): array
{
    $config = $GLOBALS['APP_CONFIG'] ?? null;
    if (!is_array($config)) {
        throw new RuntimeException('Konfigurasi belum dibuat. Salin config.example.php menjadi config.php lalu isi kredensial Supabase.');
    }
    foreach (['supabase_url', 'supabase_anon_key', 'storage_bucket'] as $key) {
        if (empty($config[$key]) || str_contains((string)$config[$key], 'PROJECT-REF') || str_contains((string)$config[$key], 'SUPABASE_PUBLISHABLE')) {
            throw new RuntimeException('Konfigurasi Supabase belum lengkap. Periksa file config.php.');
        }
    }
    return $config;
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function request_json(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function require_csrf(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $known = $_SESSION['csrf_token'] ?? '';
    if (!$sent || !$known || !hash_equals($known, $sent)) {
        json_response(['ok' => false, 'message' => 'Token keamanan tidak valid. Muat ulang halaman dan coba lagi.'], 419);
    }
}
