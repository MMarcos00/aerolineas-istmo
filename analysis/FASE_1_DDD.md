# FASE 1 · Diseño Estratégico DDD
## Aerolíneas del Istmo, S.A.

**Curso:** Desarrollo Web · Ingeniería en Sistemas  
**Caso:** Sistema de Gestión de Reservas y Abordaje  
**Enfoque:** DDD, Arquitectura Hexagonal y Modelo C4  
**Nota:** Este proyecto es una **demostración universitaria** y utiliza datos, agentes y pagos ficticios.

## Paso 1. Lenguaje ubicuo: glosario del negocio

Los términos fueron definidos para que Ventas, Operaciones y Desarrollo utilicen el mismo vocabulario. Los nombres aparecen igualmente en el código (en español).

| No. | Término | Definición acordada |
|---:|---|---|
| 1 | Pasajero | Persona identificada que viajará en uno o varios vuelos. |
| 2 | Cliente titular | Persona, agencia o empresa responsable de la reserva y del pago o crédito. |
| 3 | Agencia de viaje | Cliente comercial autorizado para gestionar reservas, incluidas las de grupo, con límite de crédito. |
| 4 | Cliente corporativo | Empresa con convenio y límite de crédito para comprar boletos. |
| 5 | Agente de ventas | Colaborador que registra, cotiza, confirma y emite una reserva. |
| 6 | Reserva | Conjunto de pasajeros y tramos que pasa por estados definidos. |
| 7 | Reserva de grupo | Reserva que incluye 10 o más pasajeros y pertenece a agencia o empresa. |
| 8 | Vuelo | Servicio de transporte con código, origen, destino, horario y aeronave asignada. |
| 9 | Tramo | Cada vuelo que integra el itinerario de una reserva. |
| 10 | Itinerario | Secuencia de uno o varios tramos reservados para viajar. |
| 11 | Tarifa | Precio aplicable a una clase de vuelo en un momento determinado. |
| 12 | Clase | Categoría de servicio ofrecida: económica o ejecutiva. |
| 13 | Cotización | Cálculo de tarifa, descuento, equipaje y total antes de confirmar. |
| 14 | Boleto | Comprobante de un pasajero para un tramo, con tarifa congelada al emitir. |
| 15 | Inventario de asientos | Cantidad de plazas vendibles por vuelo y clase. |
| 16 | Bloqueo de cupo | Reserva de disponibilidad cuando se confirma una reserva. |
| 17 | Sobreventa | Cupos autorizados por encima de la capacidad física, solo en económica y hasta 5%. |
| 18 | Equipaje facturado | Maleta registrada para transportarse en bodega y que puede generar un cargo. |
| 19 | Check-in | Registro del pasajero para volar, con validación de documentos y asignación de asiento. |
| 20 | Pase de abordar | Documento o registro generado tras el check-in que habilita el abordaje. |
| 21 | Abordaje | Confirmación de que el pasajero ingresó al vuelo. |
| 22 | Manifiesto | Lista operativa de pasajeros y estados de abordaje de un vuelo. |
| 23 | Puerta de abordaje | Área del aeropuerto asignada para embarcar pasajeros. |
| 24 | Viajero frecuente | Pasajero con nivel de fidelidad, por ejemplo básico, plata u oro. |
| 25 | Límite de crédito | Máximo total permitido a un cliente de agencia o corporativo. |
| 26 | Crédito disponible | Límite de crédito menos el crédito utilizado por reservas vigentes. |
| 27 | Notificación | Aviso registrado por un cambio de horario, puerta o cancelación. |
| 28 | Estado de reserva | Etapa de la reserva: Borrador, Confirmada, Boleto emitido, Check-in realizado, Abordado o Cancelada. |
| 29 | Penalidad de tarifa | Cargo definido para un cambio o cancelación de boleto emitido, dependiente de la clase. |
| 30 | Cambio de boleto | Sustitución autorizada de un tramo, con cálculo de penalidad, diferencia tarifaria y nueva emisión. |
| 31 | Reemisión | Generación del boleto para el nuevo tramo, conservando el boleto antiguo anulado como historial. |
| 32 | Reembolso simulado | Importe teórico luego de deducir una penalidad; esta aplicación no transfiere dinero real. |

