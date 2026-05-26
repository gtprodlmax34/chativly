<?php
// contact
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once __DIR__ . '/../config.php';

$input = json_decode(file_get_contents('php://input'), true);

$name  = trim($input['name']  ?? '');
$email = trim($input['email'] ?? '');
$phone = trim($input['phone'] ?? '');

if (!$name || !$email || !$phone) {
    http_response_code(400);
    echo json_encode(['error' => 'Visi laukai privalomi']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Neteisingas el. pašto formatas']);
    exit;
}

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->prepare('INSERT INTO leads (name, email, phone) VALUES (?, ?, ?)');
    $stmt->execute([$name, $email, $phone]);

    // Send email via Gmail SMTP
    require_once __DIR__ . '/../vendor/autoload.php';

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = MAIL_USER;
    $mail->Password   = MAIL_PASS;
    $mail->SMTPSecure = 'tls';
    $mail->Port       = 587;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom(MAIL_USER, 'Chativly');
    $mail->addAddress(MAIL_TO);
    $mail->Subject = 'Nauja užklausa — ' . $name;
    $mail->isHTML(true);
    $mail->Body = '
        <h2 style="font-family:sans-serif;">Nauja Chativly užklausa</h2>
        <table cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;font-size:15px;">
            <tr><td><strong>Vardas</strong></td><td>' . htmlspecialchars($name) . '</td></tr>
            <tr><td><strong>El. paštas</strong></td><td>' . htmlspecialchars($email) . '</td></tr>
            <tr><td><strong>Telefonas</strong></td><td>' . htmlspecialchars($phone) . '</td></tr>
        </table>
    ';
    $mail->send();

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Duomenų bazės klaida']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'El. pašto siuntimo klaida']);
}
