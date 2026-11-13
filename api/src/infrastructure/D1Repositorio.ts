/** Adaptador secundario: SQL D1. Sin decisiones de negocio. */
import { Boleto, ClaseTarifa, DetalleReserva, Pasajero, Reserva, Vuelo } from '../domain/model';
import type { PuertoRepositorioAerolinea } from '../application/ports';

type Fila = Record<string, any>;
interface Consulta { bind(...valores: unknown[]): Consulta; first<T = Fila>(): Promise<T | null>; all<T = Fila>(): Promise<{ results: T[] }>; run(): Promise<unknown>; }
export interface BaseDeDatosD1 { prepare(sql: string): Consulta; batch(consultas: Consulta[]): Promise<unknown[]>; }

function mapPasajero(x: Fila): Pasajero {
  return { id: x.id, nombre: x.nombre, documento: x.documento, documentoVence: x.documento_vence, nivelFrecuente: x.nivel_frecuente, tipoCliente: x.tipo_cliente, limiteCreditoCentavos: x.limite_credito, creditoUtilizadoCentavos: x.credito_utilizado };
}
function mapVuelo(x: Fila): Vuelo {
  return { id: x.id, codigo: x.codigo, origen: x.origen, paisOrigen: x.pais_origen, destino: x.destino, paisDestino: x.pais_destino, salida: x.salida, llegada: x.llegada, puerta: x.puerta, estado: x.estado, capacidadEconomica: x.capacidad_economica, capacidadEjecutiva: x.capacidad_ejecutiva, sobreventaAutorizada: !!x.sobreventa_autorizada, precioEconomicaCentavos: x.precio_economica, precioEjecutivaCentavos: x.precio_ejecutiva, equipajeCentavos: x.costo_equipaje, penalidadCambioEconomicaCentavos: x.penalidad_cambio_economica ?? 30000, penalidadCambioEjecutivaCentavos: x.penalidad_cambio_ejecutiva ?? 50000 };
}
function mapReserva(x: Fila): Reserva {
  return { id: x.id, agenteId: x.agente_id, clienteTitularId: x.titular_id, estado: x.estado, equipajes: x.equipajes, totalCentavos: x.total, creadaEn: x.creada_en, confirmadaEn: x.confirmada_en };
}

export class D1Repositorio implements PuertoRepositorioAerolinea {
  constructor(private readonly db: BaseDeDatosD1) {}

  async agentes() { return (await this.db.prepare('SELECT id, nombre FROM agentes ORDER BY id').all<{ id: string; nombre: string }>()).results; }
  async pasajeros() { return (await this.db.prepare('SELECT * FROM pasajeros ORDER BY nombre').all()).results.map(mapPasajero); }
  async pasajero(id: string) { const row = await this.db.prepare('SELECT * FROM pasajeros WHERE id=?').bind(id).first(); return row ? mapPasajero(row) : null; }
  async registrarPasajero(p: Pasajero) {
    await this.db.prepare('INSERT INTO pasajeros (id,nombre,documento,documento_vence,nivel_frecuente,tipo_cliente,limite_credito,credito_utilizado) VALUES (?,?,?,?,?,?,?,0)')
      .bind(p.id,p.nombre,p.documento,p.documentoVence,p.nivelFrecuente,p.tipoCliente,p.limiteCreditoCentavos).run();
  }
  async vuelos(f: { origen?: string; destino?: string; fecha?: string }) {
    let sql = `SELECT v.*, (SELECT COALESCE(SUM((SELECT COUNT(*) FROM reserva_pasajeros rp WHERE rp.reserva_id=r.id)),0)
      FROM reserva_tramos rt JOIN reservas r ON rt.reserva_id=r.id WHERE rt.vuelo_id=v.id AND rt.clase='ECONOMICA'
      AND r.estado IN ('CONFIRMADA','BOLETO_EMITIDO','CHECKIN_REALIZADO','ABORDADO')) AS tomados_economica,
      (SELECT COALESCE(SUM((SELECT COUNT(*) FROM reserva_pasajeros rp WHERE rp.reserva_id=r.id)),0)
      FROM reserva_tramos rt JOIN reservas r ON rt.reserva_id=r.id WHERE rt.vuelo_id=v.id AND rt.clase='EJECUTIVA'
      AND r.estado IN ('CONFIRMADA','BOLETO_EMITIDO','CHECKIN_REALIZADO','ABORDADO')) AS tomados_ejecutiva
      FROM vuelos v WHERE 1=1`;
    const vals: unknown[] = [];
    if (f.origen) { sql += ' AND LOWER(v.origen) LIKE LOWER(?)'; vals.push(`%${f.origen}%`); }
    if (f.destino) { sql += ' AND LOWER(v.destino) LIKE LOWER(?)'; vals.push(`%${f.destino}%`); }
    if (f.fecha) { sql += ' AND SUBSTR(v.salida,1,10)=?'; vals.push(f.fecha); }
    sql += ' ORDER BY v.salida';
    const rows = (await this.db.prepare(sql).bind(...vals).all()).results;
    return rows.map(x => ({ ...mapVuelo(x), libresEconomica: Math.max(0, x.capacidad_economica + (x.sobreventa_autorizada ? Math.floor(x.capacidad_economica * .05) : 0) - x.tomados_economica), libresEjecutiva: Math.max(0, x.capacidad_ejecutiva - x.tomados_ejecutiva) }));
  }
  async vuelo(id: string) { const row = await this.db.prepare('SELECT * FROM vuelos WHERE id=?').bind(id).first(); return row ? mapVuelo(row) : null; }

