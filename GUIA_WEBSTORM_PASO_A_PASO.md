# GUÍA PASO A PASO — AEROLÍNEAS DEL ISTMO

Esta guía empieza **desde el nombre de la carpeta** hasta la publicación en GitHub Pages. El ZIP incluye todo el código, no debes escribir manualmente cada clase.

## 1. Instalar lo necesario (sin pagar)

1. **Node.js LTS**: https://nodejs.org/ (elige LTS). Confirma `node -v` y `npm -v` en la terminal.
2. **WebStorm**: https://www.jetbrains.com/webstorm/ (para estudios selecciona licencia gratuita **Non-commercial use** en `Help > Register`).
3. **Git**: https://git-scm.com/downloads (permite subir el proyecto a GitHub).
4. **Cuenta GitHub**: https://github.com/ (repositorio público en plan gratuito).
5. **Cuenta Cloudflare**: https://dash.cloudflare.com/ (mantén el plan gratuito Workers/D1, sin mejoras de pago).
6. **draw.io**: https://app.diagrams.net/ (abre el archivo editable de diagramas).

## 2. Nombre exacto del proyecto y ubicación de archivos

1. Descarga y extrae el ZIP en una carpeta de tu equipo, por ejemplo:
   `C:\\Proyectos\\aerolineas-istmo` (Windows) o `~/Proyectos/aerolineas-istmo`.
2. El nombre de la carpeta debe ser **aerolineas-istmo**.
3. Abre WebStorm > **Open** > selecciona **aerolineas-istmo**.
4. Comprueba que ves estas carpetas en el explorador:
   - `docs/`: frontend (interfaz).
   - `api/`: TypeScript y base de datos.
   - `analysis/`: Fase 1 DDD.
   - `diagrams/`: archivo `.drawio`.
   - `tests/`: pruebas del dominio.
5. No crees archivos que ya están en el ZIP. Puedes empezar a editar `docs/index.html` y `docs/styles.css` para personalizar la interfaz.

## 3. Preparar el backend desde WebStorm

Abre **Terminal** dentro de WebStorm. Ejecuta **una línea a la vez**:

```powershell
cd api
npm install
npx wrangler login
```

Cloudflare abrirá el navegador; inicia sesión y autoriza Wrangler. En la misma terminal:

```powershell
npx wrangler d1 create aerolineas-istmo-db
```

Cloudflare mostrará un texto con `database_id = "..."`. **Copia ese valor**.

Abre el archivo `api/wrangler.toml`. Busca exactamente esta línea:

```toml
database_id = "REEMPLAZAR_POR_TU_DATABASE_ID"
```

Reemplaza solo el texto por tu ID real. **Conserva** las otras propiedades:

```toml
binding = "DB"
database_name = "aerolineas-istmo-db"
```

Si el comando te pregunta si quieres que modifique automáticamente `wrangler.toml`, puedes responder **No** y pegar el ID manualmente, para evitar duplicar `[[d1_databases]]`.

## 4. Crear y llenar la base de datos LOCAL

Estando en la carpeta `api`, ejecuta:

```powershell
npm run db:local
```

Confirma que se haya aplicado la migración `0001_inicial.sql`. Se crean las tablas y datos ficticios, incluidos **90 agentes**, **40 pasajeros** (35 preparados para reservas de grupo) y **4 vuelos**.

Puedes probar que se creó con:

```powershell
npx wrangler d1 execute aerolineas-istmo-db --local --command="SELECT COUNT(*) AS agentes FROM agentes"
```

El resultado debe ser `90`.

## 5. Iniciar el servidor API

En la **primera terminal** (dentro de `api`):

```powershell
npm run dev
```

El servidor suele mostrar la dirección `http://127.0.0.1:8787`.

Verifica en el navegador: <http://127.0.0.1:8787/health>

Debes observar un JSON como `{ "ok": true, "sistema": "Aerolíneas del Istmo", "modo": "DEMOSTRACION" }`.

**Deja abierta esa terminal.**

## 6. Iniciar el frontend en una segunda terminal

