# Verificación del caso — Aerolíneas del Istmo, S.A.

**Curso:** Desarrollo Web, Ingeniería en Sistemas  
**Versión auditada:** v2 (con migración 0002, no la v1 que ya está publicada).  
**Resultado local:** 9 pruebas de dominio y 12 pruebas de integración completadas correctamente.

## 1. Fundamentos arquitectónicos (30 puntos)

| Fundamento | Evidencia | Evaluación |
|---|---|---|
| DDD (10 pts) | `analysis/FASE_1_DDD.md`: glosario de 32 términos, subdominios, 7 contextos delimitados y Context Map. En código: `src/domain/model.ts` y `policies.ts`. | Documentado y aplicado de forma simplificada. |
| Hexagonal (10 pts) | `index.ts` (entrada HTTP), `application/AerolineaService.ts` (casos de uso), `application/ports.ts` (puerto), `infrastructure/D1Repositorio.ts` (adaptador), `domain/` (políticas y tipos). | Implementada en un Worker con módulos, no microservicios. |
| Modelo C4 (10 pts) | `diagrams/Arquitectura_Aerolineas_Istmo.drawio`: niveles 1 al 4; Context Map y modelo SQL. | Documentado. |

## 2. Requerimientos funcionales

| RF | Evidencia en aplicación/código | Estado académico |
|---|---|---|
| RF-01 | Pasajeros → registro con tipo, documento, vencimiento, nivel y crédito; tabla `pasajeros`. | Implementado en demo. |
| RF-02 | Vuelos → filtros origen/destino/fecha, dos clases, precios y cupos. | Implementado. |
| RF-03 | Reservas → crear, agregar/quitar pasajeros y tramos, confirmar. | Implementado. |
| RF-04 | `PoliticaDeReservas.cotizar`: tarifa, equipaje y descuentos al confirmar. | Implementado. |
| RF-05 | Cupo se descuenta al confirmar según reservas activas. | Implementado para operaciones secuenciales; **no hay bloqueo atómico de inventario para confirmaciones concurrentes**. |
| RF-06 | Estados Borrador, Confirmada, Boleto emitido, Check-in, Abordado y Cancelada. | Implementado. |
| RF-07 | Reservas → historial por agente y pasajero. | Implementado. |
| RF-08 | Vuelos → cambiar horario/puerta/cancelar; Notificaciones → buzón por pasajero. | Implementado **como notificación interna**, no SMS/correo/WhatsApp. |

**Extra:** Aeropuerto → manifiesto por vuelo, con asiento, equipaje y estado de abordaje.

## 3. Invariantes del dominio

| RN | Implementación en `src/domain/policies.ts` | Estado |
|---|---|---|
| RN-01 | `validarCantidad`: 1 a 9 para individuales, grupos desde 10 solo agencias/corporativos; máximo de demo 100. | Sí. |
| RN-02 | `validarCredito` y `validarPagoIndividual`. Pagos simulados. | Sí, en demo. |
| RN-03 | `validarCapacidad`: tope físico y hasta 5% adicional autorizado en económica. | Sí en lógica de dominio, **sin garantía transaccional ante dos confirmaciones a la vez**. |
| RN-04 | `porcentajeDescuento`: más de 10 → 5%; más de 30 → 10%. | Sí. |
| RN-05 | `validarCancelacion`: estados autorizados y mínimo 3 horas. | Sí. |
| RN-06 | `validarDocumentoInternacional`: 6 meses desde salida internacional. | Sí. |
| RN-07 | `validarEdicion`, `calcularCambio` y `penalidadCancelacion`: no edición directa de boleto emitido; cambio y cancelación con penalidad simulada por clase. | Sí en demo v2. |
| RN-08 | `prepararBoletos`: guarda tarifa histórica en `boletos.tarifa_cents`; al cambiar se conserva el boleto anulado, sin modificar el importe viejo. | Sí. |

## 4. Pruebas que el catedrático puede hacer

1. Registrar un pasajero individual de prueba. Crear reserva como agente AG-001 y confirmar AI202 (económica); ver disminuir los cupos.
2. Emitir sin pagar: debe rechazarse. Registrar **pago simulado** y emitir: debe permitirse.
3. Intentar agregar otro pasajero después de emitir: debe rechazarse.
4. Cambiar AI202 a AI205: cotizará penalidad Q300 por pasajero más la diferencia tarifaria positiva. Confirmar cambio simulado; se conservan las tarifas originales en SQL.
5. Con otra reserva emitida, cancelar con más de 3 horas: debe registrar penalidad simulada.
6. Hacer check-in y abordar; consultar **Aeropuerto → Manifiesto de pasajeros** para el vuelo.
7. Cambiar la puerta en **Vuelos**; abrir **Notificaciones** para consultar el aviso del pasajero afectado.
8. En **Reservas**, filtrar historial por agente y por pasajero.
9. En draw.io, mostrar el Context Map y los niveles C4 1 a 4.

## 5. Qué no se debe presentar como implementado en producción

- La aplicación se publica sin inicio de sesión ni perfiles, así que terceros con el enlace pueden crear o modificar **datos ficticios**. No usar datos reales, pasaportes verdaderos ni pagos auténticos.
- Se simula la autorización/pago de penalidades. No se integra una pasarela bancaria real ni un sistema de migración.
- Los canales WhatsApp, quiosco y app móvil son extensiones futuras previstas por la arquitectura, no apps ya desarrolladas.
- Los avisos están dentro de la aplicación, no se envían automáticamente a dispositivos.
- El inventario se consulta y actualiza, pero requiere mecanismo transaccional de reserva de plazas para concurrencia real; esto es importante para 90 agentes simultáneos.
- Los pasajeros y clientes tipo agencia/corporación comparten un modelo simplificado; en producción se separarían esas entidades.
- Un cambio solo se admite a otro vuelo programado de la **misma ruta**, antes de check-in. No se permite regresar a un vuelo cuya combinación pasajero/reserva ya tiene un boleto histórico (limitación por clave única).
- Horarios de vuelos de muestra se crean a futuro al aplicar migraciones; con el tiempo será necesario cargar más vuelos de prueba.

**Conclusión:** la versión v2 ofrece una demostración sustancial de las 8 funciones, las 8 reglas y la Fase 1. Para obtener una calificación, el docente deberá evaluar tanto la documentación como la prueba manual; aprobar tests locales no equivale a garantizar un sistema de aerolínea en producción.
