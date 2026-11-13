/** Lenguaje ubicuo: entidades y tipos del dominio. No importa HTTP, SQL ni Cloudflare. */
export type TipoCliente = 'INDIVIDUAL' | 'AGENCIA' | 'CORPORATIVO';
export type ClaseTarifa = 'ECONOMICA' | 'EJECUTIVA';
export type EstadoReserva = 'BORRADOR' | 'CONFIRMADA' | 'BOLETO_EMITIDO' | 'CHECKIN_REALIZADO' | 'ABORDADO' | 'CANCELADA';
export type EstadoVuelo = 'PROGRAMADO' | 'CANCELADO';

export interface Pasajero {
  id: string;
  nombre: string;
  documento: string;
  documentoVence: string; // ISO yyyy-mm-dd
  nivelFrecuente: string;
  tipoCliente: TipoCliente;
  limiteCreditoCentavos: number;
  creditoUtilizadoCentavos: number;
}
export interface Vuelo {
  id: string;
  codigo: string;
  origen: string;
  paisOrigen: string;
  destino: string;
  paisDestino: string;
  salida: string;
  llegada: string;
  puerta: string;
  estado: EstadoVuelo;
  capacidadEconomica: number;
  capacidadEjecutiva: number;
  sobreventaAutorizada: boolean;
  precioEconomicaCentavos: number;
  precioEjecutivaCentavos: number;
  equipajeCentavos: number;
  penalidadCambioEconomicaCentavos: number;
  penalidadCambioEjecutivaCentavos: number;
}
export interface TramoReserva { vueloId: string; clase: ClaseTarifa; }
export interface Reserva {
  id: string;
  agenteId: string;
  clienteTitularId: string;
  estado: EstadoReserva;
  equipajes: number;
  totalCentavos: number;
  creadaEn: string;
  confirmadaEn: string | null;
}
export interface DetalleReserva { reserva: Reserva; pasajeros: Pasajero[]; tramos: { vuelo: Vuelo; clase: ClaseTarifa }[]; pagosCentavos: number; boletos: number; checkins: number; abordajes: number; }
export interface Boleto { id: string; reservaId: string; pasajeroId: string; vueloId: string; tarifaCentavos: number; clase: ClaseTarifa; emitidoEn: string; }
export interface Cotizacion { subtotalCentavos: number; descuentoCentavos: number; equipajeCentavos: number; totalCentavos: number; porcentajeDescuento: number; }
export class ErrorDominio extends Error {
  constructor(mensaje: string) { super(mensaje); this.name = 'ErrorDominio'; }
}

/** Vista previa de un cambio con boleto emitido. Valores en centavos de quetzal. */
export interface CotizacionCambio {
  penalidadCentavos: number;
  diferenciaTarifariaCentavos: number;
  recargoTotalCentavos: number;
  pasajeros: number;
  tarifaAnteriorCentavos: number;
  tarifaNuevaCentavos: number;
}
