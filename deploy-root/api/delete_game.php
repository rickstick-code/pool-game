<?php
header('Content-Type: application/json; charset=utf-8');
// If your Angular dev server is on a different origin during dev, you can allow CORS:
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type');
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$path = __DIR__ . '/games.json';

// Read JSON body
$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload) || !isset($payload['id'])) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid payload']);
  exit;
}
$id = (string)$payload['id'];

// Load existing list
$games = [];
if (file_exists($path)) {
  $json = file_get_contents($path);
  $decoded = json_decode($json, true);
  if (is_array($decoded)) $games = $decoded;
}

// Filter out the entry
$before = count($games);
$games = array_values(array_filter($games, function($g) use ($id) {
  return !isset($g['id']) || $g['id'] !== $id;
}));
$removed = $before - count($games);

// Write back with lock
$fp = fopen($path, 'c+');
if ($fp === false) {
  http_response_code(500);
  echo json_encode(['error' => 'Cannot open file']);
  exit;
}
flock($fp, LOCK_EX);
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($games, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['ok' => true, 'removed' => $removed]);
