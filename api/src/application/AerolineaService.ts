/** Casos de uso. Dependen de PUERTOS y del DOMINIO, nunca de Cloudflare ni SQL. */
import { ErrorDominio, Pasajero, Reserva, TipoCliente, ClaseTarifa, DetalleReserva } from '../domain/model';
import { PoliticaDeReservas as Regla } from '../domain/policies';
import type { PuertoRepositorioAerolinea as Repositorio } from './ports';

export class AerolineaService {
  constructor(private readonly repo: Repositorio) {}
  agentes() { return this.repo.agentes(); }
  pasajeros() { return this.repo.pasajeros(); }
  vuelos(origen?:string,destino?:string,fecha?:string) { return this.repo.vuelos({origen,destino,fecha}); }
  reservas(pasajeroId?:string,agenteId?:string) { return this.repo.reservas({pasajeroId,agenteId}); }
  detalle(id:string) { return this.requerirReserva(id); }
  notificaciones(pasajeroId:string) { return this.repo.notificaciones(pasajeroId); }

  async registrarPasajero(i: {nombre:string;documento:string;documentoVence:string;nivelFrecuente:string;tipoCliente:TipoCliente;limiteCredito:number}) {
    if (!i.nombre?.trim() || !i.documento?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(i.documentoVence)) throw new ErrorDominio('Nombre, documento y fecha de vencimiento son obligatorios.');
    if (!(['INDIVIDUAL','AGENCIA','CORPORATIVO'] as TipoCliente[]).includes(i.tipoCliente)) throw new ErrorDominio('Tipo de cliente no válido.');
    const credito = i.tipoCliente === 'INDIVIDUAL' ? 0 : Math.round(Number(i.limiteCredito ?? 0)*100);
    if (!Number.isFinite(credito) || credito < 0) throw new ErrorDominio('Crédito inválido.');
    const p: Pasajero = { id:crypto.randomUUID(),nombre:i.nombre.trim(),documento:i.documento.trim(),documentoVence:i.documentoVence,nivelFrecuente:i.nivelFrecuente || 'BASICO',tipoCliente:i.tipoCliente,limiteCreditoCentavos:credito,creditoUtilizadoCentavos:0 };
    await this.repo.registrarPasajero(p);
    return p;
  }
  async crearReserva(agenteId:string,titularId:string) {
    if (!agenteId || !titularId) throw new ErrorDominio('Seleccione agente y titular.');
    const titular = await this.requerirPasajero(titularId);
    const agentes = await this.repo.agentes();
    if (!agentes.some(a => a.id===agenteId)) throw new ErrorDominio('El agente no existe.');
    const r: Reserva = { id:crypto.randomUUID(),agenteId,clienteTitularId:titular.id,estado:'BORRADOR',equipajes:0,totalCentavos:0,creadaEn:new Date().toISOString(),confirmadaEn:null };
    await this.repo.crearReserva(r);
    if (titular.tipoCliente === 'INDIVIDUAL') await this.repo.agregarPasajero(r.id,titular.id);
    return this.requerirReserva(r.id);
  }
  async agregarPasajero(id:string,pasajeroId:string) {
    const d=await this.requerirReserva(id); Regla.validarEdicion(d.reserva.estado);
    await this.requerirPasajero(pasajeroId);
    if (d.pasajeros.some(p=>p.id===pasajeroId)) throw new ErrorDominio('El pasajero ya está en la reserva.');
    if (d.pasajeros.length >= 100) throw new ErrorDominio('Se alcanzó el máximo de la demostración.');
    await this.repo.agregarPasajero(id,pasajeroId); return this.requerirReserva(id);
  }
  async quitarPasajero(id:string,pasajeroId:string) {
    const d=await this.requerirReserva(id); Regla.validarEdicion(d.reserva.estado);
    if (!d.pasajeros.some(p=>p.id===pasajeroId)) throw new ErrorDominio('El pasajero no está en esta reserva.');
    await this.repo.quitarPasajero(id,pasajeroId); return this.requerirReserva(id);
  }
  async agregarTramo(id:string,vueloId:string,clase:ClaseTarifa) {
    const d=await this.requerirReserva(id); Regla.validarEdicion(d.reserva.estado);
    const vuelo=await this.requerirVuelo(vueloId);
    if (vuelo.estado!=='PROGRAMADO' || new Date(vuelo.salida)<=new Date()) throw new ErrorDominio('El vuelo debe estar programado para una fecha futura.');
    if (clase!=='ECONOMICA' && clase!=='EJECUTIVA') throw new ErrorDominio('Clase inválida.');
    if (d.tramos.some(t=>t.vuelo.id===vueloId)) throw new ErrorDominio('El vuelo ya está en la reserva.');
    await this.repo.agregarTramo(id,vueloId,clase); return this.requerirReserva(id);
  }
  async quitarTramo(id:string,vueloId:string) {
    const d=await this.requerirReserva(id); Regla.validarEdicion(d.reserva.estado);
    await this.repo.quitarTramo(id,vueloId); return this.requerirReserva(id);
  }
  async cotizar(id:string,equipajes=0) {
    const d=await this.requerirReserva(id); const titular=await this.requerirPasajero(d.reserva.clienteTitularId);
    Regla.validarCantidad(titular.tipoCliente,d.pasajeros.length);
    if (d.tramos.length===0) throw new ErrorDominio('Agregue al menos un tramo de vuelo.');
    return Regla.cotizar(d.tramos,d.pasajeros.length,equipajes);
  }
  async confirmar(id:string,equipajes:number) {
    const d=await this.requerirReserva(id);
    if (d.reserva.estado!=='BORRADOR') throw new ErrorDominio('Solo se confirman reservas en Borrador.');
    const titular=await this.requerirPasajero(d.reserva.clienteTitularId);
    const precio=await this.cotizar(id,equipajes);
    Regla.validarCredito(titular,precio.totalCentavos);
    for (const t of d.tramos) {
      if (new Date(t.vuelo.salida)<=new Date()) throw new ErrorDominio('No se puede confirmar un vuelo que ya salió.');
      const vendidos=await this.repo.ocupados(t.vuelo.id,t.clase);
      Regla.validarCapacidad(t.vuelo,t.clase,vendidos,d.pasajeros.length);
    }
    await this.repo.confirmar(d.reserva,precio.totalCentavos,equipajes,titular);
    return { detalle:await this.requerirReserva(id),precio };
  }
  async pagar(id:string) { // Demostración: pago registrado sin cobrar dinero real.
    const d=await this.requerirReserva(id);
    if (d.reserva.estado!=='CONFIRMADA') throw new ErrorDominio('Primero confirme la reserva.');
    const titular=await this.requerirPasajero(d.reserva.clienteTitularId);
    if (titular.tipoCliente!=='INDIVIDUAL') throw new ErrorDominio('Los convenios de agencia y empresa utilizan crédito.');
    const falta=d.reserva.totalCentavos-d.pagosCentavos;
    if (falta<=0) throw new ErrorDominio('La reserva ya está pagada.');
    await this.repo.registrarPago(id,falta);
    return { mensaje:'Pago SIMULADO registrado (no se procesó dinero real)',montoCentavos:falta };
  }
  async emitir(id:string) {
    const d=await this.requerirReserva(id);
    if (d.reserva.estado!=='CONFIRMADA') throw new ErrorDominio('La reserva debe estar Confirmada para emitir boletos.');
    const titular=await this.requerirPasajero(d.reserva.clienteTitularId);
    Regla.validarPagoIndividual(titular,d.reserva.totalCentavos,d.pagosCentavos);
    // Actualizar tarifas desde el catálogo: el boleto conserva la tarifa vigente al emitir (RN-08).
    for (const t of d.tramos) t.vuelo = await this.requerirVuelo(t.vuelo.id);
    const instantaneas=Regla.prepararBoletos(d,()=>crypto.randomUUID(),new Date().toISOString());
    await this.repo.emitir(id,instantaneas);
    return this.requerirReserva(id);
  }
  async cancelar(id:string) {
    const d=await this.requerirReserva(id);
    Regla.validarCancelacion(d.reserva.estado,d.tramos.map(t=>t.vuelo.salida));
    await this.repo.cancelar(d);
    return this.requerirReserva(id);
  }
  async checkin(id:string,pasajeroId:string,vueloId:string,equipajes:number) {
    const d=await this.requerirReserva(id);
    if (!(['BOLETO_EMITIDO','CHECKIN_REALIZADO'] as string[]).includes(d.reserva.estado)) throw new ErrorDominio('Se requiere boleto emitido para hacer check-in.');
    const p=d.pasajeros.find(x=>x.id===pasajeroId); const t=d.tramos.find(x=>x.vuelo.id===vueloId);
    if (!p || !t) throw new ErrorDominio('El pasajero y el vuelo deben pertenecer a la reserva.');
    if (t.vuelo.estado !== 'PROGRAMADO') throw new ErrorDominio('El vuelo está cancelado.');
    if (!Number.isInteger(equipajes)||equipajes<0) throw new ErrorDominio('Equipajes inválidos.');
    Regla.validarDocumentoInternacional(p,t.vuelo);
    if (await this.repo.consultarCheckin(id,pasajeroId,vueloId)) throw new ErrorDominio('El pasajero ya realizó check-in para este vuelo.');
    const usados=new Set(await this.repo.asientosOcupados(vueloId));
    const plazas=t.vuelo.capacidadEconomica+t.vuelo.capacidadEjecutiva;
    let asiento='';
    for (let i=0;i<plazas;i++) { const s=`${Math.floor(i/6)+1}${'ABCDEF'[i%6]}`; if (!usados.has(s)){asiento=s;break;} }
    if (!asiento) throw new ErrorDominio('No existe asiento físico disponible para asignar en check-in.');
    await this.repo.registrarCheckin(id,pasajeroId,vueloId,equipajes,asiento);
    const estado=await this.repo.estadoCheckins(id);
    if (estado.esperados>0 && estado.realizados===estado.esperados) await this.repo.actualizarEstadoReserva(id,'CHECKIN_REALIZADO');
    return { asiento,detalle:await this.requerirReserva(id) };
  }
  async abordar(id:string,pasajeroId:string,vueloId:string) {
    const d=await this.requerirReserva(id);
    if (!(['BOLETO_EMITIDO','CHECKIN_REALIZADO'] as string[]).includes(d.reserva.estado)) throw new ErrorDominio('La reserva no permite abordar.');
    if (!d.pasajeros.some(p=>p.id===pasajeroId)||!d.tramos.some(t=>t.vuelo.id===vueloId)) throw new ErrorDominio('Pasajero/vuelo no incluido.');
    const checkin=await this.repo.consultarCheckin(id,pasajeroId,vueloId);
    if (!checkin) throw new ErrorDominio('El pasajero debe realizar check-in antes del abordaje.');
    if (checkin.abordado) throw new ErrorDominio('El pasajero ya abordó este vuelo.');
    await this.repo.registrarAbordaje(id,pasajeroId,vueloId);
    const e=await this.repo.estadoCheckins(id);
    if (e.esperados>0 && e.abordados===e.esperados) await this.repo.actualizarEstadoReserva(id,'ABORDADO');
    return this.requerirReserva(id);
  }
  async cambiarVuelo(id:string,cambios:{salida?:string;puerta?:string;estado?:string}) {
    const v=await this.requerirVuelo(id);
    if (cambios.estado && !['PROGRAMADO','CANCELADO'].includes(cambios.estado)) throw new ErrorDominio('Estado de vuelo inválido.');
    if (cambios.salida && Number.isNaN(Date.parse(cambios.salida))) throw new ErrorDominio('Fecha/hora inválida.');
    if (cambios.puerta && cambios.puerta.length>20) throw new ErrorDominio('Puerta inválida.');
    const partes:string[]=[];
    if (cambios.salida && cambios.salida!==v.salida) partes.push(`nuevo horario ${cambios.salida}`);
    if (cambios.puerta && cambios.puerta!==v.puerta) partes.push(`nueva puerta ${cambios.puerta}`);
    if (cambios.estado==='CANCELADO') partes.push('vuelo CANCELADO');
    if (!partes.length) throw new ErrorDominio('No hay ningún cambio de horario, puerta o cancelación.');
    const texto=`Vuelo ${v.codigo}: ${partes.join(', ')}.`;
    const enviados=await this.repo.cambiarVuelo(v,cambios,texto);
    return { texto,notificacionesGeneradas:enviados };
  }
  private async requerirReserva(id:string):Promise<DetalleReserva> { const d=await this.repo.reserva(id); if(!d) throw new ErrorDominio('La reserva no existe.');return d; }
  private async requerirPasajero(id:string):Promise<Pasajero> {const p=await this.repo.pasajero(id);if(!p)throw new ErrorDominio('El pasajero no existe.');return p;}
  private async requerirVuelo(id:string) {const v=await this.repo.vuelo(id);if(!v)throw new ErrorDominio('El vuelo no existe.');return v;}
}
