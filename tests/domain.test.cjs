const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PoliticaDeReservas: Reglas } = require('./.build/policies.js');
const { ErrorDominio } = require('./.build/model.js');

const persona = {tipoCliente:'AGENCIA',limiteCreditoCentavos:100000,creditoUtilizadoCentavos:25000,documentoVence:'2032-12-31'};
const vuelo = {codigo:'AI202',estado:'PROGRAMADO',capacidadEconomica:40,capacidadEjecutiva:8,sobreventaAutorizada:true,
  precioEconomicaCentavos:180000,precioEjecutivaCentavos:310000,equipajeCentavos:25000,
  paisOrigen:'Guatemala',paisDestino:'México',salida:'2027-08-01T15:00:00Z'};

test('RN-01: reservas individuales máximo 9 pasajeros',()=>{
  assert.doesNotThrow(()=>Reglas.validarCantidad('INDIVIDUAL',9));
  assert.throws(()=>Reglas.validarCantidad('INDIVIDUAL',10),ErrorDominio);
  assert.doesNotThrow(()=>Reglas.validarCantidad('AGENCIA',10));
});
test('RN-02: valida el crédito disponible',()=>{
  assert.doesNotThrow(()=>Reglas.validarCredito(persona,75000));
  assert.throws(()=>Reglas.validarCredito(persona,75001),ErrorDominio);
  assert.throws(()=>Reglas.validarPagoIndividual({...persona,tipoCliente:'INDIVIDUAL'},30000,20000),ErrorDominio);
});
test('RN-03: sobreventa 5% autorizada solo en clase económica',()=>{
  assert.doesNotThrow(()=>Reglas.validarCapacidad(vuelo,'ECONOMICA',40,2));
  assert.throws(()=>Reglas.validarCapacidad(vuelo,'ECONOMICA',40,3),ErrorDominio);
  assert.throws(()=>Reglas.validarCapacidad(vuelo,'EJECUTIVA',8,1),ErrorDominio);
});
test('RN-04: descuentos por volumen y cotización',()=>{
  assert.equal(Reglas.porcentajeDescuento(10),0);
  assert.equal(Reglas.porcentajeDescuento(11),0.05);
  assert.equal(Reglas.porcentajeDescuento(30),0.05);
  assert.equal(Reglas.porcentajeDescuento(31),0.10);
  const q=Reglas.cotizar([{vuelo,clase:'ECONOMICA'}],11,2);
  assert.equal(q.subtotalCentavos,1980000);
  assert.equal(q.descuentoCentavos,99000);
  assert.equal(q.equipajeCentavos,50000);
  assert.equal(q.totalCentavos,1931000);
});
test('RN-05: cancelación solo en estados permitidos, mínimo 3 horas',()=>{
  assert.doesNotThrow(()=>Reglas.validarCancelacion('CONFIRMADA',['2027-05-01T15:00:00Z'],new Date('2027-05-01T12:00:00Z')));
  assert.throws(()=>Reglas.validarCancelacion('ABORDADO',[],new Date('2027-05-01T12:00:00Z')),ErrorDominio);
  assert.throws(()=>Reglas.validarCancelacion('CONFIRMADA',['2027-05-01T14:00:00Z'],new Date('2027-05-01T12:00:00Z')),ErrorDominio);
});
test('RN-06: documento internacional exige seis meses',()=>{
  assert.throws(()=>Reglas.validarDocumentoInternacional({...persona,documentoVence:'2027-11-01'},vuelo),ErrorDominio);
  assert.doesNotThrow(()=>Reglas.validarDocumentoInternacional({...persona,documentoVence:'2028-02-01'},vuelo));
});
test('RN-07: no se puede editar un boleto emitido',()=>{
  assert.doesNotThrow(()=>Reglas.validarEdicion('BORRADOR'));
  assert.throws(()=>Reglas.validarEdicion('BOLETO_EMITIDO'),ErrorDominio);
});
