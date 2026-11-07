# Simplemente Futbol

## Ejecutar con la base de datos

La aplicación usa Python 3 y SQLite, incluidos en la biblioteca estándar de Python. Desde la carpeta del proyecto ejecuta:

```powershell
python server.py
```

En Windows también puedes usar `py server.py` si ese es el comando configurado en tu instalación. Abre `http://127.0.0.1:8000/html/index.html`; no abras las páginas como archivos ni uses Live Server, porque las rutas `/api/...` necesitan el servidor.

La primera ejecución crea `simplemente_futbol.db` en la carpeta del proyecto. Puedes cambiar la ubicación con `SF_DATABASE`, o el host y puerto con `SF_HOST` y `SF_PORT`. La base se crea automáticamente y no requiere migraciones manuales.

## Datos guardados

- Cuentas: nombre, correo único y hash de contraseña PBKDF2 con sal aleatoria.
- Sesiones: token aleatorio en cookie `HttpOnly`, con vencimiento de siete días.
- Marketplace: anuncios y favoritos por usuario. Los anuncios de ejemplo siguen siendo contenido demostrativo.
- Bet: partidos personalizados compartidos; solo el usuario que publicó un partido puede eliminarlo.
- Estadísticas, mensajes y pronósticos: siguen siendo demostrativos y no se guardan.

El archivo de base de datos y los archivos temporales de SQLite están excluidos de Git. Conserva una copia de `simplemente_futbol.db` si necesitas respaldar los registros.

## Alcance de seguridad

Este servidor está pensado para desarrollo y uso local. No lo expongas directamente a Internet ni lo uses en producción: antes se necesitan HTTPS, protección contra intentos repetidos de acceso, configuración segura del servidor y una estrategia de copias de seguridad.