## Paso 2. Identificación y clasificación de subdominios

| Clasificación | Subdominio | Justificación |
|---|---|---|
| **Core** | Reservas y Tarifas | Concentra reglas que diferencian a la aerolínea: grupos, descuentos, confirmación, crédito, sobreventa y congelamiento de tarifa. |
| **Soporte** | Vuelos | Publica rutas, fechas, horarios y estado operativo; indispensable, pero no constituye la lógica comercial principal. |
| **Soporte** | Inventario de asientos | Administra disponibilidad por clase y cupos reservados, incluyendo sobreventa autorizada. |
| **Soporte** | Pasajeros y Clientes | Gestiona documentos, tipo de cliente, fidelidad y crédito necesario para el negocio. |
| **Soporte** | Operaciones de aeropuerto | Realiza check-in, equipajes, asiento y abordaje. |
| **Genérico** | Pagos | Se puede integrar con una pasarela existente; en la demostración los pagos se simulan. |
| **Genérico** | Notificaciones | Canal intercambiable para alertas; en la demostración es un buzón interno. |
| **Genérico** | Autenticación | Puede delegarse a un proveedor de identidad; no se implementa seguridad de producción en esta demo. |

**Decisión:** el dominio de Reservas y Tarifas mantiene las reglas en clases propias. Los controladores HTTP y la infraestructura SQL no deciden si una reserva se puede confirmar.

## Paso 3. Bounded Contexts

| Contexto delimitado | Responsabilidad y vocabulario propio |
|---|---|
| **Vuelos** | Programa el vuelo: código, ruta, horario, puerta, estado. El «vuelo» significa servicio programado. |
| **Reservas y Tarifas** | Crea, cotiza, confirma y cambia el estado de reservas. «Pasajero» significa viajero incluido en una reserva; «vuelo» significa tramo cotizado. |
| **Inventario de asientos** | Controla plazas disponibles por vuelo y clase, bloqueo y sobreventa. «Vuelo» significa unidad de capacidad vendible. |
| **Pasajeros y Clientes** | Identidad, documento, nivel frecuente, tipo de cliente y crédito. «Pasajero» significa identidad maestra, independiente de un vuelo. |
| **Operaciones de aeropuerto** | Check-in, asiento asignado, equipaje, abordaje y manifiesto. «Pasajero» significa viajero que se presenta para un vuelo. |
| **Pagos** | Registros de pago y conciliación (en esta versión, simulación). |
| **Notificaciones** | Mensajes relativos a cambios de vuelos y reservas. |

### ¿Por qué un término puede significar cosas distintas?

En **Reservas**, «Pasajero» es parte del itinerario y de la cotización; en **Aeropuerto**, es la persona cuya documentación se revisa y a quien se asigna un asiento. En **Vuelos**, «Vuelo» representa una ruta programada; en **Inventario**, el mismo código representa la capacidad disponible. Son vistas de negocio distintas, no necesariamente la misma clase de software.

## Paso 4. Context Map: relaciones entre contextos

| Contexto proveedor (upstream) | Contexto cliente (downstream) | Relación | Explicación |
|---|---|---|---|
| Vuelos | Reservas | Cliente/Proveedor | Reservas necesita horarios y vuelos programados. |
| Pasajeros y Clientes | Reservas | Cliente/Proveedor | Reservas consulta identidades y crédito. |
| Inventario de asientos | Reservas | Cliente/Proveedor | Inventario proporciona disponibilidad a la confirmación. |
| Reservas | Operaciones de aeropuerto | Conformista (demo) | Aeropuerto utiliza identificadores y estados del boleto publicado por Reservas. |
| Vuelos | Notificaciones | Cliente/Proveedor | El cambio de vuelo origina el aviso enviado por Notificaciones. |
| Reservas ↔ Inventario | Compartir identidad mínima | Kernel compartido | Solo se comparten tipos de identidad, como VueloId y ReservaId; no se comparte lógica de negocio. |
| Reservas | Pasarela de pagos externa | Capa Anticorrupción (ACL) | Un adaptador traduce las respuestas de un proveedor externo al concepto «Pago aprobado». |
| Operaciones de aeropuerto | Sistema de migración externo | Capa Anticorrupción (ACL) | Un adaptador traduce respuestas migratorias al vocabulario interno de autorización de viaje. |

