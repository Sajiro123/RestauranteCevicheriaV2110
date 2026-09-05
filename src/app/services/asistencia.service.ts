import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

/** IP pública del router del hogar/negocio.
 *  Modificar este valor con la IP pública real. */
const WIFI_HOME_IP = '38.25.26.24'; // ← CAMBIAR POR TU IP PÚBLICA REAL

export interface Asistencia {
    id?: number;
    usuario_id: number | string;
    fecha: string;
    hora_registro: string;
    ip_cliente: string;
    created_at?: string;
}

export interface AsistenciaResult {
    success: boolean;
    data?: Asistencia | null;
    error?: string;
    forbidden?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AsistenciaService {

    constructor(private supabaseService: SupabaseService) { }

    // ─────────────────────────────────────────────────────────────
    // Obtener IP pública del cliente via ipify
    // ─────────────────────────────────────────────────────────────

    async obtenerIpPublica(): Promise<string> {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip as string;
        } catch {
            // Fallback: ip4.seeip.org
            try {
                const res = await fetch('https://ip4.seeip.org/json');
                const d = await res.json();
                return d.ip as string;
            } catch {
                return 'UNKNOWN';
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /asistencia/registrar — lógica principal
    // La fecha y hora la calcula el SERVIDOR de BD (NOW() AT TIME ZONE
    // 'America/Lima'), nunca el reloj del cliente.
    // ─────────────────────────────────────────────────────────────

    async registrar(usuarioId: number | string): Promise<AsistenciaResult> {
        // 1. Obtener IP pública del cliente
        const ipCliente = await this.obtenerIpPublica();

        // 2. Validación de red: comparar con la IP del Wi-Fi del hogar
        if (ipCliente !== WIFI_HOME_IP) {
            return {
                success: false,
                forbidden: true,
                error: `Debes estar conectado al Wi-Fi de la casa. Tu IP actual: ${ipCliente}`
            };
        }

        // 3. Llamar a la función RPC del servidor.
        //    La BD calcula internamente: NOW() AT TIME ZONE 'America/Lima'
        //    para fecha y hora_registro → 100% independiente del reloj del cliente.
        const { data: rpcResult, error: rpcError } = await this.supabaseService.client
            .rpc('registrar_asistencia', {
                p_usuario_id: usuarioId,
                p_ip_cliente: ipCliente
            });

        if (rpcError) {
            return { success: false, error: `Error de conexión: ${rpcError.message}` };
        }

        // La función retorna { success, data?, error? }
        if (!rpcResult.success) {
            return { success: false, error: rpcResult.error ?? 'Error desconocido.' };
        }

        return { success: true, data: rpcResult.data as Asistencia };
    }

    // ─────────────────────────────────────────────────────────────
    // Obtener mis asistencias (historial)
    // ─────────────────────────────────────────────────────────────

    async getMisAsistencias(usuarioId: number | string, limite: number = 30): Promise<{ success: boolean; data: Asistencia[]; error?: any }> {
        const { data, error } = await this.supabaseService.client
            .from('asistencias')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('fecha', { ascending: false })
            .order('hora_registro', { ascending: false })
            .limit(limite);

        return { success: !error, data: data ?? [], error };
    }

    // ─────────────────────────────────────────────────────────────
    // Obtener todas las asistencias (solo admin)
    // ─────────────────────────────────────────────────────────────

    async getTodasAsistencias(fecha?: string): Promise<{ success: boolean; data: any[]; error?: any }> {
        let query = this.supabaseService.client
            .from('asistencias')
            .select(`
                *,
                usuario:usuario_id (
                    idusuario,
                    username,
                    nombre
                )
            `)
            .order('fecha', { ascending: false })
            .order('hora_registro', { ascending: false });

        if (fecha) {
            query = query.eq('fecha', fecha);
        }

        const { data, error } = await query;
        return { success: !error, data: data ?? [], error };
    }

    // ─────────────────────────────────────────────────────────────
    // Verificar si ya marcó hoy
    // ─────────────────────────────────────────────────────────────

    async yaMarcoHoy(usuarioId: number | string): Promise<boolean> {
        // Obtener la fecha actual de Perú desde el servidor de BD
        // para no depender del reloj del cliente.
        const { data: fechaServer } = await this.supabaseService.client
            .rpc('obtener_fecha_lima');

        const fecha = fechaServer ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

        const { data } = await this.supabaseService.client
            .from('asistencias')
            .select('id')
            .eq('usuario_id', usuarioId)
            .eq('fecha', fecha)
            .maybeSingle();
        return !!data;
    }
}
