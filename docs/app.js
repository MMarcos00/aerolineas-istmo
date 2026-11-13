import { ApiClient } from './api-client.js';

const money = cents => new Intl.NumberFormat('es-GT',{style:'currency',currency:'GTQ'}).format((Number(cents)||0)/100);
const fecha = str => str ? new Date(str).toLocaleString('es-GT',{timeZone:'America/Guatemala',dateStyle:'medium',timeStyle:'short'}) : '—';
const esc = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tag = x => `<span class="tag ${x==='CONFIRMADA'||x==='PROGRAMADO'||x==='ABORDADO'?'ok':x==='CANCELADA'||x==='CANCELADO'?'bad':x==='BORRADOR'?'warn':'blue'}">${esc(x).replaceAll('_',' ')}</span>`;
const selectOptions = (items,value,text,placeholder='Seleccione...') => `<option value="">${placeholder}</option>${items.map(x=>`<option value="${esc(value(x))}">${esc(text(x))}</option>`).join('')}`;
const empty = msg => `<div class="empty">${esc(msg)}</div>`;
const f = (name,label,inner,cls='') => `<div class="field ${cls}"><label for="${esc(name)}">${esc(label)}</label>${inner}</div>`;

class AppController {
  constructor(){
    this.api=new ApiClient(window.API_URL);
    this.page='inicio';this.selected='';this.quote=null;this.changeQuote=null;this.flightFilter={};this.historyFilter={};this.historyRows=null;this.noticePassenger='';
    this.data={pasajeros:[],vuelos:[],agentes:[],reservas:[]};
    this.root=document.getElementById('main');
    document.body.addEventListener('click',e=>this.handleClick(e));
    document.body.addEventListener('submit',e=>this.handleSubmit(e));
    document.getElementById('mobile-menu').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
    this.load();
  }
  async load(){
    try{
      const health=await this.api.get('/health');
      document.getElementById('api-status').textContent=health.ok?'● API CONECTADA':'SIN SERVICIO';
      document.getElementById('api-status').classList.remove('offline');
      await this.refresh();
    }catch(e){document.getElementById('api-status').textContent='● API SIN CONEXIÓN';document.getElementById('api-status').classList.add('offline');this.root.innerHTML=`<section class="panel"><h2>No se pudo conectar con el servidor</h2><p class="hint">${esc(e.message)}</p><div class="notice">Primero inicia Cloudflare Workers con <code>cd api</code> y <code>npm run dev</code>. Cuando publiques en GitHub Pages, modifica <code>docs/config.js</code> con la dirección pública de tu Worker.</div><button class="btn" data-action="retry">Reintentar</button></section>`;}
  }
  async refresh(){
    const [pasajeros,vuelos,agentes,reservas]=await Promise.all([
      this.api.get('/pasajeros'),this.api.get('/vuelos'),this.api.get('/agentes'),this.api.get('/reservas')]);
    this.data={pasajeros,vuelos,agentes,reservas};
    this.render();
  }
  toast(message,error=false){const el=document.getElementById('toast');el.textContent=message;el.className=`toast show ${error?'error':'success'}`;clearTimeout(this.toastTimeout);this.toastTimeout=setTimeout(()=>el.className='toast',4800);}
  async tryAction(fn){try{const msg=await fn();if(msg!==false)this.toast(typeof msg==='string'?msg:'Operación realizada correctamente.');}catch(e){this.toast(e.message,true);}}
  setPage(p){this.page=p;this.quote=null;document.querySelector('.sidebar').classList.remove('open');this.render();}
  render(){
    const titles={inicio:'Panel general',pasajeros:'Pasajeros y clientes',vuelos:'Gestión de vuelos',reservas:'Reservas y boletos',aeropuerto:'Operaciones de aeropuerto',notificaciones:'Centro de notificaciones'};
    document.getElementById('page-title').textContent=titles[this.page];
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===this.page));
    this.root.innerHTML=this[`render_${this.page}`]();
  }
  render_inicio(){
    const d=this.data;
    const recientes=d.reservas.slice(0,5).map(r=>`<tr><td><strong>${esc(r.id.slice(0,8))}</strong></td><td>${esc(r.pasajeroTitular)}</td><td>${tag(r.estado)}</td><td>${money(r.totalCentavos)}</td><td><button class="btn small secondary" data-action="openBooking" data-id="${esc(r.id)}">Abrir</button></td></tr>`).join('');
    return `<div class="hero"><div><span class="hero-tag">SISTEMA OPERATIVO · VERSIÓN ACADÉMICA</span><h2>Conectamos destinos.<br>Gestionamos experiencias.</h2><p>Plataforma demostrativa para administrar pasajeros, consultar vuelos, reservar, emitir boletos y gestionar el abordaje.</p><button class="btn success" data-page="reservas">+ Nueva reserva</button></div><div class="big-plane">✈</div></div>
    <div class="grid"><div class="stat-card"><small>Pasajeros registrados</small><b>${d.pasajeros.length}</b><span>Clientes y viajeros de prueba</span></div><div class="stat-card"><small>Vuelos en catálogo</small><b>${d.vuelos.length}</b><span>Destinos regionales</span></div><div class="stat-card"><small>Reservas registradas</small><b>${d.reservas.length}</b><span>En distintas etapas</span></div></div>
    <h3 class="section-title">Actividad reciente</h3><section class="panel"><div class="panel-head"><h2>Últimas reservas</h2><button class="btn small secondary" data-page="reservas">Ver todas</button></div><div class="table-wrap"><table><thead><tr><th>Referencia</th><th>Titular</th><th>Estado</th><th>Total</th><th></th></tr></thead><tbody>${recientes||`<tr><td colspan="5">${empty('Crea tu primera reserva para comenzar.')}</td></tr>`}</tbody></table></div></section>
    <div class="notice">Los 90 agentes, pasajeros y vuelos de ejemplo son ficticios. El sistema no procesa pagos reales ni envía WhatsApp, correo electrónico o SMS.</div>`;
  }
  render_pasajeros(){
    const listado=this.data.pasajeros.map(p=>`<tr><td><strong>${esc(p.nombre)}</strong><br><small>${esc(p.documento)}</small></td><td>${tag(p.tipoCliente)}</td><td>${esc(p.nivelFrecuente)}</td><td>${esc(p.documentoVence)}</td><td>${money(p.limiteCreditoCentavos)}</td><td>${money(p.limiteCreditoCentavos-p.creditoUtilizadoCentavos)}</td></tr>`).join('');
    return `<section class="panel"><h2>Registrar pasajero o cliente</h2><p class="hint">RF-01 · El titular puede ser individual, agencia o cliente corporativo.</p>
      <form id="form-passenger"><div class="fields">
      ${f('nombre','Nombre completo / razón social','<input id="nombre" name="nombre" required maxlength="120" placeholder="Ej. María Gómez">')}
      ${f('documento','Documento de viaje','<input id="documento" name="documento" required maxlength="50" placeholder="Ej. P123456">')}
      ${f('documentoVence','Vencimiento del documento','<input id="documentoVence" name="documentoVence" type="date" required>')}
      ${f('tipoCliente','Tipo de cliente','<select id="tipoCliente" name="tipoCliente"><option value="INDIVIDUAL">Individual</option><option value="AGENCIA">Agencia</option><option value="CORPORATIVO">Corporativo</option></select>')}
      ${f('nivelFrecuente','Viajero frecuente','<select id="nivelFrecuente" name="nivelFrecuente"><option>BASICO</option><option>PLATA</option><option>ORO</option><option>PLATINO</option></select>')}
      ${f('limiteCredito','Límite de crédito (Q)','<input id="limiteCredito" name="limiteCredito" type="number" min="0" step="0.01" value="0">')}
      </div><div class="actions"><button class="btn" type="submit">Registrar pasajero</button></div></form></section>
      <section class="panel"><div class="panel-head"><h2>Pasajeros y clientes (${this.data.pasajeros.length})</h2></div><div class="table-wrap"><table><thead><tr><th>Nombre / documento</th><th>Tipo</th><th>Nivel</th><th>Vence</th><th>Crédito máximo</th><th>Crédito disponible</th></tr></thead><tbody>${listado||`<tr><td colspan="6">${empty('No hay pasajeros registrados.')}</td></tr>`}</tbody></table></div></section>`;
  }
  render_vuelos(){
    const vuelos=this.data.vuelos.filter(v=>!this.flightFilter.origen||v.origen.toLowerCase().includes(this.flightFilter.origen.toLowerCase())).filter(v=>!this.flightFilter.destino||v.destino.toLowerCase().includes(this.flightFilter.destino.toLowerCase())).filter(v=>!this.flightFilter.fecha||v.salida.startsWith(this.flightFilter.fecha));
    const filas=vuelos.map(v=>`<tr><td><strong>${esc(v.codigo)}</strong><br><small>${esc(v.id)}</small></td><td>${esc(v.origen)}<br><small>→ ${esc(v.destino)}</small></td><td>${fecha(v.salida)}</td><td>${tag(v.estado)}</td><td>${v.libresEconomica} / ${v.libresEjecutiva}</td><td>${money(v.precioEconomicaCentavos)} / ${money(v.precioEjecutivaCentavos)}</td><td>${esc(v.puerta)}</td></tr>`).join('');
    return `<section class="panel"><h2>Buscar vuelos disponibles</h2><p class="hint">RF-02 · Precios por clase y asientos disponibles: económica / ejecutiva.</p><form id="form-flight-filter"><div class="fields">
    ${f('filter-origin','Origen',`<input id="filter-origin" name="origen" placeholder="Ciudad de Guatemala" value="${esc(this.flightFilter.origen||'')}">`)}
    ${f('filter-destination','Destino',`<input id="filter-destination" name="destino" placeholder="San José" value="${esc(this.flightFilter.destino||'')}">`)}
    ${f('filter-date','Fecha de vuelo',`<input id="filter-date" name="fecha" type="date" value="${esc(this.flightFilter.fecha||'')}">`)}
    </div><div class="actions"><button class="btn">Buscar vuelos</button><button class="btn secondary" type="button" data-action="clearFlightFilter">Limpiar</button></div></form></section>
    <section class="panel"><h2>Catálogo de vuelos (${vuelos.length})</h2><div class="table-wrap"><table><thead><tr><th>Código</th><th>Ruta</th><th>Salida (GT)</th><th>Estado</th><th>Libres E / EJ</th><th>Tarifas E / EJ</th><th>Puerta</th></tr></thead><tbody>${filas||`<tr><td colspan="7">${empty('No se encontraron vuelos.')}</td></tr>`}</tbody></table></div></section>
    <section class="panel"><h2>Avisos por cambios de vuelo</h2><p class="hint">RF-08 · Modifica el horario, la puerta o cancela un vuelo. Genera notificaciones internas para los pasajeros afectados.</p><form id="form-change-flight"><div class="fields">
    ${f('change-flight','Vuelo',`<select name="vueloId" id="change-flight" required>${selectOptions(this.data.vuelos,x=>x.id,x=>x.codigo+' · '+x.origen+' → '+x.destino)}</select>`)}
    ${f('change-gate','Nueva puerta (opcional)','<input name="puerta" id="change-gate" placeholder="Ej. D7" maxlength="20">')}
    ${f('change-date','Nuevo horario UTC (opcional)','<input name="salida" id="change-date" type="datetime-local">')}
    ${f('change-state','Estado','<select name="estado" id="change-state"><option value="">Sin modificar</option><option value="CANCELADO">Cancelar vuelo</option></select>')}
    </div><div class="actions"><button class="btn" type="submit">Guardar cambio y notificar</button></div></form></section>`;
  }
  render_reservas(){
    const hist=this.historyRows ?? this.data.reservas;
    const lista=hist.map(r=>`<tr><td><strong>${esc(r.id.slice(0,8))}</strong><br><small>${fecha(r.creadaEn)}</small></td><td>${esc(r.pasajeroTitular)}</td><td>${esc(r.agenteId)}</td><td>${r.pasajeros}</td><td>${tag(r.estado)}</td><td>${money(r.totalCentavos)}</td><td><button class="btn small secondary" data-action="openBooking" data-id="${esc(r.id)}">Gestionar</button></td></tr>`).join('');
    return `<section class="panel"><h2>Crear una reserva</h2><p class="hint">RF-03 · Selecciona al agente de ventas y al titular que asumirá el pago o crédito.</p><form id="form-booking-create"><div class="fields two">
    ${f('new-agent','Agente de ventas',`<select name="agenteId" id="new-agent" required>${selectOptions(this.data.agentes,a=>a.id,a=>a.id+' · '+a.nombre)}</select>`)}
    ${f('new-holder','Titular de la reserva',`<select name="titularId" id="new-holder" required>${selectOptions(this.data.pasajeros,p=>p.id,p=>p.nombre+' ('+p.tipoCliente+')')}</select>`)}
    </div><div class="actions"><button class="btn" type="submit">+ Crear reserva</button></div></form></section>
    <section class="panel"><div class="panel-head"><h2>Historial de reservas</h2></div><form id="form-history"><div class="fields two">${f('history-agent','Filtrar por agente',`<select id="history-agent" name="agenteId"><option value="">Todos los agentes</option>${this.data.agentes.map(a=>`<option value="${esc(a.id)}" ${a.id===this.historyFilter.agenteId?'selected':''}>${esc(a.id)}</option>`).join('')}</select>`)}${f('history-passenger','Filtrar por pasajero',`<select id="history-passenger" name="pasajeroId"><option value="">Todos los pasajeros</option>${this.data.pasajeros.map(p=>`<option value="${esc(p.id)}" ${p.id===this.historyFilter.pasajeroId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select>`)}</div><div class="actions"><button type="submit" class="btn small">Buscar historial</button><button class="btn small secondary" type="button" data-action="clearHistory">Limpiar filtros</button></div></form><div class="table-wrap top-gap"><table><thead><tr><th>Referencia</th><th>Titular</th><th>Agente</th><th>Pax</th><th>Estado</th><th>Total</th><th></th></tr></thead><tbody>${lista||`<tr><td colspan="7">${empty('Todavía no hay reservas.')}</td></tr>`}</tbody></table></div></section>
    ${this.selected?`<section id="detalle-reserva">${this.renderBookingDetail()}</section>`:''}`;
  }
  renderBookingDetail(){
    const d=this.current;
    if(!d||d.reserva.id!==this.selected) return '<section class="panel">Cargando detalle...</section>';
    const r=d.reserva, draft=r.estado==='BORRADOR', confirmed=r.estado==='CONFIRMADA';
    const passOptions=selectOptions(this.data.pasajeros,p=>p.id,p=>p.nombre+' · '+p.documento);
    const flightOptions=selectOptions(this.data.vuelos.filter(v=>v.estado==='PROGRAMADO'),v=>v.id,v=>v.codigo+' · '+v.origen+' → '+v.destino);
    const members=d.pasajeros.map(p=>`<div class="row-list"><span><strong>${esc(p.nombre)}</strong> <span class="muted">· ${esc(p.documento)}</span></span>${draft?`<button class="btn small danger" data-action="removePassenger" data-id="${esc(p.id)}">Quitar</button>`:''}</div>`).join('');
    const legs=d.tramos.map(t=>`<div class="row-list"><span><strong>${esc(t.vuelo.codigo)}</strong> <span class="muted">· ${esc(t.clase)} · ${fecha(t.vuelo.salida)}</span></span>${draft?`<button class="btn small danger" data-action="removeLeg" data-id="${esc(t.vuelo.id)}">Quitar</button>`:''}</div>`).join('');
    return `<section class="panel"><div class="panel-head"><h2>Reserva ${esc(r.id.slice(0,8))}</h2>${tag(r.estado)}</div><p class="hint wrap">ID completo: ${esc(r.id)} · Agente: ${esc(r.agenteId)} · Creada: ${fecha(r.creadaEn)}</p><div class="grid"><div class="stat-card"><small>Pasajeros</small><b>${d.pasajeros.length}</b><span>${d.pasajeros.length>9?'Reserva de grupo':'Reserva individual / pequeña'}</span></div><div class="stat-card"><small>Tramos</small><b>${d.tramos.length}</b><span>Vuelos seleccionados</span></div><div class="stat-card"><small>Total confirmado</small><b style="font-size:23px">${money(r.totalCentavos)}</b><span>Pago simulado: ${money(d.pagosCentavos)}</span></div></div></section>
    <div class="layout-split"><section class="panel"><h2>Pasajeros de la reserva</h2>${members||empty('Sin pasajeros')}${draft?`<div class="top-gap"><div class="fields">${f('member-select','Agregar pasajero',`<select id="member-select">${passOptions}</select>`,'span2')}</div><div class="actions"><button class="btn small secondary" data-action="addPassenger">+ Agregar pasajero</button></div></div>`:''}</section>
    <section class="panel"><h2>Itinerario y clases</h2>${legs||empty('Sin tramos')}${draft?`<div class="top-gap"><div class="fields two">${f('leg-select','Seleccionar vuelo',`<select id="leg-select">${flightOptions}</select>`)}${f('leg-class','Clase',`<select id="leg-class"><option value="ECONOMICA">Económica</option><option value="EJECUTIVA">Ejecutiva</option></select>`)}</div><div class="actions"><button class="btn small secondary" data-action="addLeg">+ Agregar tramo</button></div></div>`:''}</section></div>
    <section class="panel"><h2>Tarifas, cargos y emisión</h2><p class="hint">RN-01 a RN-05, RN-07 y RN-08 se ejecutan en el backend, no en esta pantalla.</p>
    ${draft?`<div class="fields two">${f('bags-count','Equipajes facturados (total)','<input id="bags-count" type="number" min="0" step="1" value="0">')}</div><div class="actions"><button class="btn secondary" data-action="quote">Calcular tarifa</button><button class="btn success" data-action="confirm">Confirmar y bloquear cupos</button></div>`:''}
    ${this.quote?`<div class="notice">Subtotal: <b>${money(this.quote.subtotalCentavos)}</b> · Descuento: <b>${money(this.quote.descuentoCentavos)} (${this.quote.porcentajeDescuento*100}%)</b> · Equipaje: <b>${money(this.quote.equipajeCentavos)}</b><br>Total: <strong>${money(this.quote.totalCentavos)}</strong></div>`:''}
    ${confirmed?`<div class="actions"><button class="btn secondary" data-action="pay">Registrar pago SIMULADO (individual)</button><button class="btn success" data-action="issue">Emitir boletos</button><button class="btn danger" data-action="cancel">Cancelar reserva</button></div>`:''}
    ${r.estado==='BOLETO_EMITIDO'?`<div class="notice">Boletos emitidos: <b>${d.boletos}</b>. Ya no se permite editar esta reserva. Se puede gestionar check-in o cancelar si faltan al menos 3 horas.</div><div class="actions"><button class="btn" data-page="aeropuerto">Ir a check-in</button><button class="btn danger" data-action="cancel">Cancelar reserva</button></div>`:''}
    ${r.estado==='BOLETO_EMITIDO'&&d.tramos.length?`<div class="subpanel top-gap"><h3>RN-07 · Cambio de boleto con penalidad</h3>
      <p class="hint">Solo cambia el vuelo antes del check-in. La penalidad depende de la tarifa original; el recargo y su pago son simulados.</p>
      <div class="fields two">
        ${f('change-old-leg','Vuelo original',`<select id="change-old-leg">${selectOptions(d.tramos,t=>t.vuelo.id,t=>t.vuelo.codigo+' · '+t.vuelo.destino)}</select>`)}
        ${f('change-new-leg','Nuevo vuelo (misma ruta)',`<select id="change-new-leg">${selectOptions(this.data.vuelos.filter(v=>!d.tramos.some(t=>t.vuelo.id===v.id)&&d.tramos.some(t=>t.vuelo.origen===v.origen&&t.vuelo.destino===v.destino)&&v.estado==='PROGRAMADO'),v=>v.id,v=>v.codigo+' · '+fecha(v.salida))}</select>`)}
        ${f('change-new-class','Nueva clase',`<select id="change-new-class"><option value="ECONOMICA">Económica</option><option value="EJECUTIVA">Ejecutiva</option></select>`)}
      </div>
      <div class="actions"><button class="btn secondary" data-action="quoteChange">Cotizar penalidad</button><button class="btn success" data-action="makeChange">Confirmar cambio SIMULADO</button></div>
      <div id="change-quote-result" class="notice top-gap">${this.changeQuote?'Cotización anterior (selecciona nuevamente antes de confirmar)':'Selecciona vuelos y cotiza antes de cambiar.'}</div>
      </div>`:''}
    ${r.estado==='CHECKIN_REALIZADO'||r.estado==='ABORDADO'?`<div class="notice">Check-ins: ${d.checkins} · Abordajes: ${d.abordajes} · Boletos: ${d.boletos}</div><button class="btn" data-page="aeropuerto">Ir a aeropuerto</button>`:''}
    ${draft?'<div class="actions"><button class="btn danger" data-action="cancel">Cancelar borrador</button></div>':''}
    </section>`;
  }
  render_aeropuerto(){
    const d=this.current&&this.current.reserva.id===this.selected?this.current:null;
    return `<section class="panel"><h2>Check-in y abordaje</h2><p class="hint">RF-05, RF-06 y RN-06 · Para operar, abre primero una reserva con boleto emitido desde «Reservas».</p>${!d?'<div class="notice">No se ha seleccionado una reserva. Visita la sección Reservas y presiona Gestionar.</div>':`<div class="notice">Reserva <b>${esc(d.reserva.id.slice(0,8))}</b> · ${tag(d.reserva.estado)} · Check-ins: ${d.checkins} · Abordados: ${d.abordajes}</div>
    <div class="fields two">${f('airport-member','Pasajero',`<select id="airport-member">${selectOptions(d.pasajeros,p=>p.id,p=>p.nombre)}</select>`)}${f('airport-leg','Vuelo',`<select id="airport-leg">${selectOptions(d.tramos,t=>t.vuelo.id,t=>t.vuelo.codigo+' · '+t.vuelo.destino)}</select>`)}${f('airport-bags','Equipajes recibidos','<input id="airport-bags" type="number" min="0" step="1" value="0">')}</div>
    <div class="actions"><button class="btn success" data-action="checkin">Realizar check-in + asignar asiento</button><button class="btn" data-action="board">Marcar abordaje</button></div><p class="hint top-gap">El asiento se asigna automáticamente. En vuelos internacionales se validan 6 meses de vigencia del documento.</p>`}</section>
    <section class="panel top-gap"><h2>Manifiesto de pasajeros</h2><p class="hint">Listado de pasajeros reservados, asiento asignado, equipaje recibido y estado de abordaje.</p>
    <div class="fields two">${f('manifest-flight','Seleccionar vuelo',`<select id="manifest-flight">${selectOptions(this.data.vuelos,v=>v.id,v=>v.codigo+' · '+v.destino)}</select>`)}</div>
    <div class="actions"><button class="btn secondary" data-action="loadManifest">Consultar manifiesto</button></div>
    <div id="manifest-output" class="top-gap">${empty('Selecciona un vuelo y consulta el manifiesto.')}</div></section>`;
  }
  render_notificaciones(){
    const options=selectOptions(this.data.pasajeros,p=>p.id,p=>p.nombre+' · '+p.documento);
    return `<section class="panel"><h2>Alertas de vuelos</h2><p class="hint">RF-08 · Buzón interno con cambios de horario, puerta y cancelación del vuelo.</p><div class="fields two">${f('notices-person','Consultar pasajero',`<select id="notices-person">${options}</select>`)}</div><div class="actions"><button class="btn" data-action="loadNotifications">Consultar alertas</button></div><div id="notices-output" class="top-gap">${empty('Selecciona un pasajero para consultar alertas.')}</div></section>`;
  }
  async updateBooking(){if(this.selected){this.current=await this.api.get(`/reservas/${encodeURIComponent(this.selected)}`);} await this.refresh();}
  async handleClick(e){
    const btn=e.target.closest('[data-page],[data-action]'); if(!btn)return;
    if(btn.dataset.page){this.setPage(btn.dataset.page);return;}
    const a=btn.dataset.action,id=btn.dataset.id;
    await this.tryAction(async()=>{
      if(a==='retry'){await this.load();return false;}
      if(a==='clearFlightFilter'){this.flightFilter={};this.render();return false;}
      if(a==='clearHistory'){this.historyFilter={};this.historyRows=null;this.render();return false;}
      if(a==='openBooking'){this.selected=id;this.current=await this.api.get(`/reservas/${id}`);this.page='reservas';this.quote=null;this.changeQuote=null;this.render();setTimeout(()=>document.getElementById('detalle-reserva')?.scrollIntoView({behavior:'smooth'}),50);return false;}
      if(a==='addPassenger'){const p=document.getElementById('member-select').value;if(!p)throw new Error('Seleccione un pasajero.');await this.api.post(`/reservas/${this.selected}/pasajeros`,{pasajeroId:p});await this.updateBooking();return;}
      if(a==='removePassenger'){await this.api.delete(`/reservas/${this.selected}/pasajeros/${id}`);await this.updateBooking();return;}
      if(a==='addLeg'){const vueloId=document.getElementById('leg-select').value,clase=document.getElementById('leg-class').value;if(!vueloId)throw new Error('Seleccione un vuelo.');await this.api.post(`/reservas/${this.selected}/tramos`,{vueloId,clase});await this.updateBooking();return;}
      if(a==='removeLeg'){await this.api.delete(`/reservas/${this.selected}/tramos/${id}`);await this.updateBooking();return;}
      if(a==='quote'||a==='confirm'){
        const bags=Number(document.getElementById('bags-count').value);
        if(a==='quote'){this.quote=await this.api.get(`/reservas/${this.selected}/cotizacion?equipajes=${bags}`);this.render();}
        else{await this.api.post(`/reservas/${this.selected}/confirmar`,{equipajes:bags});this.quote=null;await this.updateBooking();}return;
      }
      if(a==='quoteChange'||a==='makeChange'){
        const vueloAnteriorId=document.getElementById('change-old-leg')?.value;
        const vueloNuevoId=document.getElementById('change-new-leg')?.value;
        const claseNueva=document.getElementById('change-new-class')?.value;
        if(!vueloAnteriorId||!vueloNuevoId)throw new Error('Seleccione un vuelo original y uno nuevo de la misma ruta.');
        const params=new URLSearchParams({vueloAnteriorId,vueloNuevoId,claseNueva});
        if(a==='quoteChange'){
          this.changeQuote=await this.api.get(`/reservas/${this.selected}/cotizar-cambio?${params}`);
          // Mostramos el resultado sin recrear los selectores y perder la selección.
          const notice=document.getElementById('change-quote-result');
          const msg=`Penalidad: ${money(this.changeQuote.penalidadCentavos)} · Diferencia: ${money(this.changeQuote.diferenciaTarifariaCentavos)} · Total SIMULADO: ${money(this.changeQuote.recargoTotalCentavos)}`;
          if(notice) notice.textContent=msg; else this.toast(msg);
          return false;
        }
        const actual=await this.api.get(`/reservas/${this.selected}/cotizar-cambio?${params}`);
        if(!confirm(`Cambio ${actual.vueloAnterior} → ${actual.vueloNuevo}\nPenalidad: ${money(actual.penalidadCentavos)}\nDiferencia: ${money(actual.diferenciaTarifariaCentavos)}\nRecargo simulado: ${money(actual.recargoTotalCentavos)}\n\n¿Confirmar? No se procesará dinero real.`))return false;
        const result=await this.api.post(`/reservas/${this.selected}/cambiar-boleto`,{vueloAnteriorId,vueloNuevoId,claseNueva});
        this.changeQuote=null;await this.updateBooking();return result.mensaje;
      }
      if(a==='pay'){const d=await this.api.post(`/reservas/${this.selected}/pagar`);await this.updateBooking();return d.mensaje;}
      if(a==='issue'){await this.api.post(`/reservas/${this.selected}/emitir`);await this.updateBooking();return;}
      if(a==='cancel'){if(!confirm('¿Confirmas cancelar la reserva? Si tiene boleto emitido, se aplicará la penalidad de la tarifa (simulada).'))return false;const res=await this.api.post(`/reservas/${this.selected}/cancelar`);await this.updateBooking();return `Reserva cancelada. Penalidad simulada: ${money(res.penalidadSimuladaCentavos||0)}`;}
      if(a==='checkin'||a==='board'){
        const pasajeroId=document.getElementById('airport-member')?.value,vueloId=document.getElementById('airport-leg')?.value;
        if(!pasajeroId||!vueloId)throw new Error('Seleccione un pasajero y vuelo.');
        const info=await this.api.post(`/reservas/${this.selected}/${a==='checkin'?'checkin':'abordar'}`,{pasajeroId,vueloId,equipajes:Number(document.getElementById('airport-bags').value)});
        this.current=await this.api.get(`/reservas/${this.selected}`);this.render();if(a==='checkin')return `Check-in completo. Asiento asignado: ${info.asiento}`;return;
      }
      if(a==='loadManifest'){
        const id=document.getElementById('manifest-flight')?.value;
        if(!id)throw new Error('Seleccione un vuelo.');
        const lista=await this.api.get(`/vuelos/${id}/manifiesto`);
        const filas=lista.map(x=>`<tr><td>${esc(x.pasajero)}</td><td>${esc(x.clase)}</td><td>${esc(x.asiento||'—')}</td><td>${x.equipajes}</td><td>${tag(x.estado)}</td></tr>`).join('');
        document.getElementById('manifest-output').innerHTML=lista.length?`<div class="table-wrap"><table><thead><tr><th>Pasajero</th><th>Clase</th><th>Asiento</th><th>Equipajes</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table></div>`:empty('No hay pasajeros reservados para este vuelo.');
        return false;
      }
      if(a==='loadNotifications'){
        const p=document.getElementById('notices-person').value;if(!p)throw new Error('Seleccione un pasajero.');
        const data=await this.api.get(`/notificaciones?pasajeroId=${encodeURIComponent(p)}`);
        document.getElementById('notices-output').innerHTML=data.length?data.map(n=>`<div class="notification"><p>${esc(n.texto)}</p><small>${fecha(n.creadaEn)}</small></div>`).join(''):empty('Sin alertas para este pasajero.');return false;
      }
    });
  }
  async handleSubmit(e){
    if(!e.target.matches('#form-passenger,#form-flight-filter,#form-booking-create,#form-change-flight,#form-history'))return;
    e.preventDefault();const form=e.target;const values=Object.fromEntries(new FormData(form));
    await this.tryAction(async()=>{
      if(form.id==='form-passenger'){
        await this.api.post('/pasajeros',{...values,limiteCredito:Number(values.limiteCredito)});
        await this.refresh();return;
      }
      if(form.id==='form-flight-filter'){this.flightFilter=values;this.render();return false;}
      if(form.id==='form-history'){this.historyFilter=values;const params=new URLSearchParams(Object.entries(values).filter(([,v])=>v));this.historyRows=await this.api.get('/reservas'+(params.size?'?'+params:''));this.render();return false;}
      if(form.id==='form-booking-create'){
        const d=await this.api.post('/reservas',values);
        this.selected=d.reserva.id;this.current=d;this.quote=null;this.changeQuote=null;await this.refresh();
        document.getElementById('detalle-reserva')?.scrollIntoView({behavior:'smooth'});return;
      }
      if(form.id==='form-change-flight'){
        if(!values.vueloId)throw new Error('Seleccione un vuelo.');
        const cambio={};if(values.puerta)cambio.puerta=values.puerta;
        if(values.salida)cambio.salida=new Date(values.salida).toISOString();
        if(values.estado)cambio.estado=values.estado;
        const result=await this.api.post(`/vuelos/${values.vueloId}/cambiar`,cambio);
        await this.refresh();return `${result.texto} Notificaciones: ${result.notificacionesGeneradas}`;
      }
    });
  }
}

new AppController();