En la **demostración** los contextos se organizan como módulos lógicos en un solo Worker; no se desplegaron microservicios independientes. Los adaptadores externos ACL son decisiones de diseño documentadas para una futura integración, y no servicios externos operativos.

## Aplicación DDD táctico: agregados y políticas

- **Reserva (agregado):** controla el estado, los pasajeros y los tramos; se identifica por ReservaId.
- **Pasajero (entidad):** conserva documento y tipo de cliente.
- **Vuelo (entidad):** define capacidad, horario, clase y tarifas vigentes.
- **Boleto (entidad):** registra tarifa en centavos en el momento de emisión (RN-08).
- **PoliticaDeReservas (servicio de dominio):** valida cantidad, crédito, capacidad, descuentos, cancelación y documentos.
- **AerolineaService (servicio de aplicación):** coordina casos de uso, sin SQL.
- **PuertoRepositorioAerolinea (puerto):** interfaz que necesita la aplicación para leer y persistir datos.
- **D1Repositorio (adaptador):** implementación del puerto en Cloudflare D1.

## Reglas y responsables

| Regla | Implementación en el dominio |
|---|---|
| RN-01 | `PoliticaDeReservas.validarCantidad` |
| RN-02 | `validarCredito` y `validarPagoIndividual` |
| RN-03 | `validarCapacidad` |
| RN-04 | `porcentajeDescuento` y `cotizar` |
| RN-05 | `validarCancelacion` |
| RN-06 | `validarDocumentoInternacional` |
| RN-07 | `validarEdicion`, `calcularCambio` y `penalidadCancelacion`: cambio y cancelación con recargo simulado, con registros en SQL |
| RN-08 | Instantánea de tarifa calculada por `PoliticaDeReservas.prepararBoletos` en el dominio y persistida sin recalcular por D1 |

## Modelo C4 del proyecto

1. **Nivel 1, contexto:** agentes, aeropuerto, sistema y plataformas externas.
2. **Nivel 2, contenedores:** HTML/CSS/JS en GitHub Pages, API Worker y base de datos D1.
3. **Nivel 3, componentes:** HTTP → aplicación → dominio ↔ puerto → adaptador D1.
4. **Nivel 4, código:** clases `AerolineaService`, `PoliticaDeReservas`, `D1Repositorio`, entidades y puerto.

Los diagramas editables de Context Map, C4 y base de datos están en `diagrams/Arquitectura_Aerolineas_Istmo.drawio`.

## Alcance honesto de esta versión académica

Se cubren RF-01 a RF-08 **para demostración**, aunque RF-08 usa notificaciones dentro de la app. No hay pasarela bancaria real, WhatsApp, sistema migratorio, autenticación, selección avanzada de asientos, cambio de boleto con penalidad configurable ni garantía de concurrencia para venta simultánea de alta demanda. El software no debe usarse con pasajeros reales ni datos personales sensibles.

## Ampliación académica: cambios y manifiesto

- Una reserva **BOLETO_EMITIDO** no puede editar pasajeros ni tramos directamente. El caso de uso `cambiarBoleto` realiza una reemisión controlada, valida capacidad y crédito y registra una penalidad por clase más el aumento tarifario (si existe); los pagos se simulan.
- Al cancelar una reserva con boleto emitido se registra la penalidad correspondiente y el reembolso teórico.
- La tarifa original queda registrada en el boleto histórico, marcado `anulado=1`, y el nuevo boleto recibe su propia instantánea de tarifa. Esto hace comprobable RN-08.
- En Aeropuerto, el **manifiesto** ofrece una proyección operacional distinta al modelo de Reservas: muestra pasajeros reservados, asientos, equipajes y estado de abordaje.
- Las políticas se mantienen en `src/domain/policies.ts`, no en SQL ni en las rutas HTTP.
- El flujo adicional se documenta en `diagrams/Flujo_Cambio_Boleto_RN07.drawio`.
