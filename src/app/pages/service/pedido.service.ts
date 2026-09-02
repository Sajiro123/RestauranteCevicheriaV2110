import { Injectable } from '@angular/core';
import { catchError, mergeMap, Observable, switchMap, throwError, from } from 'rxjs';
import { Mesa } from '../../model/Mesa';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { NuevoPedido } from '../../model/NuevoPedido';
import { NuevoPedidodetalle } from '../../model/NuevoPedidodetalle';
import { Pedido } from '../../model/Pedido';

@Injectable({ providedIn: 'root' })
export class PedidoService {
    deletePedido(id: number, motivo: string, responsable: string): Observable<any> {
        return from(this.supabaseService.deletePedido(id, motivo, responsable));
    }

    updateEstadoCocina(id: number, estado_cocina: number): Observable<any> {
        return from(this.supabaseService.updateEstadoCocina(id, estado_cocina));
    }

    async editarPedidoCompleto(pedido: any, detalles: any[]) {
        const total = detalles.reduce((sum: number, product: { preciounitario: number; cantidad: number }) => sum + product.preciounitario * product.cantidad, 0);

        const total_pedidos = detalles.reduce((sum: number, product: { cantidad: number }) => sum + product.cantidad, 0);

        pedido.total_pedidos = total_pedidos;

        pedido.total = total;
        const { data, error } = await this.supabaseService.client.rpc('editar_pedido_y_detalles', {
            pedido_data: pedido, // 👈 este nombre debe coincidir con el de la función SQL
            detalles: detalles
        });
        return { data, error };
    }

    updatePedidoMesa(idpedido: number, mesa: number): Observable<any> {
        const updateData = { mesa };
        return from(this.supabaseService.updatePedido(idpedido, updateData));
    }

    async insertarPedidoCompleto(pedido: any, detalles: any[]) {
        const total = detalles.reduce((sum: number, product: { preciounitario: number; cantidad: number }) => sum + product.preciounitario * product.cantidad, 0);

        const total_pedidos = detalles.reduce((sum: number, product: { cantidad: number }) => sum + product.cantidad, 0);

        pedido.total_pedidos = total_pedidos;
        pedido.total = total;
        const { data, error } = await this.supabaseService.client.rpc('insertar_pedido_y_detalles', {
            pedido_data: pedido, // 👈 este nombre debe coincidir con el de la función SQL
            detalles: detalles
        });
        return { data, error };
    }

    CobrarPedido(productos: Pedido): Observable<any> {
        const now = new Date();
        const fechaPeru = now.toLocaleDateString('en-CA', {
            timeZone: 'America/Lima'
        });
        const horaPeru = now.toLocaleString('es-PE', {
            timeZone: 'America/Lima',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const fechaHoraPeru = `${fechaPeru} ${horaPeru}`;

        const updateData = {
            estado: 3,
            yape: productos.yape,
            visa: productos.visa,
            efectivo: productos.efectivo,
            plin: productos.plin,
            updated_at: fechaHoraPeru
        };
        return from(this.supabaseService.updatePedido(productos.idpedido, updateData));
    }

    ShowProductosPdf(idpedido: any, funcion: string): Observable<any> {
        return from(
            this.supabaseService.client
                .from('pedido')
                .select(
                    `
                cliente,
                created_at,
                descuento,
                comentario,
                idpedido,
                deleted,
                mesa,
                total,
                pedidodetalle:pedidodetalle(
                    idpedidodetalle,
                    deleted,
                    toppings,
                    lugarpedido,
                    idproducto,
                    cantidad,
                    "precioU",
                    total,
                    producto:idproducto(
                        nombre,
                        acronimo,
                        numero_carta,
                        idcategoria,
                        categoria:idcategoria(nombre)
                    )
                )
            `
                )
                .eq('estado', '1')
                .eq('idpedido', idpedido)
                .is('deleted', null)
                .is('pedidodetalle.deleted', null)
                .order('mesa')
                .then(({ data, error }: { data: any; error: any }) => {
                    if (data && data.length > 0 && funcion == 'cocina') {
                        const pedido = data[0];
                        if (pedido.pedidodetalle) {
                            // Excluir los productos que son de la categoría 5 (Toppings)
                            // y excluir los taper (numero_carta == 0) para que no salgan en cocina
                            pedido.pedidodetalle = pedido.pedidodetalle.filter((d: any) => d.idproducto != 85 && d.producto?.idcategoria !== 5);
                            // MODIFICAR
                        }
                        return { success: !error, data: pedido, error };
                    } else {
                        return { success: !error, data: data[0], error };
                    }
                })
        );
    }

    ReporteDiario(fecha: string): Observable<any> {
        return from(this.supabaseService.getReporteDiario(fecha));
    }

    ValidarCierre(fecha: string): Observable<any> {
        return from(
            this.supabaseService.client
                .from('apertura_caja')
                .select('*')
                .eq('fecha', fecha)
                .eq('estado', 2)
                .is('deleted', null)
                .then(({ data, error }: { data: any; error: any }) => ({ success: !error, data: data && data.length > 0 ? data[0] : null, error }))
        );
    }

    showRerporte(parameters: any = {}): Observable<any> {
        return from(this.supabaseService.getReporteRango(parameters.fechainicio, parameters.fechafin));
    }

    ShowPedidosFecha(parameters: string): Observable<any> {
        return from(
            this.supabaseService.client
                .from('pedido')
                .select('mesa, idpedido, fecha, descuento, total, total_pedidos, yape, plin, efectivo, visa, created_at')
                .eq('estado', 3)
                .eq('fecha', parameters)
                .order('idpedido', { ascending: false })
                .is('deleted', null)
                .then(({ data, error }: { data: any; error: any }) => {
                    if (data) {
                        data.forEach((item: any) => {
                            const date = new Date(item.created_at);
                            item.hora = date.toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            });
                        });
                    }
                    return { success: !error, data, error };
                })
        );
    }

