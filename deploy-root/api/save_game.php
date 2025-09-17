<?php
header('Content-Type: application/json; charset=utf-8');
// If Angular is on another domain, you might need:
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type');
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$path = __DIR__ . '/games.json';

// Read JSON body
$raw = file_get_contents('php://input');
$game = json_decode($raw, true);

if (!is_array($game)) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid JSON']);
  exit;
}

// Load existing array (or empty)
if (!file_exists($path)) {
  $games = [];
} else {
  $json = file_get_contents($path);
  $games = json_decode($json, true);
  if (!is_array($games)) $games = [];
}

// Append new game
$games[] = $game;

// Write back with an exclusive lock
$fp = fopen($path, 'c+'); // read/write, create if not exists
if ($fp === false) {
  http_response_code(500);
  echo json_encode(['error' => 'Cannot open file for writing']);
  exit;
}
flock($fp, LOCK_EX);
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($games, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

// Return the added game or the whole list (your choice)
echo json_encode(['ok' => true, 'count' => count($games)]);
