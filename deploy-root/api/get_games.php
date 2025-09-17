<?php
header('Content-Type: application/json; charset=utf-8');
// If Angular is on the same domain, CORS not needed. If different, uncomment:
// header('Access-Control-Allow-Origin: *');

$path = __DIR__ . '/games.json';

if (!file_exists($path)) {
  echo '[]';
  exit;
}

$fp = fopen($path, 'r');
if ($fp === false) {
  http_response_code(500);
  echo json_encode(['error' => 'Cannot open file']);
  exit;
}
flock($fp, LOCK_SH); // shared lock
$contents = stream_get_contents($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo $contents ?: '[]';