    ShowPedidosFechaEliminados(parameters: any): Observable<any> {
        return from(
            this.supabaseService.client
                .from('pedido')
                .select('mesa, idpedido, fecha, descuento, total, total_pedidos, yape, plin, efectivo, visa, created_at,motivo,responsable')
                .eq('estado', '0')
                .gte('fecha', parameters.fechainicio)
                .lte('fecha', parameters.fechafin)
                .order('idpedido', { ascending: false })
                .then(({ data, error }: { data: any; error: any }) => {
                    if (data) {
                        data.forEach((item: any) => {
                            const date = new Date(item.created_at);
                            item.hora = date.toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            });
                        });
                    }
                    return { success: !error, data, error };
                })
        );
    }

    ReporteProductoDetalleEliminados(parameters: any): Observable<any> {
        return from(
            this.supabaseService.client
                .from('pedido')
                .select(
                    `
            idpedido,
            descuento,
            comentario,
            mesa,
            total,
            fecha,
            pedidodetalle(
                opcionespedido,
                pedido_estado,
                lugarpedido,
                idproducto,
                cantidad,
                precioU,
                total,
                producto(
                    idcategoria,
                    nombre
                )
            )
        `
                )
                .eq('estado', '0')
                .gte('fecha', parameters.fechainicio)
                .lte('fecha', parameters.fechafin)
                .order('mesa')
                .then(({ data, error }: { data: any; error: any }) => ({ success: !error, data, error }))
        );
    }

    ShowPedidosFechaSinCobrar(parameters: any): Observable<any> {
        return from(
            this.supabaseService.client
                .from('pedido')
                .select('mesa, idpedido, fecha, descuento, total, total_pedidos, yape, plin, efectivo, visa, created_at')
                .eq('estado', '1')
                .gte('fecha', parameters.fechainicio)
                .lte('fecha', parameters.fechafin)
                .order('idpedido', { ascending: false })
                .is('deleted', null)
                .then(({ data, error }: { data: any; error: any }) => {
                    if (data) {
                        data.forEach((item: any) => {
                            const date = new Date(item.created_at);
                            item.hora = date.toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            });
                        });
                    }
                    return { success: !error, data, error };
                })
        );
    }

    ReporteProductoDetalleSinCobrar(parameters: any): Observable<any> {
        return from(
            this.supabaseService.client
                .from('pedido')
                .select(
                    `
            idpedido,
            descuento,
            comentario,
            mesa,
            total,
            fecha,
            pedidodetalle(
                opcionespedido,
                pedido_estado,
                lugarpedido,
                idproducto,
                cantidad,
                precioU,
                total,
                producto(
                    idcategoria,
                    nombre
                )
            )
        `
                )
                .eq('estado', '1')
                .gte('fecha', parameters.fechainicio)
                .lte('fecha', parameters.fechafin)
                .order('mesa')
                .is('deleted', null)
                .then(({ data, error }: { data: any; error: any }) => ({ success: !error, data, error }))
        );
    }

    ReporteProductoDetalle(parameters: string): Observable<any> {
        return from(
            this.supabaseService.client
                .from('pedido')
                .select(
                    `
            idpedido,
            descuento,
            comentario,
            mesa,
            total,
            fecha,
            pedidodetalle(
                opcionespedido,
                pedido_estado,
                lugarpedido,
                idproducto,
                cantidad,
                precioU,
                total,
                producto(
                    idcategoria,
                    nombre
                )
            )
        `
                )
                .eq('fecha', parameters)
                .is('deleted', null)
                .is('pedidodetalle.deleted', null)
                .order('mesa')
                .then(({ data, error }: { data: any; error: any }) => ({ success: !error, data, error }))
        );
    }

    async EditarPedido(arraypedido: NuevoPedido, comentario: string): Promise<Observable<any>> {
        try {
            const total = arraypedido.pedidodetalle.reduce((sum: number, product: { preciounitario: number; cantidad: number }) => sum + product.preciounitario * product.cantidad, 0);

            const now = new Date();
            const fechaPeru = now.toLocaleDateString('en-CA', {
                timeZone: 'America/Lima'
            });
            const horaPeru = now.toLocaleString('es-PE', {
                timeZone: 'America/Lima',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            const fechaHoraPeru = `${fechaPeru} ${horaPeru}`;
            // Update pedido
            const updateData = {
                comentario,
                total_pedidos: arraypedido.pedidodetalle.length,
                total,
                updated_at: fechaHoraPeru,
                cliente: arraypedido.cliente || ''
            };

            const updateResult = await this.supabaseService.updatePedido(arraypedido.idpedido, updateData);

            if (!updateResult.success) {
                throw new Error(updateResult.error?.message);
            }

            // Mark existing details as deleted
            const { error: deleteError } = await this.supabaseService.client.from('pedidodetalle').update({ deleted: 1 }).eq('idpedido', arraypedido.idpedido);

            if (deleteError) {
                throw new Error(deleteError.message);
            }

            return from(Promise.resolve({ success: true, data: updateResult.data }));
        } catch (error) {
            console.error('Error al editar pedido:', error);
            return throwError(error);
        }
    }

    constructor(
        private supabaseService: SupabaseService,
        private router: Router
    ) {}

    ListarPedidosMesa(): Observable<any> {
        return from(this.supabaseService.getPedidosHoy());
    }

    BuscarPlatoSearch(value: any, type: string): Observable<any> {
        if (value === '') {
            type = '';
        }

        if (type === 'nombre') {
            return from(this.supabaseService.searchProductos(value, type));
        } else if (type === 'numero_carta') {
            return from(this.supabaseService.searchProductos(value, type));
        } else {
            return from(this.supabaseService.getProductos());
        }
    }

    ListarToppings(): Observable<any> {
        return from(this.supabaseService.getToppings());
    }

    InsertarTopping(nombre: string): Observable<any> {
        return from(this.supabaseService.insertTopping(nombre));
    }

    loadMozos(): Observable<any> {
        return from(this.supabaseService.loadMozos());
    }

    insertPedido(arraypedido: NuevoPedido, mesa: string, comentario: string): Observable<any> {
        arraypedido.pedidodetalle = arraypedido.pedidodetalle.filter((element: any) => element.idproducto !== 0);
        var idmozo = arraypedido.idmozo;

        const total = arraypedido.pedidodetalle.reduce((sum: number, product: { preciounitario: number; cantidad: number }) => sum + product.preciounitario * product.cantidad, 0);
        const total_pedidos = arraypedido.pedidodetalle.reduce((sum: number, product: { cantidad: number }) => sum + product.cantidad, 0);
        const now = new Date();
        const fechaPeru = now.toLocaleDateString('en-CA', {
            timeZone: 'America/Lima'
        });
        const pedidoData = {
            cliente: arraypedido.cliente,
            total,
            total_pedidos,
            estado: 1,
            mesa: parseInt(mesa),
            fecha: fechaPeru,
            comentario,
            idmozo
        };

        return from(this.supabaseService.insertPedido(pedidoData));
    }

    insertPedidoDetalle(arraypedido: NuevoPedidodetalle): Observable<any> {
        let toppings = '';
        if (arraypedido.idtoppings.length > 0) {
            arraypedido.idtoppings.forEach((element: any, index: number) => {
                toppings += `${element.idtoppings},`;
            });
        }
        toppings = toppings.slice(0, -1); // Eliminar la última coma

        const detalleData = {
            idpedido: arraypedido.idpedido,
            idproducto: arraypedido.idproducto,
            cantidad: arraypedido.cantidad,
            precioU: arraypedido.preciounitario,
            total: arraypedido.total,
            lugarpedido: arraypedido.lugarpedido,
            toppings,
            id_created_at: 1
        };

        return from(this.supabaseService.insertPedidoDetalle(detalleData));
    }
}
