import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storageListener: false
            } as any // 👈 forzamos a TypeScript a no quejarse,
        });
    }

    get client() {
        return this.supabase;
    }

    // Mesa operations
    async getMesas() {
        const { data, error } = await this.supabase.from('mesa').select('*').is('deleted', null).eq('estado', 1).order('numero');

        return { success: !error, data, error };
    }

    async updateMesaEstado(numero: string, estado: number) {
        const { data, error } = await this.supabase.from('mesa').update({ estado }).eq('numero', numero).is('deleted', null);

        return { success: !error, data, error };
    }

    // Producto operations
    async getProductos() {
        const { data, error } = await this.supabase
            .from('producto')
            .select(
                `
        *,
        categoria:idcategoria(nombre)
      `
            )
            .gt('preciounitario', 0)
            .is('deleted', null)
            .order('nombre');

        return { success: !error, data, error };
    }

    async searchProductos(searchTerm: string, type: string) {
        let query;

        if (type == 'numero_carta') {
            query = await this.supabase
                .from('producto')
                .select(
                    `
            *,
            categoria:idcategoria(nombre)
        `
                )
                .eq(type, searchTerm)
                .is('deleted', null)
                .gt('preciounitario', 0)
                .order('nombre');
        } else if (type == 'nombre') {
            let baseQuery = this.supabase
                .from('producto')
                .select(
                    `
            *,
            categoria:idcategoria(nombre)
        `
                );

            const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0).slice(0, 4);
            words.forEach(word => {
                baseQuery = baseQuery.ilike(type, `%${word}%`);
            });

            query = await baseQuery
                .is('deleted', null)
                .gt('preciounitario', 0)
                .order('nombre');
        } else {
            query = await this.supabase
                .from('producto')
                .select(
                    `
        *,
        categoria:idcategoria(nombre)
    `
                )
                .gt('preciounitario', 0)
                .is('deleted', null)
                .order('nombre');
        }

        const { data, error } = await query;
        return { success: !error, data, error };

        return { success: !error, data, error };
    }

    // Pedido operations
    async getPedidosHoy() {
        const now = new Date();
        const fechaPeru = now.toLocaleDateString('en-CA', {
            timeZone: 'America/Lima'
        });

        const { data, error } = await this.supabase
            .from('pedido')
            .select(
                `
        *,
        pedidodetalle:pedidodetalle(
          *,
          producto:idproducto(nombre, categoria:idcategoria(nombre))
        ),
        persona:idmozo(nombres,idpersona),
        vales:vales_delivery!idpedido(
          id,
          codigo,
          descripcion,
          estado,
          fecha_creacion,
          fecha_vencimiento
        )
      `
            )
            .eq('fecha', fechaPeru)
            .eq('estado', '1')
            .is('deleted', null)
            .is('pedidodetalle.deleted', null)

            .order('created_at', { ascending: false });

        return { success: !error, data, error };
    }

    async insertPedido(pedidoData: any) {
        const { data, error } = await this.supabase.from('pedido').insert(pedidoData).select().single();

        return { success: !error, data, error };
    }

    async insertPedidoDetalle(detalleData: any) {
        const { data, error } = await this.supabase.from('pedidodetalle').insert(detalleData).select();

        return { success: !error, data, error };
    }

    async updatePedido(idpedido: number, updateData: any) {
        const { data, error } = await this.supabase.from('pedido').update(updateData).eq('idpedido', idpedido);

        return { success: !error, data, error };
    }

    async updateEstadoCocina(idpedido: number, estado_cocina: number) {
        const { data, error } = await this.supabase.from('pedido').update({ estado_cocina }).eq('idpedido', idpedido);

        return { success: !error, data, error };
    }

    async deletePedido(idpedido: number, motivo: string, responsable: string) {
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

        const { data, error } = await this.supabase
            .from('pedido')
            .update({
                estado: 0,
                deleted: 1,
                motivo,
                responsable,
                updated_at: fechaHoraPeru
            })
            .eq('idpedido', idpedido);

        return { success: !error, data, error };
    }

    // Toppings operations
    async getToppings() {
        const { data, error } = await this.supabase.from('toppings').select('*').is('deleted', null).order('nombre');

        return { success: !error, data, error };
    }

    async insertTopping(nombre: string) {
        const { data, error } = await this.supabase
            .from('toppings')
            .insert({ nombre })
            .select()
            .single();

        return { success: !error, data, error };
    }

    async loadMozos() {
        const { data, error } = await this.supabase
            .from('persona')
            .select(
                `
                    *,
                    perfil:idperfil(nombre)
                `
            )
            .eq('idestado', 1)
            .is('deleted', null)
            .in('idperfil', [2, 5]) // Mesero y Supervisor
            .order('nombres');
        return { success: !error, data, error };
    }

    // Apertura caja operations
    async getAperturaHoy() {
        const now = new Date();
        const fechaPeru = now.toLocaleDateString('en-CA', {
            timeZone: 'America/Lima'
        });

        const { data, error } = await this.supabase.from('apertura_caja').select('*').eq('fecha', fechaPeru).is('deleted', null).maybeSingle();

        return { success: !error, data: data ? [data] : [], error };
    }

    async insertAperturaCaja(aperturaData: any) {
        // Validación de anti-duplicidad: verificar si ya existe caja para esa fecha
        const { data: existing } = await this.supabase
            .from('apertura_caja')
            .select('id, estado, fecha, turno')
            .eq('fecha', aperturaData.fecha)
            .is('deleted', null)
            .maybeSingle();

        if (existing) {
            return {
                success: false,
                data: null,
                error: { message: `Ya existe una apertura de caja registrada para hoy (${aperturaData.fecha}).` }
            };
        }

        const { data, error } = await this.supabase.from('apertura_caja').insert(aperturaData).select();

        return { success: !error, data, error };
    }

    async cerrarCaja(fecha: string) {
        const { data, error } = await this.supabase.from('apertura_caja').update({ estado: 2 }).eq('fecha', fecha).is('deleted', null);

        return { success: !error, data, error };
    }

    async updateAperturaCaja(fecha: string, updateData: any) {
        const { data, error } = await this.supabase
            .from('apertura_caja')
            .update(updateData)
            .eq('fecha', fecha)
            .is('deleted', null);

        return { success: !error, data, error };
    }

    // Cálculo consolidado de caja del día (ventas + inicial - gastos)
    async calcularResumenCaja(fecha: string) {
        try {
            // 1. Obtener datos de apertura (monto inicial)
            const { data: apertura } = await this.supabase
                .from('apertura_caja')
                .select('*')
                .eq('fecha', fecha)
                .is('deleted', null)
                .maybeSingle();

            const montoInicial = Number(apertura?.total) || 0;

            // 2. Obtener pedidos cobrados (estado = 3)
            const { data: pedidos, error: pedidosError } = await this.supabase
                .from('pedido')
                .select('yape, plin, visa, efectivo, total, descuento')
                .eq('estado', 3)
                .eq('fecha', fecha);

            const ventasEfectivo = (pedidos || []).reduce((sum, p) => sum + (Number(p.efectivo) || 0), 0);
            const ventasYape = (pedidos || []).reduce((sum, p) => sum + (Number(p.yape) || 0), 0);
            const ventasPlin = (pedidos || []).reduce((sum, p) => sum + (Number(p.plin) || 0), 0);
            const ventasTarjeta = (pedidos || []).reduce((sum, p) => sum + (Number(p.visa) || 0), 0);
            const totalVentas = (pedidos || []).reduce((sum, p) => sum + (Number(p.total) || 0), 0);

            // 3. Obtener gastos del día
            const { data: gastos, error: gastosError } = await this.supabase
                .from('gastos')
                .select('monto')
                .eq('fecha', fecha)
                .is('deleted', null)
                .is('app', null);

            const totalGastos = (gastos || []).reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

            // 4. Calcular efectivo esperado en caja
            const efectivoEsperado = montoInicial + ventasEfectivo - totalGastos;
            const totalSistemaEsperado = efectivoEsperado + ventasYape + ventasPlin + ventasTarjeta;

            return {
                success: true,
                data: {
                    fecha,
                    montoInicial,
                    ventasEfectivo,
                    ventasYape,
                    ventasPlin,
                    ventasTarjeta,
                    totalVentas,
                    totalGastos,
                    efectivoEsperado,
                    totalSistemaEsperado,
                    cantidadPedidos: (pedidos || []).length
                },
                error: null
            };
        } catch (error) {
            console.error('Error calculando resumen caja:', error);
            return { success: false, data: null, error };
        }
    }

    // Guardar cierre de caja con arqueo ciego (declarado vs sistema)
    async guardarCierreCaja(cierreData: {
        fecha: string;
        efectivo_declarado: number;
        yape_declarado: number;
        plin_declarado: number;
        tarjeta_declarado: number;
        notas?: string;
        turno?: string;
    }) {
        try {
            const fecha = cierreData.fecha;
            const resumen = await this.calcularResumenCaja(fecha);
            const sys = resumen.data || {
                montoInicial: 0,
                ventasEfectivo: 0,
                efectivoEsperado: 0,
                ventasYape: 0,
                ventasPlin: 0,
                ventasTarjeta: 0,
                totalGastos: 0,
                totalSistemaEsperado: 0
            };

            // 1. Marcar apertura_caja como cerrada (estado = 2)
            await this.supabase
                .from('apertura_caja')
                .update({ estado: 2 })
                .eq('fecha', fecha)
                .is('deleted', null);

            // 2. Registrar en caja_semanal para historial
            const dateObj = new Date(fecha + 'T12:00:00');
            const oneJan = new Date(dateObj.getFullYear(), 0, 1);
            const semana = Math.ceil((((dateObj.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
            const dia = dateObj.getDay() === 0 ? 7 : dateObj.getDay();

            const totalDeclarado = Number(cierreData.efectivo_declarado || 0) +
                Number(cierreData.yape_declarado || 0) +
                Number(cierreData.plin_declarado || 0) +
                Number(cierreData.tarjeta_declarado || 0);

            const registroCaja = {
                fecha: fecha,
                semana: semana.toString(),
                dia: dia.toString(),
                trabajo: cierreData.turno || 'mañana',
                efectivo: cierreData.efectivo_declarado,
                yape: cierreData.yape_declarado,
                plin: cierreData.plin_declarado,
                tarjeta: cierreData.tarjeta_declarado,
                gastos: sys.totalGastos,
                total: totalDeclarado,
                notas: cierreData.notas || ''
            };

            const { data: existingCaja } = await this.supabase
                .from('caja_semanal')
                .select('id')
                .eq('fecha', fecha)
                .maybeSingle();

            if (existingCaja) {
                await this.supabase.from('caja_semanal').update(registroCaja).eq('id', existingCaja.id);
            } else {
                await this.supabase.from('caja_semanal').insert(registroCaja);
            }

            return {
                success: true,
                data: {
                    declarado: {
                        efectivo: cierreData.efectivo_declarado,
                        yape: cierreData.yape_declarado,
                        plin: cierreData.plin_declarado,
                        tarjeta: cierreData.tarjeta_declarado,
                        total: totalDeclarado
                    },
                    sistema: {
                        montoInicial: sys.montoInicial,
                        ventasEfectivo: sys.ventasEfectivo,
                        efectivoEsperado: sys.efectivoEsperado,
                        ventasYape: sys.ventasYape,
                        ventasPlin: sys.ventasPlin,
                        ventasTarjeta: sys.ventasTarjeta,
                        totalGastos: sys.totalGastos,
                        totalSistemaEsperado: sys.totalSistemaEsperado
                    },
                    diferencias: {
                        efectivo: cierreData.efectivo_declarado - sys.efectivoEsperado,
                        yape: cierreData.yape_declarado - sys.ventasYape,
                        plin: cierreData.plin_declarado - sys.ventasPlin,
                        tarjeta: cierreData.tarjeta_declarado - sys.ventasTarjeta,
                        total: totalDeclarado - sys.totalSistemaEsperado
                    }
                },
                error: null
            };
        } catch (error) {
            console.error('Error guardando cierre caja:', error);
            return { success: false, data: null, error };
        }
    }


    // Gastos operations
    async getGastos(fecha: string) {
        const { data, error } = await this.supabase
            .from('gastos')
            .select(
                `
        *,
        categoriagastos:idcategoriagastos(descripcion)
      `
            )
            .eq('fecha', fecha)
            .is('deleted', null)
            .is('app', null)
            .order('created_at', { ascending: false });

        return { success: !error, data, error };
    }

    async getGastosApp(fecha: string) {
        const { data, error } = await this.supabase
            .from('gastos')
            .select(
                `
        *,
        categoriagastos:idcategoriagastos(descripcion)
      `
            )
            .eq('fecha', fecha)
            .is('deleted', null)
            .eq('app', '1')
            .order('created_at', { ascending: false });

        return { success: !error, data, error };
    }

    async insertGasto(gastoData: any) {
        const { data, error } = await this.supabase.from('gastos').insert(gastoData).select();

        return { success: !error, data, error };
    }

    async softDeleteGasto(idgastos: number) {
        const { data, error } = await this.supabase.from('gastos').update({ deleted: 1 }).eq('idgastos', idgastos);

        return { success: !error, data, error };
    }

    async updateGasto(idgastos: number, gastoData: any) {
        const { data, error } = await this.supabase.from('gastos').update(gastoData).eq('idgastos', idgastos);

        return { success: !error, data, error };
    }

    async getCategoriasGastos() {
        const { data, error } = await this.supabase.from('categoriagastos').select('*').is('deleted', null).order('descripcion');

        return { success: !error, data, error };
    }

    async getTrabajadores() {
        const { data, error } = await this.supabase.from('persona').select('*').is('deleted', null).eq('idestado', 1);

        return { success: !error, data, error };
    }

    // Reports
    async getReporteDiario(fecha: string) {
        const { data, error } = await this.supabase.from('pedido').select('yape, plin, visa, efectivo, fecha').eq('estado', 3).eq('fecha', fecha);

        if (error) return { success: false, data: null, error };

        // Calculate totals
        const totals = data.reduce(
            (acc, curr) => ({
                yape: acc.yape + (curr.yape || 0),
                plin: acc.plin + (curr.plin || 0),
                visa: acc.visa + (curr.visa || 0),
                efectivo: acc.efectivo + (curr.efectivo || 0),
                fecha: curr.fecha
            }),
            { yape: 0, plin: 0, visa: 0, efectivo: 0, fecha }
        );

        return { success: true, data: [totals], error: null };
    }

    async getReporteRango(fechaInicio: string, fechaFin: string) {
        // 1. Validar qué fechas en el rango consultado tienen la caja CERRADA (estado == 2 y deleted IS NULL)
        const { data: aperturas, error: errorApertura } = await this.supabase
            .from('apertura_caja')
            .select('fecha, estado')
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .is('deleted', null);

        if (errorApertura) return { success: false, data: null, error: errorApertura };

        // Fechas que tienen estado == 2 (caja cerrada)
        const fechasCerradas = (aperturas || [])
            .filter((a: any) => Number(a.estado) === 2)
            .map((a: any) => a.fecha);

        // Si ninguna fecha del rango tiene la caja cerrada, no se traen ventas
        if (fechasCerradas.length === 0) {
            return {
                success: false,
                cajaNoCerrada: true,
                message: 'Falta cerrar la caja. No se pueden consultar ventas de fechas con caja abierta o sin cerrar.',
                data: [],
                error: null
            };
        }

        // 2. Consultar pedidos SOLO de las fechas con caja cerrada
        const { data, error } = await this.supabase
            .from('pedido')
            .select('yape, plin, visa, efectivo, fecha')
            .eq('estado', 3)
            .in('fecha', fechasCerradas);

        if (error) return { success: false, data: null, error };

        // 3. Obtener gastos solo de las fechas con caja cerrada
        const { data: gastosData } = await this.supabase
            .from('gastos')
            .select('monto, fecha')
            .in('fecha', fechasCerradas)
            .is('deleted', null);

        // Agrupar ventas por fecha
        const groupedData = (data || []).reduce((acc: any, curr: any) => {
            const fecha = curr.fecha;
            if (!acc[fecha]) {
                acc[fecha] = { yape: 0, plin: 0, visa: 0, efectivo: 0, gastos: 0, fecha };
            }
            acc[fecha].yape += curr.yape || 0;
            acc[fecha].plin += curr.plin || 0;
            acc[fecha].visa += curr.visa || 0;
            acc[fecha].efectivo += curr.efectivo || 0;
            return acc;
        }, {});

        // Sumar gastos por fecha
        (gastosData || []).forEach((g: any) => {
            const fecha = g.fecha;
            if (!groupedData[fecha]) {
                groupedData[fecha] = { yape: 0, plin: 0, visa: 0, efectivo: 0, gastos: 0, fecha };
            }
            groupedData[fecha].gastos = (groupedData[fecha].gastos || 0) + (Number(g.monto) || 0);
        });

        return { success: true, data: Object.values(groupedData), error: null };
    }
}
