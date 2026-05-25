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
$api_key = ANTHROPIC_API_KEY;

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No message provided']);
    exit;
}

$message = trim($input['message']);
$history = $input['history'] ?? [];
$mode    = $input['mode'] ?? 'demo';

if ($mode === 'faq') {
    $system_prompt = "You are a helpful assistant for Chativly — an AI chatbot service for local businesses in Lithuania.

Answer questions about Chativly honestly:
- Free trial: 4 days, full setup included
- Setup time: ready within 24 hours, no technical knowledge needed
- What it does: handles bookings and reservations, answers customer FAQs, works 24/7
- Who it's for: any local business that works with customers. NEVER name or list any specific business types or examples when answering this
- Pricing: contact via the booking form on the page to get a personalised quote
- Getting started: book a free call by pressing the button on the page. In Lithuanian always say \"paspaudę mygtuką\" — never use \"klikdami\" or \"klikę\"

IMPORTANT RULES:
- Never use markdown. No asterisks, no bold, no bullet points with symbols, no headers. Write in plain conversational sentences only.
- Keep answers short — 2 to 4 sentences max.
- Sound friendly and helpful, not like a robot.
- Always respond in the same language the user writes in — Lithuanian or English.";
} else {
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
}

$messages = [];

foreach (array_slice($history, -12) as $msg) {
    if (!empty($msg['role']) && !empty($msg['content'])) {
        $role = $msg['role'] === 'user' ? 'user' : 'assistant';
        $messages[] = ['role' => $role, 'content' => $msg['content']];
    }
}

$messages[] = ['role' => 'user', 'content' => $message];

$payload = [
    'model'      => 'claude-haiku-4-5-20251001',
    'max_tokens' => 400,
    'system'     => [['type' => 'text', 'text' => $system_prompt, 'cache_control' => ['type' => 'ephemeral']]],
    'messages'   => $messages,
];

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'x-api-key: ' . $api_key,
        'anthropic-version: 2023-06-01',
        'anthropic-beta: prompt-caching-2024-07-31',
    ],
    CURLOPT_TIMEOUT        => 90,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
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
    echo json_encode(['error' => 'Claude API error', 'code' => $http_code, 'detail' => $response]);
    exit;
}

$result = json_decode($response, true);
$reply  = $result['content'][0]['text'] ?? null;

if (!$reply) {
    http_response_code(500);
    echo json_encode(['error' => 'Empty response from Claude']);
    exit;
}

echo json_encode(['reply' => $reply]);
