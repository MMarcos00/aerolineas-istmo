/** Adaptador de entrada HTTP. Nunca decide tarifas, cupos o reglas RN-01...RN-08. */
import { AerolineaService } from './application/AerolineaService';
import { D1Repositorio, BaseDeDatosD1 } from './infrastructure/D1Repositorio';
import { ErrorDominio } from './domain/model';

interface Env { DB: BaseDeDatosD1; }
function json(dato: unknown, status=200) { return new Response(JSON.stringify(dato),{status,headers:{'content-type':'application/json; charset=utf-8'}}); }
async function body(request:Request):Promise<Record<string,any>> {try {const x=await request.json();if(!x||typeof x!=='object'||Array.isArray(x))throw new Error();return x as Record<string,any>;}catch{throw new ErrorDominio('Cuerpo JSON inválido.');}}

export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    const origin=request.headers.get('Origin') || '';
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods':'GET,POST,DELETE,OPTIONS', 'access-control-allow-headers':'content-type' };
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    try {
      const url=new URL(request.url), p=url.pathname.replace(/\/+$/,'')||'/', m=request.method;
      const service=new AerolineaService(new D1Repositorio(env.DB));
      let respuesta:Response;
      if(m==='GET'&&p==='/health') respuesta=json({ok:true,sistema:'Aerolíneas del Istmo',modo:'DEMOSTRACION'});
      else if(m==='GET'&&p==='/agentes') respuesta=json(await service.agentes());
      else if(m==='GET'&&p==='/pasajeros') respuesta=json(await service.pasajeros());
      else if(m==='POST'&&p==='/pasajeros') respuesta=json(await service.registrarPasajero((await body(request)) as any),201);
      else if(m==='GET'&&p==='/vuelos') respuesta=json(await service.vuelos(url.searchParams.get('origen')||undefined,url.searchParams.get('destino')||undefined,url.searchParams.get('fecha')||undefined));
      else if(m==='GET'&&p==='/reservas') respuesta=json(await service.reservas(url.searchParams.get('pasajeroId')||undefined,url.searchParams.get('agenteId')||undefined));
      else if(m==='POST'&&p==='/reservas') { const d=await body(request);respuesta=json(await service.crearReserva(d.agenteId,d.titularId),201); }
      else if(m==='GET'&&p==='/notificaciones') respuesta=json(await service.notificaciones(url.searchParams.get('pasajeroId')||''));
      else {
        const parts=p.split('/').filter(Boolean), id=parts[1];
        if(parts[0]==='reservas'&&id) {
          if(m==='GET'&&parts.length===2) respuesta=json(await service.detalle(id));
          else if(m==='POST'&&parts[2]==='pasajeros'&&parts.length===3) respuesta=json(await service.agregarPasajero(id,(await body(request)).pasajeroId));
          else if(m==='DELETE'&&parts[2]==='pasajeros'&&parts[3]) respuesta=json(await service.quitarPasajero(id,parts[3]));
          else if(m==='POST'&&parts[2]==='tramos'&&parts.length===3) {const d=await body(request);respuesta=json(await service.agregarTramo(id,d.vueloId,d.clase));}
          else if(m==='DELETE'&&parts[2]==='tramos'&&parts[3]) respuesta=json(await service.quitarTramo(id,parts[3]));
          else if(m==='GET'&&parts[2]==='cotizacion') respuesta=json(await service.cotizar(id,Number(url.searchParams.get('equipajes')||0)));
          else if(m==='POST'&&parts[2]==='confirmar') respuesta=json(await service.confirmar(id,Number((await body(request)).equipajes||0)));
          else if(m==='POST'&&parts[2]==='pagar') respuesta=json(await service.pagar(id));
          else if(m==='POST'&&parts[2]==='emitir') respuesta=json(await service.emitir(id));
          else if(m==='GET'&&parts[2]==='cotizar-cambio') respuesta=json(await service.cotizarCambio(id,
            url.searchParams.get('vueloAnteriorId')||'',url.searchParams.get('vueloNuevoId')||'',
            url.searchParams.get('claseNueva') as any));
          else if(m==='POST'&&parts[2]==='cambiar-boleto') { const d=await body(request);
            respuesta=json(await service.cambiarBoleto(id,d.vueloAnteriorId,d.vueloNuevoId,d.claseNueva)); }
          else if(m==='POST'&&parts[2]==='cancelar') respuesta=json(await service.cancelar(id));
          else if(m==='POST'&&parts[2]==='checkin') {const d=await body(request);respuesta=json(await service.checkin(id,d.pasajeroId,d.vueloId,Number(d.equipajes||0)));}
          else if(m==='POST'&&parts[2]==='abordar') {const d=await body(request);respuesta=json(await service.abordar(id,d.pasajeroId,d.vueloId));}
          else respuesta=json({error:'Ruta no encontrada'},404);
        } else if(m==='GET'&&parts[0]==='vuelos'&&id&&parts[2]==='manifiesto') respuesta=json(await service.manifiesto(id));
        else if(m==='POST'&&parts[0]==='vuelos'&&id&&parts[2]==='cambiar') respuesta=json(await service.cambiarVuelo(id,await body(request)));
        else respuesta=json({error:'Ruta no encontrada'},404);
      }
      const headers=new Headers(respuesta.headers);Object.entries(cors).forEach(([k,v])=>headers.set(k,v));
      headers.set('x-demo','sin autenticacion; NO usar con datos reales');
      return new Response(respuesta.body,{status:respuesta.status,headers});
    }catch(err) {
      const msg=err instanceof Error?err.message:'Error inesperado';
      const status=err instanceof ErrorDominio?400: /UNIQUE constraint failed|FOREIGN KEY constraint failed/i.test(msg)?409:500;
      return new Response(JSON.stringify({error:status===500?'Error interno. Revise los registros de Cloudflare.':msg}),{status,headers:{'content-type':'application/json; charset=utf-8',...cors}});
    }
  }
};
