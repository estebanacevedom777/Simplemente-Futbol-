# Simplemente Futbol con XAMPP

## Puesta en marcha en Windows

1. Copia la carpeta completa `Simplemente-Futbol-` a `C:\xampp\htdocs\Simplemente-Futbol`. Deben quedar, por ejemplo, `C:\xampp\htdocs\Simplemente-Futbol\html\index.html` y `C:\xampp\htdocs\Simplemente-Futbol\api.php`.
2. Abre XAMPP Control Panel e inicia **Apache** y **MySQL**.
3. Entra en `http://localhost/phpmyadmin`, selecciona **Importar**, elige `database.sql` dentro de `C:\xampp\htdocs\Simplemente-Futbol` y pulsa **Importar**. El script crea la base `simplemente_futbol` y sus tablas.
4. Abre `http://localhost/Simplemente-Futbol/html/index.html`. No uses Live Server.

Si ya tenías la base de datos antes de agregar roles y apuestas, ejecuta una sola vez en phpMyAdmin:

```sql
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user';
CREATE TABLE IF NOT EXISTS bets (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    stake DECIMAL(12, 2) NOT NULL,
    selections JSON NOT NULL,
    combined_odds DECIMAL(36, 4) NOT NULL,
    created_at BIGINT NOT NULL,
    INDEX bets_user_created_at (user_id, created_at),
    CONSTRAINT bets_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

Para habilitar el botón **Agregar partido**, crea primero una cuenta y promociónala como administradora desde phpMyAdmin, usando el correo registrado:

```sql
UPDATE users SET role = 'admin' WHERE email = 'correo-del-admin@example.com';
```

Las cuentas nuevas siempre se crean como usuarios normales.

La conexión PHP usa por defecto MySQL `127.0.0.1`, base `simplemente_futbol`, usuario `root` y contraseña vacía (configuración habitual local de XAMPP). Si configuraste contraseña para `root`, actualiza `DB_PASSWORD` en `api.php`.

## Datos guardados

- Registro y sesión de usuarios (contraseñas con `password_hash` y cookies `HttpOnly`).
- Anuncios y favoritos del Marketplace.
- Partidos personalizados; solo el administrador puede agregarlos.
- Apuestas simuladas asociadas al usuario, con selecciones e importe guardados en la base de datos.
- Las cuotas y los pronósticos son educativos; el sitio no realiza transacciones con dinero real.

La base de datos se crea al importar `database.sql`. Guarda una copia de seguridad desde phpMyAdmin si necesitas conservar los datos. No publiques este servidor local directamente en Internet.
