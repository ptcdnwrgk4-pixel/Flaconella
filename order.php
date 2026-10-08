<?php
/**
 * Flaconella – Bestell-, Kontakt- und Bewertungs-Mailer für IONOS Webhosting.
 *
 * Nimmt JSON per POST entgegen (so wie index.html es sendet), schickt eine E-Mail
 * an das Shop-Postfach und – wenn "_autoresponse" und "email" enthalten sind – eine
 * kurze Eingangsbestätigung an die Kundin. Antwortet mit {"success":true}.
 *
 * Wichtig bei IONOS: Die Absenderadresse (SHOP_FROM) muss ein echtes Postfach
 * deiner Domain sein (z. B. hallo@flaconella.de aus IONOS Mail). Sonst verwirft
 * der Mailserver die Nachricht.
 */

const SHOP_TO    = 'hallo@flaconella.de';   // Empfänger der Bestellungen
const SHOP_FROM  = 'hallo@flaconella.de';   // Absender – Postfach auf der eigenen Domain
const SHOP_NAME  = 'Flaconella';
const ALLOWED_HOSTS = ['flaconella.de', 'www.flaconella.de', 'flaconella.com', 'www.flaconella.com', 'localhost'];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Nur POST erlaubt');

// Nur Anfragen von der eigenen Seite annehmen
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
$originHost = $origin ? (parse_url($origin, PHP_URL_HOST) ?: '') : '';
if ($originHost !== '' && !in_array(strtolower($originHost), ALLOWED_HOSTS, true)) fail(403, 'Ungültige Herkunft');

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 50000) fail(413, 'Anfrage zu groß');
$data = json_decode($raw, true);
if (!is_array($data) || !$data) fail(400, 'Ungültige Daten');

// Honeypot: echte Nutzer füllen dieses Feld nie aus
if (!empty($data['_gotcha'])) { echo json_encode(['success' => true]); exit; }

$subject  = trim((string)($data['_subject'] ?? 'Neue Nachricht über flaconella.de'));
$replyTo  = trim((string)($data['_replyto'] ?? ($data['email'] ?? '')));
$autoText = trim((string)($data['_autoresponse'] ?? ''));

$subject = preg_replace('/[\r\n]+/', ' ', mb_substr($subject, 0, 150));
if ($replyTo !== '' && !filter_var($replyTo, FILTER_VALIDATE_EMAIL)) $replyTo = '';

// Mailtext aus allen Feldern ohne Unterstrich-Präfix bauen
$lines = [];
foreach ($data as $key => $value) {
    if (!is_string($key) || $key === '' || $key[0] === '_') continue;
    if (is_array($value)) $value = json_encode($value, JSON_UNESCAPED_UNICODE);
    $value = trim((string)$value);
    if ($value === '') continue;
    $key = preg_replace('/[\r\n]+/', ' ', mb_substr($key, 0, 60));
    $value = mb_substr($value, 0, 8000);
    $lines[] = (strpos($value, "\n") !== false) ? "$key:\n$value" : "$key: $value";
}
if (!$lines) fail(400, 'Keine Inhalte');

$body  = implode("\n\n", $lines);
$body .= "\n\n—\nEingegangen am " . date('d.m.Y H:i') . " über flaconella.de";
if (!empty($_SERVER['REMOTE_ADDR'])) $body .= "\nIP: " . $_SERVER['REMOTE_ADDR'];

function encodeHeader(string $text): string {
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

$headers  = "From: " . encodeHeader(SHOP_NAME) . " <" . SHOP_FROM . ">\r\n";
if ($replyTo !== '') $headers .= "Reply-To: $replyTo\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";
$headers .= "X-Mailer: flaconella-order-php\r\n";

$sent = mail(SHOP_TO, encodeHeader($subject), $body, $headers, '-f' . SHOP_FROM);
if (!$sent) fail(500, 'E-Mail konnte nicht gesendet werden');

// Eingangsbestätigung an die Kundin
if ($autoText !== '' && $replyTo !== '') {
    $autoHeaders  = "From: " . encodeHeader(SHOP_NAME) . " <" . SHOP_FROM . ">\r\n";
    $autoHeaders .= "Reply-To: " . SHOP_TO . "\r\n";
    $autoHeaders .= "MIME-Version: 1.0\r\n";
    $autoHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $autoHeaders .= "Content-Transfer-Encoding: 8bit\r\n";
    @mail($replyTo, encodeHeader('Deine Bestellung bei Flaconella ist eingegangen'), mb_substr($autoText, 0, 8000), $autoHeaders, '-f' . SHOP_FROM);
}

echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
