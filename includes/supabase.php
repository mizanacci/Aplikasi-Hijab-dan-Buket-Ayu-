<?php
require_once __DIR__ . '/bootstrap.php';

function sb_request(string $method, string $path, mixed $body = null, ?string $jwt = null, array $extraHeaders = [], bool $rawBody = false): array
{
    $cfg = app_config();
    $base = rtrim($cfg['supabase_url'], '/');
    $headers = [
        'apikey: ' . $cfg['supabase_anon_key'],
        'Authorization: Bearer ' . ($jwt ?: $cfg['supabase_anon_key']),
        'Accept: application/json',
    ];
    if (!$rawBody && $body !== null) $headers[] = 'Content-Type: application/json';
    $headers = array_merge($headers, $extraHeaders);

    $url = $base . '/' . ltrim($path, '/');
    $payload = null;
    if ($body !== null) {
        $payload = $rawBody ? $body : json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 35,
            CURLOPT_CONNECTTIMEOUT => 12,
        ]);
        if ($payload !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($response === false) {
            throw new RuntimeException('Tidak dapat terhubung ke Supabase: ' . ($curlError ?: 'koneksi gagal'));
        }
    } else {
        // Fallback untuk instalasi PHP yang belum mengaktifkan ekstensi cURL.
        if (!ini_get('allow_url_fopen')) {
            throw new RuntimeException('Aktifkan ekstensi PHP cURL atau allow_url_fopen untuk menghubungkan Supabase.');
        }
        $context = stream_context_create(['http' => [
            'method' => strtoupper($method),
            'header' => implode("\r\n", $headers),
            'content' => $payload ?? '',
            'timeout' => 35,
            'ignore_errors' => true,
        ]]);
        $response = @file_get_contents($url, false, $context);
        $status = 0;
        foreach (($http_response_header ?? []) as $headerLine) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $headerLine, $match)) $status = (int)$match[1];
        }
        if ($response === false) {
            throw new RuntimeException('Tidak dapat terhubung ke Supabase. Periksa koneksi internet dan konfigurasi PHP.');
        }
    }
    $decoded = json_decode($response, true);
    return ['status' => $status, 'data' => $decoded, 'raw' => $response];
}

function sb_assert(array $result, string $fallback = 'Permintaan ke Supabase gagal'): mixed
{
    if ($result['status'] < 200 || $result['status'] >= 300) {
        $data = $result['data'];
        $message = is_array($data)
            ? ($data['msg'] ?? $data['message'] ?? $data['error_description'] ?? $data['error'] ?? $fallback)
            : $fallback;
        throw new RuntimeException((string)$message . ' (HTTP ' . $result['status'] . ')');
    }
    return $result['data'];
}

function save_auth_session(array $auth): void
{
    if (empty($auth['access_token']) || empty($auth['user']['id'])) {
        throw new RuntimeException('Supabase belum memberikan sesi login. Periksa pengaturan konfirmasi email di Supabase Auth.');
    }
    session_regenerate_id(true);
    $_SESSION['sb_access_token'] = $auth['access_token'];
    $_SESSION['sb_refresh_token'] = $auth['refresh_token'] ?? '';
    $_SESSION['sb_expires_at'] = time() + (int)($auth['expires_in'] ?? 3600) - 60;
    $_SESSION['sb_user'] = $auth['user'];
}

function current_access_token(): ?string
{
    $token = $_SESSION['sb_access_token'] ?? null;
    if (!$token) return null;
    if ((int)($_SESSION['sb_expires_at'] ?? 0) > time()) return $token;

    $refresh = $_SESSION['sb_refresh_token'] ?? '';
    if (!$refresh) return null;
    try {
        $result = sb_request('POST', 'auth/v1/token?grant_type=refresh_token', ['refresh_token' => $refresh]);
        $auth = sb_assert($result, 'Sesi login sudah berakhir. Silakan login kembali.');
        save_auth_session($auth);
        return $_SESSION['sb_access_token'];
    } catch (Throwable $e) {
        clear_auth_session();
        return null;
    }
}

function clear_auth_session(): void
{
    unset($_SESSION['sb_access_token'], $_SESSION['sb_refresh_token'], $_SESSION['sb_expires_at'], $_SESSION['sb_user']);
    session_regenerate_id(true);
}

function require_user(): array
{
    $token = current_access_token();
    $user = $_SESSION['sb_user'] ?? null;
    if (!$token || !is_array($user) || empty($user['id'])) {
        json_response(['ok' => false, 'message' => 'Sesi berakhir. Silakan login kembali.'], 401);
    }
    return ['token' => $token, 'user' => $user];
}

function sb_path_id(string $id): string
{
    if (!preg_match('/^[0-9a-fA-F-]{36}$/', $id)) {
        throw new InvalidArgumentException('ID data tidak valid.');
    }
    return rawurlencode($id);
}
