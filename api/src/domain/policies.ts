import { Boleto, ClaseTarifa, Cotizacion, DetalleReserva, ErrorDominio, EstadoReserva, Pasajero, TipoCliente, Vuelo } from './model';

/** Las RN se prueban sin base de datos ni controlador: núcleo DDD de la aplicación. */
export class PoliticaDeReservas {
  static validarCantidad(tipo: TipoCliente, cantidad: number): void { // RN-01
    if (!Number.isInteger(cantidad) || cantidad < 1) throw new ErrorDominio('La reserva requiere al menos un pasajero.');
    if (cantidad > 9 && tipo === 'INDIVIDUAL') throw new ErrorDominio('Las reservas de 10 o más pasajeros requieren agencia o empresa.');
    if (cantidad > 100) throw new ErrorDominio('Para esta demostración el máximo por reserva es de 100 pasajeros.');
  }

  static validarCredito(titular: Pasajero, total: number): void { // RN-02
    if (titular.tipoCliente !== 'INDIVIDUAL' && total > titular.limiteCreditoCentavos - titular.creditoUtilizadoCentavos) {
      throw new ErrorDominio('El total supera el crédito disponible del cliente.');
    }
  }

  static validarPagoIndividual(titular: Pasajero, total: number, pagado: number): void { // RN-02
    if (titular.tipoCliente === 'INDIVIDUAL' && pagado < total) throw new ErrorDominio('El pasajero individual debe pagar el total antes de emitir el boleto.');
  }

  static validarCapacidad(vuelo: Vuelo, clase: ClaseTarifa, ocupados: number, nuevos: number): void { // RN-03
    if (vuelo.estado !== 'PROGRAMADO') throw new ErrorDominio(`El vuelo ${vuelo.codigo} está cancelado.`);
    const capacidad = clase === 'ECONOMICA' ? vuelo.capacidadEconomica : vuelo.capacidadEjecutiva;
    const extra = clase === 'ECONOMICA' && vuelo.sobreventaAutorizada ? Math.floor(capacidad * 0.05) : 0;
    if (ocupados + nuevos > capacidad + extra) throw new ErrorDominio(`No hay capacidad suficiente en ${vuelo.codigo}, clase ${clase}.`);
  }

  static porcentajeDescuento(pasajeros: number): number { // RN-04
    return pasajeros > 30 ? 0.10 : pasajeros > 10 ? 0.05 : 0;
  }

  static cotizar(tramos: { vuelo: Vuelo; clase: ClaseTarifa }[], pasajeros: number, equipajes: number): Cotizacion { // RF-04, RN-04
    if (!Number.isInteger(equipajes) || equipajes < 0) throw new ErrorDominio('La cantidad de equipajes debe ser un entero no negativo.');
    const subtotal = tramos.reduce((s, t) => s + (t.clase === 'ECONOMICA' ? t.vuelo.precioEconomicaCentavos : t.vuelo.precioEjecutivaCentavos) * pasajeros, 0);
    const equipaje = tramos.reduce((s, t) => s + t.vuelo.equipajeCentavos * equipajes, 0);
    const porcentaje = this.porcentajeDescuento(pasajeros);
    const descuento = Math.round(subtotal * porcentaje);
    return { subtotalCentavos: subtotal, descuentoCentavos: descuento, equipajeCentavos: equipaje, totalCentavos: subtotal - descuento + equipaje, porcentajeDescuento: porcentaje };
  }

  static prepararBoletos(detalle: DetalleReserva, nuevoId: () => string, emitidoEn: string): Boleto[] { // RN-08
    // La tarifa se toma UNA SOLA VEZ al emitir y se transfiere al repositorio como dato inmutable.
    // Un cambio futuro al catálogo de tarifas NO modifica estas instantáneas.
    const boletos: Boleto[]=[];
    for (const pasajero of detalle.pasajeros) for (const tramo of detalle.tramos) {
      const tarifaCentavos=tramo.clase==='ECONOMICA'?tramo.vuelo.precioEconomicaCentavos:tramo.vuelo.precioEjecutivaCentavos;
      boletos.push({id:nuevoId(),reservaId:detalle.reserva.id,pasajeroId:pasajero.id,
        vueloId:tramo.vuelo.id,tarifaCentavos,clase:tramo.clase,emitidoEn});
    }
    return boletos;
  }

  static validarEdicion(estado: EstadoReserva): void { // RN-07
    if (estado !== 'BORRADOR') throw new ErrorDominio('Solo se pueden modificar pasajeros y tramos de una reserva en Borrador.');
  }

  static validarCancelacion(estado: EstadoReserva, salidas: string[], ahora = new Date()): void { // RN-05
    if (!(['BORRADOR', 'CONFIRMADA', 'BOLETO_EMITIDO'] as EstadoReserva[]).includes(estado)) throw new ErrorDominio('Esta reserva ya no puede cancelarse por su estado.');
    if (salidas.length && salidas.some(s => new Date(s).getTime() - ahora.getTime() < 3 * 60 * 60 * 1000)) {
      throw new ErrorDominio('Solo se puede cancelar con al menos 3 horas de anticipación.');
    }
  }

  static validarDocumentoInternacional(pasajero: Pasajero, vuelo: Vuelo): void { // RN-06
    if (vuelo.paisOrigen === vuelo.paisDestino) return;
    const salida = new Date(vuelo.salida);
    const minimo = new Date(Date.UTC(salida.getUTCFullYear(), salida.getUTCMonth() + 6, salida.getUTCDate()));
    if (new Date(`${pasajero.documentoVence}T23:59:59Z`) < minimo) {
      throw new ErrorDominio('El documento de viaje debe tener al menos 6 meses de vigencia desde la salida.');
    }
  }

  static validarPenalidadCambio(estado: EstadoReserva): void { // RN-07
    if (estado === 'BOLETO_EMITIDO') throw new ErrorDominio('Un boleto emitido no se modifica; requiere procedimiento de cambio y penalidad (fuera del alcance del demo).');
  }
}
