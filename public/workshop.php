<?php
declare(strict_types=1);

const EDUFY_FIREBASE_PROJECT_ID = 'edufy-makerlab';
const EDUFY_FIREBASE_API_KEY = 'AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A';

function escape_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function request_origin(): string
{
    $forwardedProtocol = trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]);
    $protocol = in_array($forwardedProtocol, ['http', 'https'], true)
        ? $forwardedProtocol
        : ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');
    $host = trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? ''))[0]);

    if (!preg_match('/^[A-Za-z0-9.-]+(?::\d+)?$/', $host)) {
        $host = 'localhost';
    }

    return $protocol . '://' . $host;
}

function firestore_value(array $value)
{
    foreach (['stringValue', 'booleanValue', 'integerValue', 'doubleValue', 'timestampValue'] as $key) {
        if (array_key_exists($key, $value)) {
            return $key === 'integerValue' ? (int) $value[$key] : $value[$key];
        }
    }

    if (isset($value['arrayValue'])) {
        return array_map('firestore_value', $value['arrayValue']['values'] ?? []);
    }

    if (isset($value['mapValue'])) {
        return firestore_fields($value['mapValue']['fields'] ?? []);
    }

    return null;
}

function firestore_fields(array $fields): array
{
    $decoded = [];
    foreach ($fields as $key => $value) {
        if (is_array($value)) {
            $decoded[$key] = firestore_value($value);
        }
    }
    return $decoded;
}

function fetch_workshop(string $slug): ?array
{
    $endpoint = sprintf(
        'https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents:runQuery?key=%s',
        rawurlencode(EDUFY_FIREBASE_PROJECT_ID),
        rawurlencode(EDUFY_FIREBASE_API_KEY)
    );
    $payload = json_encode([
        'structuredQuery' => [
            'from' => [['collectionId' => 'workshop_templates']],
            'where' => [
                'fieldFilter' => [
                    'field' => ['fieldPath' => 'shareableSlug'],
                    'op' => 'EQUAL',
                    'value' => ['stringValue' => $slug],
                ],
            ],
            'limit' => 1,
        ],
    ], JSON_UNESCAPED_SLASHES);

    if ($payload === false) {
        return null;
    }

    $response = false;
    if (function_exists('curl_init')) {
        $curl = curl_init($endpoint);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 8,
        ]);
        $response = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        if ($status < 200 || $status >= 300) {
            $response = false;
        }
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOL)) {
        $context = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 8,
            'ignore_errors' => true,
        ]]);
        $response = @file_get_contents($endpoint, false, $context);
    }

    if (!is_string($response) || $response === '') {
        return null;
    }

    $rows = json_decode($response, true);
    if (!is_array($rows)) {
        return null;
    }

    $fields = $rows[0]['document']['fields'] ?? null;
    return is_array($fields) ? firestore_fields($fields) : null;
}

function workshop_schedule(array $template): string
{
    $pattern = is_array($template['recurrencePattern'] ?? null) ? $template['recurrencePattern'] : [];
    $time = trim((string) ($pattern['time'] ?? '')) ?: 'time to be confirmed';

    if (($template['recurrenceType'] ?? '') === 'weekly') {
        $weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $days = array_values(array_unique(array_filter(
            array_map('intval', is_array($pattern['days'] ?? null) ? $pattern['days'] : []),
            static fn (int $day): bool => $day >= 0 && $day <= 6
        )));
        usort($days, static fn (int $left, int $right): int => ($left === 0 ? 7 : $left) <=> ($right === 0 ? 7 : $right));
        return $days ? 'Every ' . implode(', ', array_map(static fn (int $day): string => $weekdayNames[$day], $days)) . ' at ' . $time : 'Weekly at ' . $time;
    }

    $dateKey = (string) ($pattern['date'] ?? '');
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $dateKey, new DateTimeZone('UTC'));
    return ($date ? $date->format('l, j F Y') : 'Date to be confirmed') . ' at ' . $time;
}

function workshop_image_url(string $value, string $fallback): string
{
    $candidate = trim($value);
    if (!filter_var($candidate, FILTER_VALIDATE_URL) || !preg_match('/^https?:\/\//i', $candidate)) {
        return $fallback;
    }

    $parts = parse_url($candidate);
    $hostname = strtolower((string) ($parts['host'] ?? ''));
    if ($hostname === 'drive.google.com' || $hostname === 'drive.usercontent.google.com') {
        $driveFileId = '';
        if (preg_match('#/file/d/([A-Za-z0-9_-]+)#', (string) ($parts['path'] ?? ''), $matches)) {
            $driveFileId = $matches[1];
        } elseif (!empty($parts['query'])) {
            parse_str((string) $parts['query'], $query);
            $driveFileId = (string) ($query['id'] ?? '');
        }

        if (preg_match('/^[A-Za-z0-9_-]+$/', $driveFileId)) {
            return 'https://drive.usercontent.google.com/download?id=' . rawurlencode($driveFileId) . '&export=view';
        }
    }

    return $candidate;
}