Abre **otra** pestaña de Terminal de WebStorm. En Windows PowerShell puedes volver a la carpeta del proyecto con:

```powershell
cd ..
node frontend-server.cjs
```

Esto supone que estabas dentro de `api`; si la segunda terminal ya está en la raíz, ejecuta únicamente `node frontend-server.cjs`.

Abre en tu navegador: <http://127.0.0.1:5500>

Verás las secciones **Panel general, Pasajeros, Vuelos, Reservas, Aeropuerto y Notificaciones**.

**No abras `index.html` haciendo doble clic:** los módulos JavaScript requieren un servidor local como el anterior.

## 7. Prueba básica (para demostrarla al docente)

1. En **Vuelos**, observa los cuatro vuelos de prueba y las tarifas económica/ejecutiva.
2. En **Reservas**, elige `AG-001` y titular **Ana López**. Presiona **Crear reserva**.
3. El titular individual se agrega automáticamente. Puedes añadir Carlos Pérez si quieres.
4. Agrega el vuelo `AI101` en clase `ECONOMICA`.
5. Introduce `1` equipaje y pulsa **Calcular tarifa**.
6. Pulsa **Confirmar y bloquear cupos**. Debe pasar de Borrador a Confirmada.
7. Presiona **Registrar pago SIMULADO** (no se cobra dinero).
8. Pulsa **Emitir boletos**. El estado pasa a Boleto emitido.
9. En **Aeropuerto**, selecciona pasajero y vuelo; realiza el **check-in**. Verás un asiento asignado.
10. Pulsa **Marcar abordaje**. Si todos los pasajeros/tramos están completos, la reserva se mostrará como Abordado.
11. En **Vuelos**, cambia la puerta de `AI101` (antes o después de una reserva vigente); en **Notificaciones** verifica las alertas del pasajero.

## 8. Prueba de reglas de negocio

- **RN-01:** crea 10 pasajeros para una reserva individual; al confirmar aparece un mensaje de restricción.
- **RN-02:** a una agencia con poco crédito no se le permite confirmar por encima del saldo.
- **RN-03:** al agotarse la capacidad no se confirma; económica puede sobrevendenderse solo si fue autorizada y hasta el 5%.
- **RN-04:** con 11 pasajeros aplica 5%; con 31, 10%.
- **RN-05:** cancela con menos de 3 horas y debe rechazarse.
- **RN-06:** agrega a **María Torres** a un vuelo internacional y verifica que su documento próximo a vencer impide el check-in.
- **RN-07:** después de emitir, los botones de editar desaparecen; el servidor también rechaza una edición directa.
- **RN-08:** la tabla de boletos guarda `tarifa_cents` al momento de emitir, no se actualiza cuando cambien las tarifas del vuelo.

Para ejecutar las **7 pruebas de dominio** y las **9 pruebas de integración**:

```powershell
cd api
npm test
npm run test:integration
```

## 9. Crear la base de datos en la nube (PRODUCCIÓN DE DEMO)

En `api`, detén el servidor local presionando `Ctrl+C` si lo necesitas. Ejecuta:

```powershell
npm run db:remota
npm run deploy
```

**Ojo:** `db:local` y `db:remota` son dos bases distintas. La primera es solo de tu computadora; la segunda sirve a tu Worker publicado.

Cloudflare te dará una URL similar a:

```text
https://aerolineas-istmo-api.TU-USUARIO.workers.dev
```

No copies el ejemplo literalmente: utiliza la URL real que Cloudflare te muestre. Ábrela con `/health` al final para verificar la conexión.

## 10. Conectar el frontend a la API de Cloudflare

Abre `docs/config.js`. Reemplaza la dirección local:

```javascript
window.API_URL = 'http://127.0.0.1:8787';
```

Por la dirección real de tu Worker publicado:

```javascript
window.API_URL = 'https://aerolineas-istmo-api.TU-USUARIO.workers.dev';
```

No incluyas `/health` al final, solo el dominio de tu API.

## 11. Crear el repositorio en GitHub

