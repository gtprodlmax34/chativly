<?php
ini_set('display_errors', 0);
error_reporting(0);
set_time_limit(120);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config.php';
$api_key = GEMINI_API_KEY;

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No message provided']);
    exit;
}

$message = trim($input['message']);
$history = $input['history'] ?? [];

$system_prompt = "You are a demo AI assistant for Chativly — a service that provides AI chatbots for local businesses in Lithuania. Your job is to show potential business owners how a chatbot would work on their website.

You can act as a chatbot for any local business: barbershops, auto repair shops, beauty salons, dental clinics, gyms, law firms, driving schools, and so on.

When someone interacts with you:
- If they ask what you can do, explain naturally that you handle bookings and answer customer questions around the clock
- If they describe their business, adapt and act as their chatbot
- For booking requests: ask for their name, preferred date and time, and which service they want
- For FAQ: answer questions about opening hours, prices, location, services

IMPORTANT RULES:
- Never use markdown. No asterisks, no bold, no bullet points with symbols, no headers. Write in plain conversational sentences only.
- Always say 24/7 when referring to availability. Never say 7 days a week or 24 hours a day — always use 24/7.
- Keep answers short — 2 to 4 sentences max.
- Sound like a friendly human assistant, not a robot.
- Always respond in the same language the user writes in — Lithuanian or English.";

$contents = [];

foreach ($history as $msg) {
    if (!empty($msg['role']) && !empty($msg['content'])) {
        $role = $msg['role'] === 'user' ? 'user' : 'model';
        $contents[] = [
            'role' => $role,
            'parts' => [['text' => $msg['content']]]
        ];
    }
}

$contents[] = [
    'role' => 'user',
    'parts' => [['text' => $message]]
];

$payload = [
    'system_instruction' => ['parts' => [['text' => $system_prompt]]],
    'contents' => $contents,
    'generationConfig' => [
        'maxOutputTokens' => 400,
        'temperature' => 0.7
    ]
];

$url = "https://generativelanguage.googleapis.com/v1beta/models/" . GEMINI_MODEL . ":generateContent?key={$api_key}";

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_POST            => true,
    CURLOPT_POSTFIELDS      => json_encode($payload),
    CURLOPT_HTTPHEADER      => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT         => 90,
    CURLOPT_SSL_VERIFYPEER  => true,
    CURLOPT_SSL_VERIFYHOST  => 2,
]);

$response  = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_err  = curl_error($ch);
curl_close($ch);

if ($curl_err) {
    http_response_code(500);
    echo json_encode(['error' => 'Connection failed', 'detail' => $curl_err]);
    exit;
}

if ($http_code !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Gemini API error', 'code' => $http_code, 'detail' => $response]);
    exit;
}

$result = json_decode($response, true);
$reply  = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;

if (!$reply) {
    http_response_code(500);
    echo json_encode(['error' => 'Empty response from Gemini']);
    exit;
}

echo json_encode(['reply' => $reply]);
