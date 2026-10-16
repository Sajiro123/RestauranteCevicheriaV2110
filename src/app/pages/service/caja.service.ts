import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Caja } from '../../model/caja';

@Injectable({
  providedIn: 'root'
})
export class CajaService {

  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageListener: false
      } as any
    });
  }

  // ============================
  // 📌 LISTAR TODO
  // ============================
  async getAll() {
    const { data, error } = await this.supabase
      .from('caja_semanal')
      .select('*')
      .order('fecha', { ascending: true });

    return { data, error };
  }

  // ============================
  // 📌 LISTAR POR RANGO DE FECHAS
  // ============================
  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await this.supabase
      .from('caja_semanal')
      .select('*')
      .gte('fecha', startDate)
      .lte('fecha', endDate)
      .order('fecha', { ascending: true });

    return { data, error };
  }

  // ============================
  // 📌 OBTENER POR ID
  // ============================
  async getById(id: number) {
    const { data, error } = await this.supabase
      .from('caja_semanal')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  // ============================
  // 📌 INSERTAR
  // ============================
  async create(item: Caja) {
    const { total, validado, ...insertData } = item;
    insertData.created_at = validado ? (item.created_at || new Date().toISOString()) : null;

    const { data, error } = await this.supabase
      .from('caja_semanal')
      .insert(insertData)
      .select();

    return { data, error };
  }

  // ============================
  // 📌 ACTUALIZAR
  // ============================
  async update(id: number, item: Partial<Caja>) {
    // Remove total and validado fields before sending to DB
    const { total, validado, ...updateData } = item;
    if (validado !== undefined) {
      updateData.created_at = validado ? (item.created_at || new Date().toISOString()) : null;
    }

    const { data, error } = await this.supabase
      .from('caja_semanal')
      .update(updateData)
      .eq('id', id)
      .select();

    return { data, error };
  }

  // ============================
  // 📌 ACTUALIZAR VALIDACIÓN (CUADRE)
  // ============================
  async updateValidacion(id: number, validado: boolean) {
    const { data, error } = await this.supabase
      .from('caja_semanal')
      .update({ created_at: validado ? new Date().toISOString() : null })
      .eq('id', id)
      .select();

    return { data, error };
  }

  // ============================
  // 📌 ELIMINAR
  // ============================
  async delete(id: number) {
    const { data, error } = await this.supabase
      .from('caja_semanal')
      .delete()
      .eq('id', id)
      .select();

    return { data, error };
  }
}
