<?php
declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_NAME = 'simplemente_futbol';
const DB_USER = 'root';
const DB_PASSWORD = '';
const PASSWORD_ITERATIONS = 310000;

function respond(int $status, array $data): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $message): void
{
    respond($status, ['error' => $message]);
}

function database(): PDO
{
    return new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASSWORD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
}

function read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) === 0 || strlen($raw) > 16384) {
        fail(400, 'El contenido de la solicitud está vacío o es demasiado grande.');
    }
    try {
        $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        fail(400, 'El contenido de la solicitud no es JSON válido.');
    }
    if (!is_array($data)) {
        fail(400, 'El contenido de la solicitud no es válido.');
    }
    return $data;
}

function require_same_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }
    $originHost = parse_url($origin, PHP_URL_HOST);
    $originPort = parse_url($origin, PHP_URL_PORT);
    $requestHost = $_SERVER['HTTP_HOST'] ?? '';
    $expectedHost = $originHost . ($originPort ? ':' . $originPort : '');
    if (!is_string($originHost) || !hash_equals(strtolower($requestHost), strtolower($expectedHost))) {
        fail(403, 'Origen de solicitud no permitido.');
    }
}

function current_user(PDO $db): ?array
{
    $userId = $_SESSION['user_id'] ?? null;
    if (!is_string($userId)) {
        return null;
    }
    $query = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
    $query->execute([$userId]);
    $user = $query->fetch();
    if (!$user) {
        unset($_SESSION['user_id']);
        return null;
    }
    return $user;
}

function require_user(PDO $db): array
{
    $user = current_user($db);
    if ($user === null) {
        fail(401, 'Inicia sesión para continuar.');
    }
    return $user;
}

function required_text(array $data, string $key, int $maximum): string
{
    $value = $data[$key] ?? null;
    if (!is_string($value) || trim($value) === '' || mb_strlen(trim($value), 'UTF-8') > $maximum) {
        fail(400, "El campo {$key} es obligatorio y no debe superar {$maximum} caracteres.");
    }
    return trim($value);
}

function listing_object(array $row): array
{
    return [
        'id' => $row['id'],
        'title' => $row['title'],
        'category' => $row['category'],
        'condition' => $row['condition'],
        'price' => (int) $row['price'],
        'city' => $row['city'],
        'seller' => $row['seller'],
        'description' => $row['description'],
        'image' => $row['image'],
        'createdAt' => (int) $row['created_at'],
    ];
}

function match_object(array $row): array
{
    return [
        'id' => $row['id'],
        'competition' => $row['competition'],
        'kickoff' => $row['kickoff'],
        'homeTeam' => $row['home_team'],
        'awayTeam' => $row['away_team'],
        'homeOdds' => (float) $row['home_odds'],
        'drawOdds' => (float) $row['draw_odds'],
        'awayOdds' => (float) $row['away_odds'],
        'ownerId' => $row['user_id'],
    ];
}

