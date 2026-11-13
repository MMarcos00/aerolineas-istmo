-- Base relacional SQLite (Cloudflare D1). Restricciones FK/UNIQUE = integridad técnica;
-- reglas RN-01 a RN-08 = código en src/domain/policies.ts.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS agentes (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pasajeros (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, documento TEXT NOT NULL UNIQUE,
  documento_vence TEXT NOT NULL, nivel_frecuente TEXT NOT NULL DEFAULT 'BASICO',
  tipo_cliente TEXT NOT NULL CHECK(tipo_cliente IN ('INDIVIDUAL','AGENCIA','CORPORATIVO')),
  limite_credito INTEGER NOT NULL DEFAULT 0, credito_utilizado INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vuelos (
  id TEXT PRIMARY KEY, codigo TEXT NOT NULL, origen TEXT NOT NULL, pais_origen TEXT NOT NULL,
  destino TEXT NOT NULL, pais_destino TEXT NOT NULL, salida TEXT NOT NULL, llegada TEXT NOT NULL,
  puerta TEXT NOT NULL DEFAULT 'A1', estado TEXT NOT NULL DEFAULT 'PROGRAMADO',
  capacidad_economica INTEGER NOT NULL, capacidad_ejecutiva INTEGER NOT NULL,
  sobreventa_autorizada INTEGER NOT NULL DEFAULT 0,
  precio_economica INTEGER NOT NULL, precio_ejecutiva INTEGER NOT NULL,
  costo_equipaje INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reservas (
  id TEXT PRIMARY KEY, agente_id TEXT NOT NULL REFERENCES agentes(id),
  titular_id TEXT NOT NULL REFERENCES pasajeros(id), estado TEXT NOT NULL DEFAULT 'BORRADOR',
  equipajes INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0,
  creada_en TEXT NOT NULL, confirmada_en TEXT
);
CREATE TABLE IF NOT EXISTS reserva_pasajeros (
  reserva_id TEXT NOT NULL REFERENCES reservas(id),pasajero_id TEXT NOT NULL REFERENCES pasajeros(id),
  PRIMARY KEY(reserva_id,pasajero_id)
);
CREATE TABLE IF NOT EXISTS reserva_tramos (
  reserva_id TEXT NOT NULL REFERENCES reservas(id),vuelo_id TEXT NOT NULL REFERENCES vuelos(id),
  clase TEXT NOT NULL CHECK(clase IN ('ECONOMICA','EJECUTIVA')),
  PRIMARY KEY(reserva_id,vuelo_id)
);
CREATE TABLE IF NOT EXISTS pagos (
  id TEXT PRIMARY KEY, reserva_id TEXT NOT NULL REFERENCES reservas(id),monto INTEGER NOT NULL,fecha TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS boletos (
  id TEXT PRIMARY KEY, reserva_id TEXT NOT NULL REFERENCES reservas(id),
  pasajero_id TEXT NOT NULL REFERENCES pasajeros(id),vuelo_id TEXT NOT NULL REFERENCES vuelos(id),
  tarifa_cents INTEGER NOT NULL,clase TEXT NOT NULL,emitido_en TEXT NOT NULL,
  UNIQUE(reserva_id,pasajero_id,vuelo_id)
);
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,reserva_id TEXT NOT NULL REFERENCES reservas(id),
  pasajero_id TEXT NOT NULL REFERENCES pasajeros(id), vuelo_id TEXT NOT NULL REFERENCES vuelos(id),
  equipajes INTEGER NOT NULL DEFAULT 0,asiento TEXT NOT NULL, abordado INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL,
  UNIQUE(reserva_id,pasajero_id,vuelo_id),UNIQUE(vuelo_id,asiento)
);
CREATE TABLE IF NOT EXISTS notificaciones (
  id TEXT PRIMARY KEY,pasajero_id TEXT NOT NULL REFERENCES pasajeros(id),
  vuelo_id TEXT NOT NULL REFERENCES vuelos(id), texto TEXT NOT NULL,creada_en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vuelos_salida ON vuelos(salida);
CREATE INDEX IF NOT EXISTS idx_reservas_agente ON reservas(agente_id);
CREATE INDEX IF NOT EXISTS idx_rp_pasajero ON reserva_pasajeros(pasajero_id);
CREATE INDEX IF NOT EXISTS idx_rt_vuelo ON reserva_tramos(vuelo_id,clase);
CREATE INDEX IF NOT EXISTS idx_notificaciones_p ON notificaciones(pasajero_id,creada_en);

-- 90 agentes ficticios: suficiente para la simulación del caso académico.
WITH RECURSIVE contador(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM contador WHERE n<90)
INSERT INTO agentes(id,nombre) SELECT 'AG-'||printf('%03d',n), 'Agente de ventas '||n FROM contador;

INSERT INTO pasajeros VALUES
('P-001','Ana López','DOC-DEMO-001','2032-12-31','ORO','INDIVIDUAL',0,0),
('P-002','Carlos Pérez','DOC-DEMO-002','2032-12-31','PLATA','INDIVIDUAL',0,0),
('P-003','María Torres','DOC-DEMO-003','2026-12-01','BASICO','INDIVIDUAL',0,0),
('P-004','Agencia Turismo Maya','DOC-DEMO-004','2032-12-31','BASICO','AGENCIA',15000000,0),
('P-005','Empresa Corporativa Istmo','DOC-DEMO-005','2032-12-31','BASICO','CORPORATIVO',20000000,0);

-- 35 viajeros adicionales de prueba para demostrar grupos y descuentos del 5% / 10%.
WITH RECURSIVE contador(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM contador WHERE n<35)
INSERT INTO pasajeros (id,nombre,documento,documento_vence,nivel_frecuente,tipo_cliente,limite_credito,credito_utilizado)
SELECT 'G-'||printf('%03d',n),'Viajero Demo '||printf('%02d',n),
 'DOC-GRUPO-'||printf('%03d',n),'2033-12-31','BASICO','INDIVIDUAL',0,0 FROM contador;

-- Horarios relativos a la fecha de instalación: disponibles para pruebas posteriores.
INSERT INTO vuelos VALUES
('V-001','AI101','Ciudad de Guatemala','Guatemala','Flores','Guatemala',
 strftime('%Y-%m-%d','now','+2 days')||'T14:00:00Z',strftime('%Y-%m-%d','now','+2 days')||'T15:00:00Z','A1','PROGRAMADO',36,6,1,55000,120000,15000),
('V-002','AI202','Ciudad de Guatemala','Guatemala','Ciudad de México','México',
 strftime('%Y-%m-%d','now','+3 days')||'T15:00:00Z',strftime('%Y-%m-%d','now','+3 days')||'T17:20:00Z','B2','PROGRAMADO',40,8,0,180000,310000,25000),
('V-003','AI303','Ciudad de Guatemala','Guatemala','San José','Costa Rica',
 strftime('%Y-%m-%d','now','+4 days')||'T16:00:00Z',strftime('%Y-%m-%d','now','+4 days')||'T17:35:00Z','C3','PROGRAMADO',60,8,1,145000,270000,22000),
('V-004','AI404','San José','Costa Rica','Ciudad de Guatemala','Guatemala',
 strftime('%Y-%m-%d','now','+7 days')||'T19:00:00Z',strftime('%Y-%m-%d','now','+7 days')||'T20:30:00Z','D4','PROGRAMADO',60,8,0,145000,270000,22000);