  async reserva(id: string): Promise<DetalleReserva | null> {
    const row = await this.db.prepare('SELECT * FROM reservas WHERE id=?').bind(id).first();
    if (!row) return null;
    const pasajeros = (await this.db.prepare('SELECT p.* FROM pasajeros p JOIN reserva_pasajeros rp ON rp.pasajero_id=p.id WHERE rp.reserva_id=? ORDER BY p.nombre').bind(id).all()).results.map(mapPasajero);
    const tramos = (await this.db.prepare('SELECT v.*, rt.clase FROM vuelos v JOIN reserva_tramos rt ON rt.vuelo_id=v.id WHERE rt.reserva_id=? ORDER BY v.salida').bind(id).all()).results.map(x => ({ vuelo: mapVuelo(x), clase: x.clase as ClaseTarifa }));
    const pagado = await this.db.prepare('SELECT COALESCE(SUM(monto),0) AS n FROM pagos WHERE reserva_id=?').bind(id).first<{n: number}>();
    const boletos = await this.db.prepare('SELECT COUNT(*) AS n FROM boletos WHERE reserva_id=? AND anulado=0').bind(id).first<{n: number}>();
    const checkins = await this.db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(abordado),0) AS a FROM checkins WHERE reserva_id=?').bind(id).first<{n: number;a:number}>();
    return { reserva: mapReserva(row), pasajeros, tramos, pagosCentavos: pagado?.n ?? 0, boletos: boletos?.n ?? 0, checkins: checkins?.n ?? 0, abordajes: checkins?.a ?? 0 };
  }
  async reservas(f: { pasajeroId?: string; agenteId?: string }) {
    let sql = `SELECT r.id,r.estado,r.agente_id AS agenteId,r.creada_en AS creadaEn,r.total AS totalCentavos,
      (SELECT p.nombre FROM pasajeros p WHERE p.id=r.titular_id) AS pasajeroTitular,
      (SELECT COUNT(*) FROM reserva_pasajeros rp WHERE rp.reserva_id=r.id) AS pasajeros
      FROM reservas r WHERE 1=1`;
    const vals: unknown[] = [];
    if (f.pasajeroId) { sql += ' AND EXISTS (SELECT 1 FROM reserva_pasajeros rp WHERE rp.reserva_id=r.id AND rp.pasajero_id=?)'; vals.push(f.pasajeroId); }
    if (f.agenteId) { sql += ' AND r.agente_id=?'; vals.push(f.agenteId); }
    sql += ' ORDER BY r.creada_en DESC LIMIT 100';
    return (await this.db.prepare(sql).bind(...vals).all()).results as any;
  }
  async crearReserva(r: Reserva) { await this.db.prepare('INSERT INTO reservas (id,agente_id,titular_id,estado,equipajes,total,creada_en,confirmada_en) VALUES (?,?,?,?,?,?,?,NULL)')
    .bind(r.id,r.agenteId,r.clienteTitularId,r.estado,0,0,r.creadaEn).run(); }
  async agregarPasajero(r: string, p: string) { await this.db.prepare('INSERT INTO reserva_pasajeros (reserva_id,pasajero_id) VALUES (?,?)').bind(r,p).run(); }
  async quitarPasajero(r: string, p: string) { await this.db.prepare('DELETE FROM reserva_pasajeros WHERE reserva_id=? AND pasajero_id=?').bind(r,p).run(); }
  async agregarTramo(r: string, v: string, c: ClaseTarifa) { await this.db.prepare('INSERT INTO reserva_tramos (reserva_id,vuelo_id,clase) VALUES (?,?,?)').bind(r,v,c).run(); }
  async quitarTramo(r: string, v: string) { await this.db.prepare('DELETE FROM reserva_tramos WHERE reserva_id=? AND vuelo_id=?').bind(r,v).run(); }
  async ocupados(v: string, c: ClaseTarifa) {
    const fila = await this.db.prepare(`SELECT COALESCE(SUM((SELECT COUNT(*) FROM reserva_pasajeros rp WHERE rp.reserva_id=r.id)),0) AS n
       FROM reserva_tramos rt JOIN reservas r ON r.id=rt.reserva_id
       WHERE rt.vuelo_id=? AND rt.clase=? AND r.estado IN ('CONFIRMADA','BOLETO_EMITIDO','CHECKIN_REALIZADO','ABORDADO')`).bind(v,c).first<{n:number}>();
    return fila?.n ?? 0;
  }
  async confirmar(r: Reserva, total: number, equipajes: number, titular: Pasajero) {
    const consultas = [this.db.prepare("UPDATE reservas SET estado='CONFIRMADA',total=?,equipajes=?,confirmada_en=? WHERE id=? AND estado='BORRADOR'").bind(total,equipajes,new Date().toISOString(),r.id)];
    if (titular.tipoCliente !== 'INDIVIDUAL') consultas.push(this.db.prepare('UPDATE pasajeros SET credito_utilizado=credito_utilizado+? WHERE id=?').bind(total,titular.id));
    await this.db.batch(consultas);
  }
  async boletosActivos(r:string,v:string) {
    return (await this.db.prepare('SELECT pasajero_id AS pasajeroId, tarifa_cents AS tarifaCentavos FROM boletos WHERE reserva_id=? AND vuelo_id=? AND anulado=0')
      .bind(r,v).all<{pasajeroId:string;tarifaCentavos:number}>()).results;
  }
  async guardarCambio(reserva: Reserva, titular: Pasajero, anteriorId: string,
    claseAnterior: ClaseTarifa, nuevoId: string, claseNueva: ClaseTarifa,
    recargo: {penalidadCentavos:number;diferenciaTarifariaCentavos:number;recargoTotalCentavos:number},
    boletos: Boleto[]) {
    const fecha=new Date().toISOString();
    const q:Consulta[]=[
      this.db.prepare('UPDATE boletos SET anulado=1 WHERE reserva_id=? AND vuelo_id=? AND anulado=0').bind(reserva.id,anteriorId),
      this.db.prepare('DELETE FROM reserva_tramos WHERE reserva_id=? AND vuelo_id=?').bind(reserva.id,anteriorId),
      this.db.prepare('INSERT INTO reserva_tramos (reserva_id,vuelo_id,clase) VALUES (?,?,?)').bind(reserva.id,nuevoId,claseNueva),
      ...boletos.map(b=>this.db.prepare('INSERT INTO boletos (id,reserva_id,pasajero_id,vuelo_id,tarifa_cents,clase,emitido_en,anulado) VALUES (?,?,?,?,?,?,?,0)')
        .bind(b.id,b.reservaId,b.pasajeroId,b.vueloId,b.tarifaCentavos,b.clase,b.emitidoEn)),
      this.db.prepare("UPDATE reservas SET total=total+? WHERE id=? AND estado='BOLETO_EMITIDO'").bind(recargo.recargoTotalCentavos,reserva.id),
      this.db.prepare(`INSERT INTO cambios_boleto
        (id,reserva_id,vuelo_anterior_id,vuelo_nuevo_id,clase_anterior,clase_nueva,penalidad,diferencia_tarifaria,recargo_total,fecha)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),reserva.id,anteriorId,nuevoId,claseAnterior,claseNueva,
          recargo.penalidadCentavos,recargo.diferenciaTarifariaCentavos,recargo.recargoTotalCentavos,fecha)
    ];
    if(titular.tipoCliente!=='INDIVIDUAL')
      q.push(this.db.prepare('UPDATE pasajeros SET credito_utilizado=credito_utilizado+? WHERE id=?').bind(recargo.recargoTotalCentavos,titular.id));
    else q.push(this.db.prepare('INSERT INTO pagos (id,reserva_id,monto,fecha) VALUES (?,?,?,?)')
      .bind(crypto.randomUUID(),reserva.id,recargo.recargoTotalCentavos,fecha));
    // Batch D1: todos los cambios se aplican juntos o se revierten ante error.
    await this.db.batch(q);
  }
  async registrarPago(r: string, monto: number) { await this.db.prepare('INSERT INTO pagos (id,reserva_id,monto,fecha) VALUES (?,?,?,?)').bind(crypto.randomUUID(),r,monto,new Date().toISOString()).run(); }
  async emitir(reservaId: string, boletos: Boleto[]) { // Solo PERSISTE instantáneas calculadas por el dominio (RN-08).
    const q: Consulta[] = boletos.map(b => this.db.prepare('INSERT INTO boletos (id,reserva_id,pasajero_id,vuelo_id,tarifa_cents,clase,emitido_en) VALUES (?,?,?,?,?,?,?)')
      .bind(b.id,b.reservaId,b.pasajeroId,b.vueloId,b.tarifaCentavos,b.clase,b.emitidoEn));
    q.push(this.db.prepare("UPDATE reservas SET estado='BOLETO_EMITIDO' WHERE id=?").bind(reservaId));
    await this.db.batch(q);
  }
  async cancelar(detalle: DetalleReserva, penalidadCentavos: number) {
    const q: Consulta[] = [this.db.prepare("UPDATE reservas SET estado='CANCELADA' WHERE id=?").bind(detalle.reserva.id)];
    if (detalle.reserva.estado !== 'BORRADOR') {
      const titular = await this.pasajero(detalle.reserva.clienteTitularId);
      // El crédito se libera menos la penalidad de la tarifa, que queda registrada.
      if (titular && titular.tipoCliente !== 'INDIVIDUAL') q.push(this.db.prepare('UPDATE pasajeros SET credito_utilizado=MAX(0,credito_utilizado-?) WHERE id=?')
        .bind(Math.max(0,detalle.reserva.totalCentavos-penalidadCentavos),titular.id));
    }
    const reembolso = detalle.reserva.estado==='BOLETO_EMITIDO'
      ? Math.max(0,detalle.pagosCentavos-penalidadCentavos) : 0;
    q.push(this.db.prepare('INSERT INTO cancelaciones_boleto (id,reserva_id,penalidad,reembolso_simulado,fecha) VALUES (?,?,?,?,?)')
      .bind(crypto.randomUUID(),detalle.reserva.id,penalidadCentavos,reembolso,new Date().toISOString()));
    await this.db.batch(q);
  }
  async asientosOcupados(v: string) { return (await this.db.prepare('SELECT asiento FROM checkins WHERE vuelo_id=?').bind(v).all<{asiento:string}>()).results.map(x=>x.asiento); }
  async registrarCheckin(r: string,p: string,v: string,equipajes: number,asiento:string) { await this.db.prepare('INSERT INTO checkins (id,reserva_id,pasajero_id,vuelo_id,equipajes,asiento,abordado,creado_en) VALUES (?,?,?,?,?,?,0,?)').bind(crypto.randomUUID(),r,p,v,equipajes,asiento,new Date().toISOString()).run(); }
  async consultarCheckin(r:string,p:string,v:string) {
    const x=await this.db.prepare('SELECT abordado FROM checkins WHERE reserva_id=? AND pasajero_id=? AND vuelo_id=?').bind(r,p,v).first<{abordado:number}>();
    return x ? {abordado:!!x.abordado} : null;
  }
  async registrarAbordaje(r:string,p:string,v:string) { await this.db.prepare('UPDATE checkins SET abordado=1 WHERE reserva_id=? AND pasajero_id=? AND vuelo_id=?').bind(r,p,v).run(); }
  async estadoCheckins(r: string) {
    const esperado = await this.db.prepare('SELECT (SELECT COUNT(*) FROM reserva_pasajeros WHERE reserva_id=?) * (SELECT COUNT(*) FROM reserva_tramos WHERE reserva_id=?) AS n').bind(r,r).first<{n:number}>();
    const filas = await this.db.prepare('SELECT COUNT(*) AS n,COALESCE(SUM(abordado),0) AS a FROM checkins WHERE reserva_id=?').bind(r).first<{n:number;a:number}>();
    return { esperados: esperado?.n ?? 0, realizados: filas?.n ?? 0, abordados: filas?.a ?? 0 };
  }
  async actualizarEstadoReserva(r:string,e:string) { await this.db.prepare('UPDATE reservas SET estado=? WHERE id=?').bind(e,r).run(); }
  async cambiarVuelo(v:Vuelo,c:{salida?:string;puerta?:string;estado?:string},mensaje:string) {
    await this.db.batch([
      this.db.prepare('UPDATE vuelos SET salida=?,puerta=?,estado=? WHERE id=?').bind(c.salida ?? v.salida,c.puerta ?? v.puerta,c.estado ?? v.estado,v.id),
      this.db.prepare(`INSERT INTO notificaciones (id,pasajero_id,vuelo_id,texto,creada_en)
          SELECT lower(hex(randomblob(16))),rp.pasajero_id,?, ?, ? FROM reserva_tramos rt
          JOIN reservas r ON r.id=rt.reserva_id JOIN reserva_pasajeros rp ON rp.reserva_id=r.id
          WHERE rt.vuelo_id=? AND r.estado IN ('CONFIRMADA','BOLETO_EMITIDO','CHECKIN_REALIZADO','ABORDADO')`)
        .bind(v.id,mensaje,new Date().toISOString(),v.id)
    ]);
    const row = await this.db.prepare('SELECT COUNT(*) AS n FROM notificaciones WHERE vuelo_id=? AND texto=?').bind(v.id,mensaje).first<{n:number}>();
    return row?.n ?? 0;
  }
  async manifiesto(vueloId:string) {
    return (await this.db.prepare(`SELECT r.id AS reservaId,p.nombre AS pasajero,p.documento,rt.clase,
      c.asiento,COALESCE(c.equipajes,0) AS equipajes,
      CASE WHEN c.abordado=1 THEN 'ABORDADO' WHEN c.id IS NOT NULL THEN 'CHECKIN_REALIZADO' ELSE 'PENDIENTE' END AS estado
      FROM reserva_tramos rt JOIN reservas r ON r.id=rt.reserva_id
      JOIN reserva_pasajeros rp ON rp.reserva_id=r.id
      JOIN pasajeros p ON p.id=rp.pasajero_id
      LEFT JOIN checkins c ON c.reserva_id=r.id AND c.pasajero_id=p.id AND c.vuelo_id=rt.vuelo_id
      WHERE rt.vuelo_id=? AND r.estado IN ('CONFIRMADA','BOLETO_EMITIDO','CHECKIN_REALIZADO','ABORDADO')
      ORDER BY p.nombre`).bind(vueloId).all<{reservaId:string;pasajero:string;documento:string;clase:string;asiento:string|null;equipajes:number;estado:string}>()).results;
  }
  async notificaciones(id:string) { return (await this.db.prepare('SELECT id,texto,creada_en AS creadaEn FROM notificaciones WHERE pasajero_id=? ORDER BY creada_en DESC LIMIT 30').bind(id).all<{id:string;texto:string;creadaEn:string}>()).results; }
}
