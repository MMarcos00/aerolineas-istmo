-- Segunda migración: RN-07, cambio de boleto emitido con penalidad simulada.
-- La penalidad depende de la clase del boleto original; las reglas se calculan en el dominio.
ALTER TABLE vuelos ADD COLUMN penalidad_cambio_economica INTEGER NOT NULL DEFAULT 30000;
ALTER TABLE vuelos ADD COLUMN penalidad_cambio_ejecutiva INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE boletos ADD COLUMN anulado INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS cambios_boleto (
 id TEXT PRIMARY KEY,
 reserva_id TEXT NOT NULL REFERENCES reservas(id),
 vuelo_anterior_id TEXT NOT NULL REFERENCES vuelos(id),
 vuelo_nuevo_id TEXT NOT NULL REFERENCES vuelos(id),
 clase_anterior TEXT NOT NULL,
 clase_nueva TEXT NOT NULL,
 penalidad INTEGER NOT NULL,
 diferencia_tarifaria INTEGER NOT NULL,
 recargo_total INTEGER NOT NULL,
 fecha TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cancelaciones_boleto (
 id TEXT PRIMARY KEY, reserva_id TEXT NOT NULL REFERENCES reservas(id),
 penalidad INTEGER NOT NULL, reembolso_simulado INTEGER NOT NULL, fecha TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cambios_reserva ON cambios_boleto(reserva_id, fecha);
-- Otro vuelo realista de la misma ruta para demostrar un cambio sin comprar servicios externos.
INSERT INTO vuelos(id,codigo,origen,pais_origen,destino,pais_destino,salida,llegada,puerta,estado,capacidad_economica,capacidad_ejecutiva,sobreventa_autorizada,precio_economica,precio_ejecutiva,costo_equipaje)
VALUES ('V-005','AI205','Ciudad de Guatemala','Guatemala','Ciudad de México','México',strftime('%Y-%m-%d','now','+9 days')||'T15:00:00Z',strftime('%Y-%m-%d','now','+9 days')||'T17:20:00Z','B4','PROGRAMADO',40,8,0,195000,330000,25000);
INSERT INTO vuelos(id,codigo,origen,pais_origen,destino,pais_destino,salida,llegada,puerta,estado,capacidad_economica,capacidad_ejecutiva,sobreventa_autorizada,precio_economica,precio_ejecutiva,costo_equipaje)
VALUES ('V-006','AI306','Ciudad de Guatemala','Guatemala','San José','Costa Rica',strftime('%Y-%m-%d','now','+10 days')||'T16:00:00Z',strftime('%Y-%m-%d','now','+10 days')||'T17:35:00Z','C6','PROGRAMADO',60,8,1,155000,285000,22000);