function render_unavailable(string $origin, string $message, int $status): void
{
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex');
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workshop unavailable · Edufy</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f2;color:#08111f;font:16px/1.6 system-ui,sans-serif}.card{max-width:34rem;margin:1rem;padding:2rem;border:1px solid #dce2d8;border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(8,17,31,.1)}a{color:#087a68;font-weight:700}</style></head><body><main class="card"><h1>Workshop unavailable</h1><p>' . escape_html($message) . '</p><a href="' . escape_html($origin) . '">Return to Edufy</a></main></body></html>';
    exit;
}

$origin = request_origin();
$slug = trim((string) ($_GET['slug'] ?? ''));
$shareVersion = trim((string) ($_GET['v'] ?? ''));
if (!preg_match('/^[A-Za-z0-9-]{1,80}$/', $shareVersion)) {
    $shareVersion = '';
}
if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9-]{1,158}[A-Za-z0-9]$/', $slug)) {
    render_unavailable($origin, 'This invitation link is incomplete or invalid.', 404);
}

$template = fetch_workshop($slug);
if ($template === null) {
    render_unavailable($origin, 'This workshop invitation could not be loaded. Please try again shortly.', 503);
}
if (($template['isActive'] ?? true) === false) {
    render_unavailable($origin, 'Booking for this workshop is currently paused.', 410);
}

$title = trim((string) ($template['title'] ?? 'Workshop invitation')) ?: 'Workshop invitation';
$description = preg_replace('/\s+/', ' ', trim((string) ($template['description'] ?? 'Choose a session and reserve your workshop place.')));
$schedule = workshop_schedule($template);
$socialText = trim($description . ' ' . $schedule);
$socialDescription = function_exists('mb_substr') ? mb_substr($socialText, 0, 300) : substr($socialText, 0, 300);
$encodedSlug = rawurlencode($slug);
$shareUrl = $origin . '/w/' . $encodedSlug . ($shareVersion !== '' ? '?v=' . rawurlencode($shareVersion) : '');
$bookingUrl = $origin . '/?mode=booking&amp;slug=' . $encodedSlug;
$redirectUrl = $origin . '/?mode=booking&slug=' . $encodedSlug;
$defaultImage = $origin . '/images/makerlab-tello-python-hero-v1.png';
$candidateImage = trim((string) ($template['imageUrl'] ?? ''));
$imageUrl = workshop_image_url($candidateImage, $defaultImage);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
header('X-Content-Type-Options: nosniff');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= escape_html($title) ?> · Workshop invitation</title>
  <meta name="description" content="<?= escape_html($socialDescription) ?>">
  <link rel="canonical" href="<?= escape_html($shareUrl) ?>">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="MakerLab Academy">
  <meta property="og:url" content="<?= escape_html($shareUrl) ?>">
  <meta property="og:title" content="<?= escape_html($title) ?>">
  <meta property="og:description" content="<?= escape_html($socialDescription) ?>">
  <meta property="og:image" content="<?= escape_html($imageUrl) ?>">
  <meta property="og:image:secure_url" content="<?= escape_html($imageUrl) ?>">
  <meta property="og:image:alt" content="<?= escape_html($title . ' workshop invitation') ?>">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= escape_html($title) ?>">
  <meta name="twitter:description" content="<?= escape_html($socialDescription) ?>">
  <meta name="twitter:image" content="<?= escape_html($imageUrl) ?>">
  <meta http-equiv="refresh" content="0;url=<?= $bookingUrl ?>">
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f2;color:#08111f;font:16px/1.6 system-ui,sans-serif}.card{max-width:34rem;margin:1rem;padding:2rem;border:1px solid #dce2d8;border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(8,17,31,.1)}a{color:#087a68;font-weight:700}</style>
</head>
<body>
  <main class="card"><p>Opening <strong><?= escape_html($title) ?></strong>…</p><a href="<?= $bookingUrl ?>">Continue to booking</a></main>
  <script>window.location.replace(<?= json_encode($redirectUrl, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>);</script>
</body>
</html>
