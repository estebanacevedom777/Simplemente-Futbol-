# Simplemente Futbol con XAMPP

## Puesta en marcha en Windows

1. Copia la carpeta completa `Simplemente-Futbol-` a `C:\xampp\htdocs\Simplemente-Futbol`. Deben quedar, por ejemplo, `C:\xampp\htdocs\Simplemente-Futbol\html\index.html` y `C:\xampp\htdocs\Simplemente-Futbol\api.php`.
2. Abre XAMPP Control Panel e inicia **Apache** y **MySQL**.
3. Entra en `http://localhost/phpmyadmin`, selecciona **Importar**, elige `database.sql` dentro de `C:\xampp\htdocs\Simplemente-Futbol` y pulsa **Importar**. El script crea la base `simplemente_futbol` y sus tablas.
4. Abre `http://localhost/Simplemente-Futbol/html/index.html`. No uses Live Server.

La conexión PHP usa por defecto MySQL `127.0.0.1`, base `simplemente_futbol`, usuario `root` y contraseña vacía (configuración habitual local de XAMPP). Si configuraste contraseña para `root`, actualiza `DB_PASSWORD` en `api.php`.

## Datos guardados

- Registro y sesión de usuarios (contraseñas con `password_hash` y cookies `HttpOnly`).
- Anuncios y favoritos del Marketplace.
- Partidos personalizados; solo quien los crea puede eliminarlos.
- Estadísticas, anuncios de ejemplo, mensajes y pronósticos siguen siendo demostrativos.

La base de datos se crea al importar `database.sql`. Guarda una copia de seguridad desde phpMyAdmin si necesitas conservar los datos. No publiques este servidor local directamente en Internet.
