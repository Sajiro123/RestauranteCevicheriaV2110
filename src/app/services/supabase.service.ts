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
    async getFechaPeruHoy(): Promise<string> {
        try {
            const { data: serverDate, error } = await this.supabase.rpc('obtener_fecha_lima');
            if (!error && serverDate) {
                return serverDate;
            }
        } catch (e) {
            console.warn('Error consultando obtener_fecha_lima:', e);
        }
        return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    }

    async getPedidosHoy() {
        const fechaPeru = await this.getFechaPeruHoy();
        const fechaAyer = new Date(new Date(fechaPeru).getTime() - 86400000).toISOString().slice(0, 10);

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
            .eq('estado', '1')
            .is('deleted', null)
            .is('pedidodetalle.deleted', null)
            .or(`fecha.eq.${fechaPeru},created_at.gte.${fechaPeru}T00:00:00,fecha.gte.${fechaAyer}`)
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
        const fechaPeru = await this.getFechaPeruHoy();
        const now = new Date();
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

            // Si no se declararon montos en el arqueo (o están en 0), tomar las ventas reales del sistema
            const efectivoFinal = totalDeclarado > 0 ? Number(cierreData.efectivo_declarado || 0) : Number(sys.ventasEfectivo || 0);
            const yapeFinal = totalDeclarado > 0 ? Number(cierreData.yape_declarado || 0) : Number(sys.ventasYape || 0);
            const plinFinal = totalDeclarado > 0 ? Number(cierreData.plin_declarado || 0) : Number(sys.ventasPlin || 0);
            const tarjetaFinal = totalDeclarado > 0 ? Number(cierreData.tarjeta_declarado || 0) : Number(sys.ventasTarjeta || 0);
            const totalFinal = efectivoFinal + yapeFinal + plinFinal + tarjetaFinal;

            const registroCaja = {
                fecha: fecha,
                semana: semana.toString(),
                dia: dia.toString(),
                trabajo: cierreData.turno || 'mañana',
                efectivo: efectivoFinal,
                yape: yapeFinal,
                plin: plinFinal,
                tarjeta: tarjetaFinal,
                gastos: sys.totalGastos,
                total: totalFinal,
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

    private getPerfilNombreDefault(id: number): string {
        switch (Number(id)) {
            case 1: return 'Administrador de Restaurante';
            case 2: return 'Mozo / Mesero';
            case 3: return 'Cocinero / Chef';
            case 4: return 'Cajero de Restaurante';
            default: return 'Personal';
        }
    }

    /**
     * Obtiene el personal del negocio directamente desde SaaS Master API,
     * sincronizando transparentemente la tabla local persona en Supabase
     * para asegurar idpersona válidos y consistentes en aperturas y planillas.
     */
    async getTrabajadores(forceRefresh: boolean = false) {
        try {
            const tenantId = (environment as any).defaultTenantId || 'a0000000-0000-0000-0000-000000000004';
            const apiUrl = (environment as any).saasMasterApiUrl || 'https://saas-master-api.onrender.com/api/v1';

            const response = await fetch(`${apiUrl}/usuarios-negocio?negocioId=${tenantId}`);
            if (response.ok) {
                const json = await response.json();
                const saasUsers: any[] = json.data || [];

                if (saasUsers.length > 0) {
                    const { data: dbPersonas } = await this.supabase
                        .from('persona')
                        .select('*, perfil:idperfil(nombre)');

                    const personasLocales = dbPersonas || [];

                    const mapPerfil = (codigo: string): number => {
                        const c = (codigo || '').toUpperCase();
                        if (c.includes('ADMIN')) return 1;
                        if (c.includes('MOZO') || c.includes('MESERO')) return 2;
                        if (c.includes('COCIN') || c.includes('CHEF')) return 3;
                        if (c.includes('CAJER')) return 4;
                        return 2;
                    };

                    const trabajadoresSincronizados: any[] = [];

                    for (const u of saasUsers) {
                        const nombres = (u.nombres || u.email || '').trim();
                        const apellidos = (u.apellidos || '').trim();
                        const apellidosParts = apellidos.split(' ');
                        const apellidopat = apellidosParts[0] || '.';
                        const apellidomat = apellidosParts.slice(1).join(' ') || '.';
                        const doc = (u.numeroDocumento || '').trim();
                        const email = (u.email || '').trim().toLowerCase();
                        const idperfil = mapPerfil(u.perfilCodigo);
                        const estaActivo = u.estaActivo !== false;

                        // Reglas explícitas de negocio / IDs históricos del restaurante
                        let matched: any = null;
                        const nomLower = nombres.toLowerCase();
                        const emailLower = email.toLowerCase();

                        if (emailLower === 'maria@willys.com' || doc === '70234501' || nomLower.includes('maria claudia') || nomLower === 'maria') {
                            matched = personasLocales.find((p: any) => p.idpersona === 1);
                        } else if (emailLower === 'lucero@willys.com' || doc === '73628194' || nomLower.includes('lucero')) {
                            matched = personasLocales.find((p: any) => p.idpersona === 2);
                        } else if (emailLower === 'alex@willys.com' || doc === '75486273' || (nomLower.includes('alex') && !nomLower.includes('alexandra'))) {
                            matched = personasLocales.find((p: any) => p.idpersona === 6);
                        } else if (emailLower === 'sully@willys.com' || doc === '70234508' || nomLower.includes('alexandra')) {
                            matched = personasLocales.find((p: any) => p.idpersona === 12);
                        }

                        // Si no es regla fija, buscar por documento, correo o coincidencia de nombres
                        if (!matched) {
                            matched = personasLocales.find((p: any) => {
                                if (doc && p.numerodoc && p.numerodoc.trim() === doc) return true;
                                if (email && p.correo && p.correo.trim().toLowerCase() === email) return true;
                                const localFull = `${p.nombres || ''} ${p.apellidopat || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
                                const saasFull = `${nombres} ${apellidopat}`.toLowerCase().replace(/\s+/g, ' ').trim();
                                return localFull && saasFull && (localFull.includes(saasFull) || saasFull.includes(localFull));
                            });
                        }

                        let idpersona = matched ? matched.idpersona : null;

                        if (matched) {
                            if (matched.idestado !== (estaActivo ? 1 : 0) || matched.idperfil !== idperfil) {
                                await this.supabase
                                    .from('persona')
                                    .update({
                                        idestado: estaActivo ? 1 : 0,
                                        idperfil: idperfil,
                                        celular: u.telefono || matched.celular,
                                        direccion: u.direccion || matched.direccion
                                    })
                                    .eq('idpersona', matched.idpersona);
                            }
                        } else {
                            const { data: nuevaPersona } = await this.supabase
                                .from('persona')
                                .insert({
                                    nombres: nombres,
                                    apellidopat: apellidopat,
                                    apellidomat: apellidomat,
                                    numerodoc: doc || null,
                                    correo: email || null,
                                    celular: u.telefono || null,
                                    direccion: u.direccion || null,
                                    idperfil: idperfil,
                                    idestado: estaActivo ? 1 : 0,
                                    tipo: '1'
                                })
                                .select()
                                .single();

                            if (nuevaPersona) {
                                idpersona = nuevaPersona.idpersona;
                            }
                        }

                        if (estaActivo && idpersona) {
                            const perfilNombre = u.perfilNombre || this.getPerfilNombreDefault(idperfil);
                            trabajadoresSincronizados.push({
                                idpersona: idpersona,
                                id: idpersona,
                                id_persona: idpersona,
                                saasId: u.id,
                                usuarioId: u.usuarioId,
                                personaId: u.personaId,
                                nombres: nombres,
                                apellidos: apellidos,
                                apellidopat: apellidopat,
                                apellidomat: apellidomat,
                                nombreCompleto: u.nombreCompleto || `${nombres} ${apellidos}`.trim(),
                                numerodoc: doc,
                                correo: email,
                                email: email,
                                celular: u.telefono,
                                direccion: u.direccion,
                                idperfil: idperfil,
                                perfilCodigo: u.perfilCodigo,
                                perfilNombre: perfilNombre,
                                perfil: { nombre: perfilNombre },
                                estaActivo: estaActivo,
                                idestado: 1
                            });
                        }
                    }

                    if (trabajadoresSincronizados.length > 0) {
                        return { success: true, data: trabajadoresSincronizados, error: null };
                    }
                }
            }
        } catch (saasErr) {
            console.warn('[SupabaseService] Error consultando SaaS Master, usando fallback local de persona:', saasErr);
        }

        // Fallback local a Supabase si no hay conexión con SaaS Master
        const { data, error } = await this.supabase
            .from('persona')
            .select('*, perfil:idperfil(nombre)')
            .is('deleted', null)
            .eq('idestado', 1)
            .order('nombres');

        const fallbackData = (data || []).map((p: any) => {
            const perfilNom = p.perfil?.nombre || this.getPerfilNombreDefault(p.idperfil);
            return {
                ...p,
                nombreCompleto: `${p.nombres || ''} ${p.apellidopat || ''} ${p.apellidomat || ''}`.trim(),
                perfilNombre: perfilNom,
                perfil: { nombre: perfilNom }
            };
        });

        return { success: !error, data: fallbackData, error };
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
        // Helper para normalizar cualquier fecha a formato YYYY-MM-DD
        const normalizarFecha = (f: any): string => {
            if (!f) return '';
            return String(f).trim().split('T')[0].split(' ')[0];
        };

        // 1. Consultar apertura_caja en el rango para conocer el estado de caja de cada día
        const { data: aperturas, error: errorApertura } = await this.supabase
            .from('apertura_caja')
            .select('fecha, estado')
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .is('deleted', null);

        if (errorApertura) console.warn('Aviso al consultar aperturas en rango:', errorApertura);

        // Mapear el estado de caja por cada fecha
        const estadosCaja: Record<string, number> = {};
        (aperturas || []).forEach((a: any) => {
            const f = normalizarFecha(a.fecha);
            if (f) {
                estadosCaja[f] = Number(a.estado);
            }
        });

        // 2. Consultar pedidos con estado = 3 (atendidos/cobrados) en todo el rango
        const { data: pedidosData, error: errorPedidos } = await this.supabase
            .from('pedido')
            .select('yape, plin, visa, efectivo, fecha, total')
            .eq('estado', 3)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin + 'T23:59:59')
            .is('deleted', null);

        if (errorPedidos) return { success: false, data: null, error: errorPedidos };

        // 3. Obtener gastos registrados en el rango
        const { data: gastosData, error: errorGastos } = await this.supabase
            .from('gastos')
            .select('monto, fecha')
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .is('deleted', null);

        if (errorGastos) console.warn('Aviso al consultar gastos en rango:', errorGastos);

        // 4. Agrupar ventas y gastos por fecha unificada (YYYY-MM-DD)
        const groupedData: Record<string, any> = {};

        (pedidosData || []).forEach((curr: any) => {
            const fecha = normalizarFecha(curr.fecha);
            if (!fecha) return;
            if (!groupedData[fecha]) {
                groupedData[fecha] = {
                    yape: 0,
                    plin: 0,
                    visa: 0,
                    efectivo: 0,
                    gastos: 0,
                    fecha,
                    cajaEstado: estadosCaja[fecha] || null
                };
            }
            groupedData[fecha].yape += Number(curr.yape) || 0;
            groupedData[fecha].plin += Number(curr.plin) || 0;
            groupedData[fecha].visa += Number(curr.visa) || 0;
            groupedData[fecha].efectivo += Number(curr.efectivo) || 0;
        });

        // Sumar gastos por fecha unificada (YYYY-MM-DD)
        (gastosData || []).forEach((g: any) => {
            const fecha = normalizarFecha(g.fecha);
            if (!fecha) return;
            if (!groupedData[fecha]) {
                groupedData[fecha] = {
                    yape: 0,
                    plin: 0,
                    visa: 0,
                    efectivo: 0,
                    gastos: 0,
                    fecha,
                    cajaEstado: estadosCaja[fecha] || null
                };
            }
            groupedData[fecha].gastos += Number(g.monto) || 0;
        });

        // Asegurar que todas las fechas tengan su estado de caja
        Object.keys(groupedData).forEach((f) => {
            groupedData[f].cajaEstado = estadosCaja[f] || null;
        });

        return { success: true, data: Object.values(groupedData), error: null };
    }

    // Obtener ranking de platos, bebidas y gaseosas vendidas en un rango de fechas
    async getReportePlatosVendidos(fechaInicio: string, fechaFin: string): Promise<any> {
        try {
            // 1. Obtener catálogo de categorías activas
            const { data: categoriasData } = await this.supabase
                .from('categoria')
                .select('idcategoria, nombre')
                .is('deleted', null)
                .order('idcategoria', { ascending: true });

            const categoriasMap: Record<number, string> = {};
            (categoriasData || []).forEach((c: any) => {
                categoriasMap[Number(c.idcategoria)] = c.nombre;
            });

            // 2. Consultar todos los detalles de pedidos cobrados (estado = 3, deleted IS NULL)
            // Usamos paginación por bloques de 1000 para no truncar meses con alto volumen
            const pageSize = 1000;
            let from = 0;
            let allDetalles: any[] = [];

            while (true) {
                const { data: batch, error } = await this.supabase
                    .from('pedidodetalle')
                    .select(`
                        idpedidodetalle,
                        idpedido,
                        idproducto,
                        cantidad,
                        precioU,
                        total,
                        lugarpedido,
                        producto (
                            idproducto,
                            nombre,
                            preciounitario,
                            idcategoria
                        ),
                        pedido!inner (
                            idpedido,
                            fecha,
                            mesa,
                            estado,
                            deleted
                        )
                    `)
                    .eq('pedido.estado', 3)
                    .is('pedido.deleted', null)
                    .gte('pedido.fecha', fechaInicio)
                    .lte('pedido.fecha', fechaFin + 'T23:59:59')
                    .range(from, from + pageSize - 1);

                if (error) {
                    return { success: false, data: [], categorias: categoriasData || [], error };
                }

                if (!batch || batch.length === 0) {
                    break;
                }

                allDetalles = allDetalles.concat(batch);

                if (batch.length < pageSize) {
                    break;
                }
                from += pageSize;
            }

            // 3. Agrupar por producto
            const agrupado: Record<string, {
                idproducto: number;
                nombre: string;
                idcategoria: number;
                categoria: string;
                precioUnitario: number;
                cantidadVendida: number;
                cantidadSalon: number;
                cantidadLlevar: number;
                totalRecaudado: number;
                pedidosSet: Set<number>;
                esBebida: boolean;
                esGaseosa: boolean;
            }> = {};

            allDetalles.forEach((item: any) => {
                const prod = item.producto || {};
                const idProd = Number(item.idproducto || prod.idproducto || 0);
                const nombreProd = (prod.nombre || `Producto #${idProd}`).trim();
                const idCat = Number(prod.idcategoria || 0);
                const nombreCat = categoriasMap[idCat] || (idCat === 5 ? 'Bebidas' : 'General');
                const cant = Number(item.cantidad) || 0;
                const precioU = Number(item.precioU ?? prod.preciounitario) || 0;
                const subtotal = Number(item.total) || (cant * precioU);
                const esLlevar = item.pedido?.mesa === 0 || Number(item.lugarpedido) === 1;

                const key = idProd ? String(idProd) : nombreProd.toLowerCase();

                if (!agrupado[key]) {
                    const lowerName = nombreProd.toLowerCase();
                    agrupado[key] = {
                        idproducto: idProd,
                        nombre: nombreProd,
                        idcategoria: idCat,
                        categoria: nombreCat,
                        precioUnitario: Number(prod.preciounitario) || precioU,
                        cantidadVendida: 0,
                        cantidadSalon: 0,
                        cantidadLlevar: 0,
                        totalRecaudado: 0,
                        pedidosSet: new Set<number>(),
                        esBebida: idCat === 5 || lowerName.includes('gaseosa') || lowerName.includes('chicha') || lowerName.includes('limonada') || lowerName.includes('maracuya') || lowerName.includes('agua') || lowerName.includes('cerveza') || lowerName.includes('pilsen') || lowerName.includes('cusqueña'),
                        esGaseosa: lowerName.includes('gaseosa')
                    };
                }

                agrupado[key].cantidadVendida += cant;
                if (esLlevar) {
                    agrupado[key].cantidadLlevar += cant;
                } else {
                    agrupado[key].cantidadSalon += cant;
                }
                agrupado[key].totalRecaudado += subtotal;
                if (item.idpedido) {
                    agrupado[key].pedidosSet.add(Number(item.idpedido));
                }
            });

            // 4. Convertir a arreglo y ordenar de mayor a menor cantidad vendida
            const totalUnidadesGlobal = Object.values(agrupado).reduce((acc, p) => acc + p.cantidadVendida, 0);

            const resultado = Object.values(agrupado)
                .map((p) => ({
                    idproducto: p.idproducto,
                    nombre: p.nombre,
                    idcategoria: p.idcategoria,
                    categoria: p.categoria,
                    precioUnitario: p.precioUnitario,
                    cantidadVendida: p.cantidadVendida,
                    cantidadSalon: p.cantidadSalon,
                    cantidadLlevar: p.cantidadLlevar,
                    pedidosCount: p.pedidosSet.size,
                    totalRecaudado: Number(p.totalRecaudado.toFixed(2)),
                    porcentajeUnidades: totalUnidadesGlobal > 0 ? Number(((p.cantidadVendida / totalUnidadesGlobal) * 100).toFixed(1)) : 0,
                    esBebida: p.esBebida,
                    esGaseosa: p.esGaseosa
                }))
                .sort((a, b) => {
                    if (b.cantidadVendida !== a.cantidadVendida) {
                        return b.cantidadVendida - a.cantidadVendida;
                    }
                    return b.totalRecaudado - a.totalRecaudado;
                })
                .map((item, idx) => ({
                    ...item,
                    ranking: idx + 1
                }));

            return {
                success: true,
                data: resultado,
                categorias: categoriasData || [],
                error: null
            };
        } catch (err) {
            console.error('Error en getReportePlatosVendidos:', err);
            return { success: false, data: [], categorias: [], error: err };
        }
    }

    // ============================================================
    // SUPABASE STORAGE: FACTURACION ELECTRONICA
    // ============================================================
    normalizarUrlSegura(url: string | null | undefined): string {
        if (!url) return '';
        if (/^http:\/\/(?!localhost|127\.0\.0\.1)/i.test(url)) {
            return url.replace(/^http:\/\//i, 'https://');
        }
        return url;
    }

    async subirComprobanteStorage(path: string, blob: Blob, contentType: string = 'application/pdf'): Promise<string | null> {
        try {
            const { data, error } = await this.supabase.storage
                .from('Facturacion')
                .upload(path, blob, {
                    contentType,
                    upsert: true
                });

            if (error) {
                console.warn('Error subiendo comprobante a Supabase Storage Facturacion:', error);
                return null;
            }

            return this.obtenerUrlPublicaComprobante(path);
        } catch (err) {
            console.error('Excepción al subir archivo a Facturacion:', err);
            return null;
        }
    }

    async subirComprobanteDesdeUrl(path: string, urlLocal: string, contentType: string = 'application/pdf'): Promise<string | null> {
        try {
            const urlSegura = this.normalizarUrlSegura(urlLocal);
            if (!urlSegura) return null;
            const response = await fetch(urlSegura);
            if (!response.ok) return null;
            const blob = await response.blob();
            return await this.subirComprobanteStorage(path, blob, contentType);
        } catch (e) {
            console.warn('No se pudo descargar archivo local para subir a Supabase:', e);
            return null;
        }
    }

    obtenerUrlPublicaComprobante(path: string): string {
        const { data } = this.supabase.storage.from('Facturacion').getPublicUrl(path);
        return data.publicUrl;
    }
}