Entra a GitHub > **New repository** y crea:

- Repository name: **aerolineas-istmo**
- Visibility: **Public** (necesario para GitHub Pages gratis en GitHub Free)
- No marques «Add a README file» si ya vas a subir esta carpeta.

En la terminal de WebStorm, **en la raíz** del proyecto:

```powershell
git init -b main
git add .
git commit -m "proyecto inicial aerolineas del istmo"
git remote add origin https://github.com/TU-USUARIO/aerolineas-istmo.git
git push -u origin main
```

Cambia `TU-USUARIO` por tu usuario real de GitHub. GitHub puede pedir autenticación la primera vez. No subas contraseñas ni datos reales.

## 12. Activar GitHub Pages

1. Entra a tu repositorio `aerolineas-istmo`.
2. Selecciona **Settings > Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Selecciona la rama **main**.
5. Selecciona la carpeta **/docs**.
6. Haz clic en **Save**.
7. Al completarse, GitHub indicará una URL similar a:

   `https://TU-USUARIO.github.io/aerolineas-istmo/`

Esa será la página pública de tu proyecto. No hace falta comprar dominio ni configurar GitHub Actions porque la interfaz es HTML/CSS/JS estática.

## 13. ¿Cómo modificar el proyecto y subir cambios?

Edita un archivo en WebStorm; luego, en la raíz:

```powershell
git add .
git commit -m "mejoras de interfaz y reservas"
git push
```

GitHub Pages actualiza la interfaz al publicar el nuevo commit. Si cambias el backend, también ejecuta `npm run deploy` dentro de `api`.

## 14. Abrir los diagramas de draw.io

1. Visita <https://app.diagrams.net/>.
2. Selecciona **Device** si pregunta dónde guardar.
3. Ve a **File > Open from > Device**.
4. Abre `diagrams/Arquitectura_Aerolineas_Istmo.drawio`.
5. Verás 6 pestañas: Context Map, C4-1, C4-2, C4-3, C4-4 y Modelo de Datos.
6. Puedes mover las cajas, corregir textos, exportar a PDF/PNG o entregar el `.drawio` directamente.

## 15. Dónde está cada clase o elemento del código

| Archivo | Para qué sirve |
|---|---|
| `api/src/domain/model.ts` | Entidades `Pasajero`, `Vuelo`, `Reserva`, tipos y errores. |
| `api/src/domain/policies.ts` | `PoliticaDeReservas`, contiene reglas RN-01 a RN-07 y cálculos. |
| `api/src/application/ports.ts` | Puerto `PuertoRepositorioAerolinea` (interfaz). |
| `api/src/application/AerolineaService.ts` | Casos de uso de crear, cotizar, confirmar, emitir, check-in y abordar. |
| `api/src/infrastructure/D1Repositorio.ts` | Adaptador SQL de Cloudflare D1, incluido guardado de tarifa del boleto RN-08. |
| `api/src/index.ts` | Adaptador de entrada, rutas HTTP. |
| `api/migrations/0001_inicial.sql` | Tablas, relaciones, índices y datos de demostración. |
| `docs/index.html` | Estructura de la interfaz y menú. |
| `docs/styles.css` | Diseño, colores y adaptación a móviles. |
| `docs/api-client.js` | Comunicación del navegador con la API. |
| `docs/app.js` | Vistas y controles de usuario. |

## 16. Qué no debes prometer en la exposición

Este es un **prototipo educativo**, no un sistema certificado para aerolíneas ni una tienda real de boletos. No ofrece pagos reales, autenticación segura, integración migratoria, mensajes reales por WhatsApp/SMS/correo ni control de concurrencia multiagente bajo alta demanda. Para producción harían falta seguridad, transacciones de inventario, conciliación de pagos, auditoría, protección de datos, pruebas de carga y reemisión con penalidades configuradas.

## Fuentes oficiales para instalación

- Cloudflare D1: https://developers.cloudflare.com/d1/get-started/
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- WebStorm gratis no comercial: https://www.jetbrains.com/help/webstorm/register.html
