/** Puertos de salida: la aplicación no sabe si la persistencia es D1, Postgres u otra. */
import { Boleto, ClaseTarifa, DetalleReserva, Pasajero, Reserva, TipoCliente, Vuelo } from '../domain/model';

export interface PuertoRepositorioAerolinea {
  agentes(): Promise<{ id: string; nombre: string }[]>;
  pasajeros(): Promise<Pasajero[]>;
  pasajero(id: string): Promise<Pasajero | null>;
  registrarPasajero(p: Pasajero): Promise<void>;
  vuelos(filtros: { origen?: string; destino?: string; fecha?: string }): Promise<(Vuelo & { libresEconomica: number; libresEjecutiva: number })[]>;
  vuelo(id: string): Promise<Vuelo | null>;
  reserva(id: string): Promise<DetalleReserva | null>;
  reservas(filtros: { pasajeroId?: string; agenteId?: string }): Promise<{ id: string; estado: string; agenteId: string; pasajeroTitular: string; creadaEn: string; totalCentavos: number; pasajeros: number }[]>;
  crearReserva(r: Reserva): Promise<void>;
  agregarPasajero(reservaId: string, pasajeroId: string): Promise<void>;
  quitarPasajero(reservaId: string, pasajeroId: string): Promise<void>;
  agregarTramo(reservaId: string, vueloId: string, clase: ClaseTarifa): Promise<void>;
  quitarTramo(reservaId: string, vueloId: string): Promise<void>;
  ocupados(vueloId: string, clase: ClaseTarifa): Promise<number>;
  confirmar(reserva: Reserva, total: number, equipajes: number, titular: Pasajero): Promise<void>;
  registrarPago(reservaId: string, monto: number): Promise<void>;
  emitir(reservaId: string, boletos: Boleto[]): Promise<void>;
  cancelar(reserva: DetalleReserva): Promise<void>;
  registrarCheckin(reservaId: string, pasajeroId: string, vueloId: string, equipajes: number, asiento: string): Promise<void>;
  asientosOcupados(vueloId: string): Promise<string[]>;
  consultarCheckin(reservaId: string, pasajeroId: string, vueloId: string): Promise<{ abordado: boolean } | null>;
  registrarAbordaje(reservaId: string, pasajeroId: string, vueloId: string): Promise<void>;
  estadoCheckins(reservaId: string): Promise<{ esperados: number; realizados: number; abordados: number }>;
  actualizarEstadoReserva(reservaId: string, estado: string): Promise<void>;
  cambiarVuelo(vuelo: Vuelo, cambios: { salida?: string; puerta?: string; estado?: string }, mensaje: string): Promise<number>;
  notificaciones(pasajeroId: string): Promise<{ id: string; texto: string; creadaEn: string }[]>;
}
