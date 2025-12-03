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
        const { data, error } = await this.supabase.from('mesa').select('*').is('deleted', null).order('numero');

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
                .order('nombre');
        } else if (type == 'nombre') {
            query = await this.supabase
                .from('producto')
                .select(
                    `
            *,
            categoria:idcategoria(nombre)
        `
                )
                .ilike(type, `%${searchTerm}%`)
                .is('deleted', null)
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
        const { data, error } = await this.supabase.from('apertura_caja').insert(aperturaData).select();

        return { success: !error, data, error };
    }

    async cerrarCaja(fecha: string) {
        const { data, error } = await this.supabase.from('apertura_caja').update({ estado: 2 }).eq('fecha', fecha).is('deleted', null);

        return { success: !error, data, error };
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

    async getCategoriasGastos() {
        const { data, error } = await this.supabase.from('categoriagastos').select('*').is('deleted', null).order('descripcion');

        return { success: !error, data, error };
    }

    async getTrabajadores() {
        const { data, error } = await this.supabase.from('persona').select('*').is('deleted', null);

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
        const { data, error } = await this.supabase.from('pedido').select('yape, plin, visa, efectivo, fecha').eq('estado', 3).gte('fecha', fechaInicio).lte('fecha', fechaFin);

        if (error) return { success: false, data: null, error };

        // Group by date and calculate totals
        const groupedData = data.reduce((acc: any, curr: any) => {
            const fecha = curr.fecha;
            if (!acc[fecha]) {
                acc[fecha] = { yape: 0, plin: 0, visa: 0, efectivo: 0, fecha };
            }
            acc[fecha].yape += curr.yape || 0;
            acc[fecha].plin += curr.plin || 0;
            acc[fecha].visa += curr.visa || 0;
            acc[fecha].efectivo += curr.efectivo || 0;
            return acc;
        }, {});

        return { success: true, data: Object.values(groupedData), error: null };
    }
}
