# Actualización v2 sin perder tu repositorio ni datos

Esta actualización añade la **RN-07 completa para demo** (cambio y cancelación con penalidad simulada) y un **manifiesto**. Aún no está aplicada a tus cuentas: debes publicar los cambios tú mismo.

## 1. Actualizar los archivos en WebStorm

1. Haz una copia de seguridad de `C:\Users\Marcos\Desktop\aerolineas-istmo` por si quieres volver atrás.
2. Descomprime `Aerolineas_Istmo_Actualizacion_RN07.zip`.
3. Abre la carpeta **actualizacion** del ZIP y copia **su contenido** dentro de `C:\Users\Marcos\Desktop\aerolineas-istmo`, aceptando reemplazar archivos existentes. No reemplaces el directorio completo ni borres `.git`.
4. Conserva los archivos propios `api/wrangler.toml` y `docs/config.js` de tu proyecto; esta actualización NO los incluye.

## 2. Actualizar la base de datos de Cloudflare

Abre PowerShell en WebStorm y ejecuta:

```powershell
cd C:\Users\Marcos\Desktop\aerolineas-istmo\api
npm install
npm run db:remota
```

Si Wrangler pregunta `About to apply 1 migration(s)` para `0002_cambios_con_penalidad.sql`, elige **yes**. NO borres ni recrees tu base de datos actual. Esta nueva migración añade campos/tablas y dos vuelos de prueba, conservando tus reservas previas.

Verificación remota:

```powershell
npx wrangler d1 execute aerolineas-istmo-db --remote --command="SELECT COUNT(*) AS vuelos FROM vuelos"
```

**Se esperan 6 vuelos**, si antes tenías los 4 iniciales y no añadiste otros manualmente.

## 3. Publicar la API nueva

Desde la carpeta `api` ejecuta:

```powershell
npx wrangler deploy
```

Prueba `https://aerolineas-istmo-api.mendezmarcosgt.workers.dev/health` en el navegador.

## 4. Subir la interfaz y código a GitHub

En la carpeta principal (no en api):

```powershell
cd C:\Users\Marcos\Desktop\aerolineas-istmo
git add .
git commit -m "completar reglas rn07 y manifiesto de aeropuerto"
git push origin main
```

GitHub Pages ya está configurado en **main /docs**. Tras finalizar la publicación del commit, recarga `https://mmarcos00.github.io/aerolineas-istmo/` con **Ctrl + F5**. No debes crear otro repositorio.

## 5. Pruebas de la nueva pantalla

1. En **Vuelos**, verifica que estén **AI205** y **AI306** además de los cuatro anteriores.
2. En **Reservas**, crea una reserva de prueba para el pasajero Carlos Pérez (P-002), agente AG-001, vuelo **AI202**, económica. Confirma, registra el pago SIMULADO y emite.
3. En el detalle aparecerá **Cambio de boleto con penalidad**; selecciona AI202 como vuelo original y AI205 como vuelo nuevo, clase Económica. Presiona **Cotizar penalidad**. Luego **Confirmar cambio SIMULADO**.
4. En **Aeropuerto**, puedes consultar **Manifiesto de pasajeros** del vuelo AI205 para comprobar el pasajero reservado (y posteriormente su check-in).
5. Haz una segunda reserva emitida y cancélala con 3 horas o más de anticipación para comprobar la penalidad simulada de cancelación.

**Importante:** Son ejemplos académicos. No emplees tarjetas ni datos de pasajeros reales. Al no contar con autenticación, cualquiera con el enlace puede modificar los datos ficticios.

## 6. Si aparece algún error

- `no such column: anulado` o `no such table: cambios_boleto`: falta aplicar la migración `0002` en la base remota.
- `Route not found` para `/cotizar-cambio`: falta publicar el backend nuevo con `npx wrangler deploy`.
- La opción de cambio no aparece: falta subir `docs/app.js` mediante `git push` y esperar a Pages.
- `Cannot change after check-in`: utiliza una reserva con **boleto emitido**, sin haber registrado check-in.
- Vuelo sin fecha futura: utiliza los nuevos vuelos de ejemplo después de instalar la migración o programa otros vuelos.
