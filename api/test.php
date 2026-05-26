<?php
// test
require_once __DIR__ . '/../config.php';
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

$payload = json_encode([
    'contents' => [
        ['role' => 'user', 'parts' => [['text' => 'Say hello in one sentence.']]]
    ],
    'generationConfig' => ['maxOutputTokens' => 50]
]);

$url = "https://generativelanguage.googleapis.com/v1beta/models/" . GEMINI_MODEL . ":generateContent?key=" . GEMINI_API_KEY;

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_POST            => true,
    CURLOPT_POSTFIELDS      => $payload,
    CURLOPT_HTTPHEADER      => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT         => 20,
    CURLOPT_SSL_VERIFYPEER  => false,
    CURLOPT_SSL_VERIFYHOST  => false,
]);

$response  = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_err  = curl_error($ch);
curl_close($ch);

echo "HTTP Status: $http_code\n";
echo "Model: " . GEMINI_MODEL . "\n";
if ($curl_err) echo "CURL Error: $curl_err\n";
echo "\n" . ($response ?: 'No response body');