function route(PDO $db, string $action, string $method): void
{
    if ($method === 'GET' && $action === 'session') {
        respond(200, ['user' => current_user($db)]);
    }

    if ($method === 'GET' && $action === 'listings') {
        $rows = $db->query(
            'SELECT listings.*, users.name AS seller
             FROM listings JOIN users ON users.id = listings.user_id
             ORDER BY listings.created_at DESC'
        )->fetchAll();
        $user = current_user($db);
        $favorites = [];
        if ($user !== null) {
            $query = $db->prepare('SELECT listing_id FROM favorites WHERE user_id = ?');
            $query->execute([$user['id']]);
            $favorites = array_column($query->fetchAll(), 'listing_id');
        }
        respond(200, [
            'listings' => array_map('listing_object', $rows),
            'favorites' => $favorites,
        ]);
    }

    if ($method === 'GET' && $action === 'matches') {
        $rows = $db->query('SELECT * FROM custom_matches ORDER BY created_at DESC')->fetchAll();
        respond(200, ['matches' => array_map('match_object', $rows)]);
    }

    if ($method === 'POST') {
        $data = read_json();
        if ($action === 'signup') {
            $name = required_text($data, 'name', 60);
            $email = strtolower(required_text($data, 'email', 254));
            $password = $data['password'] ?? null;
            if (mb_strlen($name, 'UTF-8') < 2
                || !preg_match("/^[\\p{L}\\p{M}]+(?:[ '-][\\p{L}\\p{M}]+)*$/u", $name)) {
                fail(400, 'Escribe un nombre válido con letras, espacios, guiones o apóstrofos.');
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                fail(400, 'Escribe un correo electrónico válido.');
            }
            if (!is_string($password) || strlen($password) < 10 || strlen($password) > 256
                || !preg_match('/[A-Z\\p{Lu}]/u', $password)
                || !preg_match('/[a-z\\p{Ll}]/u', $password)
                || !preg_match('/\\d/', $password)
                || !preg_match('/[^\\p{L}\\p{M}\\d\\s]/u', $password)) {
                fail(400, 'La contraseña debe tener 10 caracteres o más e incluir mayúscula, minúscula, número y símbolo.');
            }
            $id = uuid();
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $query = $db->prepare('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)');
            try {
                $query->execute([$id, $name, $email, $hash, (int) (microtime(true) * 1000)]);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') {
                    fail(409, 'Ya existe una cuenta con ese correo electrónico.');
                }
                throw $error;
            }
            respond(201, ['user' => ['id' => $id, 'name' => $name, 'email' => $email]]);
        }

        if ($action === 'login') {
            $email = $data['email'] ?? null;
            $password = $data['password'] ?? null;
            if (!is_string($email) || !is_string($password)) {
                fail(400, 'Correo o contraseña incorrectos.');
            }
            $query = $db->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
            $query->execute([strtolower(trim($email))]);
            $user = $query->fetch();
            if (!$user || !password_verify($password, $user['password_hash'])) {
                fail(401, 'Correo o contraseña incorrectos.');
            }
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            respond(200, ['user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']]]);
        }

        if ($action === 'logout') {
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', [
                    'expires' => time() - 42000,
                    'path' => $params['path'],
                    'domain' => $params['domain'],
                    'secure' => $params['secure'],
                    'httponly' => true,
                    'samesite' => 'Lax',
                ]);
            }
            session_destroy();
            respond(200, ['loggedOut' => true]);
        }

        if ($action === 'listings') {
            $user = require_user($db);
            $title = required_text($data, 'title', 70);
            $city = required_text($data, 'city', 50);
            $description = required_text($data, 'description', 240);
            $category = $data['category'] ?? null;
            $condition = $data['condition'] ?? null;
            $price = $data['price'] ?? null;
            $image = $data['image'] ?? '';
            if (!in_array($category, ['Camisas', 'Trofeos'], true)
                || !in_array($condition, ['Nuevo', 'Como nuevo', 'Buen estado'], true)) {
                fail(400, 'Selecciona una categoría y un estado válidos.');
            }
            if (!is_int($price) || $price < 1000 || $price > 100000000) {
                fail(400, 'El precio debe ser un valor entero válido en COP.');
            }
            $invalidImage = !is_string($image) || strlen($image) > 2048;
            if (!$invalidImage && $image !== '') {
                $invalidImage = !in_array(parse_url($image, PHP_URL_SCHEME), ['http', 'https'], true);
            }
            if ($invalidImage) {
                fail(400, 'La imagen debe usar una dirección HTTP o HTTPS.');
            }
            $id = uuid();
            $createdAt = (int) (microtime(true) * 1000);
            $query = $db->prepare(
                'INSERT INTO listings (id, user_id, title, category, `condition`, price, city, description, image, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $query->execute([$id, $user['id'], $title, $category, $condition, $price, $city, $description, $image, $createdAt]);
            respond(201, ['listing' => [
                'id' => $id, 'title' => $title, 'category' => $category, 'condition' => $condition,
                'price' => $price, 'city' => $city, 'seller' => $user['name'],
                'description' => $description, 'image' => $image, 'createdAt' => $createdAt,
            ]]);
        }

        if ($action === 'favorites') {
            $user = require_user($db);
            $listingId = $data['listingId'] ?? null;
            $favorite = $data['favorite'] ?? null;
            if (!is_string($listingId) || strlen($listingId) > 80 || !is_bool($favorite)) {
                fail(400, 'El favorito enviado no es válido.');
            }
            if ($favorite) {
                $query = $db->prepare('INSERT IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)');
            } else {
                $query = $db->prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?');
            }
            $query->execute([$user['id'], $listingId]);
            respond(200, ['listingId' => $listingId, 'favorite' => $favorite]);
        }

        if ($action === 'matches') {
            $user = require_user($db);
            $competition = required_text($data, 'competition', 40);
            $homeTeam = required_text($data, 'homeTeam', 40);
            $awayTeam = required_text($data, 'awayTeam', 40);
            $kickoff = $data['kickoff'] ?? null;
            if (mb_strtolower($homeTeam, 'UTF-8') === mb_strtolower($awayTeam, 'UTF-8')) {
                fail(400, 'Los equipos deben tener nombres distintos.');
            }
            if (!is_string($kickoff) || !preg_match('/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/', $kickoff)) {
                fail(400, 'La fecha del partido no es válida.');
            }
            $odds = [$data['homeOdds'] ?? null, $data['drawOdds'] ?? null, $data['awayOdds'] ?? null];
            foreach ($odds as $odd) {
                if (!is_numeric($odd) || (float) $odd < 1.01 || (float) $odd > 1000) {
                    fail(400, 'Cada cuota debe estar entre 1.01 y 1000.');
                }
            }
            $id = uuid();
            $createdAt = (int) (microtime(true) * 1000);
            $query = $db->prepare(
                'INSERT INTO custom_matches
                 (id, user_id, competition, kickoff, home_team, away_team, home_odds, draw_odds, away_odds, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $query->execute([$id, $user['id'], $competition, $kickoff, $homeTeam, $awayTeam, ...$odds, $createdAt]);
            respond(201, ['match' => [
                'id' => $id, 'competition' => $competition, 'kickoff' => $kickoff, 'homeTeam' => $homeTeam,
                'awayTeam' => $awayTeam, 'homeOdds' => (float) $odds[0], 'drawOdds' => (float) $odds[1],
                'awayOdds' => (float) $odds[2], 'ownerId' => $user['id'],
            ]]);
        }
    }

    if ($method === 'DELETE' && $action === 'matches') {
        $user = require_user($db);
        $id = $_GET['id'] ?? '';
        $query = $db->prepare('DELETE FROM custom_matches WHERE id = ? AND user_id = ?');
        $query->execute([$id, $user['id']]);
        if ($query->rowCount() === 0) {
            $check = $db->prepare('SELECT user_id FROM custom_matches WHERE id = ?');
            $check->execute([$id]);
            $match = $check->fetch();
            if ($match) {
                fail(403, 'Solo quien creó el partido puede eliminarlo.');
            }
            fail(404, 'El partido ya no existe.');
        }
        respond(200, ['deleted' => true]);
    }

    fail(404, 'Ruta de API no encontrada.');
}

function uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4)
        . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20, 12);
}

require_same_origin();
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'], true)) {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !str_starts_with($contentType, 'application/json')) {
        fail(415, 'Se esperaba contenido JSON.');
    }
}

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

try {
    route(database(), $_GET['action'] ?? '', $_SERVER['REQUEST_METHOD']);
} catch (PDOException $error) {
    error_log('Simplemente Futbol database error: ' . $error->getMessage());
    fail(500, 'No se pudo acceder a MySQL. Revisa que MySQL esté iniciado y que hayas importado database.sql.');
} catch (Throwable $error) {
    error_log('Simplemente Futbol API error: ' . $error->getMessage());
    fail(500, 'Ocurrió un error interno. Revisa el registro de errores de PHP.');
}
