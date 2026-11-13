# Aerolíneas del Istmo · Proyecto Desarrollo Web

Proyecto universitario con **DDD**, **Arquitectura Hexagonal**, documentación **C4**, interfaz en **HTML/CSS/JavaScript** y una API **Cloudflare Workers / TypeScript** con base **D1 (SQLite)**.

## ARCHIVOS IMPORTANTES

- `GUIA_WEBSTORM_PASO_A_PASO.md`: instrucciones completas de instalación y GitHub Pages.
- `analysis/FASE_1_DDD.md`: Fase 1 lista para entregar (glosario, subdominios, contextos y context map).
- `diagrams/Arquitectura_Aerolineas_Istmo.drawio`: 6 diagramas editables en diagrams.net / draw.io.
- `docs/index.html`: interfaz principal. La ruta `/docs` es la que se publica en GitHub Pages.
- `docs/config.js`: dirección de la API (local o publicada).
- `docs/app.js`, `docs/api-client.js`, `docs/styles.css`: interfaz.
- `api/src/domain`: entidades y reglas de negocio, sin dependencias tecnológicas.
- `api/src/application`: casos de uso y puerto de repositorio.
- `api/src/infrastructure`: adaptador D1 de SQL.
- `api/src/index.ts`: controlador REST y configuración CORS.
- `api/migrations/0001_inicial.sql`: SQL de tablas, índices, 90 agentes y 40 pasajeros ficticios.
- `tests/domain.test.cjs`: 7 pruebas automatizadas del dominio; `tests/integration.test.cjs`: 9 pruebas de flujo contra SQL simulado.
- `frontend-server.cjs`: servidor de desarrollo para Windows/macOS/Linux con Node.js.

## EJECUCIÓN BREVE

1. Instala Node.js LTS, WebStorm (licencia de uso no comercial), Git y crea cuentas gratis en GitHub y Cloudflare.
2. Abre esta carpeta en WebStorm.
3. En la terminal: `cd api` y `npm install`.
4. `npx wrangler login` y `npx wrangler d1 create aerolineas-istmo-db`.
5. Copia el `database_id` generado a `api/wrangler.toml`, mantén `binding = "DB"`.
6. `npm run db:local` y `npm run dev`.
7. Abre una **segunda** terminal en la raíz del proyecto y ejecuta `node frontend-server.cjs`.
8. Abre <http://127.0.0.1:5500>.
9. Para publicar: desde `api`, `npm run db:remota` y `npm run deploy`, y después cambia `docs/config.js` a la dirección del Worker.
10. Sube el repositorio a GitHub y en `Settings > Pages` selecciona `Deploy from a branch`, `main`, `/docs`.

## QUÉ DEMUESTRA

- RF-01: registra pasajeros/clientes, niveles, documentos y límites de crédito.
- RF-02: vuelos, clase, tarifa y cupos disponibles.
- RF-03: borrador, pasajeros, tramos y confirmación.
- RF-04: aplica tarifa, equipaje y descuentos según cantidad.
- RF-05: los cupos se contabilizan como ocupados al confirmar una reserva.
- RF-06: estado de reserva, emisión, check-in y abordaje.
- RF-07: historial por agente (interfaz) y por pasajero (API).
- RF-08: registro de notificaciones internas al cambiar horario/puerta/cancelar vuelo.
- **RN-07 ampliada:** cotización de cambio, penalidad, reemisión con historia de boletos y cancelación penalizada (todo SIMULADO).
- **Manifiesto:** listado de pasajeros por vuelo con estado de check-in/abordaje.

## LIMITACIONES DEL PROTOTIPO (IMPORTANTES)

- **Solo datos ficticios:** no incluye autenticación/autorización real; la API pública no es apta para tratar información real.
- Pagos **simulados**, no procesa tarjetas ni dinero.
- Notificaciones **internas**, no envía correos/SMS/WhatsApp.
- La regla de cambio y cancelación con penalidad está implementada con importes de demostración (económica Q300 y ejecutiva Q500 por pasajero y tramo); no procesa pagos ni reembolsos reales.
- La capacidad se valida en el dominio, pero no se implementó una reserva atómica de inventario frente a confirmaciones simultáneas; requiere un mecanismo de concurrencia para producción.
- Los datos de prueba en D1 se crean al instalar; la migración 0002 añade dos vuelos alternativos y penalidades. Los horarios se fijan relativos a la fecha de instalación. Puedes editar el horario de un vuelo para pruebas.
- Política de tarifa al emitir: el boleto guarda la tarifa del catálogo vigente al emitir, incluso si cambió desde la cotización. La conciliación comercial de ese cambio queda fuera del alcance.
- El conteo máximo de 100 pasajeros por reserva es un límite de demostración.
- Úsalo únicamente para una **presentación académica** y nunca para vender boletos verdaderos.

## GRATUIDAD

No se requieren APIs de pago. Mantén **Workers Free**, **D1 Free** y un **repositorio público de GitHub**. Los planes gratuitos tienen límites; cuando superas cuotas, operaciones pueden dejar de funcionar. No actives planes pagados.

## Actualización académica v2 (ya desplegado ≠ actualizado)

Los cambios de v2 requieren ejecutar `npm run db:remota` para aplicar `0002_cambios_con_penalidad.sql`, luego `npx wrangler deploy` y `git push` para actualizar la interfaz pública. Si no se ejecutan estos tres pasos, el repositorio y la API remotos seguirán usando la versión anterior. Los registros existentes se conservan.

- `docs/app.js`: pantalla de cotización/cambio de boleto y manifiesto.
- `api/src/domain/policies.ts`: cálculo de penalidad para cambios y cancelaciones.
- `api/migrations/0002_cambios_con_penalidad.sql`: nuevas columnas, tablas de auditoría y vuelos alternativos.
- `INFORME_VERIFICACION_REQUISITOS.md`: matriz RF/RN y limitaciones verificadas.
- `INSTRUCCIONES_ACTUALIZACION.md`: guía paso a paso para aplicar esta versión.
