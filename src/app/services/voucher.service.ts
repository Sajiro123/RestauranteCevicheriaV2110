import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from } from 'rxjs';

export interface ValeDelivery {
    id?: number;
    codigo: string;
    descripcion?: string;
    estado: number;
    fecha_creacion: string;
    fecha_uso?: string;
    fecha_vencimiento: string;
    idpersona: number;
}

@Injectable({
    providedIn: 'root'
})
export class VoucherService {
    constructor(private supabaseService: SupabaseService) {}

    async createVoucher(descripcion: string, idpedido: number, diasVencimiento: number = 30): Promise<{ success: boolean; data?: any; error?: any }> {
        try {
            // Generate voucher code using the database function
            const { data: codeData, error: codeError } = await this.supabaseService.client.rpc('generate_voucher_code');

            if (codeError) throw codeError;

            const codigo = codeData;
            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + diasVencimiento);

            const { data, error } = await this.supabaseService.client
                .from('vales_delivery')
                .insert({
                    codigo,
                    descripcion,
                    estado: 1,
                    fecha_vencimiento: fechaVencimiento.toISOString(),
                    idpedido
                })
                .select()
                .single();

            return { success: !error, data, error };
        } catch (error) {
            console.error('Error creating voucher:', error);
            return { success: false, error };
        }
    }

    async createVoucherWithPedido(descripcion: string, idpersona: number, idpedido: number, diasVencimiento: number = 30): Promise<{ success: boolean; data?: any; error?: any }> {
        try {
            // Generate voucher code using the database function
            const { data: codeData, error: codeError } = await this.supabaseService.client.rpc('generate_voucher_code');

            if (codeError) throw codeError;

            const codigo = codeData;
            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + diasVencimiento);

            const { data, error } = await this.supabaseService.client
                .from('vales_delivery')
                .insert({
                    codigo,
                    descripcion,
                    fecha_vencimiento: fechaVencimiento.toISOString(),
                    estado: 1,
                    idpedido,
                    idpersona
                })
                .select()
                .single();

            return { success: !error, data, error };
        } catch (error) {
            console.error('Error creating voucher with pedido:', error);
            return { success: false, error };
        }
    }

    async findOrCreatePersonaDni(dni: string): Promise<{ success: boolean; data?: any; error?: any }> {
        try {
            // Generate voucher code using the database function

            const { data, error } = await this.supabaseService.client
                .from('persona')
                .insert({
                    nombres: `Cliente-${dni}`,
                    apellidopat: 'Delivery',
                    apellidomat: 'Cliente',
                    direccion: `DNI: ${dni}`,
                    idperfil: 2, // Assuming 2 is for customers/mesero
                    idestado: 1
                })
                .select()
                .single();

            return { success: !error, data, error };
        } catch (error) {
            console.error('Error creating voucher:', error);
            return { success: false, error };
        }
    }

    async getVouchersByPersona(idpersona: number): Promise<{ success: boolean; data?: any[] | null; error?: any }> {
        try {
            const { data, error } = await this.supabaseService.client
                .from('vales_delivery')
                .select(
                    `
                    *
                `
                )
                .eq('idpersona', idpersona)
                .is('deleted', null)
                .order('fecha_creacion', { ascending: false });

            return { success: !error, data, error };
        } catch (error) {
            console.error('Error getting vouchers:', error);
            return { success: false, error };
        }
    }

    async getAllVouchers(): Promise<{ success: boolean; data?: any[] | null; error?: any }> {
        try {
            const { data, error } = await this.supabaseService.client
                .from('vales_delivery')
                .select(
                    `
                    *,
                    pedido:idpedido(idpedido, mesa, cliente, total, fecha)
                `
                )
                .is('deleted', null)
                .order('fecha_creacion', { ascending: false });

            return { success: !error, data, error };
        } catch (error) {
            console.error('Error getting all vouchers:', error);
            return { success: false, error };
        }
    }

    async useVoucher(codigo: string): Promise<{ success: boolean; data?: any; error?: any }> {
        try {
            const { data, error } = await this.supabaseService.client
                .from('vales_delivery')
                .update({
                    estado: 0,
                    fecha_uso: new Date().toISOString()
                })
                .eq('codigo', codigo)
                .eq('estado', 1)
                .select()
                .single();

            return { success: !error, data, error };
        } catch (error) {
            console.error('Error using voucher:', error);
            return { success: false, error };
        }
    }

    async searchVoucher(codigo: string): Promise<{ success: boolean; data?: any; error?: any }> {
        try {
            const { data, error } = await this.supabaseService.client.from('vales_delivery').select('*').eq('codigo', codigo).is('deleted', null).single();

            if (error || !data) {
                return { success: false, error: error ?? { message: 'No se encontró el voucher' } };
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error usando voucher:', error);
            return { success: false, error };
        }
    }
}
