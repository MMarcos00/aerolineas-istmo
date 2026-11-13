const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const api=require('./.build/index.js').default;

class ConsultaD1Mock {
  constructor(db,sql,params=[]){this.db=db;this.sql=sql;this.params=params;}
  bind(...args){return new ConsultaD1Mock(this.db,this.sql,args);}
  async all(){return {results:this.db.prepare(this.sql).all(...this.params)};}
  async first(){return this.db.prepare(this.sql).get(...this.params)??null;}
  async run(){return {meta:this.db.prepare(this.sql).run(...this.params)};}
}
class D1Mock {
  constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(path.join(__dirname,'..','api','migrations','0001_inicial.sql'),'utf8'));}
  prepare(sql){return new ConsultaD1Mock(this.db,sql);}
  async batch(queries){this.db.exec('BEGIN');try{const result=[];for(const q of queries)result.push(await q.run());this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}

const db=new D1Mock();
async function request(method,path,body) {
  const res=await api.fetch(new Request('https://fake.example'+path,{method,headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined}),{DB:db});
  return {status:res.status,data:await res.json()};
}

test('RF-01 / seed: 90 agentes y catálogo inicial',async()=>{
  assert.equal((await request('GET','/agentes')).data.length,90);
  assert.equal((await request('GET','/pasajeros')).data.length,40);
  const v=await request('GET','/vuelos');
  assert.equal(v.status,200);
  assert.equal(v.data.length,4);
  assert.equal(v.data[1].codigo,'AI202');
  assert.equal(v.data[1].libresEconomica,40);
});
let id;
test('RF-03 crea reserva, agrega vuelo, cotiza, confirma y bloquea cupo',async()=>{
  let r=await request('POST','/reservas',{agenteId:'AG-001',titularId:'P-001'});
  assert.equal(r.status,201,JSON.stringify(r.data));
  id=r.data.reserva.id;
  assert.equal(r.data.pasajeros.length,1);
  r=await request('POST',`/reservas/${id}/tramos`,{vueloId:'V-002',clase:'ECONOMICA'});
  assert.equal(r.status,200,JSON.stringify(r.data));
  const q=await request('GET',`/reservas/${id}/cotizacion?equipajes=1`);
  assert.equal(q.data.totalCentavos,205000,JSON.stringify(q.data));
  r=await request('POST',`/reservas/${id}/confirmar`,{equipajes:1});
  assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.detalle.reserva.estado,'CONFIRMADA');
  const flights=(await request('GET','/vuelos')).data;
  assert.equal(flights.find(v=>v.id==='V-002').libresEconomica,39);
});
test('RN-02: pago individual antes de emisión',async()=>{
  let r=await request('POST',`/reservas/${id}/emitir`,{});
  assert.equal(r.status,400);
  r=await request('POST',`/reservas/${id}/pagar`,{});
  assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.montoCentavos,205000);
  r=await request('POST',`/reservas/${id}/emitir`,{});
  assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.reserva.estado,'BOLETO_EMITIDO');
  const saved=db.db.prepare('SELECT tarifa_cents FROM boletos WHERE reserva_id=?').all(id);
  assert.equal(saved.length,1);
  assert.equal(saved[0].tarifa_cents,180000);
});
test('RN-07: no se edita tras emitir',async()=>{
  const r=await request('POST',`/reservas/${id}/pasajeros`,{pasajeroId:'P-002'});
  assert.equal(r.status,400);
});
test('RN-06 / RF-06: check-in, asiento y abordaje',async()=>{
  let r=await request('POST',`/reservas/${id}/abordar`,{pasajeroId:'P-001',vueloId:'V-002'});
  assert.equal(r.status,400);
  r=await request('POST',`/reservas/${id}/checkin`,{pasajeroId:'P-001',vueloId:'V-002',equipajes:1});
  assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.asiento,'1A');
  assert.equal(r.data.detalle.reserva.estado,'CHECKIN_REALIZADO');
  r=await request('POST',`/reservas/${id}/abordar`,{pasajeroId:'P-001',vueloId:'V-002'});
  assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.reserva.estado,'ABORDADO');
});
test('RF-08 notifica al pasajero al cambiar puerta',async()=>{
  const r=await request('POST','/vuelos/V-002/cambiar',{puerta:'C8'});
  assert.equal(r.status,200,JSON.stringify(r.data));
  const alerts=await request('GET','/notificaciones?pasajeroId=P-001');
  assert.equal(alerts.status,200);
  assert.ok(alerts.data.some(x=>x.texto.includes('C8')));
});
test('RN-06 rechaza documento a menos de seis meses para vuelo internacional',async()=>{
  const r=await request('POST','/reservas',{agenteId:'AG-002',titularId:'P-003'});
  const id2=r.data.reserva.id;
  await request('POST',`/reservas/${id2}/tramos`,{vueloId:'V-003',clase:'ECONOMICA'});
  assert.equal((await request('POST',`/reservas/${id2}/confirmar`,{equipajes:0})).status,200);
  await request('POST',`/reservas/${id2}/pagar`,{});
  await request('POST',`/reservas/${id2}/emitir`,{});
  const attempted=await request('POST',`/reservas/${id2}/checkin`,{pasajeroId:'P-003',vueloId:'V-003',equipajes:0});
  assert.equal(attempted.status,400,JSON.stringify(attempted.data));
  assert.match(attempted.data.error,/6 meses/);
});

test('RF-07: permite consultar historial por agente y por pasajero',async()=>{
  const byAgent=await request('GET','/reservas?agenteId=AG-001');
  const byPassenger=await request('GET','/reservas?pasajeroId=P-001');
  assert.ok(byAgent.data.some(x=>x.id===id));
  assert.ok(byPassenger.data.some(x=>x.id===id));
});
test('RN-08: cambio posterior de tarifa no modifica el boleto emitido',async()=>{
  db.db.prepare('UPDATE vuelos SET precio_economica=199999 WHERE id=?').run('V-002');
  const row=db.db.prepare('SELECT tarifa_cents FROM boletos WHERE reserva_id=?').get(id);
  assert.equal(row.tarifa_cents,180000);
});
