import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import datetime
from http.cookies import CookieError, SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DATABASE = Path(os.environ.get("SF_DATABASE", ROOT / "simplemente_futbol.db"))
HOST = os.environ.get("SF_HOST", "127.0.0.1")
PORT = int(os.environ.get("SF_PORT", "8000"))
PASSWORD_ITERATIONS = 310_000
SESSION_SECONDS = 7 * 24 * 60 * 60
SESSION_COOKIE = "sf_session"
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
NAME_PATTERN = re.compile(r"^[^\W\d_]+(?:[ '-][^\W\d_]+)*$", re.UNICODE)


def connect_database():
    connection = sqlite3.connect(DATABASE, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def database_connection():
    connection = connect_database()
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize_database():
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                password_salt BLOB NOT NULL,
                password_iterations INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
            CREATE TABLE IF NOT EXISTS listings (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                condition TEXT NOT NULL,
                price INTEGER NOT NULL,
                city TEXT NOT NULL,
                description TEXT NOT NULL,
                image TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS favorites (
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                listing_id TEXT NOT NULL,
                PRIMARY KEY (user_id, listing_id)
            );
            CREATE TABLE IF NOT EXISTS custom_matches (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                competition TEXT NOT NULL,
                kickoff TEXT NOT NULL,
                home_team TEXT NOT NULL,
                away_team TEXT NOT NULL,
                home_odds REAL NOT NULL,
                draw_odds REAL NOT NULL,
                away_odds REAL NOT NULL,
                created_at INTEGER NOT NULL
            );
            """
        )


class APIError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


class FutbolHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format_string, *args):
        print("%s - %s" % (self.address_string(), format_string % args))

    def send_json(self, status, payload, headers=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if headers:
            for name, value in headers:
                self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise APIError(400, "Solicitud inválida.") from error
        if length < 1 or length > 16_384:
            raise APIError(400, "El contenido de la solicitud está vacío o es demasiado grande.")
        try:
            payload = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            raise APIError(400, "El contenido de la solicitud no es JSON válido.") from error
        if not isinstance(payload, dict):
            raise APIError(400, "El contenido de la solicitud no es válido.")
        return payload

    def ensure_same_origin(self):
        origin = self.headers.get("Origin")
        if not origin:
            return
        parsed = urlparse(origin)
        if parsed.scheme not in ("http", "https") or parsed.netloc != self.headers.get("Host"):
            raise APIError(403, "Origen de solicitud no permitido.")

    def session_user(self, connection):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
        except CookieError as error:
            raise APIError(401, "Inicia sesión para continuar.") from error
        morsel = cookie.get(SESSION_COOKIE)
        if not morsel:
            raise APIError(401, "Inicia sesión para continuar.")
        token_hash = hashlib.sha256(morsel.value.encode("ascii", "ignore")).hexdigest()
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email
            FROM sessions JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
            """,
            (token_hash, int(time.time())),
        ).fetchone()
        if not row:
            raise APIError(401, "Tu sesión venció. Inicia sesión de nuevo.")
        return row

    def session_cookie(self, token, max_age):
        cookie = SimpleCookie()
        cookie[SESSION_COOKIE] = token
        cookie[SESSION_COOKIE]["path"] = "/"
        cookie[SESSION_COOKIE]["httponly"] = True
        cookie[SESSION_COOKIE]["samesite"] = "Lax"
        cookie[SESSION_COOKIE]["max-age"] = str(max_age)
        return ("Set-Cookie", cookie[SESSION_COOKIE].OutputString())

    @staticmethod
    def public_user(user):
        return {"id": user["id"], "name": user["name"], "email": user["email"]}

    def listing_object(self, row):
        return {
            "id": row["id"],
            "title": row["title"],
            "category": row["category"],
            "condition": row["condition"],
            "price": row["price"],
            "city": row["city"],
            "seller": row["name"],
            "description": row["description"],
            "image": row["image"],
            "createdAt": row["created_at"],
        }

    def match_object(self, row):
        return {
            "id": row["id"],
            "competition": row["competition"],
            "kickoff": row["kickoff"],
            "homeTeam": row["home_team"],
            "awayTeam": row["away_team"],
            "homeOdds": row["home_odds"],
            "drawOdds": row["draw_odds"],
            "awayOdds": row["away_odds"],
            "ownerId": row["user_id"],
        }

    def do_GET(self):
        if not self.path.startswith("/api/"):
            requested_file = Path(super().translate_path(self.path)).resolve()
            protected_files = {
                DATABASE.resolve(),
                Path(str(DATABASE.resolve()) + "-wal"),
                Path(str(DATABASE.resolve()) + "-shm"),
            }
            if requested_file in protected_files:
                self.send_error(404, "Archivo no encontrado")
                return
            return super().do_GET()
        path = urlparse(self.path).path
        try:
            with database_connection() as connection:
                if path == "/api/session":
                    try:
                        user = self.session_user(connection)
                    except APIError as error:
                        if error.status != 401:
                            raise
                        self.send_json(200, {"user": None})
                        return
                    self.send_json(200, {"user": self.public_user(user)})
                    return

                if path == "/api/listings":
                    rows = connection.execute(
                        """
                        SELECT listings.*, users.name
                        FROM listings JOIN users ON users.id = listings.user_id
                        ORDER BY listings.created_at DESC
                        """
                    ).fetchall()
                    user = None
                    try:
                        user = self.session_user(connection)
                    except APIError as error:
                        if error.status != 401:
                            raise
                    favorites = []
                    if user:
                        favorites = [
                            row["listing_id"]
                            for row in connection.execute(
                                "SELECT listing_id FROM favorites WHERE user_id = ?",
                                (user["id"],),
                            )
                        ]
                    self.send_json(200, {
                        "listings": [self.listing_object(row) for row in rows],
                        "favorites": favorites,
                    })
                    return

                if path == "/api/matches":
                    rows = connection.execute(
                        "SELECT * FROM custom_matches ORDER BY created_at DESC"
                    ).fetchall()
                    self.send_json(200, {"matches": [self.match_object(row) for row in rows]})
                    return
            self.send_json(404, {"error": "Ruta de API no encontrada."})
        except sqlite3.Error:
            self.log_error("Error consultando la base de datos.")
            self.send_json(500, {"error": "No se pudieron consultar los datos. Inténtalo de nuevo."})

    def do_POST(self):
        if not self.path.startswith("/api/"):
            self.send_json(404, {"error": "Ruta de API no encontrada."})
            return
        try:
            self.ensure_same_origin()
            path = urlparse(self.path).path
            payload = self.read_json()
            with database_connection() as connection:
                if path == "/api/signup":
                    self.signup(connection, payload)
                elif path == "/api/login":
                    self.login(connection, payload)
                elif path == "/api/logout":
                    self.logout(connection)
                elif path == "/api/listings":
                    self.create_listing(connection, payload)
                elif path == "/api/favorites":
                    self.set_favorite(connection, payload)
                elif path == "/api/matches":
                    self.create_match(connection, payload)
                else:
                    self.send_json(404, {"error": "Ruta de API no encontrada."})
        except APIError as error:
            self.send_json(error.status, {"error": str(error)})
        except sqlite3.IntegrityError as error:
            if "users.email" in str(error):
                self.send_json(409, {"error": "Ya existe una cuenta con ese correo electrónico."})
            else:
                self.log_error("Error de integridad en la base de datos: %s", error)
                self.send_json(400, {"error": "No se pudo guardar la información enviada."})
        except sqlite3.Error as error:
            self.log_error("Error guardando en la base de datos: %s", error)
            self.send_json(500, {"error": "No se pudieron guardar los datos. Inténtalo de nuevo."})

    def do_DELETE(self):
        match = re.fullmatch(r"/api/matches/([0-9a-f-]{36})", urlparse(self.path).path)
        if not match:
            self.send_json(404, {"error": "Ruta de API no encontrada."})
            return
        try:
            self.ensure_same_origin()
            with database_connection() as connection:
                user = self.session_user(connection)
                result = connection.execute(
                    "DELETE FROM custom_matches WHERE id = ? AND user_id = ?",
                    (match.group(1), user["id"]),
                )
                if result.rowcount == 0:
                    exists = connection.execute(
                        "SELECT 1 FROM custom_matches WHERE id = ?", (match.group(1),)
                    ).fetchone()
                    if exists:
                        raise APIError(403, "Solo quien creó el partido puede eliminarlo.")
                    raise APIError(404, "El partido ya no existe.")
            self.send_json(200, {"deleted": True})
        except APIError as error:
            self.send_json(error.status, {"error": str(error)})
        except sqlite3.Error as error:
            self.log_error("Error eliminando partido: %s", error)
            self.send_json(500, {"error": "No se pudo eliminar el partido. Inténtalo de nuevo."})

    def signup(self, connection, payload):
        name = payload.get("name")
        email = payload.get("email")
        password = payload.get("password")
        if not isinstance(name, str) or not 2 <= len(name.strip()) <= 60 or not NAME_PATTERN.fullmatch(name.strip()):
            raise APIError(400, "Escribe un nombre válido con letras, espacios, guiones o apóstrofos.")
        if not isinstance(email, str) or len(email) > 254 or not EMAIL_PATTERN.fullmatch(email.strip()):
            raise APIError(400, "Escribe un correo electrónico válido.")
        if not isinstance(password, str) or len(password) < 10 or len(password) > 256:
            raise APIError(400, "La contraseña debe tener entre 10 y 256 caracteres.")
        if not (any(char.isupper() for char in password)
                and any(char.islower() for char in password)
                and any(char.isdigit() for char in password)
                and any(not char.isalnum() and not char.isspace() for char in password)):
            raise APIError(400, "La contraseña debe incluir mayúscula, minúscula, número y símbolo.")
        email = email.strip().lower()
        if connection.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            raise APIError(409, "Ya existe una cuenta con ese correo electrónico.")
        salt = secrets.token_bytes(16)
        password_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
        )
        user_id = str(uuid.uuid4())
        connection.execute(
            """
            INSERT INTO users (id, name, email, password_hash, password_salt, password_iterations, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, name.strip(), email, password_hash.hex(), salt, PASSWORD_ITERATIONS, int(time.time() * 1000)),
        )
        connection.commit()
        self.send_json(201, {"user": {"id": user_id, "name": name.strip(), "email": email}})

    def login(self, connection, payload):
        email = payload.get("email")
        password = payload.get("password")
        if not isinstance(email, str) or not isinstance(password, str):
            raise APIError(400, "Correo o contraseña incorrectos.")
        user = connection.execute(
            "SELECT * FROM users WHERE email = ?", (email.strip().lower(),)
        ).fetchone()
        if not user:
            raise APIError(401, "Correo o contraseña incorrectos.")
        candidate = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            user["password_salt"],
            user["password_iterations"],
        )
        if not hmac.compare_digest(candidate.hex(), user["password_hash"]):
            raise APIError(401, "Correo o contraseña incorrectos.")
        token = secrets.token_urlsafe(32)
        expires_at = int(time.time()) + SESSION_SECONDS
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (hashlib.sha256(token.encode("ascii")).hexdigest(), user["id"], expires_at),
        )
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))
        connection.commit()
        self.send_json(
            200,
            {"user": self.public_user(user)},
            [self.session_cookie(token, SESSION_SECONDS)],
        )

    def logout(self, connection):
        try:
            self.session_user(connection)
            cookie = SimpleCookie()
            cookie.load(self.headers.get("Cookie", ""))
            token = cookie[SESSION_COOKIE].value
            connection.execute(
                "DELETE FROM sessions WHERE token_hash = ?",
                (hashlib.sha256(token.encode("ascii", "ignore")).hexdigest(),),
            )
        except APIError as error:
            if error.status != 401:
                raise
        expired_cookie = SimpleCookie()
        expired_cookie[SESSION_COOKIE] = ""
        expired_cookie[SESSION_COOKIE]["path"] = "/"
        expired_cookie[SESSION_COOKIE]["httponly"] = True
        expired_cookie[SESSION_COOKIE]["samesite"] = "Lax"
        expired_cookie[SESSION_COOKIE]["max-age"] = "0"
        connection.commit()
        self.send_json(200, {"loggedOut": True}, [("Set-Cookie", expired_cookie[SESSION_COOKIE].OutputString())])

    def create_listing(self, connection, payload):
        user = self.session_user(connection)
        title = self.required_text(payload, "title", 70)
        category = payload.get("category")
        condition = payload.get("condition")
        price = payload.get("price")
        city = self.required_text(payload, "city", 50)
        description = self.required_text(payload, "description", 240)
        image = payload.get("image", "")
        if category not in ("Camisas", "Trofeos") or condition not in ("Nuevo", "Como nuevo", "Buen estado"):
            raise APIError(400, "Selecciona una categoría y un estado válidos.")
        if isinstance(price, bool) or not isinstance(price, (int, float)) or not 1000 <= price <= 100_000_000 or int(price) != price:
            raise APIError(400, "El precio debe ser un valor entero válido en COP.")
        if not isinstance(image, str) or len(image) > 2048:
            raise APIError(400, "La dirección de la imagen no es válida.")
        if image and urlparse(image).scheme not in ("http", "https"):
            raise APIError(400, "La imagen debe usar una dirección HTTP o HTTPS.")
        listing_id = str(uuid.uuid4())
        created_at = int(time.time() * 1000)
        connection.execute(
            """
            INSERT INTO listings (id, user_id, title, category, condition, price, city, description, image, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (listing_id, user["id"], title, category, condition, int(price), city, description, image, created_at),
        )
        connection.commit()
        self.send_json(201, {"listing": {
            "id": listing_id, "title": title, "category": category, "condition": condition,
            "price": int(price), "city": city, "seller": user["name"], "description": description,
            "image": image, "createdAt": created_at,
        }})

    def set_favorite(self, connection, payload):
        user = self.session_user(connection)
        listing_id = payload.get("listingId")
        favorite = payload.get("favorite")
        if not isinstance(listing_id, str) or len(listing_id) > 80 or not isinstance(favorite, bool):
            raise APIError(400, "El favorito enviado no es válido.")
        if favorite:
            connection.execute(
                "INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)",
                (user["id"], listing_id),
            )
        else:
            connection.execute(
                "DELETE FROM favorites WHERE user_id = ? AND listing_id = ?",
                (user["id"], listing_id),
            )
        connection.commit()
        self.send_json(200, {"listingId": listing_id, "favorite": favorite})

    def create_match(self, connection, payload):
        user = self.session_user(connection)
        competition = self.required_text(payload, "competition", 40)
        home_team = self.required_text(payload, "homeTeam", 40)
        away_team = self.required_text(payload, "awayTeam", 40)
        kickoff = payload.get("kickoff")
        if home_team.casefold() == away_team.casefold():
            raise APIError(400, "Los equipos deben tener nombres distintos.")
        if not isinstance(kickoff, str) or len(kickoff) > 32:
            raise APIError(400, "La fecha del partido no es válida.")
        try:
            datetime.fromisoformat(kickoff)
        except ValueError as error:
            raise APIError(400, "La fecha del partido no es válida.") from error
        odds = [payload.get("homeOdds"), payload.get("drawOdds"), payload.get("awayOdds")]
        if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not 1.01 <= value <= 1000 for value in odds):
            raise APIError(400, "Cada cuota debe estar entre 1.01 y 1000.")
        match_id = str(uuid.uuid4())
        connection.execute(
            """
            INSERT INTO custom_matches
            (id, user_id, competition, kickoff, home_team, away_team, home_odds, draw_odds, away_odds, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (match_id, user["id"], competition, kickoff, home_team, away_team, *odds, int(time.time() * 1000)),
        )
        connection.commit()
        self.send_json(201, {"match": {
            "id": match_id, "competition": competition, "kickoff": kickoff, "homeTeam": home_team,
            "awayTeam": away_team, "homeOdds": odds[0], "drawOdds": odds[1], "awayOdds": odds[2],
            "ownerId": user["id"],
        }})

    @staticmethod
    def required_text(payload, key, maximum):
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
            raise APIError(400, "El campo %s es obligatorio y no debe superar %s caracteres." % (key, maximum))
        return value.strip()


if __name__ == "__main__":
    initialize_database()
    print("Simplemente Futbol disponible en http://%s:%s/html/index.html" % (HOST, PORT))
    print("Base de datos SQLite: %s" % DATABASE)
    try:
        ThreadingHTTPServer((HOST, PORT), FutbolHandler).serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
